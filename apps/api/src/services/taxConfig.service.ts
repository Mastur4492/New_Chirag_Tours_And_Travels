import { CreateTaxConfigInput, TaxConfigDto, UpdateTaxConfigInput } from '@chirag/types';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { taxConfigRepository } from '../repositories/taxConfig.repository';
import { AppError } from '../utils/appError';
import { ActorContext } from './destination.service';

export class TaxConfigService {
  async createTaxRule(input: CreateTaxConfigInput, actor: ActorContext): Promise<TaxConfigDto> {
    const existing = await taxConfigRepository.findByName(input.name);
    if (existing) {
      throw AppError.conflict(`Tax rule with name "${input.name}" already exists`);
    }

    const created = await taxConfigRepository.create({
      name: input.name,
      taxType: input.taxType || 'GST',
      ratePercent: input.ratePercent,
      isApplicable: input.isApplicable !== undefined ? input.isApplicable : true,
      jurisdiction: input.jurisdiction || 'IN',
      description: input.description,
      isDefault: input.isDefault ?? false,
      isConfirmed: input.isConfirmed ?? false,
    });


    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_CREATED',
      entityType: 'TAX_CONFIG',
      entityId: created._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: created.toDto() as unknown as Record<string, unknown>,
      notes: `Created tax rule "${created.name}" (${created.ratePercent}%)`,
    });

    return created.toDto();
  }

  async updateTaxRule(
    id: string,
    input: UpdateTaxConfigInput,
    actor: ActorContext
  ): Promise<TaxConfigDto> {
    const tax = await taxConfigRepository.findById(id);
    if (!tax) {
      throw AppError.notFound('Tax rule not found');
    }

    if (input.name && input.name !== tax.name) {
      const existing = await taxConfigRepository.findByName(input.name);
      if (existing && existing._id.toString() !== id) {
        throw AppError.conflict(`Tax rule with name "${input.name}" already exists`);
      }
    }

    const previousState = tax.toDto();
    const updated = await taxConfigRepository.update(id, input as any);
    if (!updated) {
      throw AppError.notFound('Tax rule could not be updated');
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_UPDATED',
      entityType: 'TAX_CONFIG',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updated.toDto() as unknown as Record<string, unknown>,
      notes: `Updated tax rule "${updated.name}" (${updated.ratePercent}%)`,
    });

    return updated.toDto();
  }

  async getTaxRuleById(id: string): Promise<TaxConfigDto> {
    const tax = await taxConfigRepository.findById(id);
    if (!tax) {
      throw AppError.notFound('Tax rule not found');
    }
    return tax.toDto();
  }

  async getDefaultTaxRule(): Promise<TaxConfigDto | null> {
    const tax = await taxConfigRepository.findDefault();
    return tax ? tax.toDto() : null;
  }

  async listTaxRules(filter: { isApplicable?: boolean; jurisdiction?: string } = {}): Promise<TaxConfigDto[]> {
    const rules = await taxConfigRepository.findMany(filter);
    return rules.map((r) => r.toDto());
  }
}

export const taxConfigService = new TaxConfigService();
