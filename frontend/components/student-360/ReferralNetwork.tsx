'use client';

import { useTranslations } from 'next-intl';
import type { Student360Network } from '@/lib/types/cross-analysis';
import { ArrowDown, ArrowUp, Users } from 'lucide-react';
import { formatRevenue } from '@/lib/utils';
interface ReferralNetworkProps {
  network: Student360Network | null;
  isLoading: boolean;
}

function NetworkNode({
  stdt_id,
  name,
  paid_amount,
  type,
  unknownLabel,
}: {
  stdt_id: string;
  name: string;
  paid_amount?: number;
  type: 'center' | 'referrer' | 'referral';
  unknownLabel: string;
}) {
  const bg =
    type === 'center'
      ? 'bg-action-accent-surface border-action-accent-subtle'
      : type === 'referrer'
        ? 'bg-accent-surface border-accent-token'
        : 'bg-success-surface border-success-token';

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${bg} text-sm`}>
      <div>
        <div className="font-medium text-xs font-mono">{stdt_id}</div>
        <div className="text-secondary-token text-xs">{name || unknownLabel}</div>
        {paid_amount != null && (
          <div className="text-muted-token text-[10px]">{formatRevenue(paid_amount)}</div>
        )}
      </div>
    </div>
  );
}

export function ReferralNetwork({ network, isLoading }: ReferralNetworkProps) {
  const t = useTranslations('ReferralNetwork');

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-token">{t('loading')}</div>;
  }

  if (!network) {
    return <div className="py-8 text-center text-sm text-muted-token">{t('noNetwork')}</div>;
  }

  return (
    <div className="space-y-4">
      {/* 推荐人 */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-token flex items-center gap-1">
          <ArrowUp className="w-3 h-3" /> {t('referrer')}
        </div>
        {network.referred_by ? (
          <NetworkNode
            stdt_id={network.referred_by.stdt_id}
            name={network.referred_by.name}
            type="referrer"
            unknownLabel={t('unknown')}
          />
        ) : (
          <div className="text-xs text-muted-token px-3 py-2 border border-dashed border-subtle-token rounded-lg">
            {t('noReferrer')}
          </div>
        )}
      </div>

      {/* 分割线 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 border-t border-subtle-token" />
        <span className="text-[10px] text-muted-token uppercase tracking-wider">
          {t('currentStudent')}
        </span>
        <div className="flex-1 border-t border-subtle-token" />
      </div>

      {/* 当前学员 */}
      <NetworkNode
        stdt_id={network.center.stdt_id}
        name={network.center.name}
        type="center"
        unknownLabel={t('unknown')}
      />

      {/* 分割线 */}
      <div className="flex items-center gap-2">
        <ArrowDown className="w-3 h-3 text-muted-token" />
        <div className="text-xs font-medium text-muted-token flex items-center gap-1">
          <Users className="w-3 h-3" /> {t('referrals')} {network.referrals.length}
          {t('referralsSuffix')}
        </div>
      </div>

      {/* 被推荐人列表 */}
      {network.referrals.length === 0 ? (
        <div className="text-xs text-muted-token px-3 py-2 border border-dashed border-subtle-token rounded-lg">
          {t('noReferrals')}
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
              unknownLabel={t('unknown')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
