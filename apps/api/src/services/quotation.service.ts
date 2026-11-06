import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  ApproveQuotationInput,
  CreateQuotationInput,
  QuotationDto,
  QuotationPublicDto,
  QuotationStatus,
  QuotationVersionDto,
  ReviseQuotationInput,
  UserRole,
} from '@chirag/types';
import {
  calculateHotelStayPricing,
  calculateQuotationTotals,
  calculateTransportPricing,
  validateRoomOccupancy,
} from '@chirag/pricing';
import { normalizePhoneNumber } from '@chirag/validation';
import { quotationRepository, FindQuotationsFilter } from '../repositories/quotation.repository';
import { quotationVersionRepository } from '../repositories/quotationVersion.repository';
import { leadRepository } from '../repositories/lead.repository';
import { customerRepository } from '../repositories/customer.repository';
import { destinationRepository } from '../repositories/destination.repository';
import { hotelRepository } from '../repositories/hotel.repository';
import { roomCategoryRepository } from '../repositories/roomCategory.repository';
import { seasonalRateCardRepository } from '../repositories/seasonalRateCard.repository';
import { seasonRepository } from '../repositories/season.repository';
import { transportRepository } from '../repositories/transport.repository';
import { taxConfigRepository } from '../repositories/taxConfig.repository';
import { userRepository } from '../repositories/user.repository';
import { tourPackageRepository } from '../repositories/package.repository';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { bookingRepository } from '../repositories/booking.repository';
import { IBookingDocument } from '../models/booking.model';
import { IQuotationDocument } from '../models/quotation.model';
import { getNextSequenceValue } from '../models/sequence.model';
import { notificationService } from './notification.service';
import { realtimeService } from './realtime.service';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export interface ActorContext {
  userId: string;
  role: UserRole;
  ipAddress?: string;
  userAgent?: string;
}

export class QuotationService {
  /**
   * Pure calculation helper that evaluates hotel and transport line items and financial totals
   */
  async calculateQuoteDetails(
    input: CreateQuotationInput,
    actor?: ActorContext,
    options?: { sanitizeForAgent?: boolean }
  ) {
    let totalBaseSupplierCost = 0;

    // 1. Calculate Hotel Line Items
    const calculatedHotels = [];
    for (const h of input.hotels || []) {
      const hotel = await hotelRepository.findById(h.hotelId);
      if (!hotel) {
        throw AppError.notFound(`Hotel with ID ${h.hotelId} not found`);
      }
      if (!hotel.isActive) {
        throw AppError.badRequest(`Hotel "${hotel.name}" is currently inactive`);
      }

      const roomCategory = await roomCategoryRepository.findById(h.roomCategoryId);
      if (!roomCategory) {
        throw AppError.notFound(`Room category with ID ${h.roomCategoryId} not found`);
      }
      if (!roomCategory.isActive) {
        throw AppError.badRequest(`Room category "${roomCategory.name}" is currently inactive`);
      }
      if (roomCategory.hotelId.toString() !== h.hotelId) {
        throw AppError.badRequest(
          `Room category "${roomCategory.name}" does not belong to hotel "${hotel.name}"`
        );
      }

      // Occupancy and meal plan validation
      validateRoomOccupancy(
        roomCategory.toDto(),
        h.numberOfRooms,
        h.adultsCount,
        h.childrenWithBedCount || 0,
        h.childrenWithoutBedCount || 0,
        h.mealPlan
      );

      // Load rate cards for this room category
      const { rateCards } = await seasonalRateCardRepository.findMany({
        hotelId: h.hotelId,
        roomCategoryId: h.roomCategoryId,
        isActive: true,
      });

      const resolvedRateCards = rateCards || [];

      const seasons = await seasonRepository.findByDestination(hotel.destinationId.toString());

      const checkIn = new Date(h.checkInDate);
      const checkOut = new Date(h.checkOutDate);
      const numberOfNights = Math.max(
        1,
        Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      );

      const hotelStayCalculation = calculateHotelStayPricing({
        checkInDate: h.checkInDate,
        numberOfNights,
        roomCategory: roomCategory.toDto(),
        mealPlan: h.mealPlan,
        numberOfRooms: h.numberOfRooms,
        adultsCount: h.adultsCount,
        childrenWithBedCount: h.childrenWithBedCount || 0,
        childrenWithoutBedCount: h.childrenWithoutBedCount || 0,
        candidateSeasons: seasons.map((s) => s.toDto()),
        rateCards: resolvedRateCards.map((rc) => rc.toDto()),
        allowRegularSeasonFallback: true,
      });

      const lineSupplierCost = hotelStayCalculation.totalStaySupplierCost;
      totalBaseSupplierCost += lineSupplierCost;

      calculatedHotels.push({
        hotelId: h.hotelId as any,
        roomCategoryId: h.roomCategoryId as any,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfNights,
        numberOfRooms: h.numberOfRooms,
        adultsCount: h.adultsCount,
        childrenWithBedCount: h.childrenWithBedCount || 0,
        childrenWithoutBedCount: h.childrenWithoutBedCount || 0,
        mealPlan: h.mealPlan,
        supplierCost: lineSupplierCost,
        calculatedPrice: lineSupplierCost,
      });
    }

    // 2. Calculate Transport Line Items
    const calculatedTransports = [];
    for (const t of input.transports || []) {
      let lineSupplierCost = 0;

      if (t.tariffId) {
        const tariff = await transportRepository.findTariffById(t.tariffId);
        if (!tariff) {
          throw AppError.notFound(`Transport tariff with ID ${t.tariffId} not found`);
        }
        if (!tariff.isActive) {
          throw AppError.badRequest('Selected transport tariff is currently inactive');
        }

        const transportCalc = calculateTransportPricing({
          tariff: tariff.toDto({ includeSupplierCost: true }),
          numberOfDays: t.numberOfDays || 1,
          totalEstimatedKm: t.estimatedKm,
          numberOfNightHalts: t.nightHaltDays,
          estimatedTollParking: t.tollsAndParking,
        });

        lineSupplierCost = transportCalc.totalSupplierCost;
      } else {
        // Fallback / ad-hoc estimation if no pre-configured tariff selected
        lineSupplierCost = Math.max(0, t.tollsAndParking || 0);
      }

      totalBaseSupplierCost += lineSupplierCost;

      calculatedTransports.push({
        vehicleId: t.vehicleId ? (t.vehicleId as any) : undefined,
        tariffId: t.tariffId ? (t.tariffId as any) : undefined,
        pricingBasis: t.pricingBasis,
        numberOfDays: t.numberOfDays,
        estimatedKm: t.estimatedKm,
        driverAllowanceDays: t.driverAllowanceDays || 0,
        nightHaltDays: t.nightHaltDays || 0,
        tollsAndParking: t.tollsAndParking || 0,
        supplierCost: lineSupplierCost,
        calculatedPrice: lineSupplierCost,
        notes: t.notes,
      });
    }

    // 3. Resolve Taxes
    let taxRatePercent = input.taxRatePercent;
    let isTaxApplicable = true;
    let isTaxConfirmed = false;
    let taxRuleName = 'Unconfirmed Fallback GST (5% Pending CA Sign-off)';

    // Security Invariant: Agents are not authorized to unilaterally declare quotations tax-exempt
    if (actor?.role === 'AGENT' && input.isTaxApplicable === false) {
      throw AppError.forbidden(
        'Agents are not authorized to declare quotations tax-exempt. Tax exemptions require an approved administrator tax rule.'
      );
    }

    if (input.isTaxApplicable === false) {
      // Exemption explicitly requested (Admin only)
      // Derive tax exemption strictly from authorized server-side rules in TaxConfigModel
      const exemptRules = await taxConfigRepository.findMany({
        isApplicable: false,
      });
      const confirmedExempt = exemptRules.find((r) => Boolean((r as any).isConfirmed));

      if (confirmedExempt) {
        isTaxApplicable = false;
        taxRatePercent = confirmedExempt.ratePercent || 0;
        taxRuleName = confirmedExempt.name;
        isTaxConfirmed = true;
      } else {
        // No confirmed exempt rule in database -> unconfirmed custom exemption
        isTaxApplicable = false;
        taxRatePercent = 0;
        taxRuleName = 'Unconfirmed Custom Exemption (Pending CA Sign-off)';
        isTaxConfirmed = false;
      }
    } else if (taxRatePercent === undefined) {
      const defaultTax = await taxConfigRepository.findDefault();
      if (defaultTax) {
        isTaxApplicable = defaultTax.isApplicable !== false && (defaultTax as any).taxType !== 'EXEMPT';
        taxRatePercent = defaultTax.ratePercent;
        taxRuleName = defaultTax.name;
        isTaxConfirmed = Boolean((defaultTax as any).isConfirmed);
      } else {
        // Fallback default standard GST (5% under pending CA review)
        isTaxApplicable = true;
        taxRatePercent = 5;
        isTaxConfirmed = false;
        taxRuleName = 'Unconfirmed Fallback GST (5% Pending CA Sign-off)';
      }
    } else {
      const rules = await taxConfigRepository.findMany({ isApplicable: true });
      const matching = rules.find((r) => r.ratePercent === taxRatePercent);
      if (matching) {
        isTaxApplicable = matching.isApplicable !== false && (matching as any).taxType !== 'EXEMPT';
        isTaxConfirmed = Boolean((matching as any).isConfirmed);
        taxRuleName = matching.name;
      } else {
        isTaxApplicable = true;
        isTaxConfirmed = false;
        taxRuleName = `Custom Tax (${taxRatePercent}%)`;
      }
    }

    // 4. Calculate Financial Totals
    const calculatedTotals = calculateQuotationTotals({
      baseSupplierCost: totalBaseSupplierCost,
      markupType: input.markupType,
      markupPercent: input.markupPercent,
      markupAmount: input.markupAmount,
      discountType: input.discountType,
      discountPercent: input.discountPercent || 0,
      discountAmount: input.discountAmount,
      taxRatePercent,
      isTaxApplicable,
      isTaxConfirmed,
    });

    const shouldSanitize = options?.sanitizeForAgent ?? (actor?.role === 'AGENT');
    const pricingSummary = {
      ...calculatedTotals,
      totalBaseSupplierCost: shouldSanitize ? undefined : calculatedTotals.totalBaseSupplierCost,
      projectedGrossProfit: shouldSanitize ? undefined : calculatedTotals.projectedGrossProfit,
      isTaxConfirmed,
      taxRuleName,
    };

    return {
      hotels: shouldSanitize
        ? calculatedHotels.map((h) => ({ ...h, supplierCost: undefined }))
        : calculatedHotels,
      transports: shouldSanitize
        ? calculatedTransports.map((t) => ({ ...t, supplierCost: undefined }))
        : calculatedTransports,
      pricingSummary,
    };
  }

  async createQuotation(
    input: CreateQuotationInput,
    actor: ActorContext
  ): Promise<QuotationDto> {
    // 1. Verify Lead
    const lead = await leadRepository.findById(input.leadId);
    if (!lead) {
      throw AppError.notFound(`Lead with ID ${input.leadId} not found`);
    }

    // 2. Verify Row-Level Access & Scoping
    if (actor.role === 'AGENT') {
      const assigned = lead.assignedAgentId
        ? (lead.assignedAgentId as any)._id?.toString() || lead.assignedAgentId.toString()
        : '';
      if (assigned !== actor.userId) {
        throw AppError.forbidden('You do not have permission to create quotations for this lead');
      }
    }

    // 3. Verify Destination
    const destination = await destinationRepository.findById(input.destinationId);
    if (!destination) {
      throw AppError.notFound(`Destination with ID ${input.destinationId} not found`);
    }

    // 4. Verify Package if provided
    if (input.packageId) {
      const tourPackage = await tourPackageRepository.findById(input.packageId);
      if (!tourPackage) {
        throw AppError.notFound(`Tour package with ID ${input.packageId} not found`);
      }
    }

    // 5. Evaluate Pricing
    const evaluated = await this.calculateQuoteDetails(input, actor, { sanitizeForAgent: false });

    // 6. Agent Discount & Markup Guardrails
    let initialStatus: QuotationStatus = 'DRAFT';
    let approvalReason: string | undefined = undefined;

    if (actor.role === 'AGENT') {
      const agentUser = await userRepository.findById(actor.userId);
      const maxDiscount = agentUser?.agentProfile?.maxDiscountPercent ?? 5;
      const maxMarkup = agentUser?.agentProfile?.maxMarkupPercent ?? 20;

      const requestedDiscount = evaluated.pricingSummary.discountPercent || 0;
      const requestedMarkup = evaluated.pricingSummary.markupPercent || 0;

      if (requestedDiscount > maxDiscount || requestedMarkup > maxMarkup) {
        initialStatus = 'PENDING_ADMIN_APPROVAL';
        approvalReason = `Discount (${requestedDiscount.toFixed(1)}%) or Markup (${requestedMarkup.toFixed(1)}%) exceeds agent threshold (Max Discount: ${maxDiscount}%, Max Markup: ${maxMarkup}%)`;
      }
    } else if (actor.role === 'ADMIN') {
      initialStatus = 'APPROVED';
    }

    // 7. Calculate Dates & Durations
    const start = new Date(input.travelStartDate);
    const end = new Date(input.travelEndDate);
    const durationNights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const durationDays = durationNights + 1;

    // 8. Generate Unique Sequential Quote Number: NCT-QT-YYYY-XXXXX
    const year = new Date().getFullYear();
    const seq = await getNextSequenceValue(`quotation_${year}`);
    const quoteNumber = `NCT-QT-${year}-${String(seq).padStart(5, '0')}`;

    const validUntil = new Date(Date.now() + (input.validityDays || 7) * 24 * 60 * 60 * 1000);

    const previewToken = crypto.randomBytes(32).toString('hex');
    const previewTokenHash = crypto.createHash('sha256').update(previewToken).digest('hex');

    const created = await quotationRepository.create({
      quoteNumber,
      leadId: input.leadId as any,
      customerId: lead.customerId._id ? (lead.customerId._id as any) : (lead.customerId as any),
      assignedAgentId: lead.assignedAgentId
        ? (lead.assignedAgentId as any)._id
          ? (lead.assignedAgentId as any)._id
          : (lead.assignedAgentId as any)
        : (actor.userId as any),
      destinationId: input.destinationId as any,
      packageId: input.packageId ? (input.packageId as any) : undefined,
      travelStartDate: start,
      travelEndDate: end,
      durationNights,
      durationDays,
      numberOfAdults: input.numberOfAdults,
      numberOfChildren: input.numberOfChildren || 0,
      numberOfInfants: input.numberOfInfants || 0,
      currentVersion: 1,
      status: initialStatus,
      shareableToken: previewToken,
      shareableTokenHash: previewTokenHash,
      validUntil,
      notes: input.notes?.trim(),
      inclusions: input.inclusions || [],
      exclusions: input.exclusions || [],
      terms: input.terms || [],
      hotels: evaluated.hotels,
      transports: evaluated.transports,
      pricingSummary: evaluated.pricingSummary as any,
      approvalReason,
      createdBy: actor.userId as any,
    });

    // Update lead status to QUOTED if currently NEW or ASSIGNED
    if (lead.status === 'NEW' || lead.status === 'ASSIGNED') {
      await leadRepository.update(lead._id.toString(), { status: 'QUOTED' });
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'QUOTATION_CREATED',
      entityType: 'QUOTATION',
      entityId: created._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: created.toDto('ADMIN') as unknown as Record<string, unknown>,
    });

    const createdDto = created.toDto(actor.role);
    realtimeService.broadcast({
      type: 'QUOTATION_UPDATE',
      title: 'New Quotation Proposal Created',
      message: `Quotation ${created.quoteNumber} created by ${actor.role}`,
      data: { action: 'CREATED', quoteNumber: created.quoteNumber, id: created._id.toString() },
    });
    return createdDto;
  }

  async reviseQuotation(
    id: string,
    input: ReviseQuotationInput,
    actor: ActorContext
  ): Promise<QuotationDto> {
    const quotation = await quotationRepository.findById(id);
    if (!quotation) {
      throw AppError.notFound(`Quotation with ID ${id} not found`);
    }

    if (quotation.status === 'ACCEPTED') {
      throw AppError.badRequest('Cannot revise a quotation proposal that has already been accepted by the traveler');
    }

    // Check Row-Level Access & Lead Reassignment
    const lead = await leadRepository.findById(quotation.leadId.toString());
    if (actor.role === 'AGENT') {
      const assigned = lead?.assignedAgentId
        ? (lead.assignedAgentId as any)._id?.toString() || lead.assignedAgentId.toString()
        : '';
      if (assigned !== actor.userId) {
        throw AppError.forbidden('You do not have permission to modify this quotation because the lead is no longer assigned to you');
      }
    }

    // 1. Snapshot previous state into QuotationVersion (Immutable Historical Archive)
    await quotationVersionRepository.create({
      quotationId: quotation._id,
      versionNumber: quotation.currentVersion,
      changeReason: input.changeReason,
      snapshot: quotation.toDto('ADMIN'),
      createdBy: actor.userId as any,
    });

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'QUOTATION_VERSION_CREATED',
      entityType: 'QUOTATION',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      notes: `Archived version ${quotation.currentVersion}: "${input.changeReason}"`,
    });

    // 2. Recalculate Pricing with revised parameters
    const evaluated = await this.calculateQuoteDetails(input, actor, { sanitizeForAgent: false });

    // 3. Agent limits check on revised version
    let status: QuotationStatus = 'DRAFT';
    let approvalReason: string | undefined = undefined;

    if (actor.role === 'AGENT') {
      const agentUser = await userRepository.findById(actor.userId);
      const maxDiscount = agentUser?.agentProfile?.maxDiscountPercent ?? 5;
      const maxMarkup = agentUser?.agentProfile?.maxMarkupPercent ?? 20;

      const requestedDiscount = evaluated.pricingSummary.discountPercent || 0;
      const requestedMarkup = evaluated.pricingSummary.markupPercent || 0;

      if (requestedDiscount > maxDiscount || requestedMarkup > maxMarkup) {
        status = 'PENDING_ADMIN_APPROVAL';
        approvalReason = `Revision exceeds agent limits (Discount: ${requestedDiscount.toFixed(1)}%, Markup: ${requestedMarkup.toFixed(1)}%)`;
      }
    } else if (actor.role === 'ADMIN') {
      status = 'APPROVED';
    }

    const start = new Date(input.travelStartDate);
    const end = new Date(input.travelEndDate);
    const durationNights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const durationDays = durationNights + 1;

    const newVersionNumber = quotation.currentVersion + 1;

    // Atomically update quotation version and revoke the old shareable token hash
    const updated = await quotationRepository.atomicReviseQuotation({
      quotationId: id,
      expectedVersion: quotation.currentVersion,
      newVersion: newVersionNumber,
      tokenToRevoke: quotation.shareableTokenHash,
      data: {
        status,
        travelStartDate: start,
        travelEndDate: end,
        durationNights,
        durationDays,
        numberOfAdults: input.numberOfAdults,
        numberOfChildren: input.numberOfChildren || 0,
        numberOfInfants: input.numberOfInfants || 0,
        hotels: evaluated.hotels,
        transports: evaluated.transports,
        pricingSummary: evaluated.pricingSummary as any,
        approvalReason,
        inclusions: input.inclusions || quotation.inclusions,
        exclusions: input.exclusions || quotation.exclusions,
        terms: input.terms || quotation.terms,
        notes: input.notes !== undefined ? input.notes.trim() : quotation.notes,
      },
    });

    if (!updated) {
      const current = await quotationRepository.findById(id);
      if (!current) {
        throw AppError.notFound(`Quotation with ID ${id} not found`);
      }
      if (current.status === 'ACCEPTED') {
        throw AppError.badRequest('Cannot revise quotation: the traveler accepted this proposal while your revision was being prepared.');
      }
      if (current.currentVersion !== quotation.currentVersion) {
        throw AppError.badRequest('Quotation was modified concurrently by another user. Please reload and try again.');
      }
      throw AppError.badRequest('Quotation revision could not be completed due to a concurrent update conflict.');
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'QUOTATION_REVISED',
      entityType: 'QUOTATION',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      notes: `Revised to version ${newVersionNumber}. Reason: ${input.changeReason}`,
    });

    const revisedDto = updated.toDto(actor.role);
    realtimeService.broadcast({
      type: 'QUOTATION_UPDATE',
      title: 'Quotation Proposal Revised',
      message: `Quotation ${updated.quoteNumber} revised to v${updated.currentVersion}`,
      data: { action: 'REVISED', quoteNumber: updated.quoteNumber, id: updated._id.toString(), currentVersion: updated.currentVersion },
    });
    return revisedDto;
  }

  async approveQuotation(
    id: string,
    input: ApproveQuotationInput,
    actor: ActorContext
  ): Promise<QuotationDto> {
    if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can approve or reject quotations');
    }

    const quotation = await quotationRepository.findById(id);
    if (!quotation) {
      throw AppError.notFound(`Quotation with ID ${id} not found`);
    }

    const newStatus: QuotationStatus = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updated = await quotationRepository.update(id, {
      status: newStatus,
      approvalReason: input.notes?.trim(),
      approvedBy: input.decision === 'APPROVE' ? (actor.userId as any) : undefined,
      approvedAt: input.decision === 'APPROVE' ? new Date() : undefined,
    });

    if (!updated) {
      throw AppError.notFound(`Quotation with ID ${id} not found`);
    }

    const auditAction =
      input.decision === 'APPROVE'
        ? 'QUOTATION_PRICE_OVERRIDE_APPROVED'
        : 'QUOTATION_PRICE_OVERRIDE_REJECTED';

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: auditAction,
      entityType: 'QUOTATION',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      notes: input.notes,
    });

    const revisedDto = updated.toDto(actor.role);
    realtimeService.broadcast({
      type: 'QUOTATION_UPDATE',
      title: 'Quotation Proposal Revised',
      message: `Quotation ${updated.quoteNumber} revised to v${updated.currentVersion}`,
      data: { action: 'REVISED', quoteNumber: updated.quoteNumber, id: updated._id.toString(), currentVersion: updated.currentVersion },
    });
    return revisedDto;
  }

  async issueQuotation(
    id: string,
    actor: ActorContext
  ): Promise<{ quotation: QuotationDto; shareableToken: string }> {
    const quotation = await quotationRepository.findById(id);
    if (!quotation) {
      throw AppError.notFound(`Quotation with ID ${id} not found`);
    }

    // Role scoping
    if (actor.role === 'AGENT') {
      const assigned = quotation.assignedAgentId
        ? (quotation.assignedAgentId as any)._id?.toString() || quotation.assignedAgentId.toString()
        : '';
      if (assigned !== actor.userId) {
        throw AppError.forbidden('You do not have permission to issue this quotation');
      }
    }

    // State machine check
    if (quotation.status === 'PENDING_ADMIN_APPROVAL') {
      throw AppError.badRequest('Quotation is pending Admin approval and cannot be issued yet');
    }
    if (quotation.status === 'REJECTED') {
      throw AppError.badRequest('Rejected quotation cannot be issued. Please revise and request approval');
    }

    // Financial calculation & completeness safeguards
    if (!quotation.pricingSummary || typeof quotation.pricingSummary.finalSellingPrice !== 'number') {
      throw AppError.badRequest('Quotation cannot be issued because financial calculations are incomplete or missing');
    }

    const finalPrice = quotation.pricingSummary.finalSellingPrice;
    const isExplicitlyFree =
      (quotation as any).isComplimentary === true ||
      Boolean(quotation.approvalReason?.toLowerCase().includes('complimentary')) ||
      Boolean(quotation.notes?.toLowerCase().includes('complimentary'));

    if (finalPrice <= 0 && !isExplicitlyFree) {
      throw AppError.badRequest(
        'Cannot issue quotation with ₹0 selling price. Quotations must reflect valid inventory rates or explicit complimentary authorization.'
      );
    }

    // Statutory/Commercial Safety Guard:
    // Every issued quotation must be governed by an approved, confirmed tax rule (whether taxable or exempt).
    // An unconfirmed tax fallback or unconfirmed tax exemption CANNOT be issued to customers.
    if (quotation.pricingSummary.isTaxConfirmed !== true) {
      throw AppError.badRequest(
        'Cannot issue quotation: GST/tax configuration is unconfirmed (pending Faisal/CA approval). Please configure and confirm an approved tax rule before issuing quotations to customers.'
      );
    }

    // Generate cryptographic token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const updated = await quotationRepository.update(id, {
      status: 'ISSUED',
      shareableToken: rawToken,
      shareableTokenHash: tokenHash,
    });

    if (!updated) {
      throw AppError.notFound(`Quotation with ID ${id} not found`);
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'QUOTATION_STATUS_UPDATED',
      entityType: 'QUOTATION',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      notes: 'Quotation issued and secure token generated',
    });

    const dto = updated.toDto(actor.role);
    dto.shareableToken = rawToken;

    realtimeService.broadcast({
      type: 'QUOTATION_UPDATE',
      title: 'Quotation Proposal Issued',
      message: `Quotation ${updated.quoteNumber} issued and live for customer`,
      data: { action: 'ISSUED', quoteNumber: updated.quoteNumber, id: updated._id.toString() },
    });

    return { quotation: dto, shareableToken: rawToken };
  }

  async getPublicQuotation(rawToken: string): Promise<QuotationPublicDto> {
    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const quotation = await quotationRepository.findByShareableTokenHash(tokenHash);
    if (!quotation) {
      const superseded = await quotationRepository.findBySupersededTokenHash(tokenHash);
      if (superseded) {
        throw AppError.badRequest('This quotation proposal has been updated with a newer version. Please contact New Chirag Tours & Travels for the latest proposal link.');
      }
      throw AppError.notFound('Quotation link is invalid or has expired');
    }

    if (new Date() > new Date(quotation.validUntil)) {
      throw AppError.badRequest('This quotation has expired. Please contact New Chirag Tours & Travels for an updated quote');
    }

    return quotation.toPublicDto();
  }

  async updateTravelerPublicQuotation(
    rawToken: string,
    input: {
      fullName: string;
      mobile: string;
      email?: string | null;
      city?: string | null;
    }
  ): Promise<QuotationPublicDto> {
    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const quotation = await quotationRepository.findByShareableTokenHash(tokenHash);
    if (!quotation) {
      throw AppError.notFound('Quotation link is invalid or has expired');
    }

    if (quotation.customerId) {
      const custObj = quotation.customerId as any;
      const customerId = (custObj._id ? custObj._id : custObj).toString();
      const normalizedMobile = normalizePhoneNumber(input.mobile);

      // Check conflict if changing mobile
      const existingCustomer = await customerRepository.findByMobile(normalizedMobile);
      if (existingCustomer && existingCustomer._id.toString() !== customerId) {
        throw AppError.conflict(`Another customer with mobile ${normalizedMobile} is already registered.`);
      }

      const updateData: Record<string, any> = {
        fullName: input.fullName.trim(),
        mobile: normalizedMobile,
      };
      if (input.email !== undefined) {
        updateData.email = input.email ? input.email.trim().toLowerCase() : undefined;
      }
      if (input.city !== undefined) {
        updateData.city = input.city ? input.city.trim() : undefined;
      }

      await customerRepository.update(customerId, updateData);

      await auditLogRepository.record({
        actorId: customerId,
        actorRole: 'CUSTOMER',
        action: 'CUSTOMER_UPDATED',
        entityType: 'CUSTOMER',
        entityId: customerId,
        notes: `Traveler updated their details on proposal #${quotation.quoteNumber}`,
      });
    }

    const refreshed = await quotationRepository.findByShareableTokenHash(tokenHash);
    return refreshed ? refreshed.toPublicDto() : quotation.toPublicDto();
  }

  async acceptPublicQuotation(
    rawToken: string,
    notes?: string
  ): Promise<QuotationPublicDto> {
    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const quotation = await quotationRepository.findByShareableTokenHash(tokenHash);
    if (!quotation) {
      const superseded = await quotationRepository.findBySupersededTokenHash(tokenHash);
      if (superseded) {
        throw AppError.badRequest('This quotation proposal has been updated with a newer version and can no longer be accepted. Please request the latest proposal link.');
      }
      throw AppError.notFound('Quotation link is invalid or has expired');
    }

    if (new Date() > new Date(quotation.validUntil)) {
      throw AppError.badRequest('This quotation has expired and cannot be accepted. Please request an updated quote');
    }

    // Idempotency & Crash-Recovery:
    // If already marked ACCEPTED, check whether the booking was created or if a crash interrupted it
    if (quotation.status === 'ACCEPTED') {
      const activeBooking = await bookingRepository.findActiveByQuotationId(quotation._id.toString());
      if (activeBooking) {
        // Self-heal quotation link in MongoDB if it was missing or unpersisted
        if (!quotation.bookingId || quotation.bookingNumber !== activeBooking.bookingNumber) {
          await quotationRepository.update(quotation._id.toString(), {
            bookingId: activeBooking._id,
            bookingNumber: activeBooking.bookingNumber,
          });
          quotation.bookingId = activeBooking._id;
          quotation.bookingNumber = activeBooking.bookingNumber;
        }

        // Reconcile any missing CRM or audit side effects idempotently
        await this.reconcileAcceptanceSideEffects(quotation, activeBooking, notes);

        return quotation.toPublicDto();
      }

      // CRASH RECOVERY: Quotation was marked ACCEPTED but process crashed before booking creation!
      // Do NOT return success with undefined bookingNumber!
      // Safely resume booking creation using the accepted quotation version and immutable snapshot:
      const recoveredBooking = await this.createAndLinkBookingForQuotation(quotation, notes, false);
      quotation.bookingId = recoveredBooking._id;
      quotation.bookingNumber = recoveredBooking.bookingNumber;
      return quotation.toPublicDto();
    }

    if (quotation.status !== 'ISSUED' && quotation.status !== 'SENT') {
      throw AppError.badRequest(`Quotation is in "${quotation.status}" status and cannot be accepted`);
    }

    // Atomic conditional update to prevent race conditions with concurrent revisions or multiple acceptance clicks
    const updated = await quotationRepository.atomicAcceptQuotation({
      quotationId: quotation._id.toString(),
      version: quotation.currentVersion,
      tokenHash,
      notes,
    });

    if (!updated) {
      const current = await quotationRepository.findById(quotation._id.toString());
      if (current && current.status === 'ACCEPTED') {
        const activeBooking = await bookingRepository.findActiveByQuotationId(current._id.toString());
        if (activeBooking) {
          if (!current.bookingId || current.bookingNumber !== activeBooking.bookingNumber) {
            await quotationRepository.update(current._id.toString(), {
              bookingId: activeBooking._id,
              bookingNumber: activeBooking.bookingNumber,
            });
            current.bookingId = activeBooking._id;
            current.bookingNumber = activeBooking.bookingNumber;
          }
          await this.reconcileAcceptanceSideEffects(current, activeBooking, notes);
          return current.toPublicDto();
        }

        // Concurrent crash recovery
        const recoveredBooking = await this.createAndLinkBookingForQuotation(current, notes, false);
        current.bookingId = recoveredBooking._id;
        current.bookingNumber = recoveredBooking.bookingNumber;
        return current.toPublicDto();
      }
      if (current && current.currentVersion !== quotation.currentVersion) {
        throw AppError.badRequest('This quotation proposal was revised while your request was being processed. Please review the updated quotation before accepting.');
      }
      throw AppError.badRequest('Quotation is no longer eligible for acceptance.');
    }

    // Normal path: Create the Booking Request in QUOTE_ACCEPTED status
    const booking = await this.createAndLinkBookingForQuotation(updated, notes, true);
    updated.bookingId = booking._id;
    updated.bookingNumber = booking.bookingNumber;

    return updated.toPublicDto();
  }

  private async createAndLinkBookingForQuotation(
    quotation: IQuotationDocument,
    notes?: string,
    isInitialAcceptance: boolean = false
  ): Promise<IBookingDocument> {
    const year = new Date().getFullYear();
    const seq = await getNextSequenceValue(`booking_${year}`);
    const bookingNumber = `NCT-BK-${year}-${seq.toString().padStart(5, '0')}`;

    const sellingPrice = quotation.pricingSummary?.finalSellingPrice || 0;
    const sellingPricePaise = Math.round(sellingPrice * 100);
    const supplierCost = quotation.pricingSummary?.totalBaseSupplierCost;
    const supplierCostPaise = supplierCost !== undefined ? Math.round(supplierCost * 100) : undefined;
    const profit = quotation.pricingSummary?.projectedGrossProfit;

    let booking: IBookingDocument;
    try {
      booking = await bookingRepository.create({
        bookingNumber,
        quotationId: quotation._id,
        quotationVersionUsed: quotation.currentVersion,
        leadId: quotation.leadId,
        customerId: quotation.customerId,
        assignedAgentId: (quotation.assignedAgentId || quotation.createdBy) as any,
        destinationId: quotation.destinationId,
        travelStartDate: quotation.travelStartDate,
        travelEndDate: quotation.travelEndDate,
        durationNights: quotation.durationNights || 1,
        durationDays: quotation.durationDays || 2,
        numberOfAdults: quotation.numberOfAdults || 2,
        numberOfChildren: quotation.numberOfChildren || 0,
        numberOfInfants: quotation.numberOfInfants || 0,
        status: 'QUOTE_ACCEPTED',
        financials: {
          totalAmount: sellingPrice,
          totalAmountInPaise: sellingPricePaise,
          currency: 'INR',
          advanceRequired: 0,
          advanceRequiredInPaise: 0,
          totalPaid: 0,
          totalPaidInPaise: 0,
          balancePending: sellingPrice,
          balancePendingInPaise: sellingPricePaise,
          supplierCostTotal: supplierCost,
          supplierCostTotalInPaise: supplierCostPaise,
          realizedGrossProfit: profit,
          taxableAmount: quotation.pricingSummary?.taxableAmount,
          taxAmount: quotation.pricingSummary?.taxAmount,
          taxRatePercent: quotation.pricingSummary?.taxRatePercent,
        },
        itinerarySnapshot: {
          hotels: quotation.hotels || [],
          transports: quotation.transports || [],
          inclusions: quotation.inclusions || [],
          exclusions: quotation.exclusions || [],
          terms: quotation.terms || [],
        },
        customerNotes: notes ? notes.trim() : undefined,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        // Concurrent collision or duplicate key on quotationId partial index
        const existing = await bookingRepository.findActiveByQuotationId(quotation._id.toString());
        if (existing) {
          booking = existing;
        } else {
          // Booking number collision (rare): retry once
          const retrySeq = await getNextSequenceValue(`booking_${year}`);
          const retryNumber = `NCT-BK-${year}-${retrySeq.toString().padStart(5, '0')}`;
          booking = await bookingRepository.create({
            bookingNumber: retryNumber,
            quotationId: quotation._id,
            quotationVersionUsed: quotation.currentVersion,
            leadId: quotation.leadId,
            customerId: quotation.customerId,
            assignedAgentId: quotation.assignedAgentId,
            destinationId: quotation.destinationId,
            travelStartDate: quotation.travelStartDate,
            travelEndDate: quotation.travelEndDate,
            durationNights: quotation.durationNights || 1,
            durationDays: quotation.durationDays || 2,
            numberOfAdults: quotation.numberOfAdults || 2,
            numberOfChildren: quotation.numberOfChildren || 0,
            numberOfInfants: quotation.numberOfInfants || 0,
            status: 'QUOTE_ACCEPTED',
            financials: {
              totalAmount: sellingPrice,
              totalAmountInPaise: sellingPricePaise,
              currency: 'INR',
              advanceRequired: 0,
              advanceRequiredInPaise: 0,
              totalPaid: 0,
              totalPaidInPaise: 0,
              balancePending: sellingPrice,
              balancePendingInPaise: sellingPricePaise,
              supplierCostTotal: supplierCost,
              supplierCostTotalInPaise: supplierCostPaise,
              realizedGrossProfit: profit,
              taxableAmount: quotation.pricingSummary?.taxableAmount,
              taxAmount: quotation.pricingSummary?.taxAmount,
              taxRatePercent: quotation.pricingSummary?.taxRatePercent,
            },
            itinerarySnapshot: {
              hotels: quotation.hotels || [],
              transports: quotation.transports || [],
              inclusions: quotation.inclusions || [],
              exclusions: quotation.exclusions || [],
              terms: quotation.terms || [],
            },
            customerNotes: notes ? notes.trim() : undefined,
          });
        }
      } else {
        if (isInitialAcceptance) {
          // Unexpected database error during initial booking creation:
          // Safely roll back quotation status to previous status (e.g. 'ISSUED') so it is not orphaned without a booking!
          logger.error('Failed to create booking for accepted quotation. Reverting quotation acceptance status to avoid orphaned state:', err);
          await quotationRepository.revertQuotationAcceptance(quotation._id.toString(), quotation.status);
          throw AppError.internal('Unable to finalize booking request. Quotation acceptance has been safely reverted. Please try again or contact support.');
        } else {
          logger.error('Failed to recover booking creation for accepted quotation:', err);
          throw AppError.internal('Unable to finalize booking request. Please try again or contact support.');
        }
      }
    }

    // Persist booking reference on the quotation document
    await quotationRepository.update(quotation._id.toString(), {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
    });
    quotation.bookingId = booking._id;
    quotation.bookingNumber = booking.bookingNumber;

    // Reconcile associated Lead and AuditLog side effects idempotently
    await this.reconcileAcceptanceSideEffects(quotation, booking, notes);

    return booking;
  }

  private async reconcileAcceptanceSideEffects(
    quotation: IQuotationDocument,
    booking: IBookingDocument,
    notes?: string
  ): Promise<void> {
    try {
      // 1. Reconcile Lead Status (ensure Lead is marked CONVERTED)
      if (quotation.leadId) {
        const lead = await leadRepository.findById(quotation.leadId.toString());
        if (lead) {
          if (lead.status !== 'CONVERTED') {
            await leadRepository.update(quotation.leadId.toString(), {
              status: 'CONVERTED',
            });
          }

        // 2. Reconcile Lead Timeline Event (prevent duplicate entries for the same booking)
        const hasAcceptanceEvent = lead.timeline?.some(
          (event: any) =>
            event.type === 'QUOTATION_ACCEPTED' &&
            (event.title?.includes(booking.bookingNumber) || event.content?.includes(booking.bookingNumber))
        );

        if (!hasAcceptanceEvent) {
          await leadRepository.addTimelineEvent(quotation.leadId.toString(), {
            type: 'QUOTATION_ACCEPTED',
            title: `Quotation Accepted & Booking Request Created (${booking.bookingNumber})`,
            content: notes
              ? `Booking request generated with reference ${booking.bookingNumber}. Customer Notes: ${notes.trim()}`
              : `Booking request generated with reference ${booking.bookingNumber} via online acceptance.`,
          });
        }
      }
    }

      // 3. Reconcile Audit Log (prevent duplicate audit log records for the same quotation acceptance)
      const existingAudit = await auditLogRepository.findQuotationAcceptanceLog(quotation._id.toString());
      if (!existingAudit) {
        await auditLogRepository.record({
          actorType: 'PUBLIC_CUSTOMER',
          action: 'QUOTATION_STATUS_UPDATED',
          entityType: 'QUOTATION',
          entityId: quotation._id.toString(),
          notes: `Quotation accepted by customer online. Booking request created: ${booking.bookingNumber}`,
          newState: {
            status: 'ACCEPTED',
            acceptedAt: quotation.acceptedAt || new Date(),
            bookingNumber: booking.bookingNumber,
          },
        });
      }

      // 4. In-App Notifications for Admin and Assigned Agent
      let clientName = 'Client';
      const custObj = quotation.customerId as any;
      if (custObj && typeof custObj === 'object' && custObj.fullName) {
        clientName = custObj.fullName;
      } else {
        const rawId = custObj?._id ? custObj._id.toString() : quotation.customerId ? quotation.customerId.toString() : null;
        if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
          const cust = await customerRepository.findById(rawId);
          if (cust?.fullName) clientName = cust.fullName;
        }
      }

      notificationService
        .createNotification({
          recipientRole: 'ADMIN',
          type: 'QUOTATION_ACCEPTED',
          title: `Proposal Accepted! (${booking.bookingNumber})`,
          message: `${clientName} accepted Proposal ${quotation.quoteNumber}. New Booking ${booking.bookingNumber} is generated and ready for processing.`,
          link: `/bookings/${booking._id.toString()}`,
          entityType: 'BOOKING',
          entityId: booking._id.toString(),
          metadata: {
            quoteNumber: quotation.quoteNumber,
            bookingNumber: booking.bookingNumber,
            customerName: clientName,
          },
        })
        .catch((err) => logger.error('[QuotationService] Failed to notify admin of acceptance:', err));

      const assignedAgentId =
        (booking.assignedAgentId as any)?._id?.toString() || booking.assignedAgentId?.toString();
      if (assignedAgentId) {
        notificationService
          .createNotification({
            recipientUserId: assignedAgentId,
            recipientRole: 'AGENT',
            type: 'QUOTATION_ACCEPTED',
            title: `Your Proposal Was Accepted! (${booking.bookingNumber})`,
            message: `${clientName} accepted Proposal ${quotation.quoteNumber}. New Booking ${booking.bookingNumber} is generated.`,
            link: `/bookings/${booking._id.toString()}`,
            entityType: 'BOOKING',
            entityId: booking._id.toString(),
            metadata: {
              quoteNumber: quotation.quoteNumber,
              bookingNumber: booking.bookingNumber,
              customerName: clientName,
            },
          })
          .catch((err) => logger.error('[QuotationService] Failed to notify agent of acceptance:', err));
      }

      // Live real-time broadcast across all 3 portals
      realtimeService.broadcast({
        type: 'QUOTATION_UPDATE',
        scopeId: quotation.shareableToken,
        title: `Proposal Accepted!`,
        message: `${clientName} accepted Proposal ${quotation.quoteNumber}.`,
        data: {
          action: 'ACCEPTED',
          quotationId: quotation._id.toString(),
          quoteNumber: quotation.quoteNumber,
          bookingId: booking._id.toString(),
          bookingNumber: booking.bookingNumber,
          customerName: clientName,
        },
      });

      realtimeService.broadcast({
        type: 'BOOKING_UPDATE',
        title: `New Booking Generated (${booking.bookingNumber})`,
        message: `Booking request generated for ${clientName}`,
        data: {
          action: 'CREATED',
          bookingId: booking._id.toString(),
          bookingNumber: booking.bookingNumber,
          customerName: clientName,
        },
      });
    } catch (sideEffectError) {
      logger.error('Error reconciling acceptance side effects:', sideEffectError, {
        quotationId: quotation._id.toString(),
        bookingNumber: booking.bookingNumber,
      });
    }
  }

  async requestModificationPublicQuotation(
    rawToken: string,
    message: string
  ): Promise<QuotationPublicDto> {
    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const quotation = await quotationRepository.findByShareableTokenHash(tokenHash);
    if (!quotation) {
      const superseded = await quotationRepository.findBySupersededTokenHash(tokenHash);
      if (superseded) {
        throw AppError.badRequest('This quotation proposal has been updated with a newer version. Please request changes on the latest proposal link.');
      }
      throw AppError.notFound('Quotation link is invalid or has expired');
    }

    if (new Date() > new Date(quotation.validUntil)) {
      throw AppError.badRequest('This quotation has expired. Please contact us for a new quote');
    }

    if (quotation.status === 'REVISED' || quotation.status === 'REJECTED') {
      throw AppError.badRequest(`Cannot request changes on a quotation in "${quotation.status}" status`);
    }

    const updated = await quotationRepository.update(quotation._id.toString(), {
      customerModificationRequest: {
        message: message.trim(),
        requestedAt: new Date(),
      },
    });

    if (!updated) {
      throw AppError.notFound('Quotation could not be updated');
    }

    // Update Lead to NEGOTIATING
    await leadRepository.update(quotation.leadId.toString(), {
      status: 'NEGOTIATING',
    });

    await leadRepository.addTimelineEvent(quotation.leadId.toString(), {
      type: 'MODIFICATION_REQUESTED',
      title: `Traveler Requested Changes on ${quotation.quoteNumber}`,
      content: `Message from Traveler: "${message.trim()}"`,
    });

    await auditLogRepository.record({
      actorType: 'PUBLIC_CUSTOMER',
      action: 'QUOTATION_STATUS_UPDATED',
      entityType: 'QUOTATION',
      entityId: quotation._id.toString(),
      notes: `Customer requested modification: "${message.trim()}"`,
      newState: { customerModificationRequest: message.trim() },
    });

    return updated.toPublicDto();
  }

  async getQuotationById(id: string, actor: ActorContext): Promise<QuotationDto> {
    const quotation = await quotationRepository.findById(id);
    if (!quotation) {
      throw AppError.notFound(`Quotation with ID ${id} not found`);
    }

    if (actor.role === 'AGENT') {
      const assigned = quotation.assignedAgentId
        ? (quotation.assignedAgentId as any)._id?.toString() || quotation.assignedAgentId.toString()
        : '';
      if (assigned !== actor.userId) {
        throw AppError.forbidden('You do not have permission to access this quotation');
      }
    }

    return quotation.toDto(actor.role);
  }

  async listQuotations(
    filter: FindQuotationsFilter,
    actor: ActorContext
  ): Promise<{ quotations: QuotationDto[]; total: number }> {
    const queryFilter: FindQuotationsFilter = { ...filter };
    if (actor.role === 'AGENT') {
      queryFilter.assignedAgentId = actor.userId;
    }

    const { quotations, total } = await quotationRepository.findMany(queryFilter);
    return {
      quotations: quotations.map((q) => q.toDto(actor.role)),
      total,
    };
  }

  async listQuotationVersions(
    quotationId: string,
    actor: ActorContext
  ): Promise<QuotationVersionDto[]> {
    const quotation = await quotationRepository.findById(quotationId);
    if (!quotation) {
      throw AppError.notFound(`Quotation with ID ${quotationId} not found`);
    }

    if (actor.role === 'AGENT') {
      const assigned = quotation.assignedAgentId
        ? (quotation.assignedAgentId as any)._id?.toString() || quotation.assignedAgentId.toString()
        : '';
      if (assigned !== actor.userId) {
        throw AppError.forbidden('You do not have permission to view versions for this quotation');
      }
    }

    const versions = await quotationVersionRepository.findByQuotationId(quotationId);
    return versions.map((v) => {
      const dto = v.toDto();
      // Mask confidential fields in snapshot if actor is AGENT
      if (actor.role !== 'ADMIN') {
        if (dto.snapshot.pricingSummary) {
          delete dto.snapshot.pricingSummary.totalBaseSupplierCost;
          delete dto.snapshot.pricingSummary.projectedGrossProfit;
        }
        if (dto.snapshot.hotels) {
          dto.snapshot.hotels.forEach((h) => {
            delete h.supplierCost;
          });
        }
        if (dto.snapshot.transports) {
          dto.snapshot.transports.forEach((t) => {
            delete t.supplierCost;
          });
        }
      }
      return dto;
    });
  }
}

export const quotationService = new QuotationService();
