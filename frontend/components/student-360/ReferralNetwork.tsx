'use client';

import type { Student360Network } from '@/lib/types/cross-analysis';
import { ArrowDown, ArrowUp, Users } from 'lucide-react';

interface ReferralNetworkProps {
  network: Student360Network | null;
  isLoading: boolean;
}

function NetworkNode({
  stdt_id,
  name,
  paid_amount,
  type,
}: {
  stdt_id: string;
  name: string;
  paid_amount?: number;
  type: 'center' | 'referrer' | 'referral';
}) {
  const bg =
    type === 'center'
      ? 'bg-blue-50 border-blue-300'
      : type === 'referrer'
        ? 'bg-purple-50 border-purple-300'
        : 'bg-green-50 border-green-300';

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${bg} text-sm`}>
      <div>
        <div className="font-medium text-xs font-mono">{stdt_id}</div>
        <div className="text-[var(--text-secondary)] text-xs">{name || '未知'}</div>
        {paid_amount != null && (
          <div className="text-[var(--text-muted)] text-[10px]">
            ${paid_amount.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

export function ReferralNetwork({ network, isLoading }: ReferralNetworkProps) {
  if (isLoading) {
    return <div className="py-8 text-center text-sm text-[var(--text-muted)]">加载中...</div>;
  }

  if (!network) {
    return (
      <div className="py-8 text-center text-sm text-[var(--text-muted)]">暂无推荐网络数据</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 推荐人 */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
          <ArrowUp className="w-3 h-3" /> 推荐人（上游）
        </div>
        {network.referred_by ? (
          <NetworkNode
            stdt_id={network.referred_by.stdt_id}
            name={network.referred_by.name}
            type="referrer"
          />
        ) : (
          <div className="text-xs text-[var(--text-muted)] px-3 py-2 border border-dashed border-[var(--border-subtle)] rounded-lg">
            无推荐人（直接渠道）
          </div>
        )}
      </div>

      {/* 分割线 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 border-t border-[var(--border-subtle)]" />
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
          当前学员
        </span>
        <div className="flex-1 border-t border-[var(--border-subtle)]" />
      </div>

      {/* 当前学员 */}
      <NetworkNode stdt_id={network.center.stdt_id} name={network.center.name} type="center" />

      {/* 分割线 */}
      <div className="flex items-center gap-2">
        <ArrowDown className="w-3 h-3 text-[var(--text-muted)]" />
        <div className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
          <Users className="w-3 h-3" /> 被推荐人（下游 {network.referrals.length} 人）
        </div>
      </div>

      {/* 被推荐人列表 */}
      {network.referrals.length === 0 ? (
        <div className="text-xs text-[var(--text-muted)] px-3 py-2 border border-dashed border-[var(--border-subtle)] rounded-lg">
          暂无被推荐人
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {network.referrals.map((r) => (
            <NetworkNode
              key={r.stdt_id}
              stdt_id={r.stdt_id}
              name={r.name}
              paid_amount={r.paid_amount}
              type="referral"
            />
          ))}
        </div>
      )}
    </div>
  );
}
