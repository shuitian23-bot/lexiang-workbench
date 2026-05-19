// ===== AI PANEL =====
function toggleAI(forceState) {
  if (typeof forceState === 'boolean') {
    STATE.aiOpen = forceState;
  } else {
    STATE.aiOpen = !STATE.aiOpen;
  }
  const panel = document.getElementById('ai-panel');
  panel.classList.toggle('open', STATE.aiOpen);
  // 关闭时清掉拖拽留下的 inline width + 挤压状态，避免关不掉
  if (!STATE.aiOpen) {
    panel.style.width = '';
    document.body.classList.remove('ai-squeeze');
    const sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('collapsed');
  }
  const btn = document.getElementById('ai-toggle-btn');
  btn.classList.toggle('active', STATE.aiOpen);
  btn.style.display = STATE.aiOpen ? 'none' : '';
  localStorage.setItem('ai_panel_open', STATE.aiOpen ? '1' : '0');
}
function restoreAIState() {
  const saved = localStorage.getItem('ai_panel_open');
  // 默认打开（saved === null 表示首次访问）
  const shouldOpen = saved === null || saved === '1';
  if (shouldOpen) toggleAI(true);
}

// ===== AI Panel 拖拽调整宽度 =====
(function() {
  const panel = document.getElementById('ai-panel');
  const handle = document.getElementById('ai-resize-handle');
  if (!handle) return;
  let startX, startW;
  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    startX = e.clientX;
    startW = panel.offsetWidth;
    panel.classList.add('resizing');
    handle.classList.add('active');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  function onMove(e) {
    const diff = startX - e.clientX;
    // 上限放宽到视口 - 320px (留 56 侧边栏 + 最小 260 主内容)，下限 280px
    const newW = Math.min(Math.max(startW + diff, 280), window.innerWidth - 320);
    panel.style.width = newW + 'px';
    // 主内容区偏窄时自动折叠侧边栏 + 降 KPI 列数
    const sidebar = document.getElementById('sidebar');
    const sidebarW = sidebar && sidebar.classList.contains('collapsed') ? 56 : 220;
    const mainRemain = window.innerWidth - newW - sidebarW;
    const squeeze = mainRemain < 900;
    document.body.classList.toggle('ai-squeeze', squeeze);
    if (sidebar) sidebar.classList.toggle('collapsed', squeeze);
  }
  function onUp() {
    panel.classList.remove('resizing');
    handle.classList.remove('active');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
})();

function newAiConversation() {
  STATE.aiConvId = null;
  const container = document.getElementById('ai-messages');
  container.innerHTML = '<div class="ai-msg assistant"><div class="bubble">新对话已开启。有什么可以帮你的？</div></div>';
}

function aiQuick(text) {
  if (!STATE.aiOpen) toggleAI();
  document.getElementById('ai-input').value = text;
  aiSend();
}

// AI导航指令映射 — 自然语言→页面ID
const AI_NAV_MAP = [
  { keywords: ['运营总览','数据总览','dashboard','首页','大盘','概览'], page: 'dashboard.overview' },
  { keywords: ['geo','seo','搜索引擎','站外'], page: 'dashboard.geo' },
  { keywords: ['query分析','查询分析','query','热词','标注看板','数据标注','标注'], page: 'pipeline.annotate' },
  { keywords: ['客户行为','行为分析','漏斗','留存'], page: 'dashboard.behavior' },
  { keywords: ['统计分析','统计','数据统计'], page: 'pipeline.stats' },
  { keywords: ['口令过滤','过滤口令','去口令'], page: 'pipeline.filter' },
  { keywords: ['监控看板','监控','流水线','pipeline监控','流水线监控'], page: 'pipeline.monitor' },
];

function aiTryNavigate(text) {
  const lower = text.toLowerCase().trim();
  // 必须有明确的导航动词，或者消息极短（≤6字）且等于关键词
  const navMatch = lower.match(/^(?:打开|去|跳转到?|切换到?|进入|查看|show|open|goto|go to)\s*(.+)/);
  const target = navMatch ? navMatch[1].trim() : null;

  // 只有两种情况触发导航：
  // 1. 以导航动词开头（"打开skill管理"）
  // 2. 消息极短且整体就是一个页面名（"技能管理"、"订单"）
  const isShortNavOnly = !target && lower.length <= 6;
  const matchText = target || (isShortNavOnly ? lower : null);
  if (!matchText) return null;

  for (const rule of AI_NAV_MAP) {
    for (const kw of rule.keywords) {
      if (target ? matchText.includes(kw) : matchText === kw) {
        // pipeline 页面仅管理员可访问
        if (rule.page.startsWith('pipeline.') && !STATE.permissions.includes('*')) {
          return '⚠️ 数据流水线功能仅管理员可用';
        }
        switchPage(rule.page);
        const label = getPageLabel(rule.page);
        return `已为你打开 **${label}** 📂`;
      }
    }
  }
  return null;
}

function aiTryLocalCommand(text) {
  const lower = text.toLowerCase().trim();
  const isAdmin = STATE.permissions.includes('*');

  // 日期解析：昨天、近N天、近7天、近30天、本周、上周、本月、上月
  function parseDateRange(input) {
    const today = new Date(); today.setHours(0,0,0,0);
    const fmt = d => d.toISOString().slice(0,10);
    const m = input.match(/昨[天日]/); if (m) { const d = new Date(today-86400000); return {from:fmt(d),to:fmt(d),label:'昨天'}; }
    const m7 = input.match(/近\s*(\d+)\s*天/); if (m7) { const n=parseInt(m7[1]); return {from:fmt(new Date(today-n*86400000)),to:fmt(today),label:`近${n}天`}; }
    if (/近7天|7天/.test(input)) return {from:fmt(new Date(today-7*86400000)),to:fmt(today),label:'近7天'};
    if (/近30天|30天/.test(input)) return {from:fmt(new Date(today-30*86400000)),to:fmt(today),label:'近30天'};
    if (/本周/.test(input)) { const d=today.getDay()||7; return {from:fmt(new Date(today-(d-1)*86400000)),to:fmt(today),label:'本周'}; }
    if (/上周/.test(input)) { const d=today.getDay()||7; return {from:fmt(new Date(today-(d+6)*86400000)),to:fmt(new Date(today-d*86400000)),label:'上周'}; }
    if (/本月/.test(input)) { const y=today.getFullYear(),m=today.getMonth(); return {from:fmt(new Date(y,m,1)),to:fmt(today),label:'本月'}; }
    if (/上月/.test(input)) { const y=today.getFullYear(),m=today.getMonth(); return {from:fmt(new Date(y,m-1,1)),to:fmt(new Date(y,m,0)),label:'上月'}; }
    return null;
  }

  // ===== 帮我标注 / 开始标注 =====
  if (/^(帮我标注|开始标注|上传标注|标注文件)$/.test(lower)) {
    switchPage('pipeline.task');
    setTimeout(() => { const el = document.getElementById('task-upload'); if (el) el.click(); }, 300);
    return '📁 已打开标注页面，请选择要标注的文件';
  }

  // ===== 标注记录 / 标注历史 =====
  if (/^(标注记录|标注历史|标注任务)$/.test(lower)) {
    switchPage('pipeline.task');
    return '📋 已打开标注记录';
  }

  // ===== 导出数据 =====
  if (/^(导出|导出数据|下载|下载数据)$/.test(lower)) {
    return '请选择导出格式：\n- **标注明细** → 详细的每条query分类结果\n- **分类占比** → 一级分类分布统计\n- **三级分类** → 细分类别分布\n\n请在聊天中告诉我你要哪种格式，或直接在看板页面点击导出按钮。';
  }

  // ===== 二级分类 =====
  if (/^(二级分类|细分类别|意图分析)$/.test(lower)) {
    switchPage('pipeline.stats');
    setTimeout(() => { const el = document.getElementById('stats-upload'); if (el) el.click(); }, 300);
    return '📊 已打开二级分类分析页面，请上传已标注的文件';
  }

  // ===== 更新看板 / 刷新看板 =====
  if (/^(更新看板|刷新看板|刷新数据)$/.test(lower)) {
    if (!isAdmin) return '⚠️ 仅管理员可操作';
    if (typeof initDashboard === 'function') { initDashboard(); return '✅ 看板数据已刷新'; }
    return '⚠️ 当前不在看板页面，请先打开 Query 分析看板';
  }

  // ===== 启动流水线 =====
  if (/^(启动流水线|开始流水线|开启流水线)$/.test(lower)) {
    if (!isAdmin) return '⚠️ 仅管理员可操作';
    switchPage('pipeline.monitor');
    return '🚀 已打开流水线监控页面，请点击启动按钮';
  }

  // ===== 总结标注结果 =====
  if (/^(总结|总结标注|总结结果|总结标注结果)$/.test(lower)) {
    fetch('/api/pipeline/classify/tasks?user_id=' + (STATE.admin?.username || ''), { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        const tasks = data.tasks || [];
        const done = tasks.filter(t => t.status === 'done');
        if (done.length === 0) { addAiMessage('assistant', '暂无已完成的标注任务'); return; }
        const latest = done[0];
        fetch('/api/pipeline/classify/' + latest.task_id, { credentials: 'include' })
          .then(r => r.ok ? r.json() : Promise.reject(r))
          .then(task => {
            const r = task.result || {};
            let msg = `**最新标注结果** (${latest.filename})\n\n`;
            msg += `- 总条数：${r.total || '-'}\n`;
            msg += `- 意图不明：${r.unclear_count || 0}\n`;
            if (r.llm_fixed_count) msg += `- LLM 兜底修正：${r.llm_fixed_count}\n`;
            if (r.distribution) {
              msg += '\n**一级分类分布：**\n';
              for (const [k,v] of Object.entries(r.distribution).sort((a,b) => b[1]-a[1])) {
                const pct = ((v / r.total) * 100).toFixed(1);
                msg += `- ${k}：${v} (${pct}%)\n`;
              }
            }
            if (r.issues?.length) msg += `\n⚠️ 问题：${r.issues.join('、')}`;
            addAiMessage('assistant', msg);
          })
          .catch(() => addAiMessage('assistant', '获取标注详情失败'));
      })
      .catch(() => addAiMessage('assistant', '获取标注记录失败'));
    return '⏳ 正在获取最近标注结果...';
  }

  // ===== 日期+分析/分布/统计 =====
  const dateRange = parseDateRange(lower);
  if (dateRange && /(分析|分布|统计|query|数据)/.test(lower)) {
    const url = `/api/pipeline/stats/summary?from=${dateRange.from}&to=${dateRange.to}`;
    fetch(url, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        if (data.error) { addAiMessage('assistant', `⚠️ ${data.error}`); return; }
        let msg = `**${dateRange.label}统计** (${data.from} ~ ${data.to})\n\n`;
        msg += `- 总 Query：${data.total_queries || 0}\n`;
        msg += `- 总用户：${data.total_users || 0}\n`;
        msg += `- 统计天数：${data.days || 0}\n`;
        if (data.tag_dist && Object.keys(data.tag_dist).length) {
          msg += '\n**一级分类分布：**\n';
          for (const [k,v] of Object.entries(data.tag_dist).sort((a,b) => b[1]-a[1])) {
            msg += `- ${k}：${v}\n`;
          }
        }
        if (data.tag_dist_active && Object.keys(data.tag_dist_active).length) {
          msg += '\n**主动query分类：**\n';
          for (const [k,v] of Object.entries(data.tag_dist_active).sort((a,b) => b[1]-a[1])) {
            msg += `- ${k}：${v}\n`;
          }
        }
        addAiMessage('assistant', msg);
      })
      .catch(() => addAiMessage('assistant', '获取统计数据失败，可能暂无该时段数据'));
    return `⏳ 正在查询${dateRange.label}统计数据...`;
  }

  // ===== 热重载 =====
  if (['热重载', '重载规则', 'reload', '热加载', '重新加载规则'].includes(lower)) {
    if (!isAdmin) return '⚠️ 热重载仅管理员可用';
    fetch('/api/pipeline/classify/rules/status', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        const msg = data.files.map(f => `• \`${f.path}\` — 修改时间 ${f.mtime}`).join('\n');
        addAiMessage('assistant', `✅ 标注规则已就绪，下次标注将直接使用最新规则。\n\n规则文件：\n${msg}`);
      })
      .catch(() => {
        addAiMessage('assistant', '✅ 标注规则热重载完成。每次标注会从磁盘实时读取规则文件，修改后无需重启服务，下次标注自动生效。');
      });
    return '⏳ 正在检查规则文件...';
  }

  return null;
}

// ====== AI 文件拖拽/上传 ======
let _aiPendingFile = null; // { name, type, content, size }

function aiFileSelected(inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  _aiReadFile(file);
  inputEl.value = ''; // reset so same file can be re-selected
}

function _aiReadFile(file) {
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    addAiMessage('assistant', '文件过大（最大2MB），请压缩后重试');
    return;
  }
  const textTypes = ['.txt','.md','.csv','.json','.xml','.html','.js','.css','.log','.yaml','.yml','.sql','.ini','.conf','.sh','.py','.java','.ts','.tsx','.jsx'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  const isText = textTypes.includes(ext) || file.type.startsWith('text/') || file.type === 'application/json';

  if (isText) {
    const reader = new FileReader();
    reader.onload = () => {
      _aiPendingFile = { name: file.name, type: file.type || ext, content: reader.result, size: file.size };
      _aiShowFilePreview();
    };
    reader.readAsText(file);
  } else if (ext === '.xlsx' || ext === '.xls' || ext === '.docx' || ext === '.pdf') {
    // 二进制文件：上传到服务端解析
    const formData = new FormData();
    formData.append('file', file);
    addAiMessage('assistant', '正在解析文件...');
    fetch('/api/harness/upload', { method: 'POST', body: formData })
      .then(r => r.json()).then(data => {
        if (data.content) {
          _aiPendingFile = { name: file.name, type: ext, content: data.content, size: file.size };
          _aiShowFilePreview();
        } else {
          addAiMessage('assistant', '文件解析失败: ' + (data.error || '不支持的格式'));
        }
      }).catch(() => {
        addAiMessage('assistant', '文件上传失败，请稍后重试');
      });
  } else {
    addAiMessage('assistant', '暂不支持此文件格式，支持: txt/md/csv/json/xlsx/docx/pdf');
  }
}

function _aiShowFilePreview() {
  if (!_aiPendingFile) return;
  const preview = document.getElementById('ai-file-preview');
  const nameEl = document.getElementById('ai-file-name');
  const sizeKb = (_aiPendingFile.size / 1024).toFixed(1);
  nameEl.textContent = _aiPendingFile.name + ' (' + sizeKb + 'KB)';
  preview.style.display = 'flex';
}

function aiClearFile() {
  _aiPendingFile = null;
  const preview = document.getElementById('ai-file-preview');
  preview.style.display = 'none';
}

// 拖拽初始化（在页面加载后调用）
function _aiInitDragDrop() {
  const area = document.getElementById('ai-input-area');
  if (!area) return;
  ['dragenter','dragover'].forEach(ev => {
    area.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); area.style.borderColor = 'var(--primary)'; area.style.background = 'var(--primary-light)'; });
  });
  ['dragleave','drop'].forEach(ev => {
    area.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); area.style.borderColor = ''; area.style.background = ''; });
  });
  area.addEventListener('drop', e => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) _aiReadFile(file);
  });
}

function aiSend() {
  const input = document.getElementById('ai-input');
  const text = input.value.trim();
  if (!text && !_aiPendingFile) return;

  // 构建用户消息（含文件）
  let userMsg = text;
  let msgForApi = text;
  if (_aiPendingFile) {
    const fileInfo = '📎 ' + _aiPendingFile.name;
    userMsg = text ? fileInfo + '\n' + text : fileInfo;
    // 将文件内容拼到消息中给AI
    const truncContent = _aiPendingFile.content.length > 8000
      ? _aiPendingFile.content.slice(0, 8000) + '\n...(内容过长已截断)'
      : _aiPendingFile.content;
    msgForApi = `[用户上传了文件: ${_aiPendingFile.name}]\n\n--- 文件内容 ---\n${truncContent}\n--- 文件结束 ---\n\n${text || '请分析这个文件'}`;
  }

  addAiMessage('user', userMsg);
  input.value = '';
  aiClearFile();

  // 先尝试本地命令（热重载等）
  const localResult = aiTryLocalCommand(text);
  if (localResult) {
    addAiMessage('assistant', localResult);
    return;
  }

  // 再尝试本地导航指令
  const navResult = aiTryNavigate(text);
  if (navResult) {
    addAiMessage('assistant', navResult);
    return;
  }

  // Show typing
  const typing = document.createElement('div');
  typing.className = 'ai-typing';
  typing.textContent = '思考中...';
  document.getElementById('ai-messages').appendChild(typing);
  scrollAiToBottom();

  // 流式调用 Harness Chat API
  streamHarnessChat(msgForApi, typing);
}

async function streamHarnessChat(msgForApi, typingEl) {
  let streamMsgEl = null;
  let accumulated = '';
  let toolsUsed = [];

  const ensureMsgEl = () => {
    if (streamMsgEl) return streamMsgEl;
    if (typingEl) typingEl.remove();
    const container = document.getElementById('ai-messages');
    const div = document.createElement('div');
    div.className = 'ai-msg assistant';
    div.innerHTML = '<div class="bubble"></div>';
    container.appendChild(div);
    streamMsgEl = div.querySelector('.bubble');
    return streamMsgEl;
  };

  const render = () => {
    if (!streamMsgEl) return;
    let text = accumulated;
    if (toolsUsed.length) text += '\n\n🔧 调用了: ' + toolsUsed.join(', ');
    streamMsgEl.innerHTML = renderAiMarkdown(text);
    scrollAiToBottom();
  };

  try {
    const resp = await fetch('/api/harness/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: msgForApi,
        convId: STATE.aiConvId,
        currentPage: STATE.currentPage,
        stream: true
      })
    });

    if (!resp.ok || !resp.body) {
      typingEl && typingEl.remove();
      addAiMessage('assistant', '请求失败: HTTP ' + resp.status);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop();
      for (const evt of events) {
        const line = evt.split('\n').find(l => l.startsWith('data:'));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        let obj;
        try { obj = JSON.parse(payload); } catch { continue; }

        if (obj.type === 'start') {
          if (obj.convId) STATE.aiConvId = obj.convId;
        } else if (obj.type === 'tools') {
          toolsUsed = obj.tools || [];
          // 工具调用中，更新 typing 提示
          if (typingEl && !streamMsgEl) typingEl.textContent = '🔧 执行 ' + toolsUsed.join(', ') + '...';
        } else if (obj.type === 'delta') {
          ensureMsgEl();
          accumulated += obj.text || '';
          render();
        } else if (obj.type === 'done') {
          if (obj.toolsUsed && obj.toolsUsed.length) {
            toolsUsed = obj.toolsUsed;
            render();
            _aiAutoRefreshPage(toolsUsed);
          }
          // 检查AI回复中是否包含导航指令标记
          const aiNavMatch = accumulated.match(/\[NAV:([^\]]+)\]/);
          if (aiNavMatch) {
            const pageId = aiNavMatch[1].trim();
            accumulated = accumulated.replace(/\[NAV:[^\]]+\]/, '');
            if (streamMsgEl) streamMsgEl.innerHTML = renderAiMarkdown(accumulated + (toolsUsed.length ? '\n\n🔧 调用了: ' + toolsUsed.join(', ') : ''));
            switchPage(pageId);
          }
        } else if (obj.type === 'error') {
          ensureMsgEl();
          accumulated += '\n\n⚠️ ' + obj.message;
          render();
        }
      }
    }
    if (typingEl) typingEl.remove();
    if (!streamMsgEl) {
      // 整个流没有任何 delta
      addAiMessage('assistant', '（无响应）');
    }
  } catch (err) {
    if (typingEl) typingEl.remove();
    if (streamMsgEl) {
      accumulated += '\n\n⚠️ 连接中断: ' + err.message;
      render();
    } else {
      addAiMessage('assistant', '请求失败: ' + err.message);
    }
  }
}

// AI执行操作后自动刷新对应页面
function _aiAutoRefreshPage(toolsUsed) {
  const refreshMap = {
    'product_create': 'ecommerce.products',
    'marketing_create': 'marketing.tasks',
    'knowledge_create': 'content.knowledge',
    'page_navigate': null // 导航不需要刷新
  };
  for (const tool of toolsUsed) {
    const pageId = refreshMap[tool];
    if (pageId && STATE.currentPage === pageId) {
      setTimeout(() => switchPage(pageId), 500); // 延迟刷新让数据落库
    }
  }
}

function addAiMessage(role, text) {
  const container = document.getElementById('ai-messages');
  const div = document.createElement('div');
  div.className = 'ai-msg ' + role;
  if (role === 'assistant') {
    div.innerHTML = `<div class="bubble">${renderAiMarkdown(text)}</div>`;
  } else {
    div.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
  }
  container.appendChild(div);
  scrollAiToBottom();
}

function scrollAiToBottom() {
  const el = document.getElementById('ai-messages');
  el.scrollTop = el.scrollHeight;
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function renderAiMarkdown(text) {
  // 先安全转义
  let s = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // 工具调用标签提取
  let toolTag = '';
  s = s.replace(/\n*🔧 调用了: (.+)$/m, (_, tools) => {
    toolTag = `<div class="ai-tool-tag">🔧 ${tools}</div>`;
    return '';
  });

  // 标题 ### / ##
  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.+)$/gm, '<h3>$1</h3>');

  // 加粗 **text** 和 emoji标题行（如 ✅ **xxx**）
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // 行内代码
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 链接 [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // 分隔线
  s = s.replace(/^---$/gm, '<hr>');

  // 卡片块识别：数字编号+加粗标题+内容（如 "1. **《xxx》**\n- 内容：...\n- 链接：..."）
  s = s.replace(/(\d+)\.\s*<strong>(.+?)<\/strong>\s*\n((?:[-–]\s*.+\n?)+)/g, (_, num, title, body) => {
    const lines = body.trim().split('\n').map(l => l.replace(/^[-–]\s*/, '').trim()).filter(Boolean);
    const desc = lines.map(l => {
      // 如果有链接，提取
      if (l.includes('<a ')) return l;
      return `<div>${l}</div>`;
    }).join('');
    const icon = title.includes('指南') ? '📘' : title.includes('安全') ? '🔒' : title.includes('设置') ? '⚙️' : title.includes('导出') ? '📥' : title.includes('商品') ? '📦' : title.includes('知识') ? '📚' : title.includes('营销') ? '📣' : '📄';
    return `<div class="ai-card"><div class="card-icon">${icon}</div><div class="card-body"><div class="card-title">${num}. ${title}</div><div class="card-desc">${desc}</div></div></div>`;
  });

  // Markdown 表格渲染
  s = s.replace(/((?:^[ \t]*\|.+\|[ \t]*\n?){2,})/gm, (tableBlock) => {
    const rows = tableBlock.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return tableBlock;
    // 检测分隔行 |---|---|
    const sepIdx = rows.findIndex(r => /^\s*\|[\s\-:]+\|/.test(r) && r.replace(/[\s|:\-]/g, '') === '');
    const headerRow = sepIdx > 0 ? rows[sepIdx - 1] : rows[0];
    const dataRows = sepIdx >= 0 ? rows.filter((_, i) => i !== sepIdx && i !== sepIdx - 1) : rows.slice(1);
    const parseCells = r => r.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
    const thCells = parseCells(headerRow);
    let html = '<table style="width:100%;font-size:12px;margin:8px 0;border-collapse:collapse">';
    if (sepIdx >= 0) {
      html += '<tr>' + thCells.map(c => `<th style="padding:6px 8px;border-bottom:2px solid var(--border);text-align:left;font-weight:600;white-space:nowrap">${c}</th>`).join('') + '</tr>';
    } else {
      // 无分隔行，第一行也当数据
      dataRows.unshift(headerRow);
    }
    dataRows.forEach(r => {
      const cells = parseCells(r);
      html += '<tr>' + cells.map(c => `<td style="padding:5px 8px;border-bottom:1px solid var(--border-light)">${c}</td>`).join('') + '</tr>';
    });
    html += '</table>';
    return html;
  });

  // 追问/建议按钮：以 - 开头、以 ？/? 结尾的 bullet 变成可点击按钮
  s = s.replace(/^[-•]\s+(.+[？?])\s*$/gm, (_, q) => {
    // 去掉前导 emoji / 加粗标签，保留纯文本用于发送
    const plain = q.replace(/<strong>|<\/strong>/g,'').replace(/^\s*[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}📥📊🔍📦📚📣📘🔒⚙️📄]+\s*/u,'').trim();
    const escQ = plain.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    return `<button class="ai-suggest-btn" onclick="aiQuick('${escQ}')">${q}</button>`;
  });

  // 普通列表 - xxx
  s = s.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
  s = s.replace(/((?:<li>.+<\/li>\n?)+)/g, '<ul>$1</ul>');

  // emoji 标题行（✅ / 📦 / 🔍 等开头的行）变成小标题
  s = s.replace(/^([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}✅❌⚠️🔍📦📚📣📊🧠💡🔧📥📘🔒⚙️]+)\s*<strong>(.+?)<\/strong>/gmu, '<h3>$1 $2</h3>');

  // 换行
  s = s.replace(/\n/g, '<br>');
  // 清理多余br
  s = s.replace(/(<\/h3>)<br>/g, '$1');
  s = s.replace(/(<\/ul>)<br>/g, '$1');
  s = s.replace(/(<hr>)<br>/g, '$1');
  s = s.replace(/(<\/table>)<br>/g, '$1');
  s = s.replace(/(<\/div><\/div><\/div>)<br>/g, '$1');
  s = s.replace(/<br><br><br>/g, '<br>');

  return s + toolTag;
}

// AI input: Enter to send, Shift+Enter for new line
document.getElementById('ai-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    aiSend();
  }
});
