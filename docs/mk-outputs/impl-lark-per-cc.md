# lark_bot.py 分组推送改造 — 产出报告

## 完成状态
✓ 改造完成，dry-run 验证通过，已 push（commit 7fb1596b）

## 变更内容

### 新增函数
- `group_students_by_cc(students)` — 按 cc_name 字段分组，空归 unknown
- `generate_cc_image(cc_name, team_name, students, date_str)` — per-CC 图片（6列，去掉负责人列）
- `generate_overview_image(team_summary, date_str)` — 团队汇总总览图（含合计行深色背景）

### TH 字典新增词条
overview_title / cc_count / avg_per_cc / col_team / col_not_checked / total_row（共 6 条）

### cmd_followup() 重构
原：1 条 interactive card
改：8 条 Lark 消息
- 消息 1：总览 card（各团队汇总统计 + overview 图）
- 消息 2-8：每团队 card（每 CC 一段 markdown + 独立图片链接）

### 保留不变
- --dry-run 逻辑
- --confirm 安全防线
- 双图床 fallback（upload_image）
- Lark webhook 签名（_lark_sign / _send_lark）
- send_lark_test 连通测试
- CLI 参数解析

## 验证结果（dry-run）
- 858 名未打卡学员
- 7 个团队（CC01~CC06 + CC15）
- 1 张总览图（57KB）
- 51 张 per-CC 图片（38KB ~ 340KB）
- 图片命名：lark-overview-YYYYMMDD.png / lark-followup-{team}-{cc}-YYYYMMDD.png

## 文件变更
- `scripts/lark_bot.py` — 398 行新增，62 行删除
