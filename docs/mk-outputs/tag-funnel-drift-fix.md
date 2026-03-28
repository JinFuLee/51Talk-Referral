# Tag-Funnel: 漏斗 API 字段 drift 修复报告

## 状态
✓ 已完成 | commit d3717c80 | push 成功

## 修复内容

### Part 1: FunnelStage 新增 target_rate / rate_gap
- 文件：`backend/models/funnel.py`
- 在 `FunnelStage` 模型追加两个可空字段：`target_rate` 和 `rate_gap`
- 文件：`backend/core/scenario_engine.py` L131-135
- 转化率环节循环（CONVERSION_PAIRS）赋值新字段，前端 `conversionChartData` 不再需要 fallback 计算

### Part 2: ScenarioResult 新增前端兼容别名
- 文件：`backend/models/funnel.py`
- `ScenarioResult` 追加：`stage / current_rate / scenario_rate / impact_registrations / impact_payments / impact_revenue`
- 文件：`backend/core/scenario_engine.py` L211-245
- `compute_scenario()` 末尾赋值所有别名字段；`impact_registrations=0`（场景推演不改注册数，只改转化率）
- 遗留字段 `scenario_stage / scenario_rate_current / scenario_rate_target / incremental_*` 保留向后兼容

### Part 3: 前端 workaround 清理
- 文件：`frontend/app/funnel/page.tsx` L105-113
- 去除 `s.scenario_stage ?? s.stage`、`s.scenario_rate_current ?? s.current_rate`、`s.incremental_payments ?? s.impact_payments` 等 fallback 链，直接消费后端新字段
- 文件：`frontend/components/funnel/ScenarioTable.tsx` L39/42/45
- 3 处裸 `.toLocaleString()` 改为 `(s.impact_registrations ?? 0).toLocaleString()` 等，消除 TypeError 风险

## 验收核查
| 项 | 结果 |
|---|---|
| ruff check backend/ | ✓ 零错误 |
| pre-commit hooks（eslint + prettier） | ✓ 全通过 |
| git commit | ✓ d3717c80 |
| git push | ✓ main -> main |

## 变更文件
- `backend/models/funnel.py` — +10 行（2 个 Pydantic 字段组）
- `backend/core/scenario_engine.py` — +17 行（字段赋值）
- `frontend/app/funnel/page.tsx` — workaround 映射精简（-7/+7 行）
- `frontend/components/funnel/ScenarioTable.tsx` — null guard +3 处
