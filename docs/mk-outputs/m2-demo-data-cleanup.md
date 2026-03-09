# M2 Demo Data Cleanup — 结果报告

## 任务摘要

清除 backend 4 个 API 文件中的合成业务数据函数，无数据时统一返回标准空态结构。

## 变更清单

### backend/api/cohort_student.py
- 删除 `_demo_cc_ranking()`（假泰文姓名 8 条）
- 删除 `_demo_retention_curve()`（假留存曲线 12 条）
- 删除 `_demo_team_list()`（假团队列表 4 条）
- 修复 `total or 8806` → `total or 0`（8806 为假学员总数）
- `data_source == "demo"` 分支改为返回标准空态：
  `{"available": False, "data_source": "no_data", "empty_reason": "无学员数据源可用", "data": {"total_students": 0, "cc_ranking": [], "retention_curve": [], "by_team": []}}`

### backend/api/cohort_decay.py
- 删除 `_demo_coefficient_by_month()`（假 6 入组月 × m1-m12 系数）
- 重写 `_fallback_decay()`：移除 decay_rates / base_m1 / demo_months 合成逻辑，返回空态
- `get_cohort_coefficient` 端点：`not by_month` 时返回标准空态

### backend/api/cohort_detail.py
- 删除 `_mock_decay_series()`（死代码，从未调用）
- `get_cohort_decay` 端点：`not by_cohort_month` 时返回空态，`data_source` 固定为 `"cohort_roi"`
- `get_cohort_heatmap` 端点：`not by_month_raw` 时返回空态（原演示 6 条硬编码数据删除）

### backend/api/presentation.py
- `_fallback_action_plan()`：`status: "fallback"` → `"unavailable"`，`items: []`（删除假提示条目）
- `_fallback_meeting_summary()`：`status: "fallback"` → `"unavailable"`，`consensus: []`（删除"数据暂未加载"提示文字），`next_meeting_topic: ""`
- `_fallback_resource_request()`：`status: "fallback"` → `"unavailable"`，`categories: []`（删除"增加CC外呼配置"假业务推荐）

### scripts/check_imports.sh
- 新增 BANNED_PATTERNS 检测：`def _(demo|mock)_*` 函数名模式
- 退出码 1 = 发现裸导入或合成数据函数

## SEE 闭环验证

| 步骤 | 结果 |
|------|------|
| 全局扫描 `_demo_\|total or 8806\|MOCK_DATA\|isMock\|_mock_` | 0 命中 |
| pytest backend/tests/ | 332 passed, 2 skipped, 0 failures |
| check_imports.sh | OK: 0 裸导入，0 合成数据函数 |

## 删除的合成数据函数

| 函数 | 文件 | 类型 |
|------|------|------|
| `_demo_cc_ranking()` | cohort_student.py | 假泰文姓名 + 假绩效 |
| `_demo_retention_curve()` | cohort_student.py | 假留存曲线 |
| `_demo_team_list()` | cohort_student.py | 假团队列表 |
| `_demo_coefficient_by_month()` | cohort_decay.py | 假系数数据 |
| `_mock_decay_series()` | cohort_detail.py | 假衰减序列（死代码） |
