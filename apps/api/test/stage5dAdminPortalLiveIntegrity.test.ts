import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuditLogModel } from '../src/models/auditLog.model';
import { CustomerModel } from '../src/models/customer.model';
import { UserModel } from '../src/models/user.model';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { customerService } from '../src/services/customer.service';
import { authService } from '../src/services/auth.service';

const testDbName = `chirag_test_m4_live_${Date.now()}`;
const testMongoUri = `mongodb://localhost:27017/${testDbName}`;

describe('Milestone 4: Admin Portal Live MongoDB Integration Tests', () => {
  let adminUser: any;
  let agentUser: any;

  const adminActor = {
    userId: '',
    role: 'ADMIN' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'LiveM4TestRunner/1.0',
  };

  const agentActor = {
    userId: '',
    role: 'AGENT' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'LiveM4TestRunner/1.0',
  };

  beforeAll(async () => {
    await mongoose.connect(testMongoUri);

    await Promise.all([
      AuditLogModel.syncIndexes(),
      CustomerModel.syncIndexes(),
      UserModel.syncIndexes(),
    ]);

    // Create Admin User
    adminUser = await UserModel.create({
      fullName: 'Milestone 4 Admin',
      mobile: '9999900002',
      passwordHash: await authService.hashPassword('AdminPass@2026!'),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminActor.userId = adminUser._id.toString();

    // Create Agent User
    agentUser = await UserModel.create({
      fullName: 'Milestone 4 Agent',
      mobile: '9999900003',
      passwordHash: await authService.hashPassword('DemoAgent@2026!'),
      role: 'AGENT',
      status: 'ACTIVE',
    });
    agentActor.userId = agentUser._id.toString();
  });

  afterAll(async () => {
    try {
      await mongoose.connection.dropDatabase();
    } catch {
      // Ignore cleanup error if already dropped
    }
    await mongoose.disconnect();
  });

  describe('1. Live Customer Management & Domain Rules', () => {
    let createdCustomerId: string;

    it('creates a new customer record with normalization and audit logging', async () => {
      const customer = await customerService.createCustomer(
        {
          fullName: 'Bhavin Shah',
          mobile: '9825012345',
          email: 'bhavin.shah@example.com',
          city: 'Ahmedabad',
          state: 'Gujarat',
          notes: 'Vegetarian meals, senior citizen in family',
          source: 'ADMIN_DIRECT',
        },
        adminActor
      );

      expect(customer).toBeDefined();
      expect(customer.fullName).toBe('Bhavin Shah');
      expect(customer.mobile).toBe('9825012345');
      createdCustomerId = customer.id;

      // Check DB persistence directly
      const inDb = await CustomerModel.findById(customer.id);
      expect(inDb).not.toBeNull();
      expect(inDb?.fullName).toBe('Bhavin Shah');

      // Check audit log recorded in DB
      const auditLog = await AuditLogModel.findOne({
        entityType: 'CUSTOMER',
        entityId: customer.id,
        action: 'CUSTOMER_CREATED',
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.actorRole).toBe('ADMIN');
    });

    it('rejects duplicate customer creation with the same mobile number (409 Conflict)', async () => {
      await expect(
        customerService.createCustomer(
          {
            fullName: 'Duplicate Bhavin',
            mobile: '9825012345', // same normalized mobile
            city: 'Surat',
          },
          adminActor
        )
      ).rejects.toThrow(/already exists/i);
    });

    it('lists customers with pagination and search filter', async () => {
      const { customers, total } = await customerService.listCustomers(
        { search: 'Bhavin', skip: 0, limit: 10 },
        adminActor
      );

      expect(total).toBeGreaterThanOrEqual(1);
      expect(customers[0].fullName).toBe('Bhavin Shah');
    });

    it('updates customer details with audit trail', async () => {
      const updated = await customerService.updateCustomer(
        createdCustomerId,
        {
          notes: 'Updated: Prefers morning departures and Jain food.',
        },
        adminActor
      );

      expect(updated.notes).toContain('Jain food');

      const auditLog = await AuditLogModel.findOne({
        entityType: 'CUSTOMER',
        entityId: createdCustomerId,
        action: 'CUSTOMER_UPDATED',
      });
      expect(auditLog).not.toBeNull();
      expect((auditLog?.newState as any)?.notes).toContain('Jain food');
    });
  });

  describe('2. Live Audit Log Persistence, Filtering & Index Verification', () => {
    it('persists diverse audit actions and filters by entityType and action', async () => {
      // Record multiple live audit entries
      await auditLogRepository.record({
        action: 'PAYMENT_VERIFIED',
        entityType: 'PAYMENT',
        entityId: 'pay-live-001',
        actorId: adminActor.userId,
        actorRole: 'ADMIN',
        ipAddress: '127.0.0.1',
        notes: 'Verified against HDFC statement UTR998877',
      });

      await auditLogRepository.record({
        action: 'PAYMENT_REJECTED',
        entityType: 'PAYMENT',
        entityId: 'pay-live-002',
        actorId: adminActor.userId,
        actorRole: 'ADMIN',
        ipAddress: '127.0.0.1',
        notes: 'Invalid bank UTR',
      });

      await auditLogRepository.record({
        action: 'HOTEL_VOUCHER_GENERATED',
        entityType: 'HOTEL_RESERVATION',
        entityId: 'res-live-001',
        actorId: adminActor.userId,
        actorRole: 'ADMIN',
        ipAddress: '127.0.0.1',
        notes: 'Issued voucher v1 for Grand Mumtaz Gulmarg',
      });

      // Filter by PAYMENT
      const paymentLogs = await auditLogRepository.findLogs({
        entityType: 'PAYMENT',
        limit: 10,
      });
      expect(paymentLogs.total).toBe(2);
      expect(paymentLogs.logs.map((l) => l.action)).toContain('PAYMENT_VERIFIED');
      expect(paymentLogs.logs.map((l) => l.action)).toContain('PAYMENT_REJECTED');

      // Filter by specific action
      const voucherLogs = await auditLogRepository.findLogs({
        action: 'HOTEL_VOUCHER_GENERATED',
        limit: 10,
      });
      expect(voucherLogs.total).toBe(1);
      expect(voucherLogs.logs[0].entityId).toBe('res-live-001');

      // Filter by entityId substring
      const searchLogs = await auditLogRepository.findLogs({
        entityId: 'live-001',
        limit: 10,
      });
      expect(searchLogs.total).toBe(2); // pay-live-001 and res-live-001
    });

    it('verifies strict immutability: audit logs have no deletion or mutation method in repository', () => {
      // Intentionally verify repository provides no delete or remove method
      expect((auditLogRepository as any).delete).toBeUndefined();
      expect((auditLogRepository as any).remove).toBeUndefined();
      expect((auditLogRepository as any).deleteMany).toBeUndefined();
    });
  });
});
