import { ApiResponse } from '@chirag/types';
import { Request, Response } from 'express';
import { isDatabaseConnected } from '../config/database';

export function getHealth(_req: Request, res: Response): void {
  const dbConnected = isDatabaseConnected();
  const statusCode = dbConnected ? 200 : 503;

  const responseBody: ApiResponse<{
    status: 'healthy' | 'degraded';
    uptimeSeconds: number;
    database: 'connected' | 'disconnected';
    nodeVersion: string;
  }> = {
    success: true,
    data: {
      status: dbConnected ? 'healthy' : 'degraded',
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbConnected ? 'connected' : 'disconnected',
      nodeVersion: process.version,
    },
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.status(statusCode).json(responseBody);
}
