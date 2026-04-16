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
  { keywords: ['query分析','查询分析','query','热词'], page: 'dashboard.query' },
  { keywords: ['客户行为','行为分析','漏斗','留存'], page: 'dashboard.behavior' },
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
        switchPage(rule.page);
        const label = getPageLabel(rule.page);
        return `已为你打开 **${label}** 📂`;
      }
    }
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

  // 先尝试本地导航指令
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
