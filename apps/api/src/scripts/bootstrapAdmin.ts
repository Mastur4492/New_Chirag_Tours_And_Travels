import { connectDB, disconnectDB } from '../config/database';
import { env } from '../config/env';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { userRepository } from '../repositories/user.repository';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

async function bootstrapAdmin(): Promise<void> {
  logger.info('🚀 Starting secure Admin bootstrap process...');

  const mobile = env.BOOTSTRAP_ADMIN_MOBILE || process.env.BOOTSTRAP_ADMIN_MOBILE;
  const password = env.BOOTSTRAP_ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const fullName = env.BOOTSTRAP_ADMIN_NAME || process.env.BOOTSTRAP_ADMIN_NAME || 'Faisal Bikanerwala';
  const email = env.BOOTSTRAP_ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL;

  if (!mobile || !password) {
    logger.error(
      '❌ Bootstrap failed: BOOTSTRAP_ADMIN_MOBILE and BOOTSTRAP_ADMIN_PASSWORD must be provided in .env or environment variables.'
    );
    logger.info('Usage example:');
    logger.info('  BOOTSTRAP_ADMIN_MOBILE=9876543210 BOOTSTRAP_ADMIN_PASSWORD=YourSecurePass123 npm run bootstrap:admin');
    process.exit(1);
  }

  if (password.length < 8) {
    logger.error('❌ Bootstrap failed: BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters long.');
    process.exit(1);
  }

  const cleaned = mobile.replace(/[\s\-.()]/g, '');
  let cleanedMobile = cleaned;

  if (cleaned.startsWith('+91') && /^[6-9]\d{9}$/.test(cleaned.slice(3))) {
    cleanedMobile = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12 && /^[6-9]\d{9}$/.test(cleaned.slice(2))) {
    cleanedMobile = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11 && /^[6-9]\d{9}$/.test(cleaned.slice(1))) {
    cleanedMobile = cleaned.slice(1);
  }

  const isValidIndian = /^[6-9]\d{9}$/.test(cleanedMobile);
  const isValidInternational = /^\+[1-9]\d{6,14}$/.test(cleanedMobile);

  if (!isValidIndian && !isValidInternational) {
    logger.error(
      '❌ Bootstrap failed: BOOTSTRAP_ADMIN_MOBILE must be a valid 10-digit Indian mobile number or an international phone number with country code (e.g. +14155552671).'
    );
    process.exit(1);
  }

  try {
    await connectDB();

    const existingAdminCount = await userRepository.countAdmins();
    if (existingAdminCount > 0) {
      logger.warn(
        `⚠️ Security Notice: An ADMIN account already exists in this database (${existingAdminCount} found).`
      );
      logger.warn('Initial admin bootstrap is locked to prevent administrative hijacking.');
      await disconnectDB();
      process.exit(0);
    }

    const existingUser = await userRepository.findByMobile(cleanedMobile);
    if (existingUser) {
      logger.error(`❌ Bootstrap failed: A user with mobile number ${cleanedMobile} already exists.`);
      await disconnectDB();
      process.exit(1);
    }

    const passwordHash = await authService.hashPassword(password);

    const adminUser = await userRepository.create({
      fullName,
      mobile: cleanedMobile,
      email: email?.toLowerCase(),
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    await auditLogRepository.record({
      actorId: adminUser._id.toString(),
      actorRole: 'ADMIN',
      action: 'USER_LOGIN', // Log creation action
      entityType: 'USER',
      entityId: adminUser._id.toString(),
      notes: 'Initial administrator bootstrapped via secure CLI',
    });

    logger.info(`✅ Admin user successfully created!`);
    logger.info(`   Name: ${adminUser.fullName}`);
    logger.info(`   Mobile: ${adminUser.mobile}`);
    logger.info(`   Role: ${adminUser.role}`);
    logger.info('Remember to remove or unset BOOTSTRAP_ADMIN_PASSWORD from your environment once done.');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during admin bootstrap:', error);
    await disconnectDB();
    process.exit(1);
  }
}

bootstrapAdmin();
