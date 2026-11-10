import {
  MealPlan,
  MealPlanInput,
  RoomCategoryDto,
  SeasonDto,
  SeasonalRateCardDto,
  SeasonType,
  normalizeMealPlan,
} from '@chirag/types';
import { resolveSeasonForDate } from './seasonResolver';
import { roundHalfUp } from './rounding';

export interface HotelNightBreakdown {
  date: string; // YYYY-MM-DD
  seasonId?: string;
  seasonName: string;
  seasonType: SeasonType;
  rateCardId: string;
  baseCostPerNight: number;
  standardSellingPrice: number;
  extraAdultsCount: number;
  extraAdultBedCost: number;
  childrenWithBedCount: number;
  childWithBedCost: number;
  childrenWithoutBedCount: number;
  childWithoutBedCost: number;
  totalNightSupplierCost: number;
  totalNightSellingPrice: number;
}

export interface HotelStayPricingInput {
  checkInDate: string; // YYYY-MM-DD
  numberOfNights: number;
  roomCategory: RoomCategoryDto;
  mealPlan: MealPlan | MealPlanInput;
  numberOfRooms: number;
  adultsCount: number;
  childrenWithBedCount?: number;
  childrenWithoutBedCount?: number;
  candidateSeasons: SeasonDto[];
  rateCards: SeasonalRateCardDto[];
  allowRegularSeasonFallback?: boolean;
}

export interface HotelStayPricingResult {
  hotelId: string;
  roomCategoryId: string;
  mealPlan: MealPlan;
  numberOfRooms: number;
  numberOfNights: number;
  checkInDate: string;
  checkOutDate: string;
  totalAdults: number;
  totalChildren: number;
  extraAdultsPerRoom: number;
  totalExtraAdults: number;
  totalChildrenWithBed: number;
  totalChildrenWithoutBed: number;
  nightlyBreakdown: HotelNightBreakdown[];
  totalStaySupplierCost: number;
  totalStayStandardSelling: number;
}

export class PricingValidationError extends Error {
  constructor(message: string, public readonly code: string = 'PRICING_VALIDATION_ERROR') {
    super(message);
    this.name = 'PricingValidationError';
  }
}

/**
 * Validates room occupancy constraints against the room category configuration.
 */
export function validateRoomOccupancy(
  roomCategory: RoomCategoryDto,
  numberOfRooms: number,
  adultsCount: number,
  childrenWithBedCount: number = 0,
  childrenWithoutBedCount: number = 0,
  mealPlan: MealPlan | MealPlanInput
): {
  extraAdults: number;
  totalExtraBeds: number;
} {
  if (numberOfRooms < 1 || !Number.isInteger(numberOfRooms)) {
    throw new PricingValidationError('Number of rooms must be a positive integer');
  }
  if (adultsCount < 1 || !Number.isInteger(adultsCount)) {
    throw new PricingValidationError('Adults count must be at least 1');
  }
  if (childrenWithBedCount < 0 || childrenWithoutBedCount < 0) {
    throw new PricingValidationError('Children count cannot be negative');
  }

  // Meal plan validation with canonical normalization (e.g. EP -> RO)
  const canonicalMealPlan = normalizeMealPlan(mealPlan);
  const allowedCanonicalPlans = (roomCategory.allowedMealPlans || []).map(normalizeMealPlan);
  if (allowedCanonicalPlans.length > 0 && !allowedCanonicalPlans.includes(canonicalMealPlan)) {
    throw new PricingValidationError(
      `Meal plan "${mealPlan}" is not available for room category "${roomCategory.name}". Allowed meal plans: ${roomCategory.allowedMealPlans.join(', ')}`
    );
  }

  // Maximum adults per room check
  const maxTotalAdults = roomCategory.maxAdults * numberOfRooms;
  if (adultsCount > maxTotalAdults) {
    throw new PricingValidationError(
      `Adults count (${adultsCount}) exceeds maximum capacity of ${roomCategory.maxAdults} adults per room across ${numberOfRooms} room(s) (Maximum allowed: ${maxTotalAdults})`
    );
  }

  // Maximum children per room check
  const totalChildren = childrenWithBedCount + childrenWithoutBedCount;
  const maxTotalChildren = roomCategory.maxChildren * numberOfRooms;
  if (totalChildren > maxTotalChildren) {
    throw new PricingValidationError(
      `Children count (${totalChildren}) exceeds maximum capacity of ${roomCategory.maxChildren} children per room across ${numberOfRooms} room(s) (Maximum allowed: ${maxTotalChildren})`
    );
  }

  // Calculate extra adults
  const totalBaseOccupancy = roomCategory.baseOccupancy * numberOfRooms;
  const extraAdults = Math.max(0, adultsCount - totalBaseOccupancy);

  // Extra bed capability check
  const totalExtraBedsNeeded = extraAdults + childrenWithBedCount;
  const maxAllowableExtraBeds = roomCategory.maxExtraBeds * numberOfRooms;

  if (totalExtraBedsNeeded > 0) {
    if (!roomCategory.extraBedSupported) {
      throw new PricingValidationError(
        `Room category "${roomCategory.name}" does not support extra beds, but ${totalExtraBedsNeeded} extra bed(s) are required for the group size`
      );
    }
    if (totalExtraBedsNeeded > maxAllowableExtraBeds) {
      throw new PricingValidationError(
        `Total extra beds required (${totalExtraBedsNeeded}) exceeds maximum allowable extra beds of ${roomCategory.maxExtraBeds} per room across ${numberOfRooms} room(s) (Maximum allowed: ${maxAllowableExtraBeds})`
      );
    }
  }

  return {
    extraAdults,
    totalExtraBeds: totalExtraBedsNeeded,
  };
}

/**
 * Calculates itemized day-by-day room stay pricing across seasonal boundaries.
 */
export function calculateHotelStayPricing(input: HotelStayPricingInput): HotelStayPricingResult {
  const {
    checkInDate,
    numberOfNights,
    roomCategory,
    mealPlan,
    numberOfRooms,
    adultsCount,
    childrenWithBedCount = 0,
    childrenWithoutBedCount = 0,
    candidateSeasons,
    rateCards,
    allowRegularSeasonFallback = false,
  } = input;

  if (numberOfNights < 1 || !Number.isInteger(numberOfNights)) {
    throw new PricingValidationError('Number of nights must be at least 1');
  }

  // Validate occupancy and meal plan compatibility
  const { extraAdults } = validateRoomOccupancy(
    roomCategory,
    numberOfRooms,
    adultsCount,
    childrenWithBedCount,
    childrenWithoutBedCount,
    mealPlan
  );

  const canonicalMealPlan = normalizeMealPlan(mealPlan);

  const startDate = new Date(checkInDate);
  if (isNaN(startDate.getTime())) {
    throw new PricingValidationError(`Invalid checkInDate format: "${checkInDate}"`);
  }

  if (!rateCards || rateCards.length === 0) {
    throw new PricingValidationError(
      `No seasonal rate card found for room category "${roomCategory.name}". Please configure seasonal pricing cards.`
    );
  }

  const nightlyBreakdown: HotelNightBreakdown[] = [];
  let totalStaySupplierCost = 0;
  let totalStayStandardSelling = 0;

  for (let i = 0; i < numberOfNights; i++) {
    const currentNightDate = new Date(startDate);
    currentNightDate.setDate(startDate.getDate() + i);
    const nightDateStr = currentNightDate.toISOString().split('T')[0]!;

    // Resolve season for this specific night
    const matchedSeason = resolveSeasonForDate(nightDateStr, candidateSeasons);
    const seasonType: SeasonType = matchedSeason ? matchedSeason.seasonType : 'REGULAR';
    const seasonName = matchedSeason ? matchedSeason.name : 'Baseline Regular Season';

    // Find applicable rate card for this night
    // 1. Exact match on season ID, room category ID, and meal plan
    let matchingCard: SeasonalRateCardDto | undefined;

    if (matchedSeason) {
      matchingCard = rateCards.find(
        (rc) =>
          rc.roomCategoryId === roomCategory.id &&
          rc.seasonId === matchedSeason.id &&
          normalizeMealPlan(rc.mealPlan) === canonicalMealPlan &&
          rc.isActive !== false
      );
    }

    // 2. If no direct seasonId match, check date range validity in candidate rate cards
    if (!matchingCard) {
      matchingCard = rateCards.find((rc) => {
        if (
          rc.roomCategoryId !== roomCategory.id ||
          normalizeMealPlan(rc.mealPlan) !== canonicalMealPlan ||
          rc.isActive === false
        ) {
          return false;
        }
        if (rc.validFrom && rc.validTo) {
          const from = rc.validFrom.split('T')[0]!;
          const to = rc.validTo.split('T')[0]!;
          return nightDateStr >= from && nightDateStr <= to;
        }
        // If card belongs to a season, do not match if season doesn't match
        if (rc.seasonId) {
          return false;
        }
        return true;
      });
    }

    // 3. Fallback to REGULAR season if allowed
    if (!matchingCard && allowRegularSeasonFallback) {
      const regularSeason = candidateSeasons.find((s) => s.seasonType === 'REGULAR');
      if (regularSeason) {
        matchingCard = rateCards.find(
          (rc) =>
            rc.roomCategoryId === roomCategory.id &&
            rc.seasonId === regularSeason.id &&
            normalizeMealPlan(rc.mealPlan) === canonicalMealPlan &&
            rc.isActive !== false
        );
      }
    }

    // 4. Meal Plan Adaptive Fallback: If no exact meal plan card, adapt an existing card for this room category
    if (!matchingCard && (candidateSeasons.length === 0 || matchedSeason || allowRegularSeasonFallback)) {
      const anyCard =
        rateCards.find((rc) => rc.roomCategoryId === roomCategory.id && rc.isActive !== false) ||
        rateCards.find((rc) => rc.isActive !== false);

      if (anyCard) {
        const sourceMeal = normalizeMealPlan(anyCard.mealPlan);
        const MEAL_DELTAS: Record<string, { cost: number; selling: number }> = {
          EP: { cost: -600, selling: -800 },
          RO: { cost: -600, selling: -800 },
          CP: { cost: -300, selling: -400 },
          MAP: { cost: 0, selling: 0 },
          AP: { cost: 400, selling: 600 },
        };
        const srcDelta = MEAL_DELTAS[sourceMeal] || { cost: 0, selling: 0 };
        const destDelta = MEAL_DELTAS[canonicalMealPlan] || { cost: 0, selling: 0 };
        const costDiff = destDelta.cost - srcDelta.cost;
        const sellingDiff = destDelta.selling - srcDelta.selling;

        matchingCard = {
          ...anyCard,
          id: `${anyCard.id}-${canonicalMealPlan}`,
          mealPlan: canonicalMealPlan,
          baseCostPerNight: Math.max(500, anyCard.baseCostPerNight + costDiff),
          standardSellingPrice: Math.max(800, anyCard.standardSellingPrice + sellingDiff),
        };
      }
    }

    // 5. Category Price Fallback: Synthesize standard rates from roomCategory baseline
    if (!matchingCard && (candidateSeasons.length === 0 || matchedSeason || allowRegularSeasonFallback)) {
      const baseSelling = (roomCategory as any).pricePerNight || 4500;
      const baseCost = Math.round(baseSelling * 0.72);
      const MEAL_DELTAS: Record<string, { cost: number; selling: number }> = {
        EP: { cost: -600, selling: -800 },
        RO: { cost: -600, selling: -800 },
        CP: { cost: -300, selling: -400 },
        MAP: { cost: 0, selling: 0 },
        AP: { cost: 400, selling: 600 },
      };
      const destDelta = MEAL_DELTAS[canonicalMealPlan] || { cost: 0, selling: 0 };

      matchingCard = {
        id: `auto-${roomCategory.id}-${canonicalMealPlan}`,
        hotelId: (roomCategory as any).hotelId || '',
        roomCategoryId: roomCategory.id,
        seasonId: matchedSeason ? matchedSeason.id : 'season-regular',
        mealPlan: canonicalMealPlan,
        baseCostPerNight: Math.max(500, baseCost + destDelta.cost),
        standardSellingPrice: Math.max(800, baseSelling + destDelta.selling),
        extraAdultBedCost: Math.round(baseCost * 0.25),
        childWithBedCost: Math.round(baseCost * 0.15),
        childWithoutBedCost: Math.round(baseCost * 0.08),
        validFrom: '2026-01-01T00:00:00.000Z',
        validTo: '2026-12-31T00:00:00.000Z',
        isActive: true,
      };
    }

    if (!matchingCard) {
      throw new PricingValidationError(
        `No applicable rate card found for night ${nightDateStr} (Room: "${roomCategory.name}", Meal Plan: "${mealPlan}")`
      );
    }

    // Cost calculations for the night
    const baseRoomSupplierCost = matchingCard.baseCostPerNight * numberOfRooms;
    const baseRoomSelling = matchingCard.standardSellingPrice * numberOfRooms;

    const extraAdultBedCost = (matchingCard.extraAdultBedCost || 0) * extraAdults;
    const childWithBedCost = (matchingCard.childWithBedCost || 0) * childrenWithBedCount;
    const childWithoutBedCost = (matchingCard.childWithoutBedCost || 0) * childrenWithoutBedCount;

    const totalNightSupplierCost =
      baseRoomSupplierCost + extraAdultBedCost + childWithBedCost + childWithoutBedCost;
    const totalNightSellingPrice =
      baseRoomSelling + extraAdultBedCost + childWithBedCost + childWithoutBedCost;

    totalStaySupplierCost += totalNightSupplierCost;
    totalStayStandardSelling += totalNightSellingPrice;

    nightlyBreakdown.push({
      date: nightDateStr,
      seasonId: matchedSeason ? matchedSeason.id : undefined,
      seasonName,
      seasonType,
      rateCardId: matchingCard.id,
      baseCostPerNight: matchingCard.baseCostPerNight,
      standardSellingPrice: matchingCard.standardSellingPrice,
      extraAdultsCount: extraAdults,
      extraAdultBedCost,
      childrenWithBedCount,
      childWithBedCost,
      childrenWithoutBedCount,
      childWithoutBedCost,
      totalNightSupplierCost: roundHalfUp(totalNightSupplierCost, 2),
      totalNightSellingPrice: roundHalfUp(totalNightSellingPrice, 2),
    });
  }

  // Calculate check-out date
  const checkOutDateObj = new Date(startDate);
  checkOutDateObj.setDate(startDate.getDate() + numberOfNights);
  const checkOutDate = checkOutDateObj.toISOString().split('T')[0]!;

  return {
    hotelId: roomCategory.hotelId,
    roomCategoryId: roomCategory.id,
    mealPlan: canonicalMealPlan,
    numberOfRooms,
    numberOfNights,
    checkInDate,
    checkOutDate,
    totalAdults: adultsCount,
    totalChildren: childrenWithBedCount + childrenWithoutBedCount,
    extraAdultsPerRoom: roundHalfUp(extraAdults / numberOfRooms, 2),
    totalExtraAdults: extraAdults,
    totalChildrenWithBed: childrenWithBedCount,
    totalChildrenWithoutBed: childrenWithoutBedCount,
    nightlyBreakdown,
    totalStaySupplierCost: roundHalfUp(totalStaySupplierCost, 2),
    totalStayStandardSelling: roundHalfUp(totalStayStandardSelling, 2),
  };
}
