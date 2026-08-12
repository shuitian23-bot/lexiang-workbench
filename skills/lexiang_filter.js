// Skill: lexiang.filter — 过滤口令数据（纯Python，无LLM）
const { execFile } = require('child_process');
const path = require('path');

const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const SKILLS_DIR = path.resolve(process.env.PYTHON_SKILLS_DIR || path.join(__dirname, '..', 'external-skills'));

function runPython(script, args, timeout = 120000) {
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
  name: 'lexiang.filter',
  description: '过滤联想乐享数据中的口令query。剔除access_channel含auto的被动数据、口令活动query（焕新+乐享、好物+乐享），输出清洗后的Excel文件。',
  parameters: {
    type: 'object',
    properties: {
      file_paths: {
        type: 'array',
        items: { type: 'string' },
        description: '输入文件路径列表（支持xlsx/xls）'
      },
      output_path: {
        type: 'string',
        description: '输出文件路径（可选，默认与输入同目录）'
      }
    },
    required: ['file_paths']
  },
  execute: async ({ file_paths, output_path }) => {
    const script = path.join(SKILLS_DIR, 'lexiang-filter-kouling', 'filter_kouling.py');
    const args = ['--json', ...file_paths];
    if (output_path) {
      args.push('--output', output_path);
    }

    const stdout = await runPython(script, args);
    const result = parseJsonOutput(stdout);

    if (!result) {
      throw new Error('过滤脚本未返回有效JSON');
    }
    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }
};
