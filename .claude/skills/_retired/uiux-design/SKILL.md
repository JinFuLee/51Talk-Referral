---
name: uiux-design
description: UI/UX 设计规范生成与组件方案 — 适配 ref-ops-engine 的 shadcn/ui + Recharts + 中泰双语 + 运营数据可视化设计语言
when_to_use: UI/UX 任务时自动触发（全局 CLAUDE.md 规定）；新增图表组件、页面布局、数据卡片时使用
version: 1.0.0
---

# /uiux-design — UI/UX 设计规范（ref-ops-engine 适配版）

## 项目上下文

- **UI 库**：shadcn/ui（基于 Tailwind CSS）
- **图表库**：Recharts
- **字体/语言**：中泰双语，动态路由 `[locale]`（`zh` / `th`）
- **国际化**：Next.js i18n，键值存储于 `frontend/lib/i18n/`，M3.6 基准 147 键
- **设计参考文件**：`~/.claude/contexts/uiux-design-laws.md`（全局设计法则）

## 项目设计语言规范

### 色彩体系（运营数据可视化）
| 用途 | 颜色 | Tailwind Class |
|------|------|---------------|
| 超额/正向 | 绿色 | `text-green-600` / `bg-green-50` |
| 落后/负向 | 红色 | `text-red-600` / `bg-red-50` |
| 接近目标（-5%~0%）| 黄色 | `text-yellow-600` / `bg-yellow-50` |
| 主色调（品牌信任）| 蓝色 | `text-blue-600` / `bg-blue-50` |
| 中性/背景 | 灰色 | `text-gray-600` / `bg-gray-50` |
| Mock 降级标识 | 琥珀色 | `bg-amber-50` / `text-amber-700` |

### 状态标签规范
```
缺口 >0%  = 绿色 badge "超额"
-5%~0%    = 黄色 badge "落后"
<-5%      = 红色 badge "严重"
```

### KPI 卡片必备 8 项（数值类）
每个数值 KPI 卡片必须展示：
1. 当前实际值（大字，主信息）
2. 本月目标
3. 目标绝对差（`actual - target`，正绿负红）
4. 时间进度差（`actual/target - time_progress`）
5. 达标需日均
6. 追进度需日均
7. 效率提升需求（%）
8. 当前日均

使用 `frontend/lib/utils.ts` 中的共享工具函数，禁止硬编码计算逻辑。

### 效率卡片必备 5 项
1. 当前实际率
2. 本月目标率
3. 目标差（正绿负红）
4. 损失量化（$ 损失链）
5. 根因标注

### 货币显示规范（强制）
```typescript
// 使用共享函数，禁止硬编码
import { formatRevenue } from '@/lib/utils'
formatRevenue(usd, exchangeRate)  // 输出: "$1,234 (฿41,956)"
// 禁止: ¥ / CNY / 硬编码 34 汇率
```

### 图表组件选型
| 数据类型 | 推荐组件 | Recharts 类型 |
|---------|---------|--------------|
| 时序趋势 | TrendLineChart | LineChart |
| 排名对比 | BarChart（水平）| BarChart horizontal |
| 漏斗流程 | FunnelEfficiencyPanel | FunnelChart |
| 热力分布 | EnclosureHeatmap | 自定义 grid |
| 占比分析 | PieChart | PieChart |
| 瀑布对比 | ImpactWaterfallChart | ComposedChart |

### 术语展示规范
每个分析页面顶部必须包含 `GlossaryBanner` 组件，展示该页涉及的代称/名词/定义/公式（小字）。

### 双语适配要求
- 所有新增文案必须同时在中文和泰文 i18n 文件中注册
- 组件内禁止硬编码中文字符串，统一用 `useTranslations()` hook
- i18n 键命名：`{页面}.{模块}.{元素}`（如 `ops.ranking.title`）

### Mock 降级 Banner
当组件使用 mock 数据时，必须显示：
```tsx
{isMock && (
  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1 rounded">
    ⚠ 当前显示模拟数据，真实数据接入后自动更新
  </div>
)}
```

## 组件目录规范
```
frontend/components/
├── charts/       # 纯数据可视化（Recharts 封装）
├── biz/          # 业务组件（带业务逻辑）
├── ops/          # 运营操作类组件
├── layout/       # 布局组件（NavSidebar 等）
└── ui/           # shadcn/ui 基础组件（不修改）
```

## 与全局 Skill 的关系
- 全局版路径：~/.claude/skills/uiux-design/SKILL.md（**当前不存在**）
- 全局设计法则参考：`~/.claude/contexts/uiux-design-laws.md`（**文件存在，可 Read**）
- 本适配版在全局设计法则基础上，添加了项目特有的色彩体系、KPI 卡片规范、币种规范
