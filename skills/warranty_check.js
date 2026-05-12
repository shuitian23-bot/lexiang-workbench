// Skill: 序列号 SN 查保修（POC mock 数据）
module.exports = {
  name: 'warranty_check',
  description: '根据用户提供的序列号 SN 查询联想整机保修状态、剩余天数、服务网点和可申请服务。当用户提供 SN 或问「保修剩余/质保/我的机器还在保修期吗」时调用。',
  parameters: {
    type: 'object',
    properties: {
      sn: { type: 'string', description: '联想机器序列号 Serial Number，6+ 位字符串' },
    },
    required: ['sn'],
  },
  execute: ({ sn }) => {
    sn = String(sn || '').trim();
    if (!sn || sn.length < 6) {
      return { action:'frontend_modal', type:'info', title:'🔧 保修查询', content:'请提供有效的序列号 SN（6+ 位字符）。SN 通常在机器底部铭牌，或开机按 F2 进 BIOS 查看。' };
    }
    // mock：根据 sn 哈希出稳定的剩余天数
    var hash = 0;
    for (var i=0; i<sn.length; i++) hash = (hash * 31 + sn.charCodeAt(i)) >>> 0;
    var daysLeft = (hash % 800) + 30;
    var purchaseDate = new Date(Date.now() - (1095 - daysLeft) * 86400000);
    var expireDate = new Date(Date.now() + daysLeft * 86400000);
    var fmt = function(d){ return d.toISOString().slice(0,10); };
    var models = ['ThinkPad X1 Carbon Gen 11','拯救者 Y9000P 2025','小新 Pro 14 2025','ThinkBook 16+ 2026','YOGA Pro 14s'];
    var model = models[hash % models.length];
    return {
      action: 'frontend_modal',
      type: 'info',
      title: '🔧 保修查询结果',
      content:
`## 序列号：\`${sn}\`

| 项目 | 详情 |
|---|---|
| 机型 | ${model} |
| 购机日期 | ${fmt(purchaseDate)} |
| 保修类型 | 整机 3 年（含上门）+ 电池 1 年 |
| **保修剩余** | **${daysLeft} 天**（至 ${fmt(expireDate)}）|
| 已使用维修 | 0 次 |
| 服务网点 | 联想北京海淀朝阳门店（距您 3.2km）|

---

### 可申请服务
- 🛠 **预约维修**：上门 / 寄修 / 到店三选一
- 📞 **400 客服**：400-810-8888 转 1
- 🔋 **电池健康检测**：保修期内免费
- 🔄 **以旧换新**：可叠加保修期内免折旧抵扣

*POC 演示数据，实际接联想服务系统*`,
    };
  },
};
