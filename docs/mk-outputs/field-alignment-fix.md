# P0 字段对齐修复报告

## 修复范围

后端 API 返回字段名与前端 TypeScript 类型不匹配，导致所有页面渲染崩溃。修复 6 个模块共 30+ 处字段名不一致。

## 变更文件清单

| 文件 | 变更类型 | 变更说明 |
|------|---------|---------|
| `backend/models/attribution.py` | 重命名 12 字段 | attendance→attendances, paid_count→payments, avg_price→avg_order_value, total_revenue_usd→total_revenue, attend_to_paid_rate→attend_to_pay_rate, reg_to_paid_rate→registration_conversion_rate, target_paid_count→monthly_target_units, target_revenue_usd→monthly_target_revenue, target_avg_price_usd→target_order_value, region_count_attainment→unit_achievement_rate, region_revenue_attainment→revenue_achievement_rate, region_price_attainment→order_value_achievement_rate; SimulationResult.predicted_attainment_pct→predicted_achievement; AttributionBreakdownItem.label→group_key, total_revenue_usd→revenue |
| `backend/models/warroom.py` | 新增模型 | 新增 DailyContact（cc_connected/ss_connected/lp_connected/valid_checkin/new_reg/new_attend/new_paid）、WarroomTimelineProfile、WarroomTimeline；TimelineEvent 和 StudentTimeline 保留为内部模型 |
| `backend/models/daily_monitor.py` | 重命名字段+新增字段 | DailyContactStats: overall_cc_rate→cc_contact_rate, overall_ss_rate→ss_contact_rate, overall_lp_rate→lp_contact_rate, segment_breakdown→by_segment; 新增 total_students, checkin_rate; FunnelStat: paid_count→payments, 新增 invitations/revenue_usd; ContactSegmentStat: student_count→students |
| `backend/models/cc_matrix.py` | 新增模型 | 新增 CCHeatmapResponse（rows/cols/data 字段） |
| `backend/models/enclosure_health.py` | 重命名字段+新增字段 | participation_rate→participation, conversion_rate→conversion, checkin_rate→checkin; 新增 level（>=80→green, 60-80→yellow, <60→red） |
| `backend/core/cross_analyzer.py` | 修复 col_map + 6个方法输出 | attribution_summary col_map 全量对齐; _breakdown_d2/_agg_d4: label→group_key, total_revenue_usd→revenue; attribution_simulation: predicted_attainment_pct→predicted_achievement; hp_timeline: 重构输出为 {stdt_id, profile, daily_log, is_high_potential}; daily_contact_stats: 全量重命名+新增 total_students/checkin_rate; cc_enclosure_heatmap: cells→data, cc_names→rows, segments→cols; enclosure_health_scores: 字段重命名+level计算 |
| `backend/api/hp_warroom.py` | 更新 response_model | timeline endpoint 返回 WarroomTimeline 替代 StudentTimeline |
| `backend/api/daily_monitor.py` | 更新字段引用 | 使用新字段名构建 DailyContactStats |
| `backend/api/cc_matrix.py` | 更新 response_model | heatmap endpoint 返回 CCHeatmapResponse，添加强类型响应 |

## 验证

- ruff check: 全部通过（0 errors）
- 前端类型来源: `frontend/lib/types/cross-analysis.ts`（真理来源，未修改）
