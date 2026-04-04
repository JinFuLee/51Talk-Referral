import type { SummaryData } from './types';
import { useNotificationStore } from './stores/notification-store';

/**
 * Trigger notifications based on summary KPI data.
 * Dedup key format: `{metric}_{date}` — prevents duplicate push on same day.
 */
export function checkAndTriggerNotifications(summaryData: SummaryData): void {
  const store = useNotificationStore.getState();
  const today = new Date().toISOString().slice(0, 10);

  for (const [metric, m] of Object.entries(summaryData)) {
    if (!m) continue;

    // KPI status red → warning
    if (m.status === 'red') {
      const key = `kpi_red_${metric}_${today}`;
      if (!store.hasKey(key)) {
        store.addNotification({
          type: 'warning',
          title: `KPI 预警：${m.label ?? metric}`,
          message: `当前值 ${m.actual}，目标 ${m.target}，状态严重落后。`,
          source: key,
          actionHref: '/ops/dashboard',
        });
      }
    }

    // absolute_gap < -20% of target → alert
    if (
      m.absolute_gap !== undefined &&
      m.target !== undefined &&
      m.target > 0 &&
      m.absolute_gap < -(m.target * 0.2)
    ) {
      const key = `gap_20pct_${metric}_${today}`;
      if (!store.hasKey(key)) {
        store.addNotification({
          type: 'alert',
          title: `目标缺口预警：${m.label ?? metric}`,
          message: `差额 ${m.absolute_gap.toFixed(0)}，超过目标 20%，需加速追进度。`,
          source: key,
          actionHref: '/ops/kpi-north-star',
        });
      }
    }
  }
}

/**
 * Trigger zero-followup alert notification.
 * Call this after fetching paid-followup / zero-followup alert data.
 */
export function checkZeroFollowupNotification(totalZero: number): void {
  if (totalZero <= 0) return;

  const store = useNotificationStore.getState();
  const today = new Date().toISOString().slice(0, 10);
  const key = `zero_followup_${today}`;

  if (!store.hasKey(key)) {
    store.addNotification({
      type: 'alert',
      title: '零跟进学员预警',
      message: `本月有 ${totalZero} 名付费学员未被跟进，存在流失风险。`,
      source: key,
      actionHref: '/ops/followup-alert',
    });
  }
}
