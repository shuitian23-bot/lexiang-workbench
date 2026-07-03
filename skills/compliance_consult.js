// Skill: 信创 / 等保 / 国密 / 国产化合规咨询（POC mock）
module.exports = {
  name: 'compliance_consult',
  description: '政教大企业信创合规咨询：等保 2.0、国密、国产化适配、信创目录。当用户问「信创 / 等保 / 国密 / 国产化 / 信创目录 / 操作系统适配 / 麒麟 / 统信 UOS」时调用。',
  parameters: { type:'object', properties:{ scope:{ type:'string', description:'合规范围，如 等保 / 国密 / 信创 / 国产化' } }, required:[] },
  execute: ({ scope }) => {
    return {
      action:'frontend_modal', type:'info',
      title: '🛡 信创合规咨询',
      content:
`# 政企采购合规快查

## 1️⃣ 等保 2.0 三级合规

联想商用全系已通过 **等保 2.0 三级**认证，包含：

- ThinkCentre M 系列（台式）
- ThinkPad L / T / X / E 系列（笔记本）
- ThinkStation P 系列（工作站）
- ThinkSystem SR / ST 系列（服务器）

**配套**：
- 安全 BIOS（Intel Boot Guard / Secure Boot）
- TPM 2.0 加密芯片（可选 TCM 国密版）
- 智能管控套件 ThinkShield

---

## 2️⃣ 国密合规

| 机型 | TCM 芯片 | 国密 SM 系列算法 |
|---|---|---|
| ThinkCentre M70 国密版 | ✅ TCM 2.0 | SM2/SM3/SM4 |
| ThinkPad L 国密定制 | ✅ TCM 2.0 | SM2/SM3/SM4 |
| ThinkStation P3 国密 | ✅ TCM 2.0 | SM2/SM3/SM4/SM9 |

**支持规范**：GB/T 22239-2019、GM/T 0008、GB/T 39786

---

## 3️⃣ 信创 / 国产化适配

### 操作系统适配清单
- ✅ **麒麟 V10**（中标麒麟 / 银河麒麟）
- ✅ **统信 UOS V20**（专业版 / 服务器版）
- ✅ **中标 NeoKylin**
- ✅ **欧拉 openEuler**
- ✅ **deepin 25**

### CPU 适配
- ✅ 海光 C86 / 鲲鹏 920 / 飞腾 D2000 / 龙芯 3A6000 / 兆芯 KX-7000

### 信创整机型号
- 启天 T800 系列（鲲鹏 / 飞腾 / 海光）
- 开天 PC 系列（信创桌面）
- 联想信创工作站 P780 国产版

---

## 4️⃣ 政府机要 / 涉密改造

支持机型外送 **涉密改造**（去拆 WiFi / 蓝牙 / 摄像头 / 加装专用红黑分离结构）：

- 改造周期：**15 工作日**
- 改造证明：随机附 **国家保密局认证报告**
- 适用：党政办公、军工、机要单位

---

## 📞 合规专家对接

需要详细方案、参数偏离表、入围名录证明？

- **合规咨询专线**：400-810-1234 转 7
- **邮箱**：compliance@lenovo.com.cn
- **白皮书下载**：政企信创合规白皮书 PDF（在小程序「合规中心」）

*POC 演示数据，实际接联想政企事业部合规部*`,
    };
  },
};
