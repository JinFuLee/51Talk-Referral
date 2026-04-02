# M38 Frontend — 月份选择器实现报告

## 完成状态：全部 4 项已完成

## 变更文件列表

| 文件 | 类型 | 说明 |
|------|------|------|
| `frontend/lib/stores/config-store.ts` | 修改 | 新增 `selectedMonth` state + `setSelectedMonth` setter + `validateSelectedMonth` validator |
| `frontend/lib/hooks/use-filtered-swr.ts` | 修改 | 附加 `month=YYYYMM` 参数 + 历史月 SWR 缓存策略 |
| `frontend/components/ui/UnifiedFilterBar.tsx` | 修改 | 月份下拉（最左侧）+ `/api/archives/months` 数据源 + 橙色历史选中样式 |
| `frontend/components/shared/HistoricalMonthBanner.tsx` | 新增 | 历史月份黄色警告横幅 + "返回当月"按钮 |
| `frontend/app/[locale]/layout.tsx` | 修改 | 插入 `<HistoricalMonthBanner />` 在 `<UnifiedFilterBar />` 之后 |
| `frontend/messages/zh.json` | 修改 | `monthSelector` 命名空间 5 个 key |
| `frontend/messages/en.json` | 修改 | 同上（英文） |
| `frontend/messages/th.json` | 修改 | 同上（泰文） |
| `frontend/messages/zh-TW.json` | 修改 | 同上（繁中） |

## 技术要点

### 1. config-store.ts — selectedMonth state
- 类型：`string | null`（YYYYMM 格式或 null = 当前月）
- 加入 `persist` middleware，localStorage 持久化
- `validateSelectedMonth()`：校验 6 位数字正则 `/^\d{6}$/`，非法值归零为 null

### 2. useFilteredSWR — month 参数附加规则
- `selectedMonth !== null && selectedMonth !== getCurrentYYYYMM()` 才附加 `month=YYYYMM`
- 历史月份自动启用 `revalidateOnFocus: false, dedupingInterval: 60000`（数据不再变化）
- 合并逻辑：调用方传的 `config` 优先级高于历史月自动策略

### 3. UnifiedFilterBar — 月份下拉
- 数据源：`/api/archives/months`（已有后端端点，返回归档的 YYYYMM 列表）
- 当月始终排在第一位，其余历史月份按降序排列（最近月份优先）
- 当月选中：默认样式（`bg-[var(--bg-subtle)]`）
- 历史月选中：橙色轮廓（`bg-amber-50 border-amber-400 text-amber-700`）
- 图标：`CalendarDays`（lucide-react）

### 4. HistoricalMonthBanner
- 条件渲染：`selectedMonth !== null && selectedMonth !== currentYYYYMM`
- 样式：`bg-amber-50 border-b border-amber-200 text-amber-800`
- 包含"返回当月"按钮，点击 `setSelectedMonth(null)`
- 文案：`正在查看 2026年3月 历史数据 — 部分操作已禁用`

## 验收指令

```bash
# 1. 前端类型检查
cd frontend && npx tsc --noEmit

# 2. 启动后端
DATA_SOURCE_DIR="$HOME/Desktop/转介绍中台监测指标" uv run uvicorn backend.main:app --host 0.0.0.0 --port 8100

# 3. 启动前端
cd frontend && npm run dev

# 4. 浏览器验证
# http://localhost:3100
# → FilterBar 最左侧出现日历图标 + 月份下拉
# → 当月显示 "2026年4月（当月）"
# → 选历史月 → URL 携带 ?month=YYYYMM → 橙色边框
# → 页面出现黄色 banner "正在查看 2026年X月 历史数据"
# → 点"返回当月" → banner 消失 → 恢复当月数据
```

## TypeScript 类型检查结果
`npx tsc --noEmit` — 0 errors ✅
