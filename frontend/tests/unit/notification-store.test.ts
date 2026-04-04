import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from '@/lib/stores/notification-store';

// Reset store state before each test to ensure isolation
function resetStore() {
  useNotificationStore.setState({ notifications: [], unreadCount: 0 });
}

describe('useNotificationStore', () => {
  beforeEach(() => {
    resetStore();
  });

  // ── addNotification ──────────────────────────────────────────────────────────
  describe('addNotification', () => {
    it('adds a notification with generated id and timestamp', () => {
      useNotificationStore.getState().addNotification({
        type: 'info',
        title: 'Test title',
        message: 'Test message',
      });
      const { notifications, unreadCount } = useNotificationStore.getState();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Test title');
      expect(notifications[0].read).toBe(false);
      expect(typeof notifications[0].id).toBe('string');
      expect(notifications[0].id.length).toBeGreaterThan(0);
      expect(unreadCount).toBe(1);
    });

    it('prepends new notification (most recent first)', () => {
      useNotificationStore
        .getState()
        .addNotification({ type: 'info', title: 'First', message: '' });
      useNotificationStore
        .getState()
        .addNotification({ type: 'info', title: 'Second', message: '' });
      const { notifications } = useNotificationStore.getState();
      expect(notifications[0].title).toBe('Second');
      expect(notifications[1].title).toBe('First');
    });

    it('stores optional source field', () => {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        title: 'W',
        message: 'M',
        source: 'kpi_red_registrations_2026-02-26',
      });
      const { notifications } = useNotificationStore.getState();
      expect(notifications[0].source).toBe('kpi_red_registrations_2026-02-26');
    });

    it('caps at MAX_NOTIFICATIONS (50) and drops oldest', () => {
      for (let i = 0; i < 55; i++) {
        useNotificationStore.getState().addNotification({
          type: 'info',
          title: `N${i}`,
          message: '',
        });
      }
      const { notifications } = useNotificationStore.getState();
      expect(notifications).toHaveLength(50);
      // Most recent is N54
      expect(notifications[0].title).toBe('N54');
    });
  });

  // ── markRead ────────────────────────────────────────────────────────────────
  describe('markRead', () => {
    it('marks a specific notification as read', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'T', message: '' });
      const id = useNotificationStore.getState().notifications[0].id;
      useNotificationStore.getState().markRead(id);
      const { notifications, unreadCount } = useNotificationStore.getState();
      expect(notifications[0].read).toBe(true);
      expect(unreadCount).toBe(0);
    });

    it('does not affect other notifications', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'A', message: '' });
      useNotificationStore.getState().addNotification({ type: 'info', title: 'B', message: '' });
      const idB = useNotificationStore.getState().notifications[0].id; // B is first (prepended)
      useNotificationStore.getState().markRead(idB);
      const { notifications, unreadCount } = useNotificationStore.getState();
      expect(notifications[0].read).toBe(true); // B
      expect(notifications[1].read).toBe(false); // A
      expect(unreadCount).toBe(1);
    });

    it('is a no-op for unknown id', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'T', message: '' });
      useNotificationStore.getState().markRead('nonexistent-id');
      const { unreadCount } = useNotificationStore.getState();
      expect(unreadCount).toBe(1);
    });
  });

  // ── markAllRead ─────────────────────────────────────────────────────────────
  describe('markAllRead', () => {
    it('marks all notifications as read and sets unreadCount to 0', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'A', message: '' });
      useNotificationStore.getState().addNotification({ type: 'warning', title: 'B', message: '' });
      useNotificationStore.getState().markAllRead();
      const { notifications, unreadCount } = useNotificationStore.getState();
      expect(notifications.every((n) => n.read)).toBe(true);
      expect(unreadCount).toBe(0);
    });

    it('works on empty store without error', () => {
      expect(() => useNotificationStore.getState().markAllRead()).not.toThrow();
    });
  });

  // ── clearAll ────────────────────────────────────────────────────────────────
  describe('clearAll', () => {
    it('removes all notifications and resets unreadCount', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'T', message: '' });
      useNotificationStore.getState().clearAll();
      const { notifications, unreadCount } = useNotificationStore.getState();
      expect(notifications).toHaveLength(0);
      expect(unreadCount).toBe(0);
    });
  });

  // ── hasKey ──────────────────────────────────────────────────────────────────
  describe('hasKey', () => {
    it('returns true when a notification with that source exists', () => {
      useNotificationStore.getState().addNotification({
        type: 'alert',
        title: 'T',
        message: '',
        source: 'unique-dedup-key',
      });
      expect(useNotificationStore.getState().hasKey('unique-dedup-key')).toBe(true);
    });

    it('returns false when no notification has that source', () => {
      expect(useNotificationStore.getState().hasKey('does-not-exist')).toBe(false);
    });

    it('returns false after clearAll', () => {
      useNotificationStore.getState().addNotification({
        type: 'info',
        title: 'T',
        message: '',
        source: 'key-to-clear',
      });
      useNotificationStore.getState().clearAll();
      expect(useNotificationStore.getState().hasKey('key-to-clear')).toBe(false);
    });
  });
});
