'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Rocket, Eye, Send, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { PreviewModal } from './PreviewModal';
import { PushProgress, type PushProgressItem } from './PushProgress';
import type { BotChannel } from './BotCard';

interface PushTemplate {
  id: string;
  role: string;
  enclosures: string[];
  enclosures_label: string;
  messages: string;
  enabled: boolean;
  description: string;
}

interface PushControlProps {
  platform: 'lark' | 'dingtalk';
}

export function PushControl({ platform }: PushControlProps) {
  const locale = useLocale();
  const t = useTranslations('PushControl');
  const {
    data: rawTemplates,
    isLoading: templatesLoading,
    error: templatesError,
    mutate: mutateTemplates,
  } = useFilteredSWR<{ templates: PushTemplate[] } | PushTemplate[]>(
    '/api/notifications/templates'
  );
  const templates: PushTemplate[] | undefined = rawTemplates
    ? Array.isArray(rawTemplates)
      ? rawTemplates
      : (rawTemplates as { templates: PushTemplate[] }).templates
    : undefined;

  const {
    data: rawChannels,
    isLoading: channelsLoading,
    error: channelsError,
    mutate: mutateChannels,
  } = useFilteredSWR<{ channels: BotChannel[] } | BotChannel[]>(
    `/api/notifications/channels/${platform}`
  );
  const channels: BotChannel[] | undefined = rawChannels
    ? Array.isArray(rawChannels)
      ? rawChannels
      : (rawChannels as { channels: BotChannel[] }).channels
    : undefined;

  const isLoading = templatesLoading || channelsLoading;
  const loadError = templatesError || channelsError;

  const [selectedTemplate, setSelectedTemplate] = useState<string>('daily_report');
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [pushAll, setPushAll] = useState(false);
  const [pushState, setPushState] = useState<'idle' | 'pushing' | 'done' | 'error'>('idle');
  const [progressItems, setProgressItems] = useState<PushProgressItem[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('ALL');

  const enabledChannels = (channels ?? []).filter((c) => c.enabled);
  const testChannels = enabledChannels.filter((c) => c.is_test);

  function toggleChannel(id: string) {
    setSelectedChannelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handlePushAll() {
    if (!window.confirm(t('confirmPushAll', { n: enabledChannels.length }))) return;

    await executePush(
      enabledChannels.map((c) => c.id),
      'all'
    );
  }

  async function handlePushTest() {
    const ids = testChannels.map((c) => c.id);
    if (ids.length === 0) {
      alert(t('noTestGroup'));
      return;
    }
    await executePush(ids, 'test');
  }

  async function handleConfirmPush() {
    if (selectedChannelIds.length === 0 && !pushAll) {
      alert(t('selectChannel'));
      return;
    }
    const targetIds = pushAll ? enabledChannels.map((c) => c.id) : selectedChannelIds;
    const formal = enabledChannels.filter((c) => targetIds.includes(c.id) && !c.is_test);
    if (!window.confirm(t('confirmPush', { n: targetIds.length, f: formal.length }))) return;

    await executePush(targetIds, selectedTemplate);
  }

  async function executePush(channelIds: string[], template: string) {
    const targetChannels = (channels ?? []).filter((c) => channelIds.includes(c.id));
    const items: PushProgressItem[] = targetChannels.map((c) => ({
      channel: c.name,
      role: c.role ?? '',
      status: 'pending' as const,
    }));
    setProgressItems(items);
    setPushState('pushing');

    try {
      // 后端接收字段为 channels（非 channel_ids），且异步返回 job_id
      const response = await fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          template,
          channels: channelIds,
        }),
      });

      if (!response.ok) throw new Error(`Push failed: ${response.status}`);
      const job = await response.json();

      // 轮询 job 状态直到完成
      const jobId = job.job_id;
      let attempts = 0;
      while (attempts < 60) {
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;
        const statusRes = await fetch(`/api/notifications/push/status/${jobId}`);
        if (!statusRes.ok) break;
        const statusData = await statusRes.json();

        // 更新进度：每个通道实时刷新
        const updatedItems = items.map((item) => {
          const serverItem = statusData.results?.find(
            (r: { channel: string; ok: boolean; error?: string }) => r.channel === item.channel
          );
          if (!serverItem) {
            // 判断是否是 current（推送中）
            const isCurrent = statusData.progress?.current === item.channel;
            return { ...item, status: isCurrent ? ('pending' as const) : item.status };
          }
          return {
            ...item,
            status: serverItem.ok ? ('success' as const) : ('error' as const),
            message: serverItem.error,
          };
        });
        setProgressItems(updatedItems);

        if (statusData.status === 'done') {
          setPushState('done');
          toast.success(t('pushDone'));
          return;
        }
      }
      // timeout
      setPushState('done');
      toast.success(t('pushSubmitted'));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Push failed';
      const updatedItems = items.map((item) => ({
        ...item,
        status: 'error' as const,
        message: errMsg,
      }));
      setProgressItems(updatedItems);
      setPushState('error');
      toast.error(errMsg);
    }
  }

  function resetPush() {
    setPushState('idle');
    setProgressItems([]);
  }

  const ROLE_OPTIONS = [
    'ALL',
    'CC',
    'SS',
    'LP',
    locale === 'en' ? 'Ops' : locale === 'th' ? 'ปฏิบัติการ' : '运营',
  ];

  // loading 态
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-16 bg-subtle rounded-xl" />
        <div className="h-10 bg-subtle rounded-lg" />
        <div className="h-24 bg-subtle rounded-lg" />
      </div>
    );
  }

  // error 态
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <AlertTriangle className="w-8 h-8 text-danger-token" />
        <p className="text-sm font-medium text-primary-token">{t('loadFailed')}</p>
        <p className="text-xs text-muted-token">{loadError.message ?? t('checkBackend')}</p>
        <button
          onClick={() => {
            mutateTemplates();
            mutateChannels();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-default-token rounded-lg text-secondary-token hover:bg-bg-primary transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('retry')}
        </button>
      </div>
    );
  }

  // empty 态：channels 加载完但没有任何通道
  if (!channels || channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <p className="text-sm font-medium text-primary-token">{t('noConfig')}</p>
        <p className="text-xs text-muted-token">{t('noConfigHint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* One-click push all */}
      <div className="flex items-center gap-3 p-3 bg-bg-primary rounded-xl">
        <Rocket className="w-5 h-5 text-secondary-token shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-primary-token">{t('oneClickTitle')}</p>
          <p className="text-xs text-muted-token">{t('oneClickHint', { n: enabledChannels.length })}</p>
        </div>
        <button
          onClick={handlePushAll}
          disabled={pushState === 'pushing' || enabledChannels.length === 0}
          className="px-4 py-2 bg-action text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
        >
          {t('pushNow')}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-n-200" />
        <span className="text-xs text-muted-token">{t('orSpecify')}</span>
        <div className="flex-1 h-px bg-n-200" />
      </div>

      {/* Template selection */}
      <div>
        <label className="block text-xs font-medium text-secondary-token mb-1.5">
          {t('templateLabel')}
        </label>
        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="w-full text-sm border border-subtle-token rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-action"
        >
          {(
            templates ?? [
              {
                id: 'cc_followup',
                role: 'CC',
                enclosures: [],
                enclosures_label: '',
                messages: '',
                enabled: true,
                description: 'CC 前端销售未打卡跟进',
              },
            ]
          ).map((item) => (
            <option key={item.id} value={item.id}>
              {item.role} — {item.description}
            </option>
          ))}
        </select>
      </div>

      {/* Role filter for preview */}
      <div>
        <label className="block text-xs font-medium text-secondary-token mb-1.5">
          {t('previewRoleLabel')}
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedRole === r
                  ? 'bg-action text-white'
                  : 'bg-subtle text-secondary-token hover:bg-bg-elevated'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Channel selection */}
      {enabledChannels.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-secondary-token mb-1.5">
            {t('targetChannelLabel')}
          </label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {enabledChannels.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-bg-primary cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={selectedChannelIds.includes(c.id)}
                  onChange={() => toggleChannel(c.id)}
                  className="rounded"
                />
                <span className="flex-1 text-xs text-primary-token">{c.name}</span>
                <span className="text-xs text-muted-token">{c.group_name}</span>
                {c.is_test && (
                  <span className="text-xs px-1.5 py-0.5 bg-warning-surface text-warning-token rounded">
                    {t('testBadge')}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      {progressItems.length > 0 && (
        <div className="border border-default-token rounded-xl p-3">
          <PushProgress items={progressItems} />
          {pushState !== 'pushing' && (
            <button
              onClick={resetPush}
              className="mt-3 text-xs text-muted-token hover:text-primary-token underline"
            >
              {t('clearRecord')}
            </button>
          )}
        </div>
      )}

      {/* Warning for no test group */}
      {selectedChannelIds.some((id) => !(channels ?? []).find((c) => c.id === id)?.is_test) && (
        <div className="flex items-start gap-2 p-2.5 bg-warning-surface rounded-xl text-warning-token">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs">{t('formalWarning')}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPreviewOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 border border-subtle-token rounded-lg text-xs font-medium text-secondary-token hover:bg-bg-primary transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          {t('preview')}
        </button>
        <button
          onClick={handlePushTest}
          disabled={pushState === 'pushing' || testChannels.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 border border-action text-action-text rounded-lg text-xs font-medium hover:bg-action-surface transition-colors disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
          {t('sendTest')}
        </button>
        <button
          onClick={handleConfirmPush}
          disabled={pushState === 'pushing'}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-danger-token text-white rounded-lg text-xs font-semibold hover:bg-danger-token transition-colors disabled:opacity-40"
        >
          {t('confirmPushBtn')}
        </button>
      </div>

      <PreviewModal
        open={previewOpen}
        template={selectedTemplate}
        role={selectedRole}
        platform={platform}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}
