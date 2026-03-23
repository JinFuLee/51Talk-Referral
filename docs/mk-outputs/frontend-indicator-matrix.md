# MK Output: Frontend Indicator Matrix

## 任务摘要

为 ref-ops-engine 创建指标矩阵前端组件和页面，包括 TypeScript 类型、SWR hook、Settings 配置卡片、独立矩阵总览页面，以及对现有文件的 3 处修改。

## 创建的文件

| 文件 | 说明 |
|------|------|
| `frontend/lib/types/indicator-matrix.ts` | TS 接口：IndicatorDef / RoleMatrix / IndicatorMatrix + 分类标签常量 |
| `frontend/lib/hooks/useIndicatorMatrix.ts` | SWR hook，封装 registry + matrix 双端点，提供 getActiveForRole 工具函数 |
| `frontend/app/settings/IndicatorMatrixCard.tsx` | Settings 页配置卡片：8 category 折叠分组，CC 锁定，SS/LP 可编辑 checkbox 矩阵 |
| `frontend/app/indicator-matrix/page.tsx` | 独立总览页：三栏筛选 + 矩阵表格 + CC only 差异高亮 + 统计摘要栏 + 导出 CSV |

## 修改的文件

| 文件 | 变更 |
|------|------|
| `frontend/lib/api.ts` | 新增 `indicatorMatrixAPI` 命名空间（getRegistry/getMatrix/putMatrix/resetMatrix） |
| `frontend/app/settings/page.tsx` | 导入并挂载 `<IndicatorMatrixCard />` |
| `frontend/components/layout/NavSidebar.tsx` | 系统分组新增「指标矩阵」导航项（LayoutGrid 图标，href=/indicator-matrix） |
| `frontend/lib/translations.ts` | 新增 zh + th 各 15 个 matrix.* 翻译 key |

## 验证结果

```
npx tsc --noEmit → 0 errors
```

## 设计说明

- 所有 UI 组件使用项目 CSS 变量（`--bg-surface`, `--text-primary`, `--border-default` 等）和 `n-*` / `brand-*` Tailwind token，0 处硬编码色值
- CC 列使用锁形图标 + 视觉标记（只读，全量启用）
- `availability !== 'available'` 的指标 checkbox 禁用 + 样式弱化
- 差异高亮：CC 有但 SS/LP 均无的指标行浅红色背景 + "CC 独有"标签
- 导出 CSV 含 BOM 头（\ufeff）确保 Excel 中文正常显示
- SWR mutate 乐观更新后重新验证服务端数据
