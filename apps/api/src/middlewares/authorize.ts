import { UserRole } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/appError';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access forbidden: Role '${req.user.role}' is not authorized for this resource`
        )
      );
    }

    next();
  };
}

export function requireSelfOrAdmin(paramKey = 'id') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (req.user.role === 'ADMIN') {
      return next();
    }

    const targetId = req.params[paramKey];
    if (req.user.id === targetId) {
      return next();
    }

    next(AppError.forbidden('You can only access or modify your own account resources'));
  };
}
