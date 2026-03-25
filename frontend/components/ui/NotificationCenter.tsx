'use client';

import { useState } from 'react';
import { Bell, Check, Trash2, ShieldAlert, Info, AlertTriangle } from 'lucide-react';

export interface NotificationItem {
  id: string;
  type: 'alert' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Mock data since Claude handles logic
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      type: 'alert',
      title: 'KPI 红色预警',
      message: '本月付费转化率低至 12%，远低于目标 18%',
      timestamp: '10分钟前',
      read: false,
    },
    {
      id: '2',
      type: 'warning',
      title: '零跟进预警',
      message: '王明有 5 个分配的体验课超过 24 小时未跟进',
      timestamp: '1小时前',
      read: false,
    },
    {
      id: '3',
      type: 'info',
      title: '报表生成完毕',
      message: '本周全区复盘简报已生成',
      timestamp: '5小时前',
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
        className="relative p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-surface)] shadow-xl rounded-xl border border-[var(--border-subtle)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">通知中心</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllRead}
                className="text-[11px] text-action-text hover:text-action-text font-medium"
              >
                全部已读
              </button>
              <button
                onClick={clearAll}
                className="p-1 text-[var(--text-muted)] hover:text-red-500 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex border-b border-[var(--border-subtle)]">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2 text-xs font-medium text-center ${filter === 'all' ? 'text-action-text border-b-2 border-action-active' : 'text-[var(--text-secondary)]'}`}
            >
              全部
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 py-2 text-xs font-medium text-center ${filter === 'unread' ? 'text-action-text border-b-2 border-action-active' : 'text-[var(--text-secondary)]'}`}
            >
              未读 ({unreadCount})
            </button>
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)] text-xs">暂无通知</div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 transition-colors hover:bg-[var(--bg-subtle)] ${!n.read ? 'bg-action-surface/30' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 mt-0.5">
                        {n.type === 'alert' && <ShieldAlert className="w-4 h-4 text-red-500" />}
                        {n.type === 'warning' && (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                        {n.type === 'info' && <Info className="w-4 h-4 text-action-text" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between">
                          <h4
                            className={`text-sm ${!n.read ? 'font-semibold text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]'}`}
                          >
                            {n.title}
                          </h4>
                          <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap ml-2">
                            {n.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-snug">
                          {n.message}
                        </p>
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
                          className="shrink-0 p-1 text-[var(--text-muted)] hover:text-action-text self-center transition-colors"
                          title="标记为已读"
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
