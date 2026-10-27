import { SeasonDto } from '@chirag/types';

export interface DayWiseSeasonResolution {
  date: string;
  season: SeasonDto | null;
}

/**
 * Deterministically resolves which season applies to a specific calendar date.
 *
 * Conflict Resolution Rule:
 * 1. Filter all candidate seasons where startDate <= targetDate <= endDate.
 * 2. If no season matches, returns null (baseline default pricing applies).
 * 3. If multiple seasons overlap, prioritize the season with the highest numeric `priority`.
 * 4. If priorities are equal, prioritize the season with the shorter (more specific) duration.
 */
export function resolveSeasonForDate(
  targetDateInput: Date | string,
  candidateSeasons: SeasonDto[]
): SeasonDto | null {
  const target = new Date(targetDateInput).getTime();
  if (isNaN(target)) {
    throw new Error('Invalid target date provided to season resolver');
  }

  // Filter overlapping seasons
  const activeCandidates = candidateSeasons.filter((s) => {
    const start = new Date(s.startDate).getTime();
    const end = new Date(s.endDate).getTime();
    return target >= start && target <= end;
  });

  if (activeCandidates.length === 0) {
    return null;
  }

  if (activeCandidates.length === 1) {
    return activeCandidates[0]!;
  }

  // Sort by priority descending (highest first)
  activeCandidates.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    // Secondary tie-breaker: shorter duration is more specific
    const durationA = new Date(a.endDate).getTime() - new Date(a.startDate).getTime();
    const durationB = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
    return durationA - durationB;
  });

  return activeCandidates[0]!;
}

/**
 * Resolves the applicable season for every single night of a date range.
 * Essential for stays that straddle seasonal boundaries (e.g. Dec 18 to Dec 23).
 */
export function resolveDayWiseSeasons(
  startDateInput: Date | string,
  endDateInput: Date | string,
  candidateSeasons: SeasonDto[]
): DayWiseSeasonResolution[] {
  const start = new Date(startDateInput);
  const end = new Date(endDateInput);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid start or end date provided');
  }

  if (end.getTime() < start.getTime()) {
    throw new Error('End date cannot precede start date');
  }

  const results: DayWiseSeasonResolution[] = [];
  const current = new Date(start);

  // Iterate day-by-day up to the night before departure (or total nights)
  while (current.getTime() < end.getTime()) {
    const dateStr = current.toISOString().split('T')[0]!;
    const matchedSeason = resolveSeasonForDate(current, candidateSeasons);

    results.push({
      date: dateStr,
      season: matchedSeason,
    });

    // Move to next day
    current.setDate(current.getDate() + 1);
  }

  return results;
}
