# 联想企业购SPU商品数据包

由 60 个 SKU 合并为 37 个 SPU。

分类SPU数量：{"ThinkPad": 3, "ThinkBook": 7, "扬天": 4, "办公": 11, "服务": 12}

## 共享资源规则

同一 SPU 下的所有 SKU 共用 SPU 根目录的 `商品文案.md`、`白底图.jpg` 和 `详情图.jpg`。各 SKU 的配置、价格和来源信息统一保存在 `manifest.json` 的 `configurations` 中。
