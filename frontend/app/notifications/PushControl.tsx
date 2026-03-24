'use client';

import { useState } from 'react';
import { Rocket, Eye, Send, AlertTriangle } from 'lucide-react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
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
  const { data: rawTemplates } = useSWR<{ templates: PushTemplate[] } | PushTemplate[]>(
    '/api/notifications/templates',
    swrFetcher
  );
  const templates: PushTemplate[] | undefined = rawTemplates
    ? Array.isArray(rawTemplates)
      ? rawTemplates
      : (rawTemplates as { templates: PushTemplate[] }).templates
    : undefined;

  const { data: rawChannels } = useSWR<{ channels: BotChannel[] } | BotChannel[]>(
    `/api/notifications/channels/${platform}`,
    swrFetcher
  );
  const channels: BotChannel[] | undefined = rawChannels
    ? Array.isArray(rawChannels)
      ? rawChannels
      : (rawChannels as { channels: BotChannel[] }).channels
    : undefined;

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
    if (
      !window.confirm(
        `确定发送今日全部报告到所有已启用通道（${enabledChannels.length} 个）？\n此操作包含正式群，不可撤回。`
      )
    )
      return;

    await executePush(
      enabledChannels.map((c) => c.id),
      'all'
    );
  }

  async function handlePushTest() {
    const ids = testChannels.map((c) => c.id);
    if (ids.length === 0) {
      alert('没有已启用的测试群');
      return;
    }
    await executePush(ids, 'test');
  }

  async function handleConfirmPush() {
    if (selectedChannelIds.length === 0 && !pushAll) {
      alert('请先选择要推送的通道');
      return;
    }
    const targetIds = pushAll ? enabledChannels.map((c) => c.id) : selectedChannelIds;
    const formal = enabledChannels.filter((c) => targetIds.includes(c.id) && !c.is_test);
    if (
      !window.confirm(
        `确定发送到 ${targetIds.length} 个通道（含 ${formal.length} 个正式群）？\n此操作不可撤回。`
      )
    )
      return;

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

      if (!response.ok) throw new Error(`推送失败：${response.status}`);
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
          return;
        }
      }
      // 超时
      setPushState('done');
    } catch (err) {
      const updatedItems = items.map((item) => ({
        ...item,
        status: 'error' as const,
        message: err instanceof Error ? err.message : '推送失败',
      }));
      setProgressItems(updatedItems);
      setPushState('error');
    }
  }

  function resetPush() {
    setPushState('idle');
    setProgressItems([]);
  }

  const ROLE_OPTIONS = ['ALL', 'CC', 'SS', 'LP', '运营'];

  return (
    <div className="space-y-4">
      {/* One-click push all */}
      <div className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] rounded-xl">
        <Rocket className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)]">一键推送今日全部</p>
          <p className="text-xs text-[var(--text-muted)]">
            向所有已启用通道（{enabledChannels.length} 个）发送今日报告
          </p>
        </div>
        <button
          onClick={handlePushAll}
          disabled={pushState === 'pushing' || enabledChannels.length === 0}
          className="px-4 py-2 bg-[var(--brand-600,#0284c7)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
        >
          立即推送
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--border-default)]" />
        <span className="text-xs text-[var(--text-muted)]">或指定推送</span>
        <div className="flex-1 h-px bg-[var(--border-default)]" />
      </div>

      {/* Template selection */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
          推送模板
        </label>
        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500"
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
          ).map((t) => (
            <option key={t.id} value={t.id}>
              {t.role} — {t.description}
            </option>
          ))}
        </select>
      </div>

      {/* Role filter for preview */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
          预览角色
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedRole === r
                  ? 'bg-[var(--brand-600,#0284c7)] text-white'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
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
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            目标通道（多选）
          </label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {enabledChannels.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[var(--bg-primary)] cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={selectedChannelIds.includes(c.id)}
                  onChange={() => toggleChannel(c.id)}
                  className="rounded"
                />
                <span className="flex-1 text-xs text-[var(--text-primary)]">{c.name}</span>
                <span className="text-xs text-[var(--text-muted)]">{c.group_name}</span>
                {c.is_test && (
                  <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                    测试
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      {progressItems.length > 0 && (
        <div className="border border-[var(--border-default)] rounded-xl p-3">
          <PushProgress items={progressItems} />
          {pushState !== 'pushing' && (
            <button
              onClick={resetPush}
              className="mt-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline"
            >
              清除记录
            </button>
          )}
        </div>
      )}

      {/* Warning for no test group */}
      {selectedChannelIds.some((id) => !(channels ?? []).find((c) => c.id === id)?.is_test) && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-xl text-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs">已选择正式群，推送后不可撤回</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPreviewOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          预览
        </button>
        <button
          onClick={handlePushTest}
          disabled={pushState === 'pushing' || testChannels.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 border border-emerald-500 text-emerald-600 rounded-lg text-xs font-medium hover:bg-emerald-50 transition-colors disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
          发送测试群
        </button>
        <button
          onClick={handleConfirmPush}
          disabled={pushState === 'pushing'}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-40"
        >
          确认推送
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
