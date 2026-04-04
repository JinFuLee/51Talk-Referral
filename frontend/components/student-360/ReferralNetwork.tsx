'use client';

import { useLocale } from 'next-intl';
import type { Student360Network } from '@/lib/types/cross-analysis';
import { ArrowDown, ArrowUp, Users } from 'lucide-react';
import { formatRevenue } from '@/lib/utils';

const I18N = {
  zh: {
    loading: '加载中...',
    noNetwork: '暂无推荐网络数据',
    referrer: '推荐人（上游）',
    noReferrer: '无推荐人（直接渠道）',
    currentStudent: '当前学员',
    referrals: '被推荐人（下游',
    referralsSuffix: '人）',
    noReferrals: '暂无被推荐人',
    unknown: '未知',
  },
  'zh-TW': {
    loading: '載入中...',
    noNetwork: '暫無推薦網絡數據',
    referrer: '推薦人（上游）',
    noReferrer: '無推薦人（直接渠道）',
    currentStudent: '當前學員',
    referrals: '被推薦人（下游',
    referralsSuffix: '人）',
    noReferrals: '暫無被推薦人',
    unknown: '未知',
  },
  en: {
    loading: 'Loading...',
    noNetwork: 'No referral network data',
    referrer: 'Referrer (Upstream)',
    noReferrer: 'No referrer (Direct channel)',
    currentStudent: 'Current Student',
    referrals: 'Referrals (Downstream',
    referralsSuffix: ')',
    noReferrals: 'No referrals yet',
    unknown: 'Unknown',
  },
  th: {
    loading: 'กำลังโหลด...',
    noNetwork: 'ไม่มีข้อมูลเครือข่ายการแนะนำ',
    referrer: 'ผู้แนะนำ (ต้นน้ำ)',
    noReferrer: 'ไม่มีผู้แนะนำ (ช่องทางตรง)',
    currentStudent: 'นักเรียนปัจจุบัน',
    referrals: 'ผู้ถูกแนะนำ (ปลายน้ำ',
    referralsSuffix: ' คน)',
    noReferrals: 'ยังไม่มีผู้ถูกแนะนำ',
    unknown: 'ไม่ทราบ',
  },
} as const;

type Locale = keyof typeof I18N;

function useT() {
  const locale = useLocale();
  return I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];
}

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
        ? 'bg-[var(--color-accent-surface)] border-[var(--color-accent)]'
        : 'bg-[var(--color-success-surface)] border-[var(--color-success)]';

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${bg} text-sm`}>
      <div>
        <div className="font-medium text-xs font-mono">{stdt_id}</div>
        <div className="text-[var(--text-secondary)] text-xs">{name || unknownLabel}</div>
        {paid_amount != null && (
          <div className="text-[var(--text-muted)] text-[10px]">{formatRevenue(paid_amount)}</div>
        )}
      </div>
    </div>
  );
}

export function ReferralNetwork({ network, isLoading }: ReferralNetworkProps) {
  const t = useT();

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-[var(--text-muted)]">{t.loading}</div>;
  }

  if (!network) {
    return <div className="py-8 text-center text-sm text-[var(--text-muted)]">{t.noNetwork}</div>;
  }

  return (
    <div className="space-y-4">
      {/* 推荐人 */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
          <ArrowUp className="w-3 h-3" /> {t.referrer}
        </div>
        {network.referred_by ? (
          <NetworkNode
            stdt_id={network.referred_by.stdt_id}
            name={network.referred_by.name}
            type="referrer"
            unknownLabel={t.unknown}
          />
        ) : (
          <div className="text-xs text-[var(--text-muted)] px-3 py-2 border border-dashed border-[var(--border-subtle)] rounded-lg">
            {t.noReferrer}
          </div>
        )}
      </div>

      {/* 分割线 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 border-t border-[var(--border-subtle)]" />
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
          {t.currentStudent}
        </span>
        <div className="flex-1 border-t border-[var(--border-subtle)]" />
      </div>

      {/* 当前学员 */}
      <NetworkNode
        stdt_id={network.center.stdt_id}
        name={network.center.name}
        type="center"
        unknownLabel={t.unknown}
      />

      {/* 分割线 */}
      <div className="flex items-center gap-2">
        <ArrowDown className="w-3 h-3 text-[var(--text-muted)]" />
        <div className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
          <Users className="w-3 h-3" /> {t.referrals} {network.referrals.length}
          {t.referralsSuffix}
        </div>
      </div>

      {/* 被推荐人列表 */}
      {network.referrals.length === 0 ? (
        <div className="text-xs text-[var(--text-muted)] px-3 py-2 border border-dashed border-[var(--border-subtle)] rounded-lg">
          {t.noReferrals}
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
              unknownLabel={t.unknown}
            />
          ))}
        </div>
      )}
    </div>
  );
}
