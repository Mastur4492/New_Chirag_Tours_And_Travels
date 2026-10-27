import { MealPlan } from './hotel';
import { VehicleCategory } from './vehicle';

export interface ItineraryDayDto {
  dayNumber: number;
  title: string;
  description: string;
  nightStayDestination: string;
  mealsIncluded: string[];
  activities: string[];
}

export interface TourPackageDto {
  id: string;
  title: string;
  slug: string;
  destinationId: string;
  destinationName?: string;
  durationNights: number;
  durationDays: number;
  overview?: string;
  dayWiseItinerary: ItineraryDayDto[];
  inclusions: string[];
  exclusions: string[];
  termsAndConditions: string[];
  cancellationPolicy: string[];
  featuredImage?: string;
  galleryImages: string[];
  defaultMealPlan?: MealPlan;
  defaultVehicleCategory?: VehicleCategory;
  startingPrice?: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTourPackageInput {
  title: string;
  slug?: string;
  destinationId: string;
  durationNights: number;
  durationDays: number;
  overview?: string;
  dayWiseItinerary: ItineraryDayDto[];
  inclusions: string[];
  exclusions: string[];
  termsAndConditions?: string[];
  cancellationPolicy?: string[];
  featuredImage?: string;
  galleryImages?: string[];
  defaultMealPlan?: MealPlan;
  defaultVehicleCategory?: VehicleCategory;
  startingPrice?: number;
  isPublished?: boolean;
}

export interface UpdateTourPackageInput {
  title?: string;
  slug?: string;
  destinationId?: string;
  durationNights?: number;
  durationDays?: number;
  overview?: string;
  dayWiseItinerary?: ItineraryDayDto[];
  inclusions?: string[];
  exclusions?: string[];
  termsAndConditions?: string[];
  cancellationPolicy?: string[];
  featuredImage?: string;
  galleryImages?: string[];
  defaultMealPlan?: MealPlan;
  defaultVehicleCategory?: VehicleCategory;
  startingPrice?: number;
  isPublished?: boolean;
}
