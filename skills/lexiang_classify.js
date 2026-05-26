// Skill: lexiang.classify — Query分类标注（规则标注+自查+修正+LLM兜底）
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const SKILLS_DIR = process.env.PYTHON_SKILLS_DIR || '/home/zhouyue118';
const RESULT_DIR = path.join(__dirname, '..', 'data', 'pipeline', 'results');

function runPython(script, args, timeout = 300000) {
  return new Promise((resolve, reject) => {
    const fullArgs = [script, ...args];
    execFile(PYTHON_BIN, fullArgs, { timeout, maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
        return;
      }
      resolve(stdout);
    });
  });
}

function parseJsonOutput(stdout) {
  // Find the last line that starts with { — that's our JSON
  const lines = stdout.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('{')) {
      try {
        // Collect remaining lines in case JSON is multi-line
        const jsonStr = lines.slice(i).join('\n');
        return JSON.parse(jsonStr);
      } catch {
        try { return JSON.parse(line); } catch {}
      }
    }
  }
  return null;
}

module.exports = {
  name: 'lexiang.classify',
  description: '对联想乐享Query进行场景分类标注。上传CSV/Excel文件，自动执行规则标注→自查修正→LLM兜底推断，输出tag和tag3分类。',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '待标注的CSV/Excel文件路径'
      },
      enable_llm_fallback: {
        type: 'boolean',
        description: '是否启用LLM兜底推断（对意图不明query调用AI推断）',
        default: true
      }
    },
    required: ['file_path']
  },
  execute: async ({ file_path, enable_llm_fallback = true }, context) => {
    const script = path.join(SKILLS_DIR, 'lexiang-query-classify', 'run_annotation.py');
    fs.mkdirSync(RESULT_DIR, { recursive: true });

    const inputName = path.basename(file_path, path.extname(file_path));
    const outputFile = path.join(RESULT_DIR, `标注结果_${inputName}.csv`);

    // Step 1: Run annotation (rules + self-check + auto-fix)
    const stdout = await runPython(script, ['--json', file_path, outputFile]);
    const result = parseJsonOutput(stdout);

    if (!result) {
      throw new Error('标注脚本未返回有效JSON');
    }
    if (result.error) {
      throw new Error(result.error);
    }

    // Step 2: LLM fallback for unclear queries
    if (enable_llm_fallback && result.unclear_count > 0 && result.unclear_queries?.length > 0) {
      try {
        const registry = require('../core/skill-registry');
        const unclear = result.unclear_queries;

        // Build prompt for LLM
        const rulesSummary = _loadRulesSummary();
        let prompt = `你是联想乐享Query分类专家。请根据规则对以下意图不明的query进行分类。\n\n${rulesSummary}\n\n核心原则：\n1. 唯一性：一个query只标1个最贴合的三级分类\n2. 语义优先：根据语义理解分类\n3. 先定一级(tag)再定三级(tag3)\n\n请对以下query分类，每行格式：序号|tag|tag3\n\n`;
        unclear.forEach((q, i) => {
          prompt += `${i + 1}|${q.query}\n`;
        });

        const llmResult = await registry.invoke('harness.chat', {
          message: prompt,
          currentPage: 'pipeline.annotate',
          stream: false,
        }, context);

        // Parse LLM results
        const llmResults = {};
        const reply = typeof llmResult === 'string' ? llmResult : (llmResult?.reply || llmResult?.text || '');
        const replyLines = reply.split('\n');
        for (const line of replyLines) {
          const parts = line.trim().split('|');
          if (parts.length >= 3) {
            const idx = parseInt(parts[0]) - 1;
            if (idx >= 0 && idx < unclear.length && parts[2].trim() !== '意图不明') {
              llmResults[unclear[idx].index] = { tag: parts[1].trim(), tag3: parts[2].trim() };
            }
          }
        }

        // Apply LLM results back to the CSV
        if (Object.keys(llmResults).length > 0) {
          const applyScript = path.join(SKILLS_DIR, 'lexiang-query-classify', 'apply_llm_results.py');
          const applyStdout = await runPython(applyScript, [result.output, JSON.stringify(llmResults)]);
          const applyResult = parseJsonOutput(applyStdout);
          if (applyResult) {
            result.llm_fixed_count = applyResult.llm_fixed || 0;
            result.unclear_after = applyResult.unclear_after || 0;
          }
        }
      } catch (e) {
        result.llm_fallback_error = e.message;
      }
    }

    return result;
  }
};

function _loadRulesSummary() {
  const skillsDir = SKILLS_DIR;
  const parts = [];
  const rulesFile = path.join(skillsDir, 'lexiang-query-classify', 'references', 'rules.md');
  const sceneFile = path.join(skillsDir, 'lexiang-query-classify', '场景分类定义.md');

  try {
    if (fs.existsSync(rulesFile)) {
      parts.push('### 标注规则\n' + fs.readFileSync(rulesFile, 'utf-8').slice(0, 2000));
    }
  } catch {}
  try {
    if (fs.existsSync(sceneFile)) {
      parts.push('### 场景定义\n' + fs.readFileSync(sceneFile, 'utf-8').slice(0, 2000));
    }
  } catch {}

  return parts.join('\n\n') || '（规则文件未找到）';
}
