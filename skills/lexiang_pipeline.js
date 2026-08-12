// Skill: lexiang.pipeline — 全自动化流水线（标注+统计+累积）
const { execFile } = require('child_process');
const path = require('path');

const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const SKILLS_DIR = path.resolve(process.env.PYTHON_SKILLS_DIR || path.join(__dirname, '..', 'external-skills'));

function runPython(script, args, timeout = 600000) {
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
  name: 'lexiang.pipeline',
  description: '联想乐享全自动化流水线：处理单个文件或扫描目录，自动执行标注→统计→累积。支持--once单文件和--scan扫描模式。',
  parameters: {
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        enum: ['once', 'scan'],
        description: '执行模式: once=处理单文件, scan=扫描目录已有文件',
        default: 'once'
      },
      file_path: {
        type: 'string',
        description: '单文件路径（mode=once时必填）'
      },
      watch_dir: {
        type: 'string',
        description: '扫描目录路径（mode=scan时必填）'
      }
    },
    required: ['mode']
  },
  execute: async ({ mode, file_path, watch_dir }) => {
    const script = path.join(SKILLS_DIR, 'lexiang-pipeline', 'pipeline.py');
    const args = ['--json'];

    if (mode === 'once') {
      if (!file_path) throw new Error('mode=once 需要提供 file_path');
      args.push('--once', file_path);
    } else if (mode === 'scan') {
      if (!watch_dir) throw new Error('mode=scan 需要提供 watch_dir');
      args.push('--scan', '--watch-dir', watch_dir);
    }

    const stdout = await runPython(script, args);
    const result = parseJsonOutput(stdout);

    if (!result) {
      throw new Error('流水线脚本未返回有效JSON');
    }
    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }
};
