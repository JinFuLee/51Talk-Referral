# CC 个人目标上传组件 — 交付记录

## 交付内容

### 新建文件
- `frontend/components/cc-performance/CCTargetUpload.tsx`

### 修改文件
- `frontend/app/cc-performance/page.tsx` — 页头区域集成上传按钮

## 组件功能

**CCTargetUpload** 弹窗式 Modal，三步流程：
1. 下载 CSV 模板（调用 `/api/cc-performance/targets/template?month=YYYYMM`）
2. 拖拽或点击上传 .csv/.xlsx，CSV 文件客户端 FileReader 预览前 10 条
3. 确认提交 → `POST /api/cc-performance/targets/upload?month=YYYYMM`（FormData）

删除功能：`DELETE /api/cc-performance/targets/{month}`，恢复按比例分配。

## Props

```tsx
interface CCTargetUploadProps {
  month: string;          // YYYYMM，从 CCPerformanceResponse.month 传入
  onUploadSuccess: () => void;  // 调用 mutate() 刷新 SWR
}
```

## 设计体系合规（12 维度）
- 颜色：全部使用 CSS 变量 token，无硬编码色值
- 卡片/弹窗：`rounded-xl shadow-xl`
- 按钮：`btn-secondary`（取消）+ `bg-[var(--color-accent)]`（确认），`rounded-lg`
- 表格：`slide-thead-row / slide-th / slide-td / slide-row-even/odd`
- 间距：`p-6 / space-y-6`
- 交互：`transition-colors`
- 状态：loading（Loader2 动画）/ error（红色提示）/ success（绿色提示）/ empty（拖拽区域提示）

## TypeScript 验证
`npx tsc --noEmit` — 0 errors ✓

## API 端点（后端待实现）
- `GET  /api/cc-performance/targets/template?month=YYYYMM` — 下载 CSV 模板
- `POST /api/cc-performance/targets/upload?month=YYYYMM` — 上传文件（FormData），返回 `{count, month}`
- `DELETE /api/cc-performance/targets/{month}` — 清除目标
