# 增量设计 Guard

设计 Guard 用于阻止新增或修改的内容槽源码继续引入视觉漂移，不把未触达的历史债务一次性变成发布阻塞。

## 使用方式

```bash
node scripts/check-consistency.mjs --project <app-root> \
  --baseline-ref <task-start-commit> \
  --changed-file src/views/example/ExampleView.vue \
  --changed-file src/components/example/ExamplePanel.vue
```

- `--changed-file` 可重复；路径必须位于 `<app-root>` 内。
- 已有页面使用 `--baseline-ref <task-start-commit>`：检查器从目标仓库读取该提交中的同名文件，将选择器上下文、属性、值和问题类型均相同的既有差异记录为 NOTICE；新增、更改、复制到新选择器或增加次数的问题仍 FAIL。该比较不是逐行 Git diff，不证明旧差异已获设计认可；选择器重排等语义不变重构仍可能需要人工复核。
- 不传基线时，扫描指定文件的全部样式声明并阻断发现的问题；不得将此模式描述为“只检查本次新增代码”。新文件无基线内容，按全新内容检查。
- 基线必须是该任务实际起点提交，不得在引入问题后提交一次再将其当作起点来消除报错；无效 Git 引用、读取失败、越界路径及最终文件为符号链接均失败。
- 项目封装入口若未支持 `--baseline-ref`，不要直接向旧入口传新参数；先由项目接入任务更新参数转发。项目有扩展路由时仍需沿用其扩展登记适配器，不能绕过路由检查。
- 不指定 `--changed-file` 时仍检查 Skill、模板、页面矩阵和路由，但不会把历史页面样式债务误判为本次失败。
- `--guard-all` 扫描当前 `src/views` 与 `src/components` 的 Vue/CSS 样式，只输出 NOTICE，用于建立整改清单，不能据此宣称页面已通过视觉验收。

## 自动检查边界

自动检查覆盖：

- `<style>` 与 CSS 中的硬编码 hex/rgb/hsl 颜色；token 声明文件除外。
- `margin`、`padding`、`gap` 中未使用 token 且不在 4px 基准闭集的数值。
- 不属于 0/4/8/12/9999px 闭集的圆角。
- 不属于 12/13/14/16/18/20/24/30px 阶梯的字号。
- 新路由是否登记页面矩阵、一个 T1–T7 主类型、至多一个 V1–V5 变体及 C9 状态组。

专项值必须与已确认命名 token 对应：页头字号 `var(--page-header-title-size, 19px)`、标记圆角 `var(--page-header-marker-radius, 6px)`、说明间距 `var(--page-header-description-gap, 3px)`、KPI 间距 `var(--space-kpi-gap, 14px)`。不把 19/3/6/14 任意加入所有页面的通用白名单。零圆角是合法重置。

检查器还覆盖 border/outline 颜色简写、font 字号简写和逻辑方向间距；混合 token 与硬编码值时逐项检查。自定义属性定义、非 px 单位、模板内联样式、外链 style 和动态样式不在该轻量声明检查的完整覆盖范围；token 数值及用途仍需人工核对。它不是完整 CSS/SCSS 解析器。

自动检查不能证明组件语义、真实状态实现、键盘流程或视觉质量。以下内容仍需页面合同与运行证据：

- Common / Domain / Page-local 组件选择是否合理。
- C9 各状态是否由真实数据和权限路径触发。
- Agent 开关/拖宽后的响应式、表格可达性和页面横向溢出。
- VA-R2 截图、运行指标、错误日志和评审结论。

确有业务例外时，不通过改正则绕过。先在页面矩阵登记 E 例外、原因、影响范围、确认结论和退出路径，再为最小范围建立命名 token 或专项合同。
