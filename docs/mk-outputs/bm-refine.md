# BM 盲区修复交付记录

commit: bcd2e977

## 变更文件

- `backend/api/overview.py` — bm_comparison metrics 新增 `target_daily_avg` 字段
- `frontend/lib/types/bm-calendar.ts` — BmMetricItem 新增 `target_daily_avg: number | null`
- `frontend/components/dashboard/BmComparisonTable.tsx` — 4 项变更（见下）
- `frontend/app/settings/BmCalendarCard.tsx` — 权重文案修正

## 4 个盲区修复详情

### 盲区 1: 达标日均列（BE + FE）

**BE** `overview.py:480~487`：在 bm_comparison metrics 循环末尾新增计算
```python
target_daily_avg = round((target_val - actual_val) / remaining, 2) if remaining > 0 ...
```
验证（服务已运行）：
- register: -19.85（超额）
- paid: 3.58
- revenue: 3400.37

**FE** `BmMetricItem` 新增 `target_daily_avg: number | null`
**FE** 表格新增第 8 列，null → 显示 "—"

### 盲区 2: 权重文案错误

`BmCalendarCard.tsx:264` 修正：
- Before: `普通工作日权重 1.0`
- After: `普通工作日权重 3.0，周三权重 1.0`

### 盲区 3: 列头 tooltip

表头改为 `COLUMNS` 对象数组，每列含 `tooltip` 字段。
渲染时 `title={col.tooltip}` + `ⓘ` 符号悬浮提示。

### 盲区 4: BM 行动态过滤

组件新增 `visibleKeys?: string[]` prop。
- 不传 → 全部 5 行显示（向后兼容）
- 传入 `['register', 'paid', 'revenue']` → 仅显示对应行

## 验证

- TypeScript 编译：0 errors
- BE API 字段：target_daily_avg 已返回正确数值
