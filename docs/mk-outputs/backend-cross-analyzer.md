# Wave 1 后端：交叉分析引擎 + API

## 交付摘要

- **CrossAnalyzer**（`backend/core/cross_analyzer.py`）：接收 `dm.load_all()` data dict，提供 5 个分析方法
- **AttributionSummary/BreakdownItem/SimulationResult**（`backend/models/attribution.py`）：归因 Pydantic 模型
- **WarroomStudent/TimelineEvent/StudentTimeline**（`backend/models/warroom.py`）：作战室 Pydantic 模型
- **attribution API**（`backend/api/attribution.py`）：3 个 GET 端点
- **hp_warroom API**（`backend/api/hp_warroom.py`）：2 个 GET 端点
- **main.py**：ROUTER_REGISTRY 新增 `attribution` + `hp_warroom`

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/attribution/summary` | GET | D1 第一行全字段（英文 key）→ AttributionSummary |
| `/api/attribution/breakdown` | GET | 归因拆解（group_by: enclosure/cc/channel/lifecycle）→ list[AttributionBreakdownItem] |
| `/api/attribution/simulate` | GET | 转化率模拟（segment + new_rate）→ SimulationResult |
| `/api/hp-warroom` | GET | 高潜作战室列表（urgency/cc_names 过滤）→ list[WarroomStudent] |
| `/api/hp-warroom/timeline` | GET | 单个高潜学员时间线（stdt_id）→ StudentTimeline |

## CrossAnalyzer 方法

| 方法 | 数据源 | 核心逻辑 |
|------|--------|---------|
| `attribution_summary()` | D1 | 第一行 18 列映射为英文 key dict |
| `attribution_breakdown(group_by)` | D2/D4 | enclosure/cc→D2 过滤有效+非小计 按维度 sum；channel/lifecycle→D4 按列聚合 |
| `attribution_simulation(segment, new_rate)` | D1+D2 | 指定围场注册数×new_rate=new_paid，计算 delta，预测整体达成率 |
| `hp_warroom(urgency, cc_names)` | D5+D3 | D5 left merge D3（stdt_id），聚合接触次数/打卡/最近联络日，计算 urgency_level |
| `hp_timeline(stdt_id)` | D3+D4+D5 | 三表联查，D3 按日期排序为时间线 |

## urgency_level 判定规则

- `high`：days_remaining ≤ 7，或已有带新但零付费
- `medium`：days_remaining ≤ 15，或 contact_count < 2
- `low`：其余

## lint 状态

ruff check: All checks passed (新增 5 个文件)
模块导入: 全部成功
路由注册: attribution=3 routes, hp_warroom=2 routes
