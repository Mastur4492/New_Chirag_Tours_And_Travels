'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  Sparkles,
  UserCheck,
  FileSpreadsheet,
  BookCheck,
  Clock,
  ExternalLink,
  X,
} from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveToast, setLiveToast] = useState<{
    id: string;
    title: string;
    message: string;
    link?: string;
  } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchCount = async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      if (typeof res?.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // Silently handle if unauthenticated or offline
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.list({ limit: 25 });
      if (res) {
        setNotifications(res.notifications || []);
        if (typeof res.unreadCount === 'number') {
          setUnreadCount(res.unreadCount);
        }
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial count load & backup poll
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch full list when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Enterprise real-time sync: Updates bell badge & pops notification toast instantly
  useRealtimeSync({
    eventTypes: ['NOTIFICATION', 'QUOTATION_UPDATE', 'PAYMENT_UPDATE', 'BOOKING_UPDATE'],
    onRefresh: () => {
      fetchCount();
      if (isOpen) {
        fetchNotifications();
      }
    },
    onEvent: (msg) => {
      fetchCount();
      if (msg.title || msg.message) {
        setLiveToast({
          id: String(Date.now()),
          title: msg.title || 'Live Activity Update',
          message: msg.message || '',
          link: msg.data?.link,
        });
      }
    },
  });

  // Auto-dismiss live toast after 5s
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => {
      setLiveToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [liveToast]);

  // Close on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await notificationsApi.markAllRead();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      if (!notif.isRead) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        await notificationsApi.markRead(notif.id);
      }
    } catch {
      // Ignore
    }

    setIsOpen(false);

    if (notif.link) {
      router.push(notif.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LEAD_ASSIGNED':
        return (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: 'var(--accent-emerald-light, #dcfce7)',
              color: 'var(--accent-emerald-dark, #15803d)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <UserCheck size={16} />
          </div>
        );
      case 'BOOKING_CONFIRMED':
        return (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: '#dcfce7',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BookCheck size={16} />
          </div>
        );
      default:
        return (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: '#f1f5f9',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={16} />
          </div>
        );
    }
  };

  return (
    <div ref={popoverRef} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        title="Agent Notifications"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          background: isOpen ? '#f1f5f9' : '#ffffff',
          color: unreadCount > 0 ? 'var(--primary, #0f766e)' : '#475569',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <Bell size={18} />

        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 18,
              height: 18,
              padding: '0 4px',
              borderRadius: 9,
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '10.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffffff',
              boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
              animation: 'pulse 2s infinite',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxWidth: 'calc(100vw - 24px)',
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.06)',
            zIndex: 9999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Popover Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '10px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: 'var(--primary, #0f766e)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 6px',
                    borderRadius: '4px',
                  }}
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notifications List Body */}
          <div
            style={{
              maxHeight: 380,
              overflowY: 'auto',
              padding: 0,
            }}
          >
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Checking for alerts...
              </div>
            ) : notifications.length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={22} />
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                  All Caught Up!
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                  No new lead or booking assignments right now.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    background: n.isRead ? '#ffffff' : '#f0fdfa',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = n.isRead ? '#f8fafc' : '#e6fffa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.isRead ? '#ffffff' : '#f0fdfa';
                  }}
                >
                  {getNotificationIcon(n.type)}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: n.isRead ? 600 : 700,
                          color: '#0f172a',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.title}
                      </span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          color: '#94a3b8',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: '12px',
                        color: n.isRead ? '#64748b' : '#334155',
                        margin: '4px 0 0 0',
                        lineHeight: 1.4,
                      }}
                    >
                      {n.message}
                    </p>

                    {n.link && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          marginTop: 6,
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--primary, #0f766e)',
                        }}
                      >
                        <span>View details</span>
                        <ExternalLink size={11} />
                      </div>
                    )}
                  </div>

                  {!n.isRead && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: '#0d9488',
                        marginTop: 6,
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Real-time floating popup toast */}
      {liveToast && (
        <div
          role="alert"
          onClick={() => {
            if (liveToast.link) router.push(liveToast.link);
            setLiveToast(null);
          }}
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 99999,
            maxWidth: 380,
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            borderRadius: 12,
            padding: '12px 16px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.35), 0 8px 10px -6px rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            borderLeft: '4px solid #0d9488',
            cursor: liveToast.link ? 'pointer' : 'default',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2dd4bf', marginBottom: 2 }}>
              {liveToast.title}
            </div>
            <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
              {liveToast.message}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLiveToast(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 2,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

