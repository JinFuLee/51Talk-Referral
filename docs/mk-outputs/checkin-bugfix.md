# 打卡页面崩溃修复报告

**日期**: 2026-03-23
**任务**: 修复打卡管理页面（/checkin）整页崩溃

## 根因

`_aggregate_ops_channels()` 返回的运营 role 数据缺少 `by_team` 和 `by_enclosure` 字段，导致 `SummaryTab` 中 `ChannelColumn` 访问 `ch.by_team.length` → `undefined.length` → TypeError 崩溃。

## 修复内容

### Fix 1: backend/api/checkin.py

`_aggregate_ops_channels()` return dict 补充两个字段：

```python
"by_team": [],        # 兼容 SummaryTab ChannelColumn（运营无团队拆分）
"by_enclosure": [],   # 兼容 SummaryTab ChannelColumn（运营无围场拆分）
```

### Fix 2a: frontend/app/checkin/page.tsx — ChannelColumn 防御访问

- `ch.by_team.length` → `(ch.by_team ?? []).length`
- `ch.by_team.map` → `(ch.by_team ?? []).map`
- `ch.by_enclosure.length` → `(ch.by_enclosure ?? []).length`
- `ch.by_enclosure.map` → `(ch.by_enclosure ?? []).map`

### Fix 2b: frontend/app/checkin/page.tsx — SummaryTab 过滤运营 role

```tsx
Object.entries(byRole)
  .filter(([role]) => role !== '运营')  // 运营有独立 OpsChannelView
  .map(...)
```

### Fix 3: SEE 全局扫描

Grep 搜索 `by_team|by_enclosure` 全量 tsx 文件，0 处其他裸访问（`OpsChannelView.tsx` 使用 `by_enclosure_segment` 不同字段，已有 `?? []` 防御）。

## 变更文件

- `backend/api/checkin.py`
- `frontend/app/checkin/page.tsx`

## Git Commit

`ce697d63` — fix: 修复打卡页面崩溃（运营 role 缺少 by_team/by_enclosure 字段）
