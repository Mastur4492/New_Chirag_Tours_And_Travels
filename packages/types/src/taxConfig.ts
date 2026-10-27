export type TaxConfigType = 'GST' | 'VAT' | 'CUSTOM' | 'ZERO_RATED' | 'EXEMPT';

export interface TaxConfigDto {
  id: string;
  name: string;
  taxType: TaxConfigType;
  ratePercent: number;
  isApplicable: boolean;
  jurisdiction: string;
  description?: string;
  isDefault: boolean;
  isConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxConfigInput {
  name: string;
  taxType?: TaxConfigType;
  ratePercent: number;
  isApplicable?: boolean;
  jurisdiction?: string;
  description?: string;
  isDefault?: boolean;
  isConfirmed?: boolean;
}

export interface UpdateTaxConfigInput {
  name?: string;
  taxType?: TaxConfigType;
  ratePercent?: number;
  isApplicable?: boolean;
  jurisdiction?: string;
  description?: string;
  isDefault?: boolean;
  isConfirmed?: boolean;
}

