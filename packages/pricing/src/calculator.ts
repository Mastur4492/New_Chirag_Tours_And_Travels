import { calculateTax, TaxRule } from './taxEngine';
import { roundHalfUp } from './rounding';

export interface CalculationInput {
  baseSupplierCost: number;
  markupType?: 'PERCENT' | 'FLAT';
  markupPercent?: number;
  markupAmount?: number;
  discountType?: 'PERCENT' | 'FLAT';
  discountPercent?: number;
  discountAmount?: number;
  taxRule?: Partial<TaxRule>;
  taxRatePercent?: number;
  isTaxApplicable?: boolean;
  isTaxConfirmed?: boolean;
  gstRatePercent?: number; // Backward compatibility alias
}

export interface CalculationResult {
  totalBaseSupplierCost: number;
  totalMarkupAmount: number;
  markupPercent: number;
  markupType?: 'PERCENT' | 'FLAT';
  discountAmount: number;
  discountPercent: number;
  discountType?: 'PERCENT' | 'FLAT';
  taxableAmount: number;
  taxRatePercent: number;
  taxAmount: number;
  isTaxApplicable: boolean;
  isTaxConfirmed: boolean;
  finalSellingPrice: number;
  projectedGrossProfit: number;
  // Backward compatibility aliases
  gstRatePercent: number;
  gstAmount: number;
}


export function calculateQuotationTotals(input: CalculationInput): CalculationResult {
  const baseCost = Math.max(0, input.baseSupplierCost);

  // Resolved Markup calculation (Supports both % and Flat ₹ modes)
  const resolvedMarkupType: 'PERCENT' | 'FLAT' =
    input.markupType ?? (input.markupAmount !== undefined && input.markupPercent === undefined ? 'FLAT' : 'PERCENT');

  let markupAmount = 0;
  let markupPercent = 0;

  if (resolvedMarkupType === 'FLAT') {
    markupAmount = Math.max(0, input.markupAmount ?? 0);
    markupPercent = baseCost > 0 ? (markupAmount / baseCost) * 100 : 0;
  } else {
    markupPercent = Math.max(0, input.markupPercent ?? 0);
    markupAmount = (baseCost * markupPercent) / 100;
  }

  const grossSelling = baseCost + markupAmount;

  // Resolved Discount calculation (Supports both % and Flat ₹ modes)
  const resolvedDiscountType: 'PERCENT' | 'FLAT' =
    input.discountType ?? (input.discountAmount !== undefined && input.discountPercent === undefined ? 'FLAT' : 'PERCENT');

  let discountAmount = 0;
  let discountPercent = 0;

  if (resolvedDiscountType === 'FLAT') {
    discountAmount = Math.min(Math.max(0, input.discountAmount ?? 0), grossSelling);
    discountPercent = grossSelling > 0 ? (discountAmount / grossSelling) * 100 : 0;
  } else {
    discountPercent = Math.min(Math.max(0, input.discountPercent ?? 0), 100);
    discountAmount = (grossSelling * discountPercent) / 100;
  }

  const taxableAmount = Math.max(0, grossSelling - discountAmount);

  // Dynamic tax resolution (GST is strictly in % e.g. 5% SAC 998555)
  const resolvedTaxRule: Partial<TaxRule> = {
    ...input.taxRule,
  };

  // Support explicit shorthands if provided
  if (input.isTaxApplicable !== undefined) {
    resolvedTaxRule.isApplicable = input.isTaxApplicable;
  }
  if (input.taxRatePercent !== undefined) {
    resolvedTaxRule.ratePercent = input.taxRatePercent;
  } else if (input.gstRatePercent !== undefined && resolvedTaxRule.ratePercent === undefined) {
    resolvedTaxRule.ratePercent = input.gstRatePercent;
  }

  const taxBreakdown = calculateTax(taxableAmount, resolvedTaxRule);

  const finalSellingPrice = roundHalfUp(taxBreakdown.totalWithTax, 2);
  // Gross Profit = (Taxable Amount - Base Cost). Taxes collected are liabilities payable to government, not profit.
  const projectedGrossProfit = taxableAmount - baseCost;

  return {
    totalBaseSupplierCost: roundHalfUp(baseCost, 2),
    totalMarkupAmount: roundHalfUp(markupAmount, 2),
    markupPercent: roundHalfUp(markupPercent, 2),
    markupType: resolvedMarkupType,
    discountAmount: roundHalfUp(discountAmount, 2),
    discountPercent: roundHalfUp(discountPercent, 2),
    discountType: resolvedDiscountType,
    taxableAmount: taxBreakdown.taxableAmount,
    taxRatePercent: taxBreakdown.ratePercent,
    taxAmount: taxBreakdown.taxAmount,
    isTaxApplicable: taxBreakdown.isApplicable,
    isTaxConfirmed: input.isTaxConfirmed !== undefined ? input.isTaxConfirmed : Boolean(taxBreakdown.isConfirmed),
    finalSellingPrice,
    projectedGrossProfit: roundHalfUp(projectedGrossProfit, 2),
    gstRatePercent: taxBreakdown.ratePercent,
    gstAmount: taxBreakdown.taxAmount,
  };
}

