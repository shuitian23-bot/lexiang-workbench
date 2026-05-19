// Pipeline API — 标注/统计/过滤/流水线
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const db = require('../db/schema');
const registry = require('../core/skill-registry');

const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const SKILLS_DIR = process.env.PYTHON_SKILLS_DIR || '/home/zhouyue118';
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'pipeline');
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'pipeline');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Multer for file uploads
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});
const multiUpload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 200 * 1024 * 1024 }
});

// In-memory task store
const tasks = new Map();

// ===== Classify =====

router.get('/classify/rules/status', (req, res) => {
  const rulesDir = path.join(SKILLS_DIR, 'lexiang-query-classify', 'references');
  const sceneFile = path.join(SKILLS_DIR, 'lexiang-query-classify', '场景分类定义.md');
  const files = [
    { path: path.join(rulesDir, 'rules.md'), name: '标注规则' },
    { path: sceneFile, name: '场景分类定义' },
  ];
  const result = files.map(f => {
    try {
      const stat = fs.statSync(f.path);
      return { path: f.path, name: f.name, mtime: stat.mtime.toISOString().slice(0, 19).replace('T', ' '), size: stat.size };
    } catch {
      return { path: f.path, name: f.name, mtime: '未找到', size: 0 };
    }
  });
  res.json({ files: result });
});

router.post('/classify', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未提供文件' });

  const suffix = path.extname(req.file.originalname).toLowerCase();
  if (!['.csv', '.xlsx', '.xls', '.jsonl'].includes(suffix)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: `不支持的格式: ${suffix}` });
  }

  // Rename to original extension
  const filePath = req.file.path + suffix;
  fs.renameSync(req.file.path, filePath);

  const taskId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const userId = req.session?.admin?.username || 'anonymous';

  tasks.set(taskId, {
    task_id: taskId,
    filename: req.file.originalname,
    user_id: userId,
    status: 'running',
    progress: '标注中...',
    created_at: new Date().toISOString(),
    result: null,
    _filePath: filePath,
  });

  // 调 skill 统一入口（含 LLM 兜底）
  (async () => {
    const task = tasks.get(taskId);
    try {
      const result = await registry.invoke('lexiang.classify', {
        file_path: filePath,
      }, { permissions: ['*'], admin: req.session?.admin });

      if (!task) return;
      task.status = 'done';
      task.progress = '完成';
      task.result = {
        total: result.total,
        unclear_count: result.unclear_count || 0,
        output: result.output,
        report: result.report,
        issues: result.issues,
        warnings: result.warnings,
        fix_log: result.fix_log,
        llm_fixed_count: result.llm_fixed_count || 0,
        distribution: result.distribution,
        total_users: result.total_users,
        total_sessions: result.total_sessions,
        active_count: result.active_count,
        passive_count: result.passive_count,
      };
    } catch (e) {
      if (!task) return;
      task.status = 'error';
      task.progress = e.message;
    }
  })();

  res.json({ task_id: taskId, filename: req.file.originalname, status: 'running' });
});

router.get('/classify/tasks', (req, res) => {
  const userId = req.query.user_id;
  let list = Array.from(tasks.values());
  if (userId && userId !== 'anonymous') {
    list = list.filter(t => t.user_id === userId);
  }
  list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const summary = list.map(t => ({
    task_id: t.task_id,
    filename: t.filename,
    user_id: t.user_id,
    status: t.status,
    created_at: t.created_at,
    total: t.result?.total,
    unclear_count: t.result?.unclear_count,
    output: t.result?.output,
  }));
  res.json({ tasks: summary, count: summary.length });
});

router.get('/classify/:taskId', (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  res.json(task);
});

router.post('/classify/:taskId/cancel', (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  if (task.status !== 'running') return res.status(400).json({ error: '任务不在运行中' });
  task.status = 'cancelled';
  task.progress = '用户取消';
  res.json({ task_id: req.params.taskId, status: 'cancelled' });
});

router.post('/classify/:taskId/restart', (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  if (task.status !== 'cancelled') return res.status(400).json({ error: '只能重启已取消的任务' });

  const filePath = task._filePath;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(400).json({ error: '原文件已不可用，请重新上传' });
  }

  task.status = 'running';
  task.progress = '重新标注中...';

  // 调 skill 统一入口（含 LLM 兜底）
  (async () => {
    try {
      const result = await registry.invoke('lexiang.classify', {
        file_path: filePath,
      }, { permissions: ['*'], admin: req.session?.admin });

      if (!tasks.has(req.params.taskId)) return;
      task.status = 'done';
      task.progress = '完成';
      task.result = {
        total: result.total,
        unclear_count: result.unclear_count || 0,
        output: result.output,
        report: result.report,
        issues: result.issues,
        warnings: result.warnings,
        fix_log: result.fix_log,
        llm_fixed_count: result.llm_fixed_count || 0,
        distribution: result.distribution,
        total_users: result.total_users,
        total_sessions: result.total_sessions,
        active_count: result.active_count,
        passive_count: result.passive_count,
      };
    } catch (e) {
      if (!tasks.has(req.params.taskId)) return;
      task.status = 'error';
      task.progress = e.message;
    }
  })();

  res.json({ task_id: req.params.taskId, status: 'running' });
});

router.get('/classify/:taskId/download', (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  const output = task.result?.output;
  if (!output || !fs.existsSync(output)) {
    return res.status(404).json({ error: '标注结果文件不存在' });
  }
  res.download(output);
});

// ===== Stats =====

router.post('/stats', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未提供文件' });

  const suffix = path.extname(req.file.originalname).toLowerCase();
  if (!['.csv', '.xlsx', '.xls'].includes(suffix)) {
    try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(400).json({ error: `不支持的格式: ${suffix}` });
  }

  const filePath = req.file.path + suffix;
  fs.renameSync(req.file.path, filePath);

  try {
    const result = await registry.invoke('lexiang.pipeline', {
      mode: 'once',
      file_path: filePath,
    }, { permissions: ['*'], admin: req.session?.admin });
    try { fs.unlinkSync(filePath); } catch {}
    res.json(result);
  } catch (e) {
    try { fs.unlinkSync(filePath); } catch {}
    res.status(500).json({ error: e.message });
  }
});

router.get('/stats/history', (req, res) => {
  const statsFile = path.join(SKILLS_DIR, 'lexiang-pipeline', 'data', 'stats_history.json');
  if (!fs.existsSync(statsFile)) {
    return res.json({ version: 1, records: [] });
  }
  try {
    const data = JSON.parse(fs.readFileSync(statsFile, 'utf-8'));
    res.json(data);
  } catch {
    res.json({ version: 1, records: [] });
  }
});

router.get('/stats/latest', (req, res) => {
  const statsFile = path.join(SKILLS_DIR, 'lexiang-pipeline', 'data', 'stats_history.json');
  if (!fs.existsSync(statsFile)) {
    return res.json({});
  }
  try {
    const data = JSON.parse(fs.readFileSync(statsFile, 'utf-8'));
    const records = data.records || [];
    res.json(records.length > 0 ? records[records.length - 1] : {});
  } catch {
    res.json({});
  }
});

router.get('/stats/summary', (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  const statsFile = path.join(SKILLS_DIR, 'lexiang-pipeline', 'data', 'stats_history.json');

  if (!fs.existsSync(statsFile)) {
    return res.json({ error: '无统计数据', count: 0 });
  }

  try {
    const data = JSON.parse(fs.readFileSync(statsFile, 'utf-8'));
    const records = data.records || [];

    const now = new Date();
    const defaultFrom = new Date(now - 7 * 86400000).toISOString().slice(0, 10);
    const defaultTo = now.toISOString().slice(0, 10);
    const fromDate = from || defaultFrom;
    const toDate = to || defaultTo;

    const filtered = records.filter(r => {
      const d = r.date || '';
      return d >= fromDate && d <= toDate;
    });

    if (filtered.length === 0) {
      return res.json({ error: '该时间段无数据', from: fromDate, to: toDate, count: 0 });
    }

    const totalQueries = filtered.reduce((s, r) => s + (r.total || 0), 0);
    const totalUsers = filtered.reduce((s, r) => s + (r.total_users || 0), 0);

    // Merge tag distributions
    const mergedTag = {};
    const mergedTagActive = {};
    for (const r of filtered) {
      for (const [k, v] of Object.entries(r.tag_dist_all || r.tag_distribution || {})) {
        mergedTag[k] = (mergedTag[k] || 0) + v;
      }
      for (const [k, v] of Object.entries(r.tag_dist_active || {})) {
        mergedTagActive[k] = (mergedTagActive[k] || 0) + v;
      }
    }

    res.json({
      from: fromDate, to: toDate, days: filtered.length,
      total_queries: totalQueries, total_users: totalUsers,
      tag_dist: mergedTag, tag_dist_active: mergedTagActive,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== Download =====

router.get('/download', (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  const type = req.query.type || 'detail';

  // For detail type, try to find and concatenate annotated CSVs
  if (type === 'detail') {
    const outputDir = path.join(SKILLS_DIR, 'lexiang-api', 'output');
    if (!fs.existsSync(outputDir)) {
      return res.status(404).json({ error: '无标注输出目录' });
    }
    // Find CSV files in output directory
    const csvFiles = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('标注结果_') && f.endsWith('.csv'))
      .map(f => path.join(outputDir, f));

    if (csvFiles.length === 0) {
      return res.status(404).json({ error: '无标注结果文件' });
    }

    // For now, return the most recent file
    csvFiles.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    const latestFile = csvFiles[0];
    res.download(latestFile);
    return;
  }

  res.status(400).json({ error: `不支持的导出类型: ${type}` });
});

// ===== Filter =====

router.post('/filter', multiUpload.array('files', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '未提供文件' });
  }

  const filePaths = req.files.map(f => f.path);

  try {
    const result = await registry.invoke('lexiang.filter', {
      file_paths: filePaths,
    }, { permissions: ['*'], admin: req.session?.admin });

    // Cleanup uploaded files
    for (const f of req.files) {
      try { fs.unlinkSync(f.path); } catch {}
    }

    res.json(result);
  } catch (e) {
    for (const f of req.files) {
      try { fs.unlinkSync(f.path); } catch {}
    }
    res.status(500).json({ error: e.message });
  }
});

// ===== Pipeline Control =====

// Pipeline state
let _pipelineState = {
  running: false,
  mode: 'idle',
  processed: 0,
  failed: 0,
  skipped: 0,
  current_file: null,
  watch_dir: null,
  started_at: null,
  log: [],
};

router.get('/pipeline/status', (req, res) => {
  res.json(_pipelineState);
});

router.post('/pipeline/monitor/start', (req, res) => {
  const watchDir = req.query.watch_dir || '';
  _pipelineState = { running: true, mode: 'monitor', processed: 0, failed: 0, skipped: 0, current_file: null, watch_dir: watchDir || null, started_at: new Date().toISOString(), log: ['监控已启动'] };
  res.json({ status: 'started', mode: 'monitor' });
});

router.post('/pipeline/monitor/stop', (req, res) => {
  _pipelineState.running = false;
  _pipelineState.mode = 'idle';
  _pipelineState.log.push('监控已停止');
  res.json({ status: 'stopped' });
});

router.post('/pipeline/batch', async (req, res) => {
  const watchDir = req.query.watch_dir || '';
  const skipExisting = req.query.skip_existing !== 'false';

  _pipelineState = { running: true, mode: 'batch', processed: 0, failed: 0, skipped: 0, current_file: '扫描中...', watch_dir: watchDir || null, started_at: new Date().toISOString(), log: ['批量处理已启动'] };

  try {
    const result = await registry.invoke('lexiang.pipeline', {
      mode: 'scan',
      watch_dir: watchDir || undefined,
    }, { permissions: ['*'] });
    _pipelineState.running = false;
    _pipelineState.mode = 'idle';
    _pipelineState.processed = result.processed || 0;
    _pipelineState.failed = result.failed || 0;
    _pipelineState.log.push(`批量处理完成: ${result.processed || 0} 处理, ${result.failed || 0} 失败`);
    res.json(result);
  } catch (e) {
    _pipelineState.running = false;
    _pipelineState.mode = 'idle';
    _pipelineState.log.push('批量处理失败: ' + e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/pipeline/start', async (req, res) => {
  const watchDir = req.query.watch_dir || '';
  const scanExisting = req.query.scan_existing !== 'false';

  _pipelineState = { running: true, mode: 'pipeline', processed: 0, failed: 0, skipped: 0, current_file: '启动中...', watch_dir: watchDir || null, started_at: new Date().toISOString(), log: ['流水线已启动'] };

  try {
    const result = await registry.invoke('lexiang.pipeline', {
      mode: scanExisting ? 'scan' : 'once',
      watch_dir: watchDir || undefined,
    }, { permissions: ['*'] });
    _pipelineState.running = false;
    _pipelineState.mode = 'idle';
    _pipelineState.processed = result.processed || 0;
    _pipelineState.failed = result.failed || 0;
    _pipelineState.log.push(`流水线完成: ${result.processed || 0} 处理, ${result.failed || 0} 失败`);
    res.json(result);
  } catch (e) {
    _pipelineState.running = false;
    _pipelineState.mode = 'idle';
    _pipelineState.log.push('流水线失败: ' + e.message);
    res.status(500).json({ error: e.message });
  }
});

// Legacy endpoints (kept for backward compatibility)
router.get('/status', (req, res) => {
  res.json(_pipelineState);
});

router.post('/start', async (req, res) => {
  const { watch_dir, scan_existing = true } = req.body;

  try {
    const result = await registry.invoke('lexiang.pipeline', {
      mode: scan_existing ? 'scan' : 'once',
      watch_dir: watch_dir || undefined,
    }, { permissions: ['*'] });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== Helper =====

function _parseJson(stdout) {
  const lines = stdout.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('{')) {
      try {
        return JSON.parse(lines.slice(i).join('\n'));
      } catch {
        try { return JSON.parse(line); } catch {}
      }
    }
  }
  return null;
}

module.exports = router;
