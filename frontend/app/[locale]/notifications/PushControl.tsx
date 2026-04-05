'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Rocket, Eye, Send, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { PreviewModal } from './PreviewModal';
import { PushProgress, type PushProgressItem } from './PushProgress';
import type { BotChannel } from './BotCard';

const I18N = {
  zh: {
    confirmPushAll: (n: number) =>
      `确定发送今日全部报告到所有已启用通道（${n} 个）？\n此操作包含正式群，不可撤回。`,
    noTestGroup: '没有已启用的测试群',
    selectChannel: '请先选择要推送的通道',
    confirmPush: (n: number, f: number) =>
      `确定发送到 ${n} 个通道（含 ${f} 个正式群）？\n此操作不可撤回。`,
    pushDone: '推送完成',
    pushSubmitted: '推送任务已提交',
    loadFailed: '推送配置加载失败',
    checkBackend: '请检查后端服务是否正常运行',
    retry: '重试',
    noConfig: '暂无推送配置',
    noConfigHint: '前往「通知管理」添加通道后，此处将显示推送控制面板',
    oneClickTitle: '一键推送今日全部',
    oneClickHint: (n: number) => `向所有已启用通道（${n} 个）发送今日报告`,
    pushNow: '立即推送',
    orSpecify: '或指定推送',
    templateLabel: '推送模板',
    previewRoleLabel: '预览角色',
    targetChannelLabel: '目标通道（多选）',
    testBadge: '测试',
    formalWarning: '已选择正式群，推送后不可撤回',
    clearRecord: '清除记录',
    preview: '预览',
    sendTest: '发送测试群',
    confirmPushBtn: '确认推送',
  },
  'zh-TW': {
    confirmPushAll: (n: number) =>
      `確定發送今日全部報告到所有已啟用通道（${n} 個）？\n此操作包含正式群，不可撤回。`,
    noTestGroup: '沒有已啟用的測試群',
    selectChannel: '請先選擇要推送的通道',
    confirmPush: (n: number, f: number) =>
      `確定發送到 ${n} 個通道（含 ${f} 個正式群）？\n此操作不可撤回。`,
    pushDone: '推送完成',
    pushSubmitted: '推送任務已提交',
    loadFailed: '推送設定載入失敗',
    checkBackend: '請檢查後端服務是否正常運行',
    retry: '重試',
    noConfig: '暫無推送設定',
    noConfigHint: '前往「通知管理」新增通道後，此處將顯示推送控制面板',
    oneClickTitle: '一鍵推送今日全部',
    oneClickHint: (n: number) => `向所有已啟用通道（${n} 個）發送今日報告`,
    pushNow: '立即推送',
    orSpecify: '或指定推送',
    templateLabel: '推送模板',
    previewRoleLabel: '預覽角色',
    targetChannelLabel: '目標通道（多選）',
    testBadge: '測試',
    formalWarning: '已選擇正式群，推送後不可撤回',
    clearRecord: '清除記錄',
    preview: '預覽',
    sendTest: '發送測試群',
    confirmPushBtn: '確認推送',
  },
  en: {
    confirmPushAll: (n: number) =>
      `Send today's full report to all ${n} enabled channels?\nThis includes production groups and cannot be undone.`,
    noTestGroup: 'No enabled test groups',
    selectChannel: 'Please select at least one channel',
    confirmPush: (n: number, f: number) =>
      `Send to ${n} channels (including ${f} production groups)?\nThis cannot be undone.`,
    pushDone: 'Push complete',
    pushSubmitted: 'Push job submitted',
    loadFailed: 'Failed to load push config',
    checkBackend: 'Please check if the backend service is running',
    retry: 'Retry',
    noConfig: 'No push config',
    noConfigHint: 'Add channels in Notification Management to see the push panel here',
    oneClickTitle: 'Push All Today',
    oneClickHint: (n: number) => `Send today's report to all ${n} enabled channels`,
    pushNow: 'Push Now',
    orSpecify: 'Or specify channels',
    templateLabel: 'Template',
    previewRoleLabel: 'Preview Role',
    targetChannelLabel: 'Target Channels (multi-select)',
    testBadge: 'Test',
    formalWarning: 'Production groups selected — this cannot be undone',
    clearRecord: 'Clear',
    preview: 'Preview',
    sendTest: 'Send to Test',
    confirmPushBtn: 'Confirm Push',
  },
  th: {
    confirmPushAll: (n: number) =>
      `ส่งรายงานวันนี้ทั้งหมดไปยังช่องทางที่เปิดใช้งาน ${n} ช่อง?\nรวมถึงกลุ่มทางการและไม่สามารถยกเลิกได้`,
    noTestGroup: 'ไม่มีกลุ่มทดสอบที่เปิดใช้งาน',
    selectChannel: 'กรุณาเลือกช่องทางก่อน',
    confirmPush: (n: number, f: number) =>
      `ส่งไปยัง ${n} ช่อง (รวม ${f} กลุ่มทางการ)?\nไม่สามารถยกเลิกได้`,
    pushDone: 'ส่งสำเร็จ',
    pushSubmitted: 'ส่งงานแล้ว',
    loadFailed: 'โหลดการตั้งค่าการส่งล้มเหลว',
    checkBackend: 'กรุณาตรวจสอบว่าบริการ backend ทำงานอยู่',
    retry: 'ลองใหม่',
    noConfig: 'ยังไม่มีการตั้งค่าการส่ง',
    noConfigHint: 'เพิ่มช่องทางในการจัดการการแจ้งเตือนเพื่อแสดงแผงควบคุม',
    oneClickTitle: 'ส่งทั้งหมดวันนี้',
    oneClickHint: (n: number) => `ส่งรายงานวันนี้ไปยัง ${n} ช่องทางที่เปิดใช้งาน`,
    pushNow: 'ส่งทันที',
    orSpecify: 'หรือระบุช่องทาง',
    templateLabel: 'เทมเพลต',
    previewRoleLabel: 'บทบาทตัวอย่าง',
    targetChannelLabel: 'ช่องทางเป้าหมาย (เลือกหลายรายการ)',
    testBadge: 'ทดสอบ',
    formalWarning: 'เลือกกลุ่มทางการแล้ว — ไม่สามารถยกเลิกได้',
    clearRecord: 'ล้าง',
    preview: 'ดูตัวอย่าง',
    sendTest: 'ส่งกลุ่มทดสอบ',
    confirmPushBtn: 'ยืนยันการส่ง',
  },
};

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
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
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
    if (!window.confirm(t.confirmPushAll(enabledChannels.length))) return;

    await executePush(
      enabledChannels.map((c) => c.id),
      'all'
    );
  }

  async function handlePushTest() {
    const ids = testChannels.map((c) => c.id);
    if (ids.length === 0) {
      alert(t.noTestGroup);
      return;
    }
    await executePush(ids, 'test');
  }

  async function handleConfirmPush() {
    if (selectedChannelIds.length === 0 && !pushAll) {
      alert(t.selectChannel);
      return;
    }
    const targetIds = pushAll ? enabledChannels.map((c) => c.id) : selectedChannelIds;
    const formal = enabledChannels.filter((c) => targetIds.includes(c.id) && !c.is_test);
    if (!window.confirm(t.confirmPush(targetIds.length, formal.length))) return;

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
          toast.success(t.pushDone);
          return;
        }
      }
      // timeout
      setPushState('done');
      toast.success(t.pushSubmitted);
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
        <p className="text-sm font-medium text-primary-token">{t.loadFailed}</p>
        <p className="text-xs text-muted-token">{loadError.message ?? t.checkBackend}</p>
        <button
          onClick={() => {
            mutateTemplates();
            mutateChannels();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-default-token rounded-lg text-secondary-token hover:bg-bg-primary transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t.retry}
        </button>
      </div>
    );
  }

  // empty 态：channels 加载完但没有任何通道
  if (!channels || channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <p className="text-sm font-medium text-primary-token">{t.noConfig}</p>
        <p className="text-xs text-muted-token">{t.noConfigHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* One-click push all */}
      <div className="flex items-center gap-3 p-3 bg-bg-primary rounded-xl">
        <Rocket className="w-5 h-5 text-secondary-token shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-primary-token">{t.oneClickTitle}</p>
          <p className="text-xs text-muted-token">{t.oneClickHint(enabledChannels.length)}</p>
        </div>
        <button
          onClick={handlePushAll}
          disabled={pushState === 'pushing' || enabledChannels.length === 0}
          className="px-4 py-2 bg-action text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
        >
          {t.pushNow}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-n-200" />
        <span className="text-xs text-muted-token">{t.orSpecify}</span>
        <div className="flex-1 h-px bg-n-200" />
      </div>

      {/* Template selection */}
      <div>
        <label className="block text-xs font-medium text-secondary-token mb-1.5">
          {t.templateLabel}
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
          ).map((t) => (
            <option key={t.id} value={t.id}>
              {t.role} — {t.description}
            </option>
          ))}
        </select>
      </div>

      {/* Role filter for preview */}
      <div>
        <label className="block text-xs font-medium text-secondary-token mb-1.5">
          {t.previewRoleLabel}
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
            {t.targetChannelLabel}
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
                    {t.testBadge}
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
              {t.clearRecord}
            </button>
          )}
        </div>
      )}

      {/* Warning for no test group */}
      {selectedChannelIds.some((id) => !(channels ?? []).find((c) => c.id === id)?.is_test) && (
        <div className="flex items-start gap-2 p-2.5 bg-warning-surface rounded-xl text-warning-token">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs">{t.formalWarning}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPreviewOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 border border-subtle-token rounded-lg text-xs font-medium text-secondary-token hover:bg-bg-primary transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          {t.preview}
        </button>
        <button
          onClick={handlePushTest}
          disabled={pushState === 'pushing' || testChannels.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 border border-action text-action-text rounded-lg text-xs font-medium hover:bg-action-surface transition-colors disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
          {t.sendTest}
        </button>
        <button
          onClick={handleConfirmPush}
          disabled={pushState === 'pushing'}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-danger-token text-white rounded-lg text-xs font-semibold hover:bg-danger-token transition-colors disabled:opacity-40"
        >
          {t.confirmPushBtn}
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
