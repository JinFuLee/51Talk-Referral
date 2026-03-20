# TeamDetailTab 团队明细视图组件

**任务**: MK3 打卡面板 Tab 2 团队明细视图
**产出文件**: `frontend/components/checkin/TeamDetailTab.tsx`
**commit**: e0e7beb9

## 组件说明

`TeamDetailTab` — 打卡面板 Tab 2，无 props，内部自管理状态。

### 团队选择器
按钮组：CC01Team ~ CC06Team / SS / LP / 运营（共 9 个）
选中态：`bg-[var(--n-800)] text-white`

### API 调用
`GET /api/checkin/team-detail?team={selectedTeam}`
useSWR + swrFetcher，30s 自动刷新

### 表格结构
表头：排名 | 销售 | 有效学员 | 已打卡 | 打卡率 | M0 | M1 | M2 | ...
底部汇总行（tfoot）：团队合计行加粗

### 颜色编码
- 打卡率 ≥60%：`text-green-600 font-semibold`
- 打卡率 40-60%：`text-yellow-600 font-semibold`
- 打卡率 <40%：`text-red-600 font-semibold`

### 视觉风格（Excel 密集风）
- 表头：`bg-[var(--n-800)] text-white text-xs`
- 数据行：`py-1 px-2 text-xs`，交替行 `even:bg-[var(--bg-subtle)]`
- 数字：`font-mono tabular-nums text-right`

### 三态处理
- loading：Spinner + "加载中…"
- error："数据加载失败，请稍后刷新重试"
- empty：团队名 + "暂无打卡数据" + 操作指引

## 响应 Schema（前端类型）

```typescript
interface TeamDetailResponse {
  team: string;
  members: CheckinPersonRow[];
  summary: {
    total_students: number;
    total_checked_in: number;
    checkin_rate: number;
    monthly: Record<string, number | null>;
  };
  month_labels: string[];  // ["M0","M1","M2",...]
}

interface CheckinPersonRow {
  name: string;
  valid_students: number;
  checked_in: number;
  checkin_rate: number;
  monthly: Record<string, number | null>;
}
```
