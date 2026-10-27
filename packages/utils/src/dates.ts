/**
 * Calculate the number of nights between two dates.
 */
export function calculateNights(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Normalize time to midnight UTC for pure calendar day comparison
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.floor((utcEnd - utcStart) / msPerDay);

  return Math.max(0, diffDays);
}

/**
 * Check if a given date falls within a start and end date range (inclusive).
 */
export function isDateInRange(
  targetDate: Date | string,
  startDate: Date | string,
  endDate: Date | string
): boolean {
  const target = new Date(targetDate).getTime();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  return target >= start && target <= end;
}

/**
 * Format a Date to standard human-readable display: "14 Oct 2026"
 */
export function formatDateDisplay(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a Date to standard ISO date-only format: "2026-10-14"
 */
export function formatDateISO(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0] ?? '';
}
