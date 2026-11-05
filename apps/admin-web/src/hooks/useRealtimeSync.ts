import { useEffect, useRef, useState } from 'react';
import { getAdminToken, clearClientCache } from '@/lib/api';

export interface RealtimeMessage {
  type:
    | 'CONNECTED'
    | 'NOTIFICATION'
    | 'QUOTATION_UPDATE'
    | 'PAYMENT_UPDATE'
    | 'BOOKING_UPDATE'
    | 'OPERATIONS_UPDATE'
    | 'AGENCY_SETTINGS_UPDATE';
  title?: string;
  message?: string;
  data?: any;
  scopeId?: string;
  timestamp?: string;
}

export interface UseRealtimeSyncOptions {
  scopeId?: string;
  scopes?: string[];
  eventTypes?: string[];
  onEvent?: (msg: RealtimeMessage) => void;
  onRefresh?: () => void;
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Singleton Realtime Stream Manager for the Window (Prevents socket exhaustion)
// Ensures only ONE EventSource connection is maintained per browser tab.
// ---------------------------------------------------------------------------
type Subscriber = {
  id: string;
  scopes: string[];
  eventTypes?: string[];
  onEvent?: (msg: RealtimeMessage) => void;
  onRefresh?: () => void;
};

class RealtimeStreamManager {
  private es: EventSource | null = null;
  private subscribers = new Map<string, Subscriber>();
  private reconnectTimer: any = null;
  private debounceTimers = new Map<string, any>();
  private activeToken: string = '';
  private activeScopeKey: string = '';

  public subscribe(sub: Subscriber) {
    this.subscribers.set(sub.id, sub);
    this.ensureConnection();
  }

  public updateSubscriber(sub: Subscriber) {
    this.subscribers.set(sub.id, sub);
    this.ensureConnection();
  }

  public unsubscribe(id: string) {
    this.subscribers.delete(id);
    if (this.debounceTimers.has(id)) {
      clearTimeout(this.debounceTimers.get(id));
      this.debounceTimers.delete(id);
    }
  }

  private getAllScopes(): string[] {
    const list: string[] = [];
    this.subscribers.forEach((sub) => {
      sub.scopes.forEach((s: string) => {
        if (!list.includes(s)) list.push(s);
      });
    });
    return list;
  }

  private ensureConnection() {
    if (typeof window === 'undefined') return;

    const token = getAdminToken() || '';
    const scopes = this.getAllScopes();
    const scopeKey = scopes.sort().join(',');

    // If connection already active with same token and scopes, do nothing
    if (
      this.es &&
      this.es.readyState !== EventSource.CLOSED &&
      this.activeToken === token &&
      this.activeScopeKey === scopeKey
    ) {
      return;
    }

    if (this.es) {
      this.es.close();
      this.es = null;
    }

    this.activeToken = token;
    this.activeScopeKey = scopeKey;

    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (scopes.length > 0) params.set('scope', scopes.join(','));

    const sseUrl = `/api/proxy/realtime/stream${params.toString() ? `?${params.toString()}` : ''}`;

    try {
      const es = new EventSource(sseUrl);
      this.es = es;

      es.onmessage = (e) => {
        try {
          const payload: RealtimeMessage = JSON.parse(e.data);
          if (payload.type === 'CONNECTED') return;

          this.dispatch(payload);
        } catch {
          // Ignore comments / keepalive pings
        }
      };

      es.onerror = () => {
        if (this.es?.readyState === EventSource.CLOSED) {
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.ensureConnection(), 3000);
        }
      };
    } catch {
      // Offline or network error
    }
  }

  private dispatch(msg: RealtimeMessage) {
    // Invalidate stale in-memory cache so subsequent fetches receive authoritative fresh server data
    clearClientCache();

    this.subscribers.forEach((sub, id) => {
      if (sub.eventTypes && sub.eventTypes.length > 0 && !sub.eventTypes.includes(msg.type)) {
        return;
      }

      if (msg.scopeId && sub.scopes.length > 0 && !sub.scopes.includes(msg.scopeId)) {
        return;
      }

      if (sub.onEvent) {
        try {
          sub.onEvent(msg);
        } catch {
          // Guard
        }
      }

      if (sub.onRefresh) {
        if (this.debounceTimers.has(id)) {
          clearTimeout(this.debounceTimers.get(id));
        }
        const timer = setTimeout(() => {
          try {
            if (sub.onRefresh) sub.onRefresh();
          } catch {
            // Guard
          }
        }, 300);
        this.debounceTimers.set(id, timer);
      }
    });
  }
}

// Global window singleton
const streamManager = new RealtimeStreamManager();
let nextSubscriberId = 1;

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { scopeId, scopes = [], eventTypes, onEvent, onRefresh, enabled = true } = options;
  const [subId] = useState(() => `sub_${nextSubscriberId++}`);

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const allScopes = [...scopes];
    if (scopeId && !allScopes.includes(scopeId)) {
      allScopes.push(scopeId);
    }

    const subscriber: Subscriber = {
      id: subId,
      scopes: allScopes,
      eventTypes,
      onEvent: (msg) => {
        if (onEventRef.current) onEventRef.current(msg);
      },
      onRefresh: () => {
        if (onRefreshRef.current) onRefreshRef.current();
      },
    };

    streamManager.subscribe(subscriber);

    return () => {
      streamManager.unsubscribe(subId);
    };
  }, [enabled, scopeId, scopes.join(','), (eventTypes || []).join(',')]);

  return { isConnected: true };
}
