import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerModel } from '../src/models/customer.model';
import { LeadModel } from '../src/models/lead.model';
import { UserModel } from '../src/models/user.model';
import { DestinationModel } from '../src/models/destination.model';
import { TourPackageModel } from '../src/models/tourPackage.model';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { customerRepository } from '../src/repositories/customer.repository';
import { leadRepository } from '../src/repositories/lead.repository';
import { destinationRepository } from '../src/repositories/destination.repository';
import { tourPackageRepository } from '../src/repositories/package.repository';
import { userRepository } from '../src/repositories/user.repository';
import { customerService } from '../src/services/customer.service';
import { leadService } from '../src/services/lead.service';
import * as sequenceModule from '../src/models/sequence.model';
import { AppError } from '../src/utils/appError';

describe('Phase 3 - Step B: Customer & Lead Foundation', () => {
  const adminActor = {
    userId: '66554433221100aabbccdd01',
    role: 'ADMIN' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'vitest-test',
  };

  const agent1Actor = {
    userId: '66554433221100aabbccdd02',
    role: 'AGENT' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'vitest-test',
  };

  const agent2Actor = {
    userId: '66554433221100aabbccdd03',
    role: 'AGENT' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'vitest-test',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);
    vi.spyOn(leadRepository, 'addTimelineEvent').mockResolvedValue(null as any);
  });

  describe('Customer Deduplication & Mobile Normalization', () => {
    it('normalizes Indian phone formats (+91, 0, 91, spaces) and creates customer with audit log', async () => {
      const mockCustomer = new CustomerModel({
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Rajesh Sharma',
        mobile: '9876543210',
        email: 'rajesh@example.com',
        source: 'ADMIN_DIRECT',
        createdBy: new mongoose.Types.ObjectId(adminActor.userId),
      });

      vi.spyOn(customerRepository, 'findByMobile').mockResolvedValue(null);
      vi.spyOn(customerRepository, 'create').mockResolvedValue(mockCustomer);
      const auditSpy = vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);

      const result = await customerService.createCustomer(
        {
          fullName: 'Rajesh Sharma',
          mobile: '+91 98765 43210',
          email: 'rajesh@example.com',
        },
        adminActor
      );

      expect(result.fullName).toBe('Rajesh Sharma');
      expect(result.mobile).toBe('9876543210');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUSTOMER_CREATED',
          entityType: 'CUSTOMER',
        })
      );
    });

    it('supports international E.164 phone formats without corruption', async () => {
      const mockCustomer = new CustomerModel({
        _id: new mongoose.Types.ObjectId(),
        fullName: 'John Smith',
        mobile: '+14155552671',
        source: 'CUSTOMER_WEB',
        createdBy: new mongoose.Types.ObjectId(adminActor.userId),
      });

      vi.spyOn(customerRepository, 'findByMobile').mockResolvedValue(null);
      vi.spyOn(customerRepository, 'create').mockResolvedValue(mockCustomer);

      const result = await customerService.createCustomer(
        {
          fullName: 'John Smith',
          mobile: '+1 (415) 555-2671',
          source: 'CUSTOMER_WEB',
        },
        adminActor
      );

      expect(result.mobile).toBe('+14155552671');
    });

    it('rejects duplicate customer creation with the same normalized mobile number', async () => {
      const existing = new CustomerModel({
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Existing Customer',
        mobile: '9876543210',
        source: 'PHONE',
        createdBy: new mongoose.Types.ObjectId(adminActor.userId),
      });

      vi.spyOn(customerRepository, 'findByMobile').mockResolvedValue(existing);

      await expect(
        customerService.createCustomer(
          {
            fullName: 'Duplicate Entry',
            mobile: '09876543210', // Should normalize to 9876543210 and collide
          },
          adminActor
        )
      ).rejects.toThrow(AppError);
    });

    it('getOrCreateCustomer returns existing record if mobile matches', async () => {
      const existing = new CustomerModel({
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Existing Customer',
        mobile: '9876543210',
        source: 'PHONE',
        createdBy: new mongoose.Types.ObjectId(adminActor.userId),
      });

      vi.spyOn(customerRepository, 'findByMobile').mockResolvedValue(existing);
      const createSpy = vi.spyOn(customerRepository, 'create');

      const result = await customerService.getOrCreateCustomer(
        {
          fullName: 'Same Person',
          mobile: '+91 9876543210',
        },
        adminActor
      );

      expect(result.fullName).toBe('Existing Customer');
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe('Customer Row-Level Access & Scoping', () => {
    it('allows Admin to view any customer', async () => {
      const customer = new CustomerModel({
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Private VIP Customer',
        mobile: '9876543210',
        assignedAgentId: new mongoose.Types.ObjectId(agent2Actor.userId),
        createdBy: new mongoose.Types.ObjectId(agent2Actor.userId),
      });

      vi.spyOn(customerRepository, 'findById').mockResolvedValue(customer);

      const result = await customerService.getCustomerById(customer._id.toString(), adminActor);
      expect(result.fullName).toBe('Private VIP Customer');
    });

    it('forbids agent from accessing customer assigned to another agent', async () => {
      const customer = new CustomerModel({
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Agent 2 Customer',
        mobile: '9876543210',
        assignedAgentId: new mongoose.Types.ObjectId(agent2Actor.userId),
        createdBy: new mongoose.Types.ObjectId(agent2Actor.userId),
      });

      vi.spyOn(customerRepository, 'findById').mockResolvedValue(customer);

      await expect(
        customerService.getCustomerById(customer._id.toString(), agent1Actor)
      ).rejects.toThrow(/permission/i);
    });

    it('allows agent to update their own assigned customer', async () => {
      const customer = new CustomerModel({
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Agent 1 Customer',
        mobile: '9876543210',
        assignedAgentId: new mongoose.Types.ObjectId(agent1Actor.userId),
        createdBy: new mongoose.Types.ObjectId(agent1Actor.userId),
      });

      const updated = new CustomerModel({
        _id: customer._id,
        fullName: 'Agent 1 Customer Updated',
        mobile: '9876543210',
        assignedAgentId: new mongoose.Types.ObjectId(agent1Actor.userId),
        createdBy: new mongoose.Types.ObjectId(agent1Actor.userId),
      });

      vi.spyOn(customerRepository, 'findById').mockResolvedValue(customer);
      vi.spyOn(customerRepository, 'update').mockResolvedValue(updated);
      const auditSpy = vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);

      const result = await customerService.updateCustomer(
        customer._id.toString(),
        { fullName: 'Agent 1 Customer Updated' },
        agent1Actor
      );

      expect(result.fullName).toBe('Agent 1 Customer Updated');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUSTOMER_UPDATED',
          entityType: 'CUSTOMER',
        })
      );
    });
  });

  describe('Lead Management & Referential Integrity', () => {
    it('creates lead with auto-generated sequential lead number NCT-LD-YYYY-XXXXX', async () => {
      const customerId = new mongoose.Types.ObjectId().toString();
      const destinationId = new mongoose.Types.ObjectId().toString();

      vi.spyOn(customerRepository, 'findById').mockResolvedValue(new CustomerModel({ _id: customerId, fullName: 'Test' }));
      vi.spyOn(destinationRepository, 'findById').mockResolvedValue(new DestinationModel({ _id: destinationId, name: 'Goa', isActive: true }));
      vi.spyOn(sequenceModule, 'getNextSequenceValue').mockResolvedValue(1);

      const mockLead = new LeadModel({
        _id: new mongoose.Types.ObjectId(),
        leadNumber: `NCT-LD-${new Date().getFullYear()}-00001`,
        customerId: new mongoose.Types.ObjectId(customerId),
        destinationId: new mongoose.Types.ObjectId(destinationId),
        numberOfAdults: 2,
        numberOfChildren: 1,
        source: 'ADMIN_DIRECT',
        status: 'NEW',
        createdBy: new mongoose.Types.ObjectId(adminActor.userId),
      });

      vi.spyOn(leadRepository, 'create').mockResolvedValue(mockLead);
      const auditSpy = vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);

      const result = await leadService.createLead(
        {
          customerId,
          destinationId,
          numberOfAdults: 2,
          numberOfChildren: 1,
        },
        adminActor
      );

      expect(result.leadNumber).toMatch(/^NCT-LD-\d{4}-\d{5}$/);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LEAD_CREATED',
          entityType: 'LEAD',
        })
      );
    });

    it('rejects lead creation if customer does not exist', async () => {
      vi.spyOn(customerRepository, 'findById').mockResolvedValue(null);

      await expect(
        leadService.createLead(
          {
            customerId: new mongoose.Types.ObjectId().toString(),
            destinationId: new mongoose.Types.ObjectId().toString(),
            numberOfAdults: 2,
          },
          adminActor
        )
      ).rejects.toThrow(/Customer with ID/);
    });

    it('rejects lead creation if destination is inactive', async () => {
      const customerId = new mongoose.Types.ObjectId().toString();
      const destinationId = new mongoose.Types.ObjectId().toString();

      vi.spyOn(customerRepository, 'findById').mockResolvedValue(new CustomerModel({ _id: customerId }));
      vi.spyOn(destinationRepository, 'findById').mockResolvedValue(
        new DestinationModel({ _id: destinationId, name: 'Inactive Valley', isActive: false })
      );

      await expect(
        leadService.createLead(
          {
            customerId,
            destinationId,
            numberOfAdults: 2,
          },
          adminActor
        )
      ).rejects.toThrow(/inactive/);
    });

    it('auto-assigns lead to creating agent and sets status to ASSIGNED', async () => {
      const customerId = new mongoose.Types.ObjectId().toString();
      const destinationId = new mongoose.Types.ObjectId().toString();

      vi.spyOn(customerRepository, 'findById').mockResolvedValue(new CustomerModel({ _id: customerId }));
      vi.spyOn(destinationRepository, 'findById').mockResolvedValue(new DestinationModel({ _id: destinationId, isActive: true }));
      vi.spyOn(sequenceModule, 'getNextSequenceValue').mockResolvedValue(2);

      const mockLead = new LeadModel({
        _id: new mongoose.Types.ObjectId(),
        leadNumber: `NCT-LD-${new Date().getFullYear()}-00002`,
        customerId: new mongoose.Types.ObjectId(customerId),
        destinationId: new mongoose.Types.ObjectId(destinationId),
        numberOfAdults: 2,
        source: 'AGENT',
        status: 'ASSIGNED',
        assignedAgentId: new mongoose.Types.ObjectId(agent1Actor.userId),
        createdBy: new mongoose.Types.ObjectId(agent1Actor.userId),
      });

      const repoSpy = vi.spyOn(leadRepository, 'create').mockResolvedValue(mockLead);

      const result = await leadService.createLead(
        {
          customerId,
          destinationId,
          numberOfAdults: 2,
        },
        agent1Actor
      );

      expect(repoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ASSIGNED',
          assignedAgentId: agent1Actor.userId,
        })
      );
      expect(result.status).toBe('ASSIGNED');
    });
  });

  describe('Lead Row-Level Access & Admin Reassignment', () => {
    it('restricts agent from viewing leads assigned to other agents', async () => {
      const lead = new LeadModel({
        _id: new mongoose.Types.ObjectId(),
        leadNumber: 'NCT-LD-2026-00003',
        customerId: new mongoose.Types.ObjectId(),
        destinationId: new mongoose.Types.ObjectId(),
        numberOfAdults: 2,
        assignedAgentId: new mongoose.Types.ObjectId(agent2Actor.userId),
        createdBy: new mongoose.Types.ObjectId(agent2Actor.userId),
      });

      vi.spyOn(leadRepository, 'findById').mockResolvedValue(lead);

      await expect(
        leadService.getLeadById(lead._id.toString(), agent1Actor)
      ).rejects.toThrow(/permission/i);
    });

    it('forbids non-admin agent from reassigning leads', async () => {
      await expect(
        leadService.assignLead(
          new mongoose.Types.ObjectId().toString(),
          { assignedAgentId: agent2Actor.userId },
          agent1Actor
        )
      ).rejects.toThrow(/Only administrators/);
    });

    it('allows Admin to reassign lead and revokes former agent edit permission', async () => {
      const leadId = new mongoose.Types.ObjectId().toString();
      const initialLead = new LeadModel({
        _id: new mongoose.Types.ObjectId(leadId),
        leadNumber: 'NCT-LD-2026-00004',
        customerId: new mongoose.Types.ObjectId(),
        destinationId: new mongoose.Types.ObjectId(),
        numberOfAdults: 2,
        assignedAgentId: new mongoose.Types.ObjectId(agent1Actor.userId),
        createdBy: new mongoose.Types.ObjectId(agent1Actor.userId),
        status: 'ASSIGNED',
      });

      const targetAgent = new UserModel({
        _id: new mongoose.Types.ObjectId(agent2Actor.userId),
        fullName: 'Agent Two',
        status: 'ACTIVE',
        role: 'AGENT',
      });

      const reassignedLead = new LeadModel({
        _id: initialLead._id,
        leadNumber: initialLead.leadNumber,
        customerId: initialLead.customerId,
        destinationId: initialLead.destinationId,
        numberOfAdults: 2,
        assignedAgentId: new mongoose.Types.ObjectId(agent2Actor.userId),
        createdBy: initialLead.createdBy,
        status: 'ASSIGNED',
      });

      vi.spyOn(leadRepository, 'findById')
        .mockResolvedValueOnce(initialLead)
        .mockResolvedValueOnce(reassignedLead);
      vi.spyOn(userRepository, 'findById').mockResolvedValue(targetAgent);
      vi.spyOn(leadRepository, 'update').mockResolvedValue(reassignedLead);
      const auditSpy = vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);

      // Admin reassigns lead from agent 1 to agent 2
      const result = await leadService.assignLead(
        leadId,
        { assignedAgentId: agent2Actor.userId },
        adminActor
      );

      expect(result.assignedAgentId).toBe(agent2Actor.userId);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LEAD_ASSIGNED',
          entityType: 'LEAD',
          previousState: { assignedAgentId: agent1Actor.userId },
        })
      );

      // Now verify agent1 CANNOT edit the reassigned lead
      vi.spyOn(leadRepository, 'findById').mockResolvedValue(reassignedLead);
      await expect(
        leadService.updateLead(leadId, { numberOfAdults: 3 }, agent1Actor)
      ).rejects.toThrow(/permission/i);
    });
  });
});
