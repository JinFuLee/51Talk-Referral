# impl-agent 产出：GET /api/checkin/student-analysis

## 交付摘要

新增学员维度打卡分析端点，基于 D4（已付费学员明细）+ D3（明细）联表分析。

## 变更文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `backend/api/checkin.py` | 追加 ~590 行 | 新增 3 个私有函数 + 1 个 API 端点 |
| `projects/referral/config.json` | 追加 11 行 | 新增 `checkin_student_tags` 配置段 |

## 新增 API

**端点**：`GET /api/checkin/student-analysis`

**查询参数**：
- `cc`：按 CC 姓名筛选
- `team`：按团队名称筛选
- `enclosure`：按围场 M 标签筛选（逗号分隔，如 `M0,M1`）
- `role_config`：前端宽口径配置 JSON
- `limit`：top_students 返回条数上限（默认 200）

**响应结构**（11 个字段）：
- `frequency_distribution`：0-6 次精确分布
- `frequency_bands`：4 段分组（0次/1-2次/3-4次/5-6次）
- `month_comparison`：本月 vs 上月对比（均值/满勤/活跃/参与率）
- `conversion_funnel`：打卡段 × 转化漏斗交叉
- `by_enclosure`：围场维度分布（M 标签排序）
- `tags_summary`：6 类标签计数（满勤/活跃/进步明显/在退步/沉睡高潜/超级转化）
- `lesson_checkin_cross`：课耗 × 打卡行为 2×2 交叉
- `contact_checkin_response`：联系频次（7d/14d/14d+/从未）× 打卡均值
- `renewal_checkin_correlation`：续费 × 打卡相关性
- `top_students`：按打卡降序学员列表（含 tags 字段）
- `improvement_ranking`：进步榜（delta>0，按 delta 降序）

## 新增私有函数

- `_get_student_tags_config()`：从 config.json 读取标签阈值，fallback 硬编码
- `_compute_student_tags(days_this, days_last, lesson, registrations, cfg)`：计算标签列表
- `_band_for_days(days)`：打卡天数 → 4 段标签映射

## 标签逻辑（可通过 config.json checkin_student_tags 调整阈值）

| 标签 | 条件 |
|------|------|
| 满勤 | `days_this >= 6` |
| 活跃 | `days_this >= 4` 且非满勤 |
| 进步明显 | `delta >= 2` 且 `days_last > 0` |
| 在退步 | `delta <= -2` |
| 沉睡高潜 | `days_this == 0` 且 `lesson >= 10` |
| 超级转化 | `days_this >= 4` 且 `registrations >= 2` |

## 验证

- `ruff check`：All checks passed
- Import 验证：`from backend.api.checkin import router` → OK，路由列表包含 `/checkin/student-analysis`
- Git commit：`1bf19945`，push 成功

## 数据来源

- D4（`students`）：主数据源，59 列，含本月/上月打卡天数、课耗、推荐、续费、CC 拨打日期等
- D3（`detail`）：辅助联表，通过 `stdt_id` 获取今日 `有效打卡` 状态
