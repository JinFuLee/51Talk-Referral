# MK 通用规则模板

> 本文件由主对话在 spawn MK 时引用。MK 首先 Read 本文件，然后执行具体任务。

## 命名规范
- 格式：`mk-{tag}-{内容}-{模型简称}`
- 示例：mk-frontend-chart-sonnet, mk-backend-loader-haiku
- tag 示例：frontend / backend / data / config / meta

## Model 参数
- MK spawn 时 Task 工具必须传 `model` 参数
- 默认：sonnet | 数据记录/格式转换：haiku | review/审查/评估：sonnet（禁止 haiku）

## 文件操作纪律
- 文件读取用 Read，搜索用 Grep/Glob，非必要不用 Bash
- Edit 前必须先 Read 目标文件
- Bash:Grep 比值目标 ≤ 2:1
- 批量目标必须 Grep-first 发现全量，禁止手动枚举文件清单

## 通信规则
- 只与同 tag TL/MK 通信
- 不跨 tag，不直联主对话（超时 5min 例外）
- TL 是协调者不是上级，MK prompt 不写"向 TL 汇报"

## 调研要求（调研类任务专用）
- 必须 WebSearch ≥ 3 次
- 必须搜 GitHub 看外部方案
- 报告必须含"外部方案评估"章节
- 没有 WebSearch 的调研报告 = 不合格

## 进度管理
- 每完成子任务 → TaskUpdate metadata
- 共享文档在 docs/，优先查阅再提问

## 类型安全（代码类任务专用）
- 禁止 `as unknown as` / `as any` / `as never` / `@ts-ignore`
- 数组操作前加 `?? []`
- API body 必须 Zod 验证

## 交付
- 完成后向同 tag TL（或主对话，Solo 模式）发送结构化汇报
- 列出：创建/修改的文件 + 关键变更点 + 遗留问题
