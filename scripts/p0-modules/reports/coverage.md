# P0 48模块回归覆盖

共48模块；47模块状态对照通过，1模块验证保持停用；70个截图状态。

| 类别 | 模块 | 状态 | 样本/限制 |
|---|---|---|---|
| pages | 首页（包括全屏对话） (home) | matched | home-initial、home-split |
| pages | 个人及家庭首页 (consumer-home) | matched | shop-chat-initial |
| pages | 中小企业首页 (smb-home) | matched | b-chat-initial |
| pages | 政教及大企业首页 (enterprise-home) | matched | biz-chat-initial |
| pages | 品牌首页 (brand-home) | matched | brand-initial |
| pages | 推荐商品列表 (product-list) | matched | product-list |
| pages | 推荐方案列表 (solution-list) | matched | solution-list |
| pages | 推荐门店列表 (store-list) | matched | store-list |
| pages | 设备列表 (device-list) | matched | device-list |
| pages | 商品详情 (product-detail) | matched | product-detail |
| pages | 方案详情 (solution-detail) | matched | solution-detail |
| pages | 门店详情 (store-detail) | matched | store-detail |
| pages | 设备详情 (device-detail) | matched | device-detail |
| pages | 商品对比 (product-compare) | matched | product-compare |
| pages | 方案对比 (solution-compare) | matched | solution-compare |
| pages | 我的订单列表 (order-list) | matched | order-list |
| pages | 我的订单详情 (order-detail) | matched | order-detail |
| pages | 我的会员中心 (member-center) | matched | member-center |
| pages | 我的优惠券 (coupon-center) | matched | coupon-center |
| pages | 我的代金券 (voucher-center) | matched | voucher-center |
| pages | 我的限时红包 (red-envelope) | matched | red-envelope |
| pages | 我的乐豆 (ledou-center) | matched | ledou-center |
| modals | 登录 (login) | matched | home-login、home-login-invalid、biz-chat-login、biz-chat-login-invalid |
| modals | 注册 (register) | matched | home-register、biz-chat-register |
| modals | 登录成功 (login-success) | matched | login-success |
| modals | 留资 (lead-form) | matched | home-lead、home-lead-invalid、biz-chat-lead、biz-chat-lead-invalid |
| modals | 教育认证 (education-auth) | matched | education-auth |
| modals | 职场认证 (workplace-auth) | matched | home-workplace-1、home-workplace-2、home-workplace-3、home-workplace-4、biz-chat-workplace-1、biz-chat-workplace-2、biz-chat-workplace-3、biz-chat-workplace-4 |
| modals | 企业认证 (enterprise-auth) | matched | home-enterprise、biz-chat-enterprise |
| modals | 升级钻石会员 (diamond-upgrade) | matched | diamond-upgrade |
| modals | 编辑个人资料 (profile-edit) | matched | profile-edit |
| modals | 预约到店确认 (store-appointment-confirm) | matched | store-appointment-confirm |
| modals | 选择门店 (store-select) | matched | store-select |
| modals | 到店时间 (arrival-time) | matched | arrival-time |
| modals | 门店预约目的 (store-purpose) | matched | store-purpose |
| modals | 支付订单确认 (order-payment-confirm) | matched | order-payment-confirm |
| modals | 修改订单 (order-edit) | matched | order-edit |
| modals | 修改配置 (configuration-edit) | matched | configuration-edit |
| modals | 修改发票 (invoice-edit) | matched | invoice-edit |
| modals | 正在支付 (payment-processing) | matched | payment-processing |
| modals | 支付成功 (payment-success) | matched | payment-success |
| modals | 门店优惠券核销 (store-coupon-verify) | matched | store-coupon-verify |
| modals | 商品匹配度 (product-match) | matched | product-match |
| modals | 捆绑设备 (device-bind) | matched | device-bind |
| modals | 最普通的 toast (toast) | disabled-policy-verified | 保持停用，调用不会出现右下角提示层 |
| modals | 对话历史记录 (conversation-history) | matched | home-history、biz-chat-history |
| shared | 全站公共基础 (common) | matched | home-initial、shop-chat-initial、b-chat-initial、biz-chat-initial、brand-initial |
| shared | 智能体生成内容 (agent-content) | matched | home-followups-split、home-followups-fullscreen、biz-chat-followups-split、biz-chat-followups-fullscreen |

- 全部写请求被浏览器拦截，未向生产提交留资、认证、预约、订单或支付。
- 登录、支付成功、设备等使用现有演示/模拟状态；不证明真实服务端交易或身份认证结果。
- 百度地图API固定为离线回退；门店列表、详情与预约弹窗比较一致，第三方在线地图另行验证。
- 样式比较包含目标区域可见DOM、计算样式与几何；截图用于视觉核对，不能等同所有数据及所有交互穷尽验证。
