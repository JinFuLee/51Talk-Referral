---
name: pm-sync
description: 项目进度同步 — 主对话自行读取 roadmap 并输出当前里程碑进度摘要
when_to_use: 当用户想了解项目当前进度、下一步计划、未解技术债时手动触发
version: 1.0.0
---

# /pm-sync — 项目进度同步

## 执行方式
主对话自行执行以下步骤（不 spawn agent，零额外 token 开销）：

### 步骤 1：读取数据源
1. Read `docs/roadmap.md` — 提取最近已完成里程碑 + 规划中里程碑列表
2. Read `CLAUDE.md` — 提取技术债表中 P1/P2 未解决条目

### 步骤 2：格式化输出（≤10 行）
```
## 项目进度快照 — {date}
- 最近完成: {milestone} — {summary}（{qa_result}）
- 下一计划: {next_milestone} — {description}
- 关键依赖: {dependency}
- 未解技术债: P1 ×{count} / P2 ×{count}
- TOP3 技术债: {#id desc} / {#id desc} / {#id desc}
```

### 步骤 3：风险提示（如有）
- 时间敏感项：检查是否有标注 ⚠️ 的里程碑
- 外部依赖阻塞：检查是否有"外部数据依赖"标注的里程碑

## 参数
无参数。直接 `/pm-sync` 即可。

## 与 PM Pipeline Agent 的关系
- `/pm-sync`：手动触发，只读，主对话自行执行
- `mk-meta-finalize-haiku`：自动触发，写入+commit，里程碑完成后 spawn
- 两者互补：/pm-sync 查进度，PM agent 更新进度
