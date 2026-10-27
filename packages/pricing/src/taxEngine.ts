import { roundHalfUp } from './rounding';

export type TaxType = 'GST' | 'VAT' | 'CUSTOM' | 'ZERO_RATED' | 'EXEMPT';

export interface TaxRule {
  name: string;
  taxType: TaxType;
  ratePercent: number;
  isApplicable: boolean;
  jurisdiction?: string;
  exemptionReason?: string;
  isConfirmed?: boolean;
}

export interface TaxBreakdown {
  name: string;
  taxType: TaxType;
  ratePercent: number;
  taxableAmount: number;
  taxAmount: number;
  totalWithTax: number;
  isApplicable: boolean;
  exemptionReason?: string;
  isConfirmed: boolean;
}

/**
 * Standard baseline tax rule for Indian domestic tour packages.
 * Default is unconfirmed (isConfirmed: false) pending formal sign-off from Faisal Bikanerwala / CA.
 * Admin-managed settings can override this dynamically per destination or quotation.
 */
export const DEFAULT_DOMESTIC_TAX_RULE: TaxRule = {
  name: 'GST (Tour Package - Unconfirmed Fallback)',
  taxType: 'GST',
  ratePercent: 5,
  isApplicable: true,
  jurisdiction: 'IN',
  isConfirmed: false,
};

/**
 * Backward compatibility constant.
 * Note: Quotations should use dynamic TaxRule configurations rather than assuming a single static rate.
 */
export const DEFAULT_GST_RATE_PERCENT = DEFAULT_DOMESTIC_TAX_RULE.ratePercent;

/**
 * Validates and calculates tax based on dynamic, admin-configurable rules.
 *
 * @throws Error if taxableAmount is negative or ratePercent is out of bounds [0, 100].
 */
export function calculateTax(
  taxableAmount: number,
  ruleInput?: Partial<TaxRule>
): TaxBreakdown {
  if (typeof taxableAmount !== 'number' || isNaN(taxableAmount) || taxableAmount < 0) {
    throw new Error('Taxable amount must be a non-negative number');
  }

  const rule: TaxRule = {
    ...DEFAULT_DOMESTIC_TAX_RULE,
    ...ruleInput,
  };

  if (
    typeof rule.ratePercent !== 'number' ||
    isNaN(rule.ratePercent) ||
    rule.ratePercent < 0 ||
    rule.ratePercent > 100
  ) {
    throw new Error('Tax rate percent must be a valid number between 0 and 100');
  }

  const roundedTaxable = roundHalfUp(taxableAmount, 2);

  // When tax does not apply (e.g. exempt, zero-rated, or not applicable by rule)
  if (!rule.isApplicable || rule.ratePercent === 0) {
    return {
      name: rule.name,
      taxType: rule.isApplicable ? rule.taxType : 'EXEMPT',
      ratePercent: rule.isApplicable ? rule.ratePercent : 0,
      taxableAmount: roundedTaxable,
      taxAmount: 0,
      totalWithTax: roundedTaxable,
      isApplicable: rule.isApplicable,
      exemptionReason: rule.exemptionReason,
      isConfirmed: Boolean(rule.isConfirmed),
    };
  }

  // Exact 2-decimal rounded calculation using standard commercial half-up rounding
  const taxAmount = roundHalfUp(roundedTaxable * (rule.ratePercent / 100), 2);
  const totalWithTax = roundHalfUp(roundedTaxable + taxAmount, 2);

  return {
    name: rule.name,
    taxType: rule.taxType,
    ratePercent: rule.ratePercent,
    taxableAmount: roundedTaxable,
    taxAmount,
    totalWithTax,
    isApplicable: true,
    exemptionReason: rule.exemptionReason,
    isConfirmed: Boolean(rule.isConfirmed),
  };
}


/**
 * Convenience wrapper for GST calculation supporting custom rates and exemptions.
 */
export function calculateGST(
  taxableAmount: number,
  ratePercent = DEFAULT_DOMESTIC_TAX_RULE.ratePercent,
  isApplicable = true
): TaxBreakdown {
  return calculateTax(taxableAmount, {
    taxType: 'GST',
    ratePercent,
    isApplicable,
  });
}
