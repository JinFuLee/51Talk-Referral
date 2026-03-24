'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

interface GeoRow {
  country: string;
  student_count: number;
  pct: number;
  avg_referral_registrations: number | null;
  avg_payments: number | null;
}

type GeoResponse = GeoRow[];

export default function GeoDistributionPage() {
  const { data, isLoading, error } = useSWR<GeoResponse>(
    '/api/analysis/geo-distribution',
    swrFetcher
  );

  const maxCount = data ? Math.max(...data.map((r) => r.student_count), 1) : 1;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">地理分布</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          按常登录国家/地区聚合学员分布及推荐效果
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          定义：常登录国家 = D4 学员数据中的 常登录国家 列 | 平均推荐注册/付费 = 该国学员月均值
        </p>
      </div>

      <Card title={data ? `地理分布 — 共 ${data.length} 个国家/地区` : '地理分布'}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState title="加载失败" description="请检查后端服务是否正常运行" />
        ) : !data || data.length === 0 ? (
          <EmptyState title="暂无地理分布数据" description="需要 D4 学员数据中包含 常登录国家 列" />
        ) : (
          <div className="space-y-0">
            {/* 表头 */}
            <div className="grid grid-cols-[180px_1fr_80px_100px_100px] gap-3 px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] border-b border-[var(--border-default)]">
              <span>国家/地区</span>
              <span>学员占比</span>
              <span className="text-right">学员数</span>
              <span className="text-right">均推荐注册</span>
              <span className="text-right">均推荐付费</span>
            </div>

            {data.map((row) => {
              const barWidth = Math.round((row.student_count / maxCount) * 100);
              return (
                <div
                  key={row.country}
                  className="grid grid-cols-[180px_1fr_80px_100px_100px] gap-3 items-center px-3 py-2.5 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  {/* 国家名 */}
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {row.country}
                  </span>

                  {/* 水平条形图 */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[var(--n-100)] rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono tabular-nums text-[var(--text-muted)] w-12 text-right">
                      {row.pct.toFixed(1)}%
                    </span>
                  </div>

                  {/* 学员数 */}
                  <span className="text-sm font-mono tabular-nums text-right text-[var(--text-secondary)]">
                    {row.student_count.toLocaleString()}
                  </span>

                  {/* 均推荐注册 */}
                  <span className="text-sm font-mono tabular-nums text-right text-[var(--text-secondary)]">
                    {row.avg_referral_registrations != null
                      ? row.avg_referral_registrations.toFixed(1)
                      : '—'}
                  </span>

                  {/* 均推荐付费 */}
                  <span className="text-sm font-mono tabular-nums text-right text-[var(--text-secondary)]">
                    {row.avg_payments != null ? row.avg_payments.toFixed(1) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
