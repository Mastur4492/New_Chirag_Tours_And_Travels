import bcrypt from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS } from '../config/constants';
import { ErrorCodes } from '../constants/errorCodes';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/appError';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token.utils';

export interface LoginParams {
  mobile: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async login(params: LoginParams) {
    const user = await userRepository.findByMobile(params.mobile, true);
    if (!user) {
      throw AppError.unauthorized('Invalid mobile number or password');
    }

    const isMatch = await this.comparePassword(params.password, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid mobile number or password');
    }

    if (user.status === 'SUSPENDED') {
      throw AppError.forbidden('Your account has been suspended. Please contact administration.', ErrorCodes.USER_SUSPENDED);
    }

    if (user.status === 'INACTIVE') {
      throw AppError.forbidden('Your account is inactive. Please contact administration.', ErrorCodes.USER_INACTIVE);
    }

    const accessToken = signAccessToken({
      sub: user._id.toString(),
      role: user.role,
      mobile: user.mobile,
    });

    const refreshToken = signRefreshToken({
      sub: user._id.toString(),
    });

    // Store securely hashed refresh token
    const tokenHash = hashToken(refreshToken);
    await userRepository.updateRefreshTokenHash(user._id.toString(), tokenHash);

    // Record audit log
    await auditLogRepository.record({
      actorId: user._id.toString(),
      actorRole: user.role,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user._id.toString(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      user: user.toDto(),
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async refreshAccessToken(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw AppError.unauthorized('Refresh token is required');
    }

    // Verify token validity
    const decoded = verifyRefreshToken(rawRefreshToken);
    const userId = decoded.sub;

    const user = await userRepository.findById(userId, true);
    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden('User account is not active');
    }

    // Verify stored refresh token hash matches the presented token
    const presentedHash = hashToken(rawRefreshToken);
    if (!user.refreshTokenHash || user.refreshTokenHash !== presentedHash) {
      // Security breach or reused token: immediately revoke existing token in database
      await userRepository.updateRefreshTokenHash(userId, null);
      throw AppError.unauthorized('Invalid or revoked refresh token. Please sign in again.');
    }

    // Issue new access token AND rotate refresh token
    const newAccessToken = signAccessToken({
      sub: user._id.toString(),
      role: user.role,
      mobile: user.mobile,
    });

    const newRefreshToken = signRefreshToken({
      sub: user._id.toString(),
    });

    const newHash = hashToken(newRefreshToken);
    await userRepository.updateRefreshTokenHash(userId, newHash);

    return {
      accessToken: newAccessToken,
      newRefreshToken,
    };
  }

  async logout(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (user) {
      await userRepository.updateRefreshTokenHash(userId, null);
      await auditLogRepository.record({
        actorId: userId,
        actorRole: user.role,
        action: 'USER_LOGOUT',
        entityType: 'USER',
        entityId: userId,
        ipAddress,
        userAgent,
      });
    }
  }
}

export const authService = new AuthService();
