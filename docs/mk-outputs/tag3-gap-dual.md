# Tag3: GapDashboardSlide 双排并排重构

## 完成内容

**文件**: `frontend/components/analytics/GapDashboardSlide.tsx`

### 改动摘要
- 删除 `GapView` 类型、`useState` hook、toggle 按钮组、`activeData` 变量
- `'use client'` 保留（组件内渲染函数需要 closure）
- 新增 `renderGapCard` 内部函数，支持 `compact` 参数（BM section 用 `p-2`/`text-sm` 更小）
- **Section 1（月度达标，主）**：2 列 6 卡片 + 渠道缺口表格；`monthlyData` 为 null 时显示空态
- **Section 2（BM 进度，次）**：3 列 6 卡片，更紧凑，`pt-3 border-t` 分隔

### Props 保持不变
```typescript
interface Props {
  data: GapDashboard | null | undefined;
  monthlyData?: GapDashboard | null;
  lang: Lang;
}
```

### tsc 验证
- `GapDashboardSlide.tsx` 零错误
- 全局 2 个预存错误（`FollowupTab.tsx` useSWR）与本次改动无关

## 验收状态
✓ tsc 零错误（本文件）
✓ 删除切换逻辑
✓ 双 section 并排布局
✓ 渠道缺口表格仅在月度 section
✓ BM section 3 列紧凑布局
