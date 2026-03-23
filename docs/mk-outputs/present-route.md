# TAG-PRESENT 完成报告

## 变更文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/lib/stores/presentation-store.ts` | Edit | 新增 currentSlide / nextSlide / prevSlide / setCurrentSlide |
| `frontend/lib/presentation/types.ts` | Edit | 新增 SlideEntry 接口 |
| `frontend/app/present/[audience]/[timeframe]/page.tsx` | Create | 动态路由核心页面 |

## 实现摘要

### presentation-store.ts — 新增 slide 导航状态
- `currentSlide: number`（0-indexed）
- `setCurrentSlide(n)` / `nextSlide(total)` / `prevSlide()`
- `exitPresentationMode` 同时重置 `currentSlide: 0`

### types.ts — 新增 SlideEntry 接口
```typescript
export interface SlideEntry {
  id: string
  section: string
  title: string
  subtitle?: string
}
```

### [audience]/[timeframe]/page.tsx — 动态路由完整实现

**参数验证**
```typescript
const VALID_COMBINATIONS = {
  gm: ["daily", "weekly", "monthly", "quarterly", "yearly"],
  "ops-director": ["daily", "weekly", "monthly"],
  crosscheck: ["weekly", "monthly", "quarterly"],
}
```
无效组合 → `router.replace('/present')`

**Playlist 注册表（按场景 × 顺序）**

| 场景 | Slides（顺序） |
|------|---------------|
| gm | TargetGap → RevenueContribution → ThreeFactor → ConversionRate → Scenario → ChannelRevenue |
| ops-director | TargetGap → FunnelAttribution → ConversionRate → LeadAttribution → NetAttribution → ChannelRevenue → ThreeFactor |
| crosscheck | RevenueContribution → LeadAttribution → NetAttribution → RevenueDecomposition → ThreeFactor |

**键盘导航**
- ArrowRight / Space → nextSlide
- ArrowLeft / Backspace → prevSlide
- Escape → exitPresentationMode + router.push('/present')

**全屏**：mount 时 `requestFullscreen()`，退出时 `exitFullscreen()`，均 try/catch 包裹。

**与 Settings 联动**：所有 Slide 内部通过 SWR 从 API 获取数据，API 后端读取 config 文件（围场分工 / 指标矩阵），Settings 变更自动反映。Playlist 是 UI 编排层，无业务硬编码。

## 验证结果
```
npx tsc --noEmit 2>&1 | tail -5
# 输出：components/checkin/RankingTab.tsx(153,85): error TS2722: Cannot invoke an object which is possibly 'undefined'.
# 该错误为预存在 bug（RankingTab.tsx），本次变更零引入新错误
```
