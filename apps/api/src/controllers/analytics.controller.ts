import { NextFunction, Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import {
  DashboardSummaryQuery,
  FinancialTrendsQuery,
  TopDestinationsQuery,
} from '@chirag/validation';

export async function getDashboardSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = {
      userId: req.user!.id,
      role: req.user!.role,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    };

    const query = req.query as unknown as DashboardSummaryQuery;
    const summary = await analyticsService.getDashboardSummary(query, actor);

    res.status(200).json({
      success: true,
      data: summary,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getFinancialTrends(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = {
      userId: req.user!.id,
      role: req.user!.role,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    };

    const query = req.query as unknown as FinancialTrendsQuery;
    const trends = await analyticsService.getFinancialTrends(query, actor);

    res.status(200).json({
      success: true,
      data: trends,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getTopDestinations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = {
      userId: req.user!.id,
      role: req.user!.role,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    };

    const query = req.query as unknown as TopDestinationsQuery;
    const result = await analyticsService.getTopDestinations(query, actor);

    res.status(200).json({
      success: true,
      data: result,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
