# impl-lark-enclosure-rates 实现报告

commit: 9ed79b06
文件: scripts/lark_bot.py (+476/-104 行)

## 完成内容

### 新增函数
- `fetch_team_detail(api_base, team)` — 调用 `/api/checkin/team-detail` 获取 per-CC 围场打卡率
- `fetch_summary(api_base)` — 调用 `/api/checkin/summary` 获取 CC 角色总打卡率
- `_rate_bg_color(rate)` / `_rate_text_color(rate)` — 根据打卡率返回配色（绿/黄/红）

### generate_cc_image() 重构
新签名：`(cc_name, team_name, students_by_enc, cc_rate_info, date_str, enclosure_order)`

- 顶部打卡率汇总条：总率 + 各围场明细（颜色随率动态变化）
- 学员表按围场分段，每段：深灰分段标题条 + 黑色表头 + 数据行
- 去掉围场列（已分段冗余），5 列：#/★/学员ID/末次拨打/课耗
- 空围场段自动跳过

### generate_overview_image() 重构
新签名：`(team_summary, role_summary, date_str, role, enclosure_order)`

- 角色总打卡率条（来自 /api/checkin/summary）
- 表格增列：打卡率 / M0率 / M1率 / M2率（动态列宽适配）
- 合计行打卡率来自 role_summary by_enclosure

### cmd_followup() 重构
- 额外调用 `fetch_summary()` 和 `fetch_team_detail()`（每团队一次）
- 构建 `students_by_enc` dict 按围场分组未打卡学员
- Lark 消息文字增加打卡率 + 各围场明细行

### TH 字典新增
- `checkin_rate` / `total_rate` / `col_rate` / `col_not_checked_count`

## 验证结果
- dry-run 通过：858 名学员，7 团队，51 CC，全部图片新生成
- CC 打卡率 54.8%，API 调用三路均成功
- ruff lint 0 errors
- 图片目视确认：围场分段 + 打卡率汇总条布局正确
