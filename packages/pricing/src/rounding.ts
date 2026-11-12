/**
 * Precision Monetary Rounding Engine
 * 
 * Defines standard commercial half-up rounding and banker's rounding (round half to even).
 * Provides clean midpoint resolution free from IEEE 754 floating point artifacts.
 */

/**
 * Standard Commercial Half-Up Rounding (Round half away from zero).
 * Statutory rounding convention for Indian GST invoices (Section 170 CGST Act).
 * 
 * @param amount - Number to round
 * @param decimals - Decimal places (default: 2)
 */
export function roundHalfUp(amount: number, decimals: number = 2): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  const factor = Math.pow(10, decimals);
  const sign = amount < 0 ? -1 : 1;
  const abs = Math.abs(amount);
  return (sign * Math.round(Number(abs + 'e' + decimals))) / factor;
}

/**
 * Banker's Rounding (Round half to nearest even integer).
 * Commonly used in statistical and banking applications to eliminate rounding bias.
 * 
 * @param amount - Number to round
 * @param decimals - Decimal places (default: 2)
 */
export function roundBankers(amount: number, decimals: number = 2): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  const factor = Math.pow(10, decimals);
  const sign = amount < 0 ? -1 : 1;
  const abs = Math.abs(amount);

  const shifted = Number(abs + 'e' + decimals);
  const floor = Math.floor(shifted);
  const diff = Number((shifted - floor).toFixed(8));

  let rounded: number;
  if (Math.abs(diff - 0.5) < 1e-7) {
    // Exact midpoint: round to nearest even digit
    rounded = floor % 2 === 0 ? floor : floor + 1;
  } else {
    rounded = Math.round(shifted);
  }

  return (sign * rounded) / factor;
}

/**
 * Canonical currency rounding function for New Chirag Tours and Travels.
 * Explicitly defined as Standard Commercial Half-Up Rounding to 2 decimal places.
 */
export const roundCurrency = (amount: number): number => roundHalfUp(amount, 2);
