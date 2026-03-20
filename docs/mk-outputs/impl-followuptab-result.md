# FollowupTab 实现结果

## 产出文件

- `frontend/components/checkin/FollowupTab.tsx` — 531 行，tsc 0 errors，已 commit+push (5e6bcfb0)

## 功能覆盖

| 需求 | 状态 |
|------|------|
| 角色切换 CC/SS/LP/运营 | ✓ |
| 团队下拉（动态 from API） | ✓ |
| 销售姓名搜索 🔍 | ✓ |
| 围场多选（M0-M6+） | ✓ |
| 列表按 quality_score 降序 | ✓ (后端排序，API 返回即顺序) |
| 深色表头（--n-800） | ✓ |
| 🔥 quality_score ≥70 橙色 border-left 4px | ✓ |
| CC末次联系 >7天 红色"超7天" | ✓ |
| 卡到期 ≤30天 橙色 | ✓ |
| 展开行查看全部 D4 字段 | ✓ (inline ExpandedRow) |
| 底部统计（总数/均分/高质量占比）| ✓ |
| MemberDetailDrawer 复用 | ✓ (null→undefined 字段归一化) |
| font-mono tabular-nums 数字列 | ✓ |

## API 接口期望

`GET /api/checkin/followup?role=CC&team=xxx&sales=xxx&enclosure=M0,M1`

Response shape:
```json
{
  "items": [{"rank":1,"quality_score":85,"id":"...","enclosure":"0-30","responsible":"Alice",...}],
  "total": 42,
  "avg_quality_score": 63.5,
  "high_quality_count": 12,
  "teams": ["THCC-A","THCC-B"]
}
```
