import { redirect } from 'next/navigation';

// 管理层报告入口 — 重定向到统一报告页（筛选 exec 类型）
export default function ReportsExecPage() {
  redirect('/reports?type=exec');
}
