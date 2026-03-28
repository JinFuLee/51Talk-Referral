# 排行榜围场过滤支持

**完成时间**: 2026-03-26
**commit**: 5a6c8f10

## 变更摘要

### 后端 `/api/checkin/ranking`

新增可选 Query 参数 `enclosure`（M 标签，如 `M0`/`M1`）：
- 将 M 标签通过 `_M_MAP` 反向映射为原始围场值（如 `M0` → `0~30`）
- 在角色默认围场范围内**交叉过滤**，不替换角色围场范围
- 无参数时行为完全不变（向后兼容）

变更位置：`backend/api/checkin.py` L1040–L1100（`get_checkin_ranking` 函数）

### 前端 `RankingTab`

新增 `enclosureFilter?: string | null` prop：
- `useMemo` 动态构建 ranking API URL，有 enclosure 时拼接 `&enclosure=`
- `page.tsx` 将 URL 参数 `enclosure` 传入 `RankingTab`

变更位置：
- `frontend/components/checkin/RankingTab.tsx` — 新增 prop + useMemo URL 构建
- `frontend/app/checkin/page.tsx` — 新增 `enclosureFilter` prop 传递

## 验证结果

```bash
# enclosure=M0 过滤正常
curl "http://localhost:8100/api/checkin/ranking?enclosure=M0"
# → CC M0 only: 1958 students, rate=69.3%

# 无参数向后兼容
curl "http://localhost:8100/api/checkin/ranking"
# → CC all: 1958 students, rate=69.3% （当前数据全为 M0 段）
```
