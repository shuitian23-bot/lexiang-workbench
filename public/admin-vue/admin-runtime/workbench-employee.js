// ===== 企业认证管理函数 =====
let certUsersPageSize = 20;
let currentReviewUid = null;

async function loadCertOverview() {
  try {
    // 获取统计数据（示例）
    document.getElementById('stat-total-certs').textContent = '1,247';
    document.getElementById('stat-today-certs').textContent = '12';
    document.getElementById('stat-pending').textContent = '8';
    document.getElementById('stat-rejected').textContent = '3';

    // 获取待审核任务 - 示例数据
    const tbody = document.getElementById('pending-tasks-tbody');
    tbody.innerHTML = `
      <tr style="border-bottom:1px solid var(--border-light);">
        <td style="padding:12px 0;">张三</td>
        <td style="padding:12px 0;">基础认证</td>
        <td style="padding:12px 0;">联想集团</td>
        <td style="padding:12px 0;">2026-04-14</td>
        <td style="padding:12px 0;">
          <button class="btn btn-sm btn-primary" onclick="switchPage('certify.review'); loadCertReview(1)" style="padding:4px 12px; font-size:12px;">审核</button>
        </td>
      </tr>
      <tr style="border-bottom:1px solid var(--border-light);">
        <td style="padding:12px 0;">李四</td>
        <td style="padding:12px 0;">基础认证</td>
        <td style="padding:12px 0;">联想集团</td>
        <td style="padding:12px 0;">2026-04-13</td>
        <td style="padding:12px 0;">
          <button class="btn btn-sm btn-primary" onclick="switchPage('certify.review'); loadCertReview(2)" style="padding:4px 12px; font-size:12px;">审核</button>
        </td>
      </tr>
    `;
  } catch (e) {
    console.error('加载认证概览失败:', e);
  }
}

async function loadCertUsers(page = 1) {
  try {
    const name = document.getElementById('cert-search-name')?.value || '';
    const idNo = document.getElementById('cert-search-id')?.value || '';
    const status = document.getElementById('cert-search-status')?.value || '';

    // 示例数据
    const tbody = document.getElementById('cert-users-tbody');
    tbody.innerHTML = `
      <tr style="border-bottom:1px solid var(--border-light);">
        <td style="padding:12px 0;">张三</td>
        <td style="padding:12px 0; font-family:monospace; font-size:12px;">*****0001</td>
        <td style="padding:12px 0;">联想集团</td>
        <td style="padding:12px 0;">
          <span style="padding:4px 8px; border-radius:3px; font-size:11px; background:var(--green-light); color:var(--green);">基础</span>
        </td>
        <td style="padding:12px 0;">2</td>
        <td style="padding:12px 0;">2026-04-14</td>
        <td style="padding:12px 0;">
          <button class="btn btn-sm btn-secondary" onclick="switchPage('certify.review'); loadCertReview(1)" style="padding:4px 12px; font-size:12px;">详情</button>
        </td>
      </tr>
      <tr style="border-bottom:1px solid var(--border-light);">
        <td style="padding:12px 0;">李四</td>
        <td style="padding:12px 0; font-family:monospace; font-size:12px;">*****0002</td>
        <td style="padding:12px 0;">联想集团</td>
        <td style="padding:12px 0;">
          <span style="padding:4px 8px; border-radius:3px; font-size:11px; background:var(--green-light); color:var(--green);">基础</span>
        </td>
        <td style="padding:12px 0;">1</td>
        <td style="padding:12px 0;">2026-04-10</td>
        <td style="padding:12px 0;">
          <button class="btn btn-sm btn-secondary" onclick="switchPage('certify.review'); loadCertReview(2)" style="padding:4px 12px; font-size:12px;">详情</button>
        </td>
      </tr>
    `;

    document.getElementById('cert-total-count').textContent = '2';
    document.getElementById('cert-current-page').textContent = page;
  } catch (e) {
    console.error('加载用户列表失败:', e);
  }
}

async function loadCertReview(uid) {
  currentReviewUid = uid;
  try {
    // 示例数据
    const users = {
      1: {
        real_name: '张三',
        status: 'basic-certified',
        email: 'zhangsan@lenovo.com',
        phone: '138****0001',
        first_cert_date: '2026-03-14',
        realname_auth: {
          name: '张三',
          id_no: '110102199001011234',
          phone: '13800000001',
          created_at: '2026-04-14'
        },
        employee_auth: {
          company: '联想集团',
          position: '软件工程师',
          industry: '互联网/信息技术',
          created_at: '2026-04-14'
        }
      },
      2: {
        real_name: '李四',
        status: 'basic-certified',
        email: 'lisi@lenovo.com',
        phone: '138****0002',
        first_cert_date: '2026-02-10',
        realname_auth: {
          name: '李四',
          id_no: '110102199201015678',
          phone: '13800000002',
          created_at: '2026-04-13'
        },
        employee_auth: {
          company: '联想集团',
          position: '产品经理',
          industry: '互联网/信息技术',
          created_at: '2026-04-13'
        }
      }
    };

    const data = users[uid] || users[1];

    document.getElementById('review-user-name').textContent = data.real_name;
    document.getElementById('review-user-status').textContent = '基础认证';
    document.getElementById('review-user-id').textContent = (data.realname_auth?.id_no || '').slice(-6).padStart(18, '*');
    document.getElementById('review-user-email').textContent = data.email;
    document.getElementById('review-user-phone').textContent = data.phone;
    document.getElementById('review-user-first-cert').textContent =
      data.first_cert_date ? new Date(data.first_cert_date).toLocaleDateString() : '-';

    if (data.realname_auth) {
      document.getElementById('review-realname-name').textContent = data.realname_auth.name;
      document.getElementById('review-realname-idno').textContent = data.realname_auth.id_no;
      document.getElementById('review-realname-phone').textContent = data.realname_auth.phone;
      document.getElementById('review-realname-time').textContent =
        new Date(data.realname_auth.created_at).toLocaleDateString();
    }

    if (data.employee_auth) {
      document.getElementById('review-employee-company').textContent = data.employee_auth.company;
      document.getElementById('review-employee-position').textContent = data.employee_auth.position;
      document.getElementById('review-employee-industry').textContent = data.employee_auth.industry;
      document.getElementById('review-employee-time').textContent =
        new Date(data.employee_auth.created_at).toLocaleDateString();
    }

    document.getElementById('review-history').innerHTML =
      '<div style="color:var(--text-tertiary); font-size:12px; text-align:center; padding:20px;">暂无审核历史</div>';

  } catch (e) {
    console.error('加载审核数据失败:', e);
    alert('加载失败：' + e.message);
  }
}

async function loadCertHistory() {
  const timeline = document.getElementById('history-timeline');
  timeline.innerHTML = `
    <div style="color:var(--text-secondary); text-align:center; padding:40px;">
      认证历史功能开发中，请通过右侧 AI 助手查询
    </div>
  `;
}

async function approveCert() {
  if (!currentReviewUid) { alert('请先选择用户'); return; }
  const remark = document.getElementById('review-remark').value;
  alert('✓ 认证已批准');
  loadCertOverview();
}

async function rejectCert() {
  if (!currentReviewUid) { alert('请先选择用户'); return; }
  const remark = document.getElementById('review-remark').value || '不符合认证要求';
  alert('✓ 认证已驳回');
  loadCertOverview();
}

async function requestRevision() {
  if (!currentReviewUid) { alert('请先选择用户'); return; }
  const remark = document.getElementById('review-remark').value || '请修改后重新提交';
  alert('✓ 已通知用户修改');
}

async function exportCertUsers() {
  await aiQuick('导出所有认证用户的信息为CSV文件');
}

async function exportCertHistory() {
  await aiQuick('导出认证历史数据');
}

// ===== 员工管理数据加载函数 =====

async function loadEmployeeList(page = 1) {
  const nameFilter = document.getElementById('emp-search-name')?.value || '';
  const positionFilter = (document.getElementById('emp-search-position')?.value || '').toLowerCase();
  const companyFilter = (document.getElementById('emp-search-company')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('emp-search-status')?.value || '';
  const dateStart = document.getElementById('emp-date-start')?.value || '';
  const dateEnd = document.getElementById('emp-date-end')?.value || '';

  try {
    // 使用完整演示数据
    const allEmployees = generateEmployeeData();

    // 应用过滤
    let filtered = allEmployees;

    if (nameFilter) {
      filtered = filtered.filter(e => e.real_name.includes(nameFilter));
    }
    if (positionFilter) {
      filtered = filtered.filter(e => (e.position || '').toLowerCase().includes(positionFilter));
    }
    if (companyFilter) {
      filtered = filtered.filter(e => (e.company || '').toLowerCase().includes(companyFilter));
    }
    if (statusFilter && statusFilter !== '') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }
    if (dateStart) {
      filtered = filtered.filter(e => (e.cert_time || '').substring(0, 10) >= dateStart);
    }
    if (dateEnd) {
      filtered = filtered.filter(e => (e.cert_time || '').substring(0, 10) <= dateEnd);
    }

    // 分页
    const pageSize = 20;
    const totalPages = Math.ceil(filtered.length / pageSize) || 1;

    // 检查页码是否有效
    if (page > totalPages && totalPages > 0) {
      page = totalPages;
    } else if (page < 1) {
      page = 1;
    }

    const startIdx = (page - 1) * pageSize;
    const paginatedData = filtered.slice(startIdx, startIdx + pageSize);

    const tbody = document.getElementById('emp-list-tbody');
    if (!paginatedData || paginatedData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="13" class="table-empty-cell">暂无员工数据</td></tr>';
      document.getElementById('emp-total-count').textContent = '0';
      document.getElementById('emp-current-page').textContent = '1';
      return;
    }

    tbody.innerHTML = paginatedData.map(emp => renderEmployeeRow(emp)).join('');

    document.getElementById('emp-total-count').textContent = filtered.length;
    document.getElementById('emp-current-page').textContent = page;
    document.getElementById('emp-total-pages').textContent = totalPages || 1;

    // 更新分页按钮状态
    const prevBtn = document.getElementById('emp-prev-btn');
    const nextBtn = document.getElementById('emp-next-btn');
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;

  } catch (e) {
    console.error('✗ 加载员工列表失败:', e);
    const tbody = document.getElementById('emp-list-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="13" class="table-empty-cell error">加载失败: ${e.message || '未知错误'}</td></tr>`;
  }
}

// ===== 统一表格行渲染函数 =====
function renderEmployeeRow(emp) {
  const statusClass = emp.status === 'approved' ? 'success' : emp.status === 'pending' ? 'warning' : 'danger';
  return `
    <tr class="employee-table-row" onclick="showEmpDetail('${emp.account || ''}')">
      <td class="check-col"><input type="checkbox"/></td>
      <td class="mono-cell">${emp.account || '-'}</td>
      <td>${emp.real_name || '-'}</td>
      <td>${emp.lenovo_id || '-'}</td>
      <td>${emp.phone || '-'}</td>
      <td>${emp.position || '-'}</td>
      <td>${emp.company || '-'}</td>
      <td>
        <span class="status-pill primary">
          ${emp.dept_status || '-'}
        </span>
      </td>
      <td>${emp.material_method || '-'}</td>
      <td>${emp.cert_time || '-'}</td>
      <td>
        <span class="status-pill ${statusClass}">
          ${emp.current_status || '-'}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="showEmployeeDetail('${emp.account}')">查看详情</button>
      </td>
    </tr>
  `;
}

function showEmployeeDetail(account) {
  // 找到该员工的数据
  const allEmployees = generateEmployeeData();
  const emp = allEmployees.find(e => e.account === account);
  if (!emp) {
    alert('员工数据不存在');
    return;
  }

  // 存储当前员工数据到全局变量，供详情页面使用
  window.currentEmployee = emp;

  // 切换到详情页面
  switchPage('employee.detail');
}

// ===== 认证审核页面函数 =====
let currentCertTab = 'rejected';
let currentCertPage = 1;

const CERTIFICATION_REJECTED_FEATURED = [
  { id: '2142', applicant: '张建宏', method: 'other', company: '山西华远陆港铁路投资有限公司', position: '项目经理', created_at: '2026-07-15 06:57:55.175', fail_reason: '认证材料关键信息不完整' },
  { id: '2122', applicant: '廖俊斌', method: 'other', company: '成都恒德智能科技有限公司', position: '技术经理', created_at: '2026-07-12 18:24:09.583', fail_reason: '认证材料清晰度不足' },
  { id: '2121', applicant: '廖俊斌', method: 'other', company: '成都尚光电子有限公司', position: '技术经理', created_at: '2026-07-12 18:22:40.086', fail_reason: '认证材料关键信息不完整' },
  { id: '2120', applicant: '廖俊斌', method: 'other', company: '成都尚光电子有限公司', position: '技术经理', created_at: '2026-07-12 18:20:46.449', fail_reason: '企业名称与提交信息不一致' },
  { id: '2119', applicant: '廖俊斌', method: 'other', company: '成都尚光电子有限公司', position: '技术经理', created_at: '2026-07-12 18:17:34.15', fail_reason: '认证材料已过有效期' },
  { id: '2109', applicant: '刘畅', method: 'contract', company: '德勤管理咨询（上海）有限公司', position: '咨询顾问', created_at: '2026-07-11 22:29:42.063', fail_reason: '劳动合同签章页不完整' },
  { id: '2104', applicant: '于尧', method: 'other', company: '上海市水利工程设计研究院有限公司', position: '工程师', created_at: '2026-07-11 13:15:19.009', fail_reason: '认证材料清晰度不足' },
  { id: '2103', applicant: '于尧', method: 'other', company: '上海市水利工程设计研究院有限公司', position: '工程师', created_at: '2026-07-11 13:14:30.907', fail_reason: '认证材料关键信息不完整' },
  { id: '2102', applicant: '于尧', method: 'other', company: '上海市水利工程设计研究院有限公司', position: '工程师', created_at: '2026-07-11 13:13:35.941', fail_reason: '企业名称与提交信息不一致' },
  { id: '2099', applicant: '刘洋', method: 'other', company: '天津市津南区辛庄镇党群服务中心（天津市津南区辛庄镇综合便民服务中心）', position: '综合管理', created_at: '2026-07-10 22:01:49.832', fail_reason: '认证材料缺少有效签章' },
  { id: '2098', applicant: '范子润', method: 'contract', company: '河南坤辰建筑工程有限公司', position: '项目专员', created_at: '2026-07-10 21:48:01.1', fail_reason: '劳动合同关键信息缺失' },
  { id: '2096', applicant: '李沁勋', method: 'other', company: '青岛蓝色基点电子商务有限公司', position: '运营专员', created_at: '2026-07-10 18:24:12.88', fail_reason: '认证材料清晰度不足' },
  { id: '2095', applicant: '黄楷文', method: 'other', company: '中国铁路上海局集团有限公司南京房建公寓段', position: '工程师', created_at: '2026-07-10 15:24:51.711', fail_reason: '认证材料已过有效期' },
  { id: '2090', applicant: '叶德龙', method: 'other', company: '温州喜穗达进出口有限公司', position: '业务经理', created_at: '2026-07-10 11:08:15.54', fail_reason: '企业名称与提交信息不一致' }
];

const CERTIFICATION_METHOD_QUOTAS = {
  rejected: { email: 65, contract: 22, other: 220 },
  approved: { email: 430, contract: 190, other: 1098 },
  pending: { email: 19, contract: 18, other: 82 },
  expired: { email: 0, contract: 0, other: 0 }
};

const CERTIFICATION_DEMO_NAMES = ['王晨', '李思远', '陈嘉怡', '赵子涵', '周明宇', '吴雨桐', '孙嘉诚', '郑欣怡', '冯绍杰', '何静'];
const CERTIFICATION_DEMO_COMPANIES = [
  '联想（北京）有限公司',
  '上海智联科技有限公司',
  '深圳市创新电子有限公司',
  '杭州云启信息技术有限公司',
  '苏州工业园区建设发展有限公司',
  '北京数字未来科技有限公司'
];
const CERTIFICATION_DEMO_POSITIONS = ['产品经理', '工程师', '运营专员', '销售经理', '项目经理', '综合管理'];

function formatCertificationDemoTime(index, status) {
  const baseDay = status === 'approved' ? 9 : status === 'pending' ? 15 : 10;
  const baseTime = Date.UTC(2026, 6, baseDay, 10, 0, 0);
  const date = new Date(baseTime - index * 47 * 60 * 1000);
  const pad = value => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function buildCertificationStatusRecords(status, idStart) {
  const featured = status === 'rejected'
    ? CERTIFICATION_REJECTED_FEATURED.map(record => ({ ...record, status, source: 'online' }))
    : [];
  const existingMethods = featured.reduce((counts, record) => {
    counts[record.method] = (counts[record.method] || 0) + 1;
    return counts;
  }, {});
  const records = [...featured];

  Object.entries(CERTIFICATION_METHOD_QUOTAS[status]).forEach(([method, quota]) => {
    const remaining = Math.max(0, quota - (existingMethods[method] || 0));
    for (let index = 0; index < remaining; index += 1) {
      const sequence = records.length;
      records.push({
        id: String(idStart - sequence),
        applicant: CERTIFICATION_DEMO_NAMES[sequence % CERTIFICATION_DEMO_NAMES.length],
        method,
        company: CERTIFICATION_DEMO_COMPANIES[sequence % CERTIFICATION_DEMO_COMPANIES.length],
        position: CERTIFICATION_DEMO_POSITIONS[sequence % CERTIFICATION_DEMO_POSITIONS.length],
        created_at: formatCertificationDemoTime(sequence, status),
        status,
        source: sequence % 5 === 0 ? 'offline' : 'online',
        fail_reason: status === 'rejected' ? '认证材料未通过自动校验' : ''
      });
    }
  });

  return records;
}

function buildCertificationDemoData() {
  return [
    ...buildCertificationStatusRecords('rejected', 2089),
    ...buildCertificationStatusRecords('approved', 5000),
    ...buildCertificationStatusRecords('pending', 8000)
  ];
}

function switchCertTab(status, btn) {
  currentCertTab = status;
  currentCertPage = 1;

  // 更新标签页按钮状态，视觉样式交给 CSS，避免内联样式覆盖设计规范。
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
  });
  btn.classList.add('active');

  // 重新加载表格
  loadCertificationTable(1);
}

function loadCertificationTable(page = 1) {
  currentCertPage = page || 1;
  const searchNo = document.getElementById('cert-search-no')?.value?.trim().toLowerCase() || '';
  const searchCompany = document.getElementById('cert-search-company')?.value?.trim().toLowerCase() || '';
  const searchPosition = document.getElementById('cert-search-position')?.value?.trim().toLowerCase() || '';
  const searchMethod = document.getElementById('cert-search-method')?.value || '';
  const searchSource = document.getElementById('cert-search-source')?.value || '';

  try {
    const allCertifications = buildCertificationDemoData();
    window.certificationDemoRecords = allCertifications;

    // 筛选
    let filtered = allCertifications.filter(c => c.status === currentCertTab);

    if (searchNo) {
      filtered = filtered.filter(c => c.id.toLowerCase().includes(searchNo) || c.applicant.toLowerCase().includes(searchNo));
    }
    if (searchCompany) {
      filtered = filtered.filter(c => c.company.toLowerCase().includes(searchCompany));
    }
    if (searchPosition) {
      filtered = filtered.filter(c => c.position.toLowerCase().includes(searchPosition));
    }
    if (searchMethod) {
      filtered = filtered.filter(c => c.method === searchMethod);
    }
    if (searchSource) {
      filtered = filtered.filter(c => c.source === searchSource);
    }
    // 分页
    const pageSize = 20;
    const totalPages = Math.ceil(filtered.length / pageSize);
    const actualPage = Math.min(page, totalPages || 1);
    const startIdx = (actualPage - 1) * pageSize;
    const paginatedData = filtered.slice(startIdx, startIdx + pageSize);

    // 渲染表格
    const tbody = document.getElementById('cert-list-tbody');
    if (!paginatedData || paginatedData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="table-empty-cell">暂无数据</td></tr>';
      document.getElementById('cert-total-count').textContent = '0';
      document.getElementById('cert-current-page').textContent = '1';
      document.getElementById('cert-total-pages').textContent = '1';
      return;
    }

    const statusLabels = { approved: '认证成功', rejected: '认证失败', pending: '待审核', expired: '已失效' };
    const statusClasses = { approved: 'success', rejected: 'danger', pending: 'warning', expired: 'muted' };

    tbody.innerHTML = paginatedData.map(cert => `
      <tr class="employee-table-row" onclick="showCertDetail('${cert.id}')">
        <td class="check-col"><input type="checkbox"/></td>
        <td class="mono-cell">${cert.id}</td>
        <td>${cert.applicant}</td>
        <td>
          <span class="status-pill ${cert.method === 'tax' ? 'purple' : cert.method === 'contract' ? 'success' : cert.method === 'email' ? 'primary' : 'muted'}">
            ${cert.method === 'email' ? '企业邮箱' : cert.method === 'contract' ? '劳动合同' : cert.method === 'tax' ? '个人所得税' : '其他材料'}
          </span>
        </td>
        <td>${cert.company || '-'}</td>
        <td>${cert.created_at}</td>
        <td>
          <span class="status-pill ${statusClasses[cert.status] || 'muted'}">
            ${statusLabels[cert.status] || '-'}
          </span>
        </td>
        <td>
          ${cert.status === 'rejected'
            ? `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); showCertDetailPage(this, '${cert.id}')">修改状态</button>`
            : `<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); viewCertFromList(this, '${cert.applicant}')">查看</button>`
          }
        </td>
      </tr>
    `).join('');

    // 更新分页信息
    document.getElementById('cert-total-count').textContent = filtered.length;
    document.getElementById('cert-current-page').textContent = actualPage;
    document.getElementById('cert-total-pages').textContent = totalPages;
    document.getElementById('cert-page-input').value = actualPage;

  } catch (e) {
    console.error('加载认证列表失败:', e);
  }
}

function goToCertPage() {
  const pageInput = document.getElementById('cert-page-input')?.value;
  if (pageInput && !isNaN(pageInput)) {
    loadCertificationTable(parseInt(pageInput));
  }
}

function showCertDetailPage(btn, certId) {
  // 使用列表同一条数据打开详情，确保认证方式和企业信息保持一致。
  try {
    const row = btn.closest('tr');
    const tds = row.querySelectorAll('td');
    const record = window.certificationDemoRecords?.find(item => item.id === certId);
    const applicantName = record?.applicant || tds[2]?.textContent?.trim() || '-';

    const cert = {
      ...record,
      id: certId,
      applicant: applicantName,
      applicant_name: applicantName,
      nickname: `user${certId}`,
      method: record?.method || 'other',
      method_label: tds[3]?.textContent?.trim() || '企业邮箱',
      company: record?.company || tds[4]?.textContent?.trim() || '-',
      created_at: record?.created_at || tds[5]?.textContent?.trim() || '-',
      status: 'rejected',
      cert_type: '认证失败',
      real_name: applicantName,
      position: record?.position || '职员',
      lenovo_id: `L${certId.replace(/\D/g, '').slice(-8).padStart(8, '0')}`
    };

    window.currentCertification = cert;
    switchPage('employee.cert-detail');
  } catch (e) {
    console.error('打开认证详情失败:', e);
    alert('打开详情页面失败');
  }
}

function viewCertFromList(btn, applicant) {
  // 从已通过/已拒绝列表查看员工详情页面
  try {
    // 从申请人信息中提取账号（user后面的数字）
    const match = applicant.match(/\(user(\d+)\)/);
    const userNum = match ? match[1] : '001';

    // 生成员工数据并查找
    const allEmployees = generateEmployeeData();
    let emp = allEmployees.find(e => e.account.includes(userNum));

    // 如果没找到，就用申请人名字查找
    if (!emp) {
      const name = applicant.split('(')[0].trim();
      emp = allEmployees.find(e => e.real_name === name);
    }

    if (!emp) {
      // 如果还是找不到，创建一个虚拟员工对象
      emp = {
        account: 'user' + userNum,
        real_name: applicant.split('(')[0].trim(),
        lenovo_id: 'L' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
        is_realname: '✓ 已认证',
        dept_status: '职员',
        company_name: '联想（北京）有限公司',
        position: '产品经理',
        email: applicant.split('(')[0].toLowerCase() + '@lenovo.com',
        phone: '130' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
        gender: '男',
        birthday: '1990-05-15',
        address: '北京市朝阳区',
        register_time: '2022-07-19 17:28:40',
        user_type: '企业用户',
        member_level: '白银会员',
        activation_status: '已激活',
        vip_status: '否',
        cert_method: '企业邮箱',
        cert_start_date: '2024-01-15',
        cert_end_date: '2025-01-15',
        cert_materials: ['劳动合同', '在职证明'],
        cert_verified: '已验证'
      };
    }

    window.currentEmployee = emp;
    switchPage('employee.detail');
  } catch (e) {
    console.error('打开员工详情失败:', e);
    alert('打开详情页面失败');
  }
}

function submitCertReview(certId) {
  try {
    const remark = document.getElementById('cert-review-remark')?.value || '';
    if (!remark.trim()) {
      alert('请填写操作备注');
      return;
    }

    alert(`✓ 认证状态已变更为"认证成功"\n申请编号: ${certId}\n操作备注: ${remark}`);

    switchPage('employee.certification');
    setTimeout(() => loadCertificationTable(1), 100);
  } catch (e) {
    console.error('提交失败:', e);
    alert('操作失败：' + e.message);
  }
}

function showCertDetail(certId) {
  // 显示审核详情面板
  console.log('显示认证详情:', certId);
  const card = document.getElementById('cert-detail-card');
  const cert = window.certificationDemoRecords?.find(item => item.id === certId);
  const methodLabel = cert?.method === 'email' ? '企业邮箱' : cert?.method === 'contract' ? '劳动合同' : cert?.method === 'tax' ? '个人所得税' : '其他材料';
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">审核详情 - ${certId}</span>
    </div>
    <div style="padding:20px;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
        <div>
          <div style="color:var(--text-secondary); font-size:12px; margin-bottom:4px;">申请编号</div>
          <div style="font-weight:600;">${certId}</div>
        </div>
        <div>
          <div style="color:var(--text-secondary); font-size:12px; margin-bottom:4px;">申请人</div>
          <div>${cert?.applicant || '-'}</div>
        </div>
        <div>
          <div style="color:var(--text-secondary); font-size:12px; margin-bottom:4px;">认证方式</div>
          <div>${methodLabel}</div>
        </div>
        <div>
          <div style="color:var(--text-secondary); font-size:12px; margin-bottom:4px;">企业名称</div>
          <div>${cert?.company || '-'}</div>
        </div>
      </div>
      <div style="border-top:1px solid var(--border); padding-top:16px; margin-bottom:20px;">
        <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">审核意见</div>
        <textarea style="width:100%; height:80px; padding:8px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text); font-size:12px;" placeholder="请输入审核意见"></textarea>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary" onclick="approveRequest()" style="background:#22c55e; border:none; flex:1;">✓ 批准</button>
        <button class="btn btn-secondary" onclick="rejectRequest()" style="background:#ef4444; border:none; flex:1;">✗ 拒绝</button>
      </div>
    </div>
  `;
}

function openCertReview(certId) {
  showCertDetail(certId);
}

function approveRequest() {
  alert('✓ 认证已批准');
  loadCertificationTable();
}

function rejectRequest() {
  alert('✗ 认证已拒绝');
  loadCertificationTable();
}

async function loadPendingCertifications() {
  // 这个函数现在已被 loadCertificationTable 替代
  loadCertificationTable();
}

// ===== 看板概览数据加载 =====
function loadEmployeeOverview() {
  DASHBOARD_STATE.currentMethod = null;

  // 演示统计数据（在实际应用中应从 API 获取）
  const stats = {
    total: 2144,
    approved: 1718,
    rejected: 307,
    pending: 169,
    methods: {
      email: 514,
      contract: 230,
      tax: 0,
      other: 1400
    }
  };

  // 更新 KPI 卡片
  document.getElementById('kpi-total').textContent = stats.total.toLocaleString();
  document.getElementById('kpi-approved').textContent = stats.approved.toLocaleString();
  document.getElementById('kpi-rejected').textContent = stats.rejected.toLocaleString();
  document.getElementById('kpi-pending').textContent = stats.pending.toLocaleString();

  // 更新认证方式统计
  document.getElementById('method-email').textContent = stats.methods.email.toLocaleString();
  document.getElementById('method-contract').textContent = stats.methods.contract.toLocaleString();
  document.getElementById('method-tax').textContent = stats.methods.tax.toLocaleString();
  document.getElementById('method-other').textContent = stats.methods.other.toLocaleString();

  // 加载表格数据
  setupEmployeeOverviewExport();
  loadEmployeeOverviewTable();
}

function loadEmployeeOverviewTable(page = 1) {
  try {
    updateEmployeeMethodFilterUI();
    const nameFilter = document.getElementById('emp-ov-search-name')?.value || '';
    const positionFilter = (document.getElementById('emp-ov-search-position')?.value || '').toLowerCase();
    const companyFilter = (document.getElementById('emp-ov-search-company')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('emp-ov-search-status')?.value || '';
    const dateStart = document.getElementById('emp-ov-date-start')?.value || '';
    const dateEnd = document.getElementById('emp-ov-date-end')?.value || '';

    // 使用完整演示数据
    const allEmployees = getEmployeeOverviewData();
    console.log('✓ 生成的员工数据条数:', allEmployees.length);

    // 应用过滤
    let filtered = getFilteredEmployeeOverviewData(allEmployees);

    if (nameFilter || positionFilter || companyFilter || statusFilter || dateStart || dateEnd) {
      DASHBOARD_STATE.currentFilter = {
        name: nameFilter,
        position: positionFilter,
        company: companyFilter,
        status: statusFilter,
        dateStart,
        dateEnd
      };
    } else {
      DASHBOARD_STATE.currentFilter = null;
    }

    console.log('✓ 过滤后的员工数据条数:', filtered.length);

    // 分页
    const pageSize = 20;
    const totalPages = Math.ceil(filtered.length / pageSize) || 1;

    if (page > totalPages && totalPages > 0) {
      page = totalPages;
    } else if (page < 1) {
      page = 1;
    }

    const startIdx = (page - 1) * pageSize;
    const paginatedData = filtered.slice(startIdx, startIdx + pageSize);

    const tbody = document.getElementById('emp-overview-tbody');
    if (!tbody) {
      console.error('✗ 找不到 emp-overview-tbody 元素');
      return;
    }

    if (!paginatedData || paginatedData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="13" class="table-empty-cell">暂无员工数据</td></tr>';
      document.getElementById('emp-overview-count').textContent = '0';
      document.getElementById('emp-overview-page').textContent = '1';
      document.getElementById('emp-overview-total-pages').textContent = '1';
      updateEmployeeMethodFilterUI();
      return;
    }

    const rows = paginatedData.map(emp => renderEmployeeRow(emp)).join('');
    console.log('✓ 生成的表格行数:', paginatedData.length);
    tbody.innerHTML = rows;
    document.getElementById('emp-overview-count').textContent = filtered.length;
    document.getElementById('emp-overview-page').textContent = page;
    document.getElementById('emp-overview-total-pages').textContent = totalPages;

    // 更新分页按钮状态
    const prevBtn = document.getElementById('emp-overview-prev-btn');
    const nextBtn = document.getElementById('emp-overview-next-btn');
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;
    updateEmployeeMethodFilterUI(filtered.length);

    console.log('✓ 员工列表加载完成 (第', page, '页，共', totalPages, '页)');
  } catch (e) {
    console.error('✗ 加载员工列表失败:', e);
    const tbody = document.getElementById('emp-overview-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="13" class="table-empty-cell error">加载失败: ${e.message || '未知错误'}</td></tr>`;
  }
}

// 看板统计数据全局状态
const DASHBOARD_STATE = {
  currentFilter: null,
  currentMethod: null
};

let EMPLOYEE_OVERVIEW_DATA_CACHE = null;

function getEmployeeOverviewData() {
  if (!EMPLOYEE_OVERVIEW_DATA_CACHE) {
    EMPLOYEE_OVERVIEW_DATA_CACHE = generateEmployeeData();
  }
  return EMPLOYEE_OVERVIEW_DATA_CACHE;
}

function getFilteredEmployeeOverviewData(sourceData = getEmployeeOverviewData()) {
  const nameFilter = document.getElementById('emp-ov-search-name')?.value || '';
  const positionFilter = (document.getElementById('emp-ov-search-position')?.value || '').toLowerCase();
  const companyFilter = (document.getElementById('emp-ov-search-company')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('emp-ov-search-status')?.value || '';
  const dateStart = document.getElementById('emp-ov-date-start')?.value || '';
  const dateEnd = document.getElementById('emp-ov-date-end')?.value || '';

  return sourceData.filter(emp => {
    if (nameFilter && !(emp.real_name || '').includes(nameFilter)) return false;
    if (positionFilter && !(emp.position || '').toLowerCase().includes(positionFilter)) return false;
    if (companyFilter && !(emp.company || '').toLowerCase().includes(companyFilter)) return false;
    if (statusFilter && emp.status !== statusFilter) return false;
    if (dateStart && (emp.cert_time || '').substring(0, 10) < dateStart) return false;
    if (dateEnd && (emp.cert_time || '').substring(0, 10) > dateEnd) return false;
    if (DASHBOARD_STATE.currentMethod && emp.material_method_enum !== DASHBOARD_STATE.currentMethod) return false;
    return true;
  });
}

function setupEmployeeOverviewExport() {
  const actionBar = document.getElementById('emp-ov-search-name')?.parentElement;
  if (!actionBar || document.getElementById('emp-overview-export-btn')) return;

  const exportBtn = document.createElement('button');
  exportBtn.id = 'emp-overview-export-btn';
  exportBtn.type = 'button';
  exportBtn.className = 'btn btn-sm btn-primary';
  exportBtn.textContent = '导出';
  exportBtn.onclick = exportEmployeeOverview;
  actionBar.appendChild(exportBtn);
}

function escapeEmployeeCsvValue(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function exportEmployeeOverview() {
  const rows = getFilteredEmployeeOverviewData();
  if (!rows.length) {
    alert('当前筛选条件下暂无可导出的员工数据');
    return;
  }

  const columns = [
    ['account', '账号'],
    ['real_name', '真实姓名'],
    ['lenovo_id', 'LenovoID'],
    ['phone', '关联手机号'],
    ['email', '邮箱'],
    ['position', '岗位信息'],
    ['company', '所属企业'],
    ['dept_status', '职员认证状态'],
    ['material_method', '认证方式'],
    ['cert_time', '认证时间'],
    ['current_status', '当前状态'],
    ['id_no', '身份证号'],
    ['company_code', '企业统一社会信用代码'],
    ['register_time', '注册时间'],
    ['member_level', '会员等级'],
    ['activation_status', '激活状态']
  ];

  const csv = [
    columns.map(([, title]) => escapeEmployeeCsvValue(title)).join(','),
    ...rows.map(row => columns.map(([key]) => escapeEmployeeCsvValue(row[key])).join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `职场人群认证概览_${date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function filterAndNavigate(status) {
  // 在看板页面内过滤表格
  const statusMap = {
    'all': '',
    'approved': 'approved',
    'rejected': 'rejected',
    'pending': 'pending'
  };

  DASHBOARD_STATE.currentMethod = null;
  const nameInput = document.getElementById('emp-ov-search-name');
  const positionInput = document.getElementById('emp-ov-search-position');
  const companyInput = document.getElementById('emp-ov-search-company');
  const statusInput = document.getElementById('emp-ov-search-status');
  const dateStartInput = document.getElementById('emp-ov-date-start');
  const dateEndInput = document.getElementById('emp-ov-date-end');
  if (nameInput) nameInput.value = '';
  if (positionInput) positionInput.value = '';
  if (companyInput) companyInput.value = '';
  if (statusInput) statusInput.value = statusMap[status] || '';
  if (dateStartInput) dateStartInput.value = '';
  if (dateEndInput) dateEndInput.value = '';
  updateEmployeeMethodFilterUI();
  loadEmployeeOverviewTable();
}

function generateEmployeeData() {
  // 根据数字需求生成员工数据（包含所有参考地址中的字段）
  const firstNames = ['张', '李', '王', '赵', '孙', '周', '吴', '郑', '何', '朱', '陈', '杨', '黄', '刘', '高', '林', '贾', '史', '徐', '唐'];
  const lastNames = ['三', '四', '五', '六', '七', '八', '九', '十', '一', '二'];
  const statuses = ['approved', 'approved', 'approved', 'pending', 'rejected'];
  const methods = ['企业邮箱', '劳动合同', '个人所得税', '其他材料'];
  const methodEnums = ['email', 'contract', 'tax', 'other'];

  const positions = ['产品经理', '软件工程师', '市场专员', '销售经理', '运营专员', '人力资源', '财务分析师', '项目经理'];
  const companies = ['联想（北京）有限公司', '联想集团', '联想中国', '联想研究院'];
  let employees = [];
  let accountNo = 1701000000;
  const totalCount = 2361;

  for (let i = 0; i < totalCount; i++) {
    const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const methodIdx = Math.floor(Math.random() * methods.length);
    const phone = String(13000000000 + Math.floor(Math.random() * 1000000000)).slice(0, 11);
    const certDate = new Date(2023 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);

    const idNo = '110101199' + String(Math.floor(Math.random() * 1000000000)).padStart(9, '0');
    const registerDate = new Date(2022, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const birthday = new Date(1990 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const company = companies[Math.floor(Math.random() * companies.length)];

    employees.push({
      account: String(accountNo++),
      real_name: fname + lname,
      id_no: idNo,
      lenovo_id: 'L' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0'),
      phone: phone,
      email: fname + lname.toLowerCase() + '@lenovo.com',
      is_realname: status === 'approved' ? '✓ 已认证' : '-',
      company: company,
      company_name: company,
      company_code: '911101015MA000000' + String(Math.floor(Math.random() * 100)).padStart(2, '0'),
      dept_status: '职员',
      position: positions[Math.floor(Math.random() * positions.length)],
      material_method: methods[methodIdx],
      material_method_enum: methodEnums[methodIdx],
      cert_time: certDate.toISOString().replace('T', ' ').substring(0, 16),
      current_status: status === 'approved' ? '✓ 已认证' : status === 'pending' ? '⏳ 待审核' : '✗ 已驳回',
      status: status,
      gender: Math.random() > 0.5 ? '男' : '女',
      birthday: birthday.toISOString().split('T')[0],
      address: '北京市' + ['朝阳区', '海淀区', '丰台区', '东城区', '西城区'][Math.floor(Math.random() * 5)],
      register_time: registerDate.toISOString().replace('T', ' ').substring(0, 19),
      user_type: '企业用户',
      member_level: ['白银会员', '黄金会员', '钻石会员'][Math.floor(Math.random() * 3)],
      activation_status: Math.random() > 0.2 ? '已激活' : '未激活',
      vip_status: Math.random() > 0.7 ? '是' : '否',
      cert_method: '企业邮箱',
      cert_start_date: certDate.toISOString().split('T')[0],
      cert_end_date: new Date(certDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cert_materials: ['劳动合同', '在职证明'],
      cert_verified: status === 'approved' ? '已验证' : '未验证'
    });
  }

  return employees;
}

function updateEmployeeMethodFilterUI(count) {
  const methodLabels = {
    email: '企业邮箱',
    contract: '劳动合同',
    tax: '个人所得税视频认证',
    other: '其他材料'
  };
  const activeMethod = DASHBOARD_STATE.currentMethod;
  document.querySelectorAll('.employee-method-card .employee-method-tile').forEach(tile => {
    const isActive = tile.dataset.method === activeMethod;
    tile.classList.toggle('is-selected', isActive);
    tile.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  const status = document.getElementById('employee-method-filter-status');
  if (!status) return;
  if (!activeMethod) {
    status.style.display = 'none';
    status.innerHTML = '';
    return;
  }
  const countText = Number.isFinite(count) ? ` · ${count.toLocaleString()} 条` : '';
  status.style.display = 'inline-flex';
  status.innerHTML = `当前筛选: <strong>${methodLabels[activeMethod] || activeMethod}</strong>${countText}<button type="button" onclick="clearEmployeeMethodFilter()" aria-label="清除认证方式筛选">清除</button>`;
}

function clearEmployeeMethodFilter() {
  DASHBOARD_STATE.currentMethod = null;
  updateEmployeeMethodFilterUI();
  loadEmployeeOverviewTable(1);
}

function filterByMethod(method) {
  // 按认证方式筛选（在看板页面内过滤）
  try {
    DASHBOARD_STATE.currentMethod = DASHBOARD_STATE.currentMethod === method ? null : method;
    updateEmployeeMethodFilterUI();
    loadEmployeeOverviewTable(1);
  } catch (e) {
    console.error('✗ 按方式筛选失败:', e);
  }
}

let currentCertId = null;

async function showCertificationDetail(certId) {
  currentCertId = certId;

  // 演示数据映射
  const certDetails = {
    1: {
      id: 1,
      real_name: '王五',
      id_no: '110101199204209012',
      phone: '13800138000',
      email: 'wang.wu@lenovo.com',
      company: '联想中国',
      position: '销售经理',
      industry: '科技',
      cert_type: 'employee',
      realname_verified: true,
      realname_verified_at: '2025-03-10T10:00:00',
      employee_verified: false,
      material_method: 'email',
      material_status: 'pending',
      attachments: [
        { name: '企业邮箱认证截图.png', url: '#' }
      ],
      created_at: '2025-03-15T10:30:00'
    },
    2: {
      id: 2,
      real_name: '孙七',
      id_no: '110101199406257890',
      phone: '13900139000',
      email: 'sun.qi@lenovo.com',
      company: '联想研究院',
      position: '工程师',
      industry: '研发',
      cert_type: 'employee',
      realname_verified: true,
      realname_verified_at: '2025-03-12T14:20:00',
      employee_verified: true,
      employee_verified_at: '2025-03-14T09:00:00',
      material_method: 'contract',
      material_status: 'pending',
      attachments: [
        { name: '劳动合同.pdf', url: '#' }
      ],
      created_at: '2025-03-20T14:20:00'
    },
    3: {
      id: 3,
      real_name: '郑十',
      id_no: '110101199709289012',
      phone: '13600136000',
      email: 'zheng.shi@lenovo.com',
      company: '联想集团',
      position: '市场专员',
      industry: '市场',
      cert_type: 'employee',
      realname_verified: true,
      realname_verified_at: '2025-03-08T11:00:00',
      employee_verified: true,
      employee_verified_at: '2025-03-16T15:30:00',
      material_method: 'tax',
      material_status: 'pending',
      attachments: [
        { name: '个税证明.jpg', url: '#' }
      ],
      created_at: '2025-03-26T09:15:00'
    }
  };

  const detail = certDetails[certId] || certDetails[1];

  const detailPanel = document.querySelector('[style*="审核详情"]')?.nextElementSibling ||
                      document.querySelector('.card:last-child');

  if (detailPanel) {
    detailPanel.innerHTML = `
      <div class="card-header">
        <span class="card-title">审核详情</span>
        <span style="font-size:12px; color:var(--text-secondary);">认证 ID: ${detail.id}</span>
      </div>
      <div style="padding:20px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
          <div>
            <div style="color:var(--text-secondary); font-size:12px; margin-bottom:4px;">姓名</div>
            <div style="font-weight:600;">${detail.real_name}</div>
          </div>
          <div>
            <div style="color:var(--text-secondary); font-size:12px; margin-bottom:4px;">身份证号</div>
            <div style="font-family:monospace; font-size:12px;">${detail.id_no.slice(-6).padStart(18, '*')}</div>
          </div>
          <div>
            <div style="color:var(--text-secondary); font-size:12px; margin-bottom:4px;">邮箱</div>
            <div>${detail.email}</div>
          </div>
          <div>
            <div style="color:var(--text-secondary); font-size:12px; margin-bottom:4px;">手机</div>
            <div>${detail.phone}</div>
          </div>
          <div>
            <div style="color:var(--text-secondary); font-size:12px; margin-bottom:4px;">企业</div>
            <div>${detail.company}</div>
          </div>
          <div>
            <div style="color:var(--text-secondary); font-size:12px; margin-bottom:4px;">职位</div>
            <div>${detail.position}</div>
          </div>
        </div>

        <div style="border-top:1px solid var(--border); padding-top:16px; margin-bottom:20px;">
          <div style="margin-bottom:12px;">
            <div style="color:var(--text-secondary); font-size:12px; margin-bottom:4px;">实名认证</div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${detail.realname_verified ? '#22c55e' : '#ef4444'};"></span>
              <span>${detail.realname_verified ? '✓ 已认证' : '✗ 未认证'}</span>
              ${detail.realname_verified_at ? `<span style="color:var(--text-tertiary); font-size:11px;">${new Date(detail.realname_verified_at).toLocaleDateString()}</span>` : ''}
            </div>
          </div>
          <div>
            <div style="color:var(--text-secondary); font-size:12px; margin-bottom:4px;">在职认证</div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${detail.employee_verified ? '#22c55e' : '#ef4444'};"></span>
              <span>${detail.employee_verified ? '✓ 已认证' : '✗ 未认证'}</span>
              ${detail.employee_verified_at ? `<span style="color:var(--text-tertiary); font-size:11px;">${new Date(detail.employee_verified_at).toLocaleDateString()}</span>` : ''}
            </div>
          </div>
        </div>

        <div style="border-top:1px solid var(--border); padding-top:16px; margin-bottom:20px;">
          <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">材料认证</div>
          <div style="padding:12px; background:var(--bg); border-radius:4px; margin-bottom:8px;">
            <div style="margin-bottom:4px;">方式: ${detail.material_method === 'email' ? '企业邮箱认证' : detail.material_method === 'contract' ? '劳动合同' : detail.material_method === 'tax' ? '个人所得税App' : '其他'}</div>
            <div style="font-size:11px; color:var(--text-secondary);">状态: ${detail.material_status === 'approved' ? '✓ 已通过' : detail.material_status === 'rejected' ? '✗ 已驳回' : '⏳ 待审核'}</div>
          </div>
          ${detail.attachments && detail.attachments.length > 0 ? `
            <div style="margin-bottom:8px;">
              <div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px;">附件</div>
              ${detail.attachments.map(att => `<div style="padding:4px 8px; background:var(--bg); border-radius:3px; margin-bottom:4px; font-size:12px;"><a href="${att.url}" style="color:var(--primary); text-decoration:none;">📎 ${att.name}</a></div>`).join('')}
            </div>
          ` : ''}
        </div>

        <div style="display:flex; gap:8px;">
          <button class="btn btn-primary" onclick="approveCertification()" style="background:var(--green); border:none; flex:1;">✓ 批准</button>
          <button class="btn btn-secondary" onclick="rejectCertification()" style="background:var(--red); border:none; flex:1;">✗ 驳回</button>
        </div>
        <textarea id="cert-remark" style="width:100%; height:60px; padding:8px; margin-top:12px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text); font-size:12px;" placeholder="审核备注（可选）"></textarea>
      </div>
    `;
  }
}

async function approveCertification() {
  if (!currentCertId) { alert('请先选择认证'); return; }
  const remark = document.getElementById('cert-remark')?.value || '';
  alert('✓ 认证已批准');
  loadPendingCertifications();
}

async function rejectCertification() {
  if (!currentCertId) { alert('请先选择认证'); return; }
  const remark = document.getElementById('cert-remark')?.value || '不符合认证要求';
  alert('✓ 认证已驳回');
  loadPendingCertifications();
}

async function reviewCertification(certId) {
  showCertificationDetail(certId);
}

async function exportEmployeeList() {
  await aiQuick('导出所有员工信息为CSV文件');
}
