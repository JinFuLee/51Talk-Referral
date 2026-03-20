# MK 产出：打卡面板 Tab 1 汇总视图

## 变更文件

- `frontend/app/checkin/page.tsx` — 新建（252 行）
- `frontend/components/layout/NavSidebar.tsx` — 添加打卡管理菜单项

## 交付内容

### 页面骨架
- 3 个 Tab：汇总视图 / 团队明细 / 未打卡跟进
- Tab 切换使用项目内已有 `PageTabs` 组件
- Tab 2/3 为 placeholder（其他 MK 负责）

### Tab 1: 汇总视图
- 调用 `GET /api/checkin/summary`，useSWR + swrFetcher
- 4 列布局（CC / SS / LP / 运营），响应式（sm:2列 → xl:4列）
- 每列：总体大数字（有效学员数 + 打卡率）+ 按团队表格 + 按围场表格
- 打卡率颜色编码：>=60% 绿色, 40-60% 黄色, <40% 红色
- 深色表头（`--n-800`）+ 紧凑行（`py-1 px-2`）Excel 风格
- loading / error / empty 3 态全覆盖

### NavSidebar
- 添加 `{ href: "/checkin", label: "打卡管理", Icon: CheckCircle }`
- 位置：团队汇总（分析 group）后、分析报告（系统 group）前

## 验证
- `npx tsc --noEmit` 0 错误
- ESLint + Prettier 通过（pre-commit hook 自动格式化）
- git commit 26af5993，已 push main
