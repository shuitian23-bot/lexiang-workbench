// Skill: lexiang.intent — 二级分类统计+LLM意图提炼
// 流程: 1) python3 --skip-llm 统计+抽样 2) 调 workbench agent 做LLM意图提炼 3) python3 apply-llm 回写Excel
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const SKILLS_DIR = process.env.PYTHON_SKILLS_DIR || '/home/zhouyue118';
const RESULT_DIR = path.join(__dirname, '..', 'data', 'pipeline', 'results');
const SCRIPT = path.join(SKILLS_DIR, 'lexiang-pipeline', 'intent_service.py');

function runPython(args, timeout = 300000) {
  return new Promise((resolve, reject) => {
    execFile(PYTHON_BIN, [SCRIPT, ...args], { timeout, maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
        return;
      }
      resolve(stdout);
    });
  });
}

function parseJsonOutput(stdout) {
  const lines = stdout.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('{')) {
      try {
        const jsonStr = lines.slice(i).join('\n');
        return JSON.parse(jsonStr);
      } catch {
        try { return JSON.parse(line); } catch {}
      }
    }
  }
  return null;
}

function callHarnessChat(prompt, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      message: prompt,
      currentPage: 'pipeline.intent',
      stream: false,
    });

    const req = http.request({
      hostname: '127.0.0.1',
      port: process.env.PORT || 3001,
      path: '/api/harness/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout,
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data);
        } catch (e) {
          reject(new Error('Invalid JSON from harness chat: ' + body.slice(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('LLM request timeout')); });
    req.write(postData);
    req.end();
  });
}

function buildLlmPrompt(llmBatch) {
  let prompt = '你是联想乐享智能体的数据分析专家。请根据每个二级分类下的真实用户query抽样，提炼用户的主要意图，用一句话描述（不超过40字）。\n\n要求：\n- 从用户实际问什么/表达什么的角度归纳\n- 禁止直接复述分类名称\n- 用顿号分隔不同子意图\n\n二级分类列表：\n';
  llmBatch.forEach((item, i) => {
    const queriesText = item.queries_sample.slice(0, 20).filter(q => q && q.trim()).join('；');
    prompt += `\n${i + 1}. 【${item.level2}】抽样query：${queriesText}`;
  });
  prompt += '\n\n请按编号返回，每行格式：编号. 主要意图';
  return prompt;
}

function parseLlmReply(reply, count) {
  const results = {};
  const lines = (reply || '').trim().split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed[0].isdigit && trimmed.includes('.')) {
      const [idxStr, _, intent] = trimmed.partition('.');
      // manual partition since .partition isn't in JS
      const dotIdx = trimmed.indexOf('.');
      if (dotIdx > 0 && dotIdx < 4) {
        const idx = parseInt(trimmed.slice(0, dotIdx).trim(), 10);
        const intentText = trimmed.slice(dotIdx + 1).trim();
        if (!isNaN(idx) && intentText) {
          results[idx] = intentText;
        }
      }
    }
  }
  // 按顺序组装，缺失的 fallback 空字符串
  const output = [];
  for (let i = 1; i <= count; i++) {
    output.push(results[i] || '');
  }
  return output;
}

module.exports = {
  name: 'lexiang.intent',
  description: '对已标注数据做二级分类统计+LLM意图提炼。将tag3映射到二级分类，统计占比，调AI提炼每个二级分类的主要意图，支持Excel导出。',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '已标注的CSV/Excel文件路径（需含tag和tag3列）'
      },
      period: {
        type: 'string',
        enum: ['周', '月'],
        description: '周期标签',
        default: '周'
      }
    },
    required: ['file_path']
  },
  execute: async ({ file_path, period = '周' }) => {
    fs.mkdirSync(RESULT_DIR, { recursive: true });

    // Step 1: python3 --skip-llm → 统计+抽样
    const stdout = await runPython(['--json', '--skip-llm', '--period', period, '--output-dir', RESULT_DIR, file_path]);
    const step1 = parseJsonOutput(stdout);
    if (!step1) {
      throw new Error('意图统计脚本未返回有效JSON');
    }
    if (step1.error) {
      throw new Error(step1.error);
    }

    const llmBatch = step1.llm_batch || [];
    const results = step1.results || [];

    // 如果没有 llm_batch 或只有一条，直接返回（无需LLM）
    if (llmBatch.length === 0) {
      return step1;
    }

    // Step 2: 调 workbench agent 做 LLM 意图提炼
    let llmIntents = [];
    try {
      const prompt = buildLlmPrompt(llmBatch);
      const chatRes = await callHarnessChat(prompt);
      const reply = chatRes.reply || chatRes.message || '';
      const replyText = typeof reply === 'object' ? (reply.text || JSON.stringify(reply)) : String(reply);
      llmIntents = parseLlmReply(replyText, llmBatch.length);

      // fallback: 对空缺的用 step1 中的 fallback 拼接
      for (let i = 0; i < llmIntents.length; i++) {
        if (!llmIntents[i] && results[i]) {
          llmIntents[i] = results[i].intent_summary || '';
        }
      }
    } catch (e) {
      // LLM 失败，用 step1 的 fallback 拼接
      console.warn('LLM意图提炼失败，使用fallback拼接:', e.message);
      llmIntents = results.map(r => r.intent_summary || '');
    }

    // Step 3: python3 apply-llm → 替换意图+生成Excel
    // 写中间 JSON 文件供 Python 读取
    const ts = Date.now();
    const resultsJsonPath = path.join(RESULT_DIR, `_intent_results_${ts}.json`);
    const intentsJsonPath = path.join(RESULT_DIR, `_intent_llm_${ts}.json`);

    // 写完整的 results JSON（含 llm_batch 结构以便 Python 重建）
    fs.writeFileSync(resultsJsonPath, JSON.stringify(step1, null, 2), 'utf-8');
    fs.writeFileSync(intentsJsonPath, JSON.stringify(llmIntents, null, 2), 'utf-8');

    try {
      const applyStdout = await runPython([
        'apply-llm', resultsJsonPath,
        '--intents', intentsJsonPath,
        '--period', period,
        '--output-dir', RESULT_DIR,
      ]);
      const applyResult = parseJsonOutput(applyStdout);

      // 清理临时文件
      try { fs.unlinkSync(resultsJsonPath); } catch {}
      try { fs.unlinkSync(intentsJsonPath); } catch {}

      if (applyResult && applyResult.output_file) {
        step1.output_file = applyResult.output_file;
      }

      // 更新 results 中的 intent_summary
      for (let i = 0; i < results.length && i < llmIntents.length; i++) {
        results[i].intent_summary = llmIntents[i];
      }
    } catch (e) {
      // apply-llm 失败，清理临时文件，返回 step1 结果（已有 fallback Excel）
      try { fs.unlinkSync(resultsJsonPath); } catch {}
      try { fs.unlinkSync(intentsJsonPath); } catch {}
      console.warn('apply-llm失败，使用fallback结果:', e.message);
    }

    return step1;
  }
};
