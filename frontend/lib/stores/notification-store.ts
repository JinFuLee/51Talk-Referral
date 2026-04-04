import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  type: 'warning' | 'alert' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  source?: string;
  actionHref?: string;
}

const MAX_NOTIFICATIONS = 50;

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  hasKey: (key: string) => boolean;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (n) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const notification: Notification = {
          ...n,
          id,
          timestamp: Date.now(),
          read: false,
        };
        set((state) => {
          const updated = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
          return {
            notifications: updated,
            unreadCount: updated.filter((x) => !x.read).length,
          };
        });
      },

      markRead: (id) => {
        set((state) => {
          const updated = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
          return {
            notifications: updated,
            unreadCount: updated.filter((x) => !x.read).length,
          };
        });
      },

      markAllRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      // Check if a notification with this dedup key already exists (via source field)
      hasKey: (key: string) => {
        return get().notifications.some((n) => n.source === key);
      },
    }),
    { name: 'ops-notifications' }
  )
);
