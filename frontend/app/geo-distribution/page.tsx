'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

interface GeoItem {
  country: string;
  student_count: number;
  pct: number;
  avg_referral_registrations: number | null;
  avg_payments: number | null;
}

function BarCell({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[var(--n-100)] rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full"
          style={{
            width: `${Math.min(pct, 100)}%`,
            backgroundColor: 'var(--n-600)',
          }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)] w-10 text-right shrink-0">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

export default function GeoDistributionPage() {
  const { data, isLoading, error } = useSWR<GeoItem[]>(
    '/api/analysis/geo-distribution',
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="数据加载失败"
        description="无法获取地理分布数据，请检查后端服务是否正常运行"
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">地理分布</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">学员常登录国家分布及推荐效果</p>
        </div>
        <EmptyState
          title="暂无地理数据"
          description={'数据源中未找到「常登录国家」列，请上传包含地理信息的学员数据文件'}
        />
      </div>
    );
  }

  const totalStudents = data.reduce((s, r) => s + r.student_count, 0);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">地理分布</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          学员常登录国家分布 · 共 {totalStudents.toLocaleString()} 位学员 · {data.length}{' '}
          个国家/地区
        </p>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {data.slice(0, 4).map((item) => (
          <div
            key={item.country}
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4"
          >
            <p className="text-xs text-[var(--text-muted)] mb-1">{item.country}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {item.student_count.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">占比 {item.pct.toFixed(1)}%</p>
          </div>
        ))}
      </div>

      {/* 国家条形图 + 详细表格 */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th text-left">国家 / 地区</th>
              <th className="slide-th text-right">学员数</th>
              <th className="slide-th" style={{ minWidth: '160px' }}>
                占比分布
              </th>
              <th className="slide-th text-right">人均推荐注册</th>
              <th className="slide-th text-right">人均推荐付费</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={item.country} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                <td className="slide-td font-medium text-[var(--text-primary)]">{item.country}</td>
                <td className="slide-td text-right font-mono tabular-nums">
                  {item.student_count.toLocaleString()}
                </td>
                <td className="slide-td" style={{ minWidth: '160px' }}>
                  <BarCell pct={item.pct} />
                </td>
                <td className="slide-td text-right font-mono tabular-nums">
                  {item.avg_referral_registrations != null ? (
                    item.avg_referral_registrations.toFixed(2)
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>
                <td className="slide-td text-right font-mono tabular-nums">
                  {item.avg_payments != null ? (
                    item.avg_payments.toFixed(2)
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 说明 */}
      <p className="text-xs text-[var(--text-muted)]">
        「常登录国家」来自学员账号注册/登录地理信息 · 人均指标为该国家所有学员的月度平均值
      </p>
    </div>
  );
}
