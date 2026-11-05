import { MealPlan } from './hotel';
import { TransportPricingBasis } from './vehicle';

export type QuotationStatus =
  | 'DRAFT'
  | 'PENDING_ADMIN_APPROVAL'
  | 'APPROVED'
  | 'ISSUED'
  | 'SENT'
  | 'ACCEPTED'
  | 'REVISED'
  | 'EXPIRED'
  | 'REJECTED';

export interface QuotationHotelRoomItemDto {
  hotelId: string;
  hotelName?: string;
  roomCategoryId: string;
  roomCategoryName?: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfNights: number;
  numberOfRooms: number;
  adultsCount: number;
  childrenWithBedCount: number;
  childrenWithoutBedCount: number;
  mealPlan: MealPlan;
  supplierCost?: number; // Confidential: only ADMIN
  calculatedPrice: number;
}

export interface QuotationTransportItemDto {
  vehicleId?: string;
  vehicleName?: string;
  tariffId?: string;
  pricingBasis: TransportPricingBasis;
  numberOfDays?: number;
  estimatedKm?: number;
  driverAllowanceDays?: number;
  nightHaltDays?: number;
  tollsAndParking?: number;
  supplierCost?: number; // Confidential: only ADMIN
  calculatedPrice: number;
  notes?: string;
}

export interface PricingSummaryDto {
  totalBaseSupplierCost?: number; // Only visible to ADMIN
  totalMarkupAmount: number;
  markupPercent: number;
  markupType?: 'PERCENT' | 'FLAT';
  discountAmount: number;
  discountPercent: number;
  discountType?: 'PERCENT' | 'FLAT';
  taxableAmount: number;
  taxRatePercent: number; // Configurable tax rate (e.g. 5%, 12%, 18%)
  taxAmount: number; // Dynamic calculated tax
  isTaxApplicable: boolean; // Whether tax applies or is exempt
  isTaxConfirmed?: boolean; // Whether statutory tax rate has been verified/approved by CA/Owner
  taxRuleName?: string; // Descriptive name of the applied tax rule
  finalSellingPrice: number;
  projectedGrossProfit?: number; // Only visible to ADMIN
  gstRatePercent?: number; // Backward compatibility alias
  gstAmount?: number; // Backward compatibility alias
}


export interface QuotationDto {
  id: string;
  quoteNumber: string;
  leadId: string;
  customerId: string;
  customerName?: string;
  customerMobile?: string;
  assignedAgentId: string;
  assignedAgentName?: string;
  destinationId: string;
  destinationName?: string;
  packageId?: string;
  travelStartDate: string;
  travelEndDate: string;
  durationNights: number;
  durationDays: number;
  numberOfAdults: number;
  numberOfChildren: number;
  numberOfInfants: number;
  currentVersion: number;
  status: QuotationStatus;
  shareableToken?: string; // Only returned when newly generated or authorized
  validUntil: string;
  notes?: string;
  inclusions: string[];
  exclusions: string[];
  terms: string[];
  hotels: QuotationHotelRoomItemDto[];
  transports: QuotationTransportItemDto[];
  pricingSummary: PricingSummaryDto;
  approvalReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  acceptedAt?: string;
  bookingId?: string;
  bookingNumber?: string;
  customerModificationRequest?: {
    message: string;
    requestedAt: string;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationPublicDto {
  quoteNumber: string;
  bookingId?: string;
  bookingNumber?: string;
  customerName?: string;
  customerMobile?: string;
  customerEmail?: string;
  customerCity?: string;
  destinationName?: string;
  travelStartDate: string;
  travelEndDate: string;
  durationNights: number;
  durationDays: number;
  numberOfAdults: number;
  numberOfChildren: number;
  status: QuotationStatus;
  validUntil: string;
  acceptedAt?: string;
  customerModificationRequest?: {
    message: string;
    requestedAt: string;
  };
  companyInfo: {
    name: string;
    owner: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
    logoBadgeUrl?: string;
    logoFullUrl?: string;
    logoIconUrl?: string;
    isPhoneConfigured?: boolean;
    isEmailConfigured?: boolean;
    isGstinConfigured?: boolean;
  };
  notes?: string;
  inclusions: string[];
  exclusions: string[];
  terms: string[];
  hotels: Array<{
    hotelName?: string;
    roomCategoryName?: string;
    checkInDate: string;
    checkOutDate: string;
    numberOfNights: number;
    numberOfRooms: number;
    mealPlan: MealPlan;
  }>;
  transports: Array<{
    vehicleName?: string;
    pricingBasis: TransportPricingBasis;
    numberOfDays?: number;
    notes?: string;
  }>;
  pricingSummary: {
    taxableAmount: number;
    taxRatePercent: number;
    taxAmount: number;
    isTaxApplicable: boolean;
    isTaxConfirmed?: boolean;
    discountAmount: number;
    discountPercent?: number;
    discountType?: 'PERCENT' | 'FLAT';
    finalSellingPrice: number;
    gstRatePercent?: number;
    gstAmount?: number;
  };
}


export interface RequestModificationInput {
  message: string;
}

export interface QuotationVersionDto {
  id: string;
  quotationId: string;
  versionNumber: number;
  changeReason?: string;
  snapshot: QuotationDto;
  createdBy: string;
  createdAt: string;
}

export interface CreateQuotationHotelInput {
  hotelId: string;
  roomCategoryId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfRooms: number;
  adultsCount: number;
  childrenWithBedCount?: number;
  childrenWithoutBedCount?: number;
  mealPlan: MealPlan;
}

export interface CreateQuotationTransportInput {
  vehicleId?: string;
  tariffId?: string;
  pricingBasis: TransportPricingBasis;
  numberOfDays?: number;
  estimatedKm?: number;
  driverAllowanceDays?: number;
  nightHaltDays?: number;
  tollsAndParking?: number;
  notes?: string;
}

export interface CreateQuotationInput {
  leadId: string;
  destinationId: string;
  packageId?: string;
  travelStartDate: string;
  travelEndDate: string;
  numberOfAdults: number;
  numberOfChildren?: number;
  numberOfInfants?: number;
  hotels: CreateQuotationHotelInput[];
  transports: CreateQuotationTransportInput[];
  markupType?: 'PERCENT' | 'FLAT';
  markupPercent?: number;
  markupAmount?: number;
  discountType?: 'PERCENT' | 'FLAT';
  discountPercent?: number;
  discountAmount?: number;
  isTaxApplicable?: boolean;
  taxRatePercent?: number;
  inclusions?: string[];
  exclusions?: string[];
  terms?: string[];
  notes?: string;
  validityDays?: number;
}

export interface ReviseQuotationInput extends CreateQuotationInput {
  changeReason: string;
}

export interface ApproveQuotationInput {
  decision: 'APPROVE' | 'REJECT';
  notes?: string;
}
