'use client';

import { useState } from 'react';
import { Bell, Check, Trash2, ShieldAlert, Info, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
export interface NotificationItem {
  id: string;
  type: 'alert' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export function NotificationCenter() {
  const t = useTranslations('NotificationCenter');
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => [
    {
      id: '1',
      type: 'alert',
      title: t('mockNotifications.0.title'),
      message: t('mockNotifications.0.message'),
      timestamp: t('mockNotifications.0.timestamp'),
      read: false,
    },
    {
      id: '2',
      type: 'warning',
      title: t('mockNotifications.1.title'),
      message: t('mockNotifications.1.message'),
      timestamp: t('mockNotifications.1.timestamp'),
      read: false,
    },
    {
      id: '3',
      type: 'info',
      title: t('mockNotifications.2.title'),
      message: t('mockNotifications.2.message'),
      timestamp: t('mockNotifications.2.timestamp'),
      read: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered = filter === 'all' ? notifications : notifications.filter((n) => !n.read);

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const clearAll = () => setNotifications([]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-secondary-token hover:bg-subtle rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-danger-token text-[8px] font-bold text-white ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-surface shadow-xl rounded-xl border border-subtle-token overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-subtle-token bg-subtle">
            <h3 className="text-sm font-semibold text-primary-token">{t('center')}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllRead}
                className="text-[11px] text-action-text hover:text-action-text font-medium"
              >
                {t('markAllRead')}
              </button>
              <button
                onClick={clearAll}
                className="p-1 text-muted-token hover:text-danger-token rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex border-b border-subtle-token">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2 text-xs font-medium text-center ${filter === 'all' ? 'text-action-text border-b-2 border-action-active' : 'text-secondary-token'}`}
            >
              {t('all')}
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 py-2 text-xs font-medium text-center ${filter === 'unread' ? 'text-action-text border-b-2 border-action-active' : 'text-secondary-token'}`}
            >
              {t('unread')} ({unreadCount})
            </button>
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-token text-xs">{t('empty')}</div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 transition-colors hover:bg-subtle ${!n.read ? 'bg-action-surface/30' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 mt-0.5">
                        {n.type === 'alert' && (
                          <ShieldAlert className="w-4 h-4 text-danger-token" />
                        )}
                        {n.type === 'warning' && (
                          <AlertTriangle className="w-4 h-4 text-warning-token" />
                        )}
                        {n.type === 'info' && <Info className="w-4 h-4 text-action-text" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between">
                          <h4
                            className={`text-sm ${!n.read ? 'font-semibold text-primary-token' : 'font-medium text-secondary-token'}`}
                          >
                            {n.title}
                          </h4>
                          <span className="text-[10px] text-muted-token whitespace-nowrap ml-2">
                            {n.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-secondary-token leading-snug">{n.message}</p>
                      </div>
                      {!n.read && (
                        <button
                          onClick={() => {
                            setNotifications((prev) =>
                              prev.map((item) =>
                                item.id === n.id ? { ...item, read: true } : item
                              )
                            );
                          }}
                          className="shrink-0 p-1 text-muted-token hover:text-action-text self-center transition-colors"
                          title={t('markRead')}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
