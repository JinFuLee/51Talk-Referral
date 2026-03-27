# Phase 2a — 打卡学员分析前端基础层

**完成时间**：2026-03-26
**任务类型**：前端基础设施（Types + Hooks + 共享组件）
**状态**：已交付，tsc 零错误，lint 通过，2 commits

## 交付文件（共 8 个）

| 文件路径 | 类型 | 说明 |
|---------|------|------|
| `frontend/lib/types/checkin-student.ts` | Types | 与后端 API 完整对齐的 TypeScript 类型定义（13 个接口/类型） |
| `frontend/lib/hooks/useStudentAnalysis.ts` | Hook | SWR 封装，自动附加全局 team/cc 过滤参数 |
| `frontend/components/checkin/StudentTagBadge.tsx` | 组件 | 6 种标签彩色 pill badges + overflow 计数 |
| `frontend/components/checkin/StudentFrequencyChart.tsx` | 组件 | 0-6 次精确频次分布柱图（0次红/其余金黄） |
| `frontend/components/checkin/LessonCheckinCross.tsx` | 组件 | 课耗×打卡四象限矩阵，高亮激活机会池 |
| `frontend/components/checkin/ConversionFunnelProof.tsx` | 组件 | 打卡频段×转化漏斗分组柱图 + 倍率 callout |
| `frontend/components/checkin/ContactCheckinChart.tsx` | 组件 | CC触达×打卡响应水平柱图（语义化颜色） |
| `frontend/components/checkin/RenewalCheckinChart.tsx` | 组件 | 续费×打卡关联分组柱图 |

## 关键设计决策

### 类型安全
- `StudentAnalysisResponse` 完整覆盖后端 `student_analysis` 端点所有字段
- `FrequencyItem.count` 精确对应后端 `frequency_distribution[i].count`
- `LessonCheckinCross.has_lesson_no_checkin` 等四象限字段名与后端完全一致
- `ContactCheckinResponse` 使用 `contacted_14d_plus`（后端字段名 `contacted_14d_plus`）

### useStudentAnalysis Hook
- 参数顺序：`useFilteredSWR<T>(basePath, config?, extraParams?)`
- 传 `undefined` 作为 config（无需自定义 SWR 配置），extraParams 可选附加参数

### 图表规范
- 全部使用 `CHART_PALETTE` 颜色常量，禁止硬编码
- 高度固定 280px，宽度 `ResponsiveContainer 100%`
- 0 次频次用 `danger` 红色语义化
- 图表数据为空时渲染友好的空态提示，而非空白

### 四象限矩阵
- 右上角"激活目标池"（有课耗+无打卡）用金色背景 + 🔴 标注"最大激活机会"
- 总学员数 = 四格之和，每格独立计算百分比

### ConversionFunnelProof callout
- 触发条件：最高频段 vs 0 次频段的 `has_registration_pct` 倍率 > 1.5
- 显示格式：`"5-6次打卡学员推荐注册率是零打卡的 N.Nx"`

## 验证结果

```
npx tsc --noEmit → 0 errors
eslint → 0 errors（修复了 JSX 引号转义）
git commits → 2 commits（feat + fix）
```

## 消费方

下一阶段（Phase 2b）的 `StudentAnalysisTab.tsx` 将直接消费这些类型和组件。
