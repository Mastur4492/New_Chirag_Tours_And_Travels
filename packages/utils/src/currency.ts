/**
 * Format a number to Indian Rupees (INR) string: e.g. 125000 -> "₹1,25,000"
 */
export function formatINR(amount: number, showDecimals = false): string {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Format number into Indian words/shorthand (e.g. 150000 -> "1.5 Lakh")
 */
export function formatINRShorthand(amount: number): string {
  if (isNaN(amount) || amount === 0) return '₹0';
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (absAmount >= 10000000) {
    const cr = (absAmount / 10000000).toFixed(2);
    return `${sign}₹${cr.replace(/\.?0+$/, '')} Cr`;
  }
  if (absAmount >= 100000) {
    const lk = (absAmount / 100000).toFixed(2);
    return `${sign}₹${lk.replace(/\.?0+$/, '')} Lakh`;
  }
  if (absAmount >= 1000) {
    const k = (absAmount / 1000).toFixed(1);
    return `${sign}₹${k.replace(/\.?0+$/, '')}k`;
  }
  return `${sign}₹${absAmount}`;
}

/**
 * Parse an INR string back to raw number
 */
export function parseINR(value: string): number {
  const cleaned = value.replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
