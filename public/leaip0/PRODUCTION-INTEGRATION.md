# leaip0 生产数据恢复契约

## Delta matrix

| POC 位置 | 生产目标 | 分类 | 最小改动 | 风险 | 验证 |
| --- | --- | --- | --- | --- | --- |
| 五页面统一对话脚本 | 复用 `/api/leai/*`、`/api/chat/stream` | reuse | 保持现有模型、RAG、流式事件及串行结果状态机 | 跨入口回答分叉 | 五入口同 query 回归 |
| 频道商品楼层静态数组 | `/api/products` | discard | 由共享商品适配器加载真实在售 SKU | 空数据、超时、占位价 | loading/empty/error/retry、SKU 校验 |
| 商品卡及详情视觉 | 现有卡片、详情与 Tab | reuse | 仅替换数据，不重写组件 | DOM 与事件兼容 | 点击、键盘、关闭后重建 |
| 模拟配置价与促销标签 | `/:sku/variants` 与真实价格字段 | discard | 只展示真实变体、真实划线价 | 下架、脏价、无变体 | 99999、offline、original_price 回归 |
| API、缓存、超时和数据质量 | `ProductDataAdapter` | business-only | 同源请求、缓存、取消、规范化和过滤 | API 兼容 | 单元式脚本检查和公网接口检查 |

## Component contract

```yaml
name: PC-商城-真实商品数据适配器
level: Candidate
owner: leaip0
scope:
  pages: [首页, 个人及家庭, 中小企业, 政教及大企业, 品牌]
inputs:
  - name: site
    type: shop | b | biz | ""
    required: true
  - name: category
    type: string
    required: false
outputs:
  - name: products
    payload: Product[]
states: [loading, success, empty, error, retry]
dependencies:
  components: [现有商品卡, 现有商品详情, 现有结果卡, 现有右侧Tab]
adapter_owns: [api, cache, timeout, normalization, data-quality]
responsive: 保持现有模板布局
accessibility: aria-live 状态、aria-busy、键盘打开、可聚焦重试
acceptance_tests:
  - 占位价与下架商品不展示
  - 详情和变体均使用真实 SKU
  - 接口失败保留页面并允许重试
known_gaps:
  - 真实库存接口尚未接入，统一呈现库存未知
```
