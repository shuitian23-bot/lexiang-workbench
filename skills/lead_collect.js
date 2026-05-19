// Skill: 留资表单 — 弹窗收集姓名 / 公司 / 电话 / 需求，POC 演示
module.exports = {
  name: 'lead_collect',
  description: '收集用户联系方式（留资），用于：BD 上门接洽 / 大额政企项目咨询 / 批量询价 / 上门安装预约 / 留下回访资料 等场景。当用户表达「请联系我 / 让 BD 联系 / 留下我的电话 / 安排上门 / 我想咨询大额项目」等明确留资意图时调用。',
  parameters: {
    type: 'object',
    properties: {
      scenario: { type: 'string', description: '留资场景，如：BD 接洽 / 询价 / 政企方案 / 上门安装 / 退换货咨询' },
      title:    { type: 'string', description: '弹窗标题，默认「留下您的联系方式」' },
      desc:     { type: 'string', description: '一句话说明为什么要留资，如「区域 BD 30 分钟内电话联络」' },
      need_company: { type: 'boolean', description: '是否需要公司名（B 端默认 true，C 端 false）' },
    },
    required: ['scenario'],
  },
  execute: ({ scenario, title, desc, need_company }) => {
    var fields = [
      { key:'name',  label:'姓名',  type:'text',  required:true,  placeholder:'您的称呼' },
      { key:'phone', label:'手机号', type:'tel',   required:true,  placeholder:'用于 BD 30 分钟内联系' },
    ];
    if (need_company !== false) {
      fields.push({ key:'company', label:'公司名称', type:'text', required:false, placeholder:'选填，便于资质评估' });
    }
    fields.push({ key:'requirement', label:'需求描述', type:'textarea', required:false, placeholder:'简单说说您的具体需求或预算...' });
    return {
      action: 'frontend_lead',
      title: title || '📝 留下您的联系方式',
      desc:  desc  || '区域 BD 顾问会在 30 分钟内主动联系您',
      scenario: scenario || '',
      fields: fields,
    };
  },
};
