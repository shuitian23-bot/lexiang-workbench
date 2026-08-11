// Skill: lexiang.intent — 二级分类统计+LLM意图提炼
const { execFile } = require('child_process');
const path = require('path');

const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const SKILLS_DIR = path.resolve(process.env.PYTHON_SKILLS_DIR || path.join(__dirname, '..', 'external-skills'));

function runPython(script, args, timeout = 300000) {
  return new Promise((resolve, reject) => {
    execFile(PYTHON_BIN, [script, ...args], { timeout, maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
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
    const script = path.join(SKILLS_DIR, 'lexiang-pipeline', 'intent_service.py');
    const args = ['--json', '--period', period, file_path];

    const stdout = await runPython(script, args);
    const result = parseJsonOutput(stdout);

    if (!result) {
      throw new Error('意图统计脚本未返回有效JSON');
    }
    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }
};
