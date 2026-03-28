import { redirect } from 'next/navigation';

// 运营报告入口 — 重定向到统一报告页（筛选 ops 类型）
export default function ReportsOpsPage() {
  redirect('/reports?type=ops');
}
