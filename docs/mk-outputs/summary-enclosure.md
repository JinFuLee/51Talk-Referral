# summary API enclosure 参数支持

## 任务
`GET /api/checkin/summary` 补充 enclosure 可选参数，使概览 Tab 角色汇总 grid 跟随统一筛选栏的围场过滤。

## 变更

### 后端 `backend/api/checkin.py`
- `get_checkin_summary` 新增参数：`enclosure: str | None = Query(default=None)`
- 参数解析：M 标签（如 M0）→ 反向映射 `_M_MAP` → 原始围场值（如 `0~30`）
- 在进入角色聚合循环前，对 `d3` 做全局交叉过滤：`d3[d3[_D3_ENCLOSURE_COL].isin(enc_filter_raws)]`
- 无参数时行为不变（向后兼容）

### 前端 `frontend/components/checkin/SummaryTab.tsx`
- summary URL 追加 `&enclosure=${encodeURIComponent(enclosureFilter)}`（enclosureFilter 非 null/空 时才追加）
- SWR key 随筛选变化自动重新请求

## 验证结果
```
全局（无 enclosure）: CC 1958 students
M0（enclosure=M0）:   CC  788 students
M1（enclosure=M1）:   CC  630 students
```

## commit
`ee1a0122` — feat(checkin): summary API 补 enclosure 参数支持，前端 SummaryTab 跟随筛选栏过滤
