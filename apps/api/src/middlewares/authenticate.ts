import { NextFunction, Request, Response } from 'express';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/appError';
import { verifyAccessToken } from '../utils/token.utils';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Authentication token is missing or malformed');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw AppError.unauthorized('Authentication token is missing');
    }

    const decoded = verifyAccessToken(token);

    // Verify user exists and is active in the database
    const user = await userRepository.findById(decoded.sub);
    if (!user) {
      throw AppError.unauthorized('User associated with token no longer exists');
    }

    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      mobile: user.mobile,
      email: user.email,
      fullName: user.fullName,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    try {
      const decoded = verifyAccessToken(token);
      const user = await userRepository.findById(decoded.sub);
      if (user && user.status === 'ACTIVE') {
        req.user = {
          id: user._id.toString(),
          role: user.role,
          mobile: user.mobile,
          email: user.email,
          fullName: user.fullName,
        };
      }
    } catch {
      // Non-blocking in optional authentication
    }

    next();
  } catch (error) {
    next(error);
  }
}
