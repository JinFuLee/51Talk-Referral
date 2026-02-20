import { redirect } from 'next/navigation';

// 历史记录入口 — 重定向到快照管理页
export default function HistoryPage() {
  redirect('/snapshots');
}
