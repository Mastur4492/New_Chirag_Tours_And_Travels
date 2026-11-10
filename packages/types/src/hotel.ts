export type MealPlan = 'EP' | 'CP' | 'MAP' | 'AP' | 'RO';
export type MealPlanInput = MealPlan;

export const MEAL_PLAN_LABELS: Record<MealPlan, string> = {
  EP: 'EP (European Plan - Room Only)',
  RO: 'EP (European Plan - Room Only)',
  CP: 'CP (Continental Plan - Breakfast)',
  MAP: 'MAP (Modified American Plan - Breakfast & Dinner)',
  AP: 'AP (American Plan - All Meals)',
};

export function normalizeMealPlan(plan: string): MealPlan {
  const upper = (plan || '').trim().toUpperCase();
  if (upper === 'EP' || upper === 'RO') return 'RO';
  if (upper === 'CP') return 'CP';
  if (upper === 'MAP') return 'MAP';
  if (upper === 'AP') return 'AP';
  return 'RO';
}

export type HotelPropertyType =
  | 'HOTEL'
  | 'RESORT'
  | 'HOUSEBOAT'
  | 'HOMESTAY'
  | 'LUXURY_CAMP'
  | 'HERITAGE_HAVELI';

export interface RoomCategoryDto {
  id: string;
  hotelId: string;
  name: string;
  baseOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  extraBedSupported: boolean;
  maxExtraBeds: number;
  extraBedPricePerNight?: number;
  allowedMealPlans: MealPlan[];
  pricePerNight?: number;
  totalRooms?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HotelDto {
  id: string;
  name: string;
  destinationId: string;
  starRating: number;
  propertyType: HotelPropertyType;
  address?: string;
  city?: string;
  contactPhone?: string;
  contactEmail?: string;
  vendorName?: string;
  amenities: string[];
  images: string[];
  checkInTime?: string;
  checkOutTime?: string;
  isActive: boolean;
  roomCategories?: RoomCategoryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateHotelInput {
  name: string;
  destinationId: string;
  starRating: number;
  propertyType: HotelPropertyType;
  address?: string;
  city?: string;
  contactPhone?: string;
  contactEmail?: string;
  vendorName?: string;
  amenities?: string[];
  images?: string[];
  checkInTime?: string;
  checkOutTime?: string;
  isActive?: boolean;
}

export interface UpdateHotelInput {
  name?: string;
  destinationId?: string;
  starRating?: number;
  propertyType?: HotelPropertyType;
  address?: string;
  city?: string;
  contactPhone?: string;
  contactEmail?: string;
  vendorName?: string;
  amenities?: string[];
  images?: string[];
  checkInTime?: string;
  checkOutTime?: string;
  isActive?: boolean;
}

export interface CreateRoomCategoryInput {
  hotelId: string;
  name: string;
  baseOccupancy?: number;
  maxAdults?: number;
  maxChildren?: number;
  extraBedSupported?: boolean;
  maxExtraBeds?: number;
  extraBedPricePerNight?: number;
  allowedMealPlans?: MealPlan[];
  pricePerNight?: number;
  totalRooms?: number;
  isActive?: boolean;
}

export interface UpdateRoomCategoryInput {
  name?: string;
  baseOccupancy?: number;
  maxAdults?: number;
  maxChildren?: number;
  extraBedSupported?: boolean;
  maxExtraBeds?: number;
  extraBedPricePerNight?: number;
  allowedMealPlans?: MealPlan[];
  pricePerNight?: number;
  totalRooms?: number;
  isActive?: boolean;
}

export interface SeasonalRateCardDto {
  id: string;
  hotelId: string;
  roomCategoryId: string;
  seasonId: string;
  mealPlan: MealPlan;
  baseCostPerNight: number;
  extraAdultBedCost: number;
  childWithBedCost: number;
  childWithoutBedCost: number;
  standardSellingPrice: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSeasonalRateCardInput {
  hotelId: string;
  roomCategoryId: string;
  seasonId: string;
  mealPlan: MealPlan;
  baseCostPerNight: number;
  extraAdultBedCost?: number;
  childWithBedCost?: number;
  childWithoutBedCost?: number;
  standardSellingPrice: number;
  validFrom: string;
  validTo: string;
  isActive?: boolean;
}

export interface UpdateSeasonalRateCardInput {
  mealPlan?: MealPlan;
  baseCostPerNight?: number;
  extraAdultBedCost?: number;
  childWithBedCost?: number;
  childWithoutBedCost?: number;
  standardSellingPrice?: number;
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
}
