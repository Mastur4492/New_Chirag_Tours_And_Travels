import { Request, Response } from 'express';
import { logger } from '../utils/logger';

export type RealtimeEventType =
  | 'CONNECTED'
  | 'NOTIFICATION'
  | 'QUOTATION_UPDATE'
  | 'PAYMENT_UPDATE'
  | 'BOOKING_UPDATE'
  | 'OPERATIONS_UPDATE'
  | 'AGENCY_SETTINGS_UPDATE';

export interface RealtimePayload {
  type: RealtimeEventType;
  recipientRole?: 'ADMIN' | 'AGENT' | 'CUSTOMER' | 'ALL';
  recipientUserId?: string;
  scopeId?: string; // e.g. bookingId, quotationToken, quotationId
  title?: string;
  message?: string;
  data?: any;
  timestamp?: string;
}

interface ClientConnection {
  id: string;
  res: Response;
  role: 'ADMIN' | 'AGENT' | 'CUSTOMER' | 'ANONYMOUS';
  userId?: string;
  scopes: Set<string>;
  connectedAt: Date;
}

export class RealtimeService {
  private clients: Map<string, ClientConnection> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Keepalive ping every 25 seconds to prevent browser/proxy timeouts
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);
  }

  /**
   * Register a new SSE client connection
   */
  public registerClient(
    clientId: string,
    req: Request,
    res: Response,
    meta: {
      role: 'ADMIN' | 'AGENT' | 'CUSTOMER' | 'ANONYMOUS';
      userId?: string;
      scopes?: string[];
    }
  ): void {
    // Set mandatory headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable proxy buffering (Nginx, Traefik, Cloudflare)
    });

    const scopesSet = new Set<string>();
    if (meta.scopes && Array.isArray(meta.scopes)) {
      meta.scopes.forEach((s) => scopesSet.add(s));
    }
    if (req.query.scope && typeof req.query.scope === 'string') {
      req.query.scope.split(',').forEach((s) => scopesSet.add(s.trim()));
    }

    const client: ClientConnection = {
      id: clientId,
      res,
      role: meta.role,
      userId: meta.userId,
      scopes: scopesSet,
      connectedAt: new Date(),
    };

    this.clients.set(clientId, client);
    logger.info(`[RealtimeService] Client connected: ${clientId} (${meta.role}${meta.userId ? `:${meta.userId}` : ''}). Total active: ${this.clients.size}`);

    // Send immediate connection greeting
    this.sendToClient(client, {
      type: 'CONNECTED',
      message: 'Realtime SSE event stream connected successfully',
      data: {
        clientId,
        role: meta.role,
        userId: meta.userId,
        activeScopes: Array.from(scopesSet),
        serverTime: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

    // Cleanup on disconnect
    req.on('close', () => {
      this.clients.delete(clientId);
      logger.info(`[RealtimeService] Client disconnected: ${clientId}. Remaining: ${this.clients.size}`);
    });
  }

  /**
   * Broadcast an event to matching clients
   */
  public broadcast(payload: RealtimePayload): void {
    const enrichedPayload: RealtimePayload = {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    let deliveredCount = 0;

    for (const [, client] of this.clients.entries()) {
      if (this.shouldDeliver(client, enrichedPayload)) {
        this.sendToClient(client, enrichedPayload);
        deliveredCount++;
      }
    }

    logger.debug(`[RealtimeService] Broadcast ${payload.type} -> delivered to ${deliveredCount}/${this.clients.size} clients`);
  }

  /**
   * Check if a payload should be delivered to a specific client
   */
  private shouldDeliver(client: ClientConnection, payload: RealtimePayload): boolean {
    // 1. If payload specifies a scopeId (e.g. quote token, booking ID), check client scopes
    if (payload.scopeId && client.scopes.has(payload.scopeId)) {
      return true;
    }

    // 2. If payload specifies recipientUserId, check exact match
    if (payload.recipientUserId) {
      return client.userId === payload.recipientUserId;
    }

    // 3. If payload specifies recipientRole
    if (payload.recipientRole) {
      if (payload.recipientRole === 'ALL') return true;
      if (payload.recipientRole === client.role) return true;
      // Admins receive operational and financial broadcast events, but NEVER agent-targeted notifications
      if (client.role === 'ADMIN' && payload.type !== 'NOTIFICATION') return true;
      return false;
    }

    // 4. Global broadcast without targeting
    return true;
  }

  /**
   * Format and send an SSE message to a single client
   */
  private sendToClient(client: ClientConnection, payload: RealtimePayload): void {
    try {
      client.res.write(`event: message\n`);
      client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err: any) {
      logger.warn(`[RealtimeService] Failed sending to client ${client.id}: ${err.message}`);
      this.clients.delete(client.id);
    }
  }

  /**
   * Periodic keepalive heartbeat comment
   */
  private sendHeartbeat(): void {
    const timestamp = new Date().toISOString();
    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(`: ping ${timestamp}\n\n`);
      } catch {
        this.clients.delete(id);
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public destroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const [id] of this.clients.entries()) {
      this.clients.delete(id);
    }
  }
}

export const realtimeService = new RealtimeService();
