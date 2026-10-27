import { SeasonType } from './season';

export type VehicleCategory =
  | 'HATCHBACK'
  | 'SEDAN'
  | 'SUV'
  | 'PREMIUM_SUV'
  | 'TEMPO_TRAVELLER'
  | 'BUS';

export type VehicleStatus = 'AVAILABLE' | 'ON_TRIP' | 'MAINTENANCE' | 'INACTIVE';

export type DriverStatus = 'ACTIVE' | 'ON_DUTY' | 'OFF_DUTY' | 'BLACKLISTED';

export type TariffBasis = 'PER_DAY' | 'PER_KM' | 'FIXED_CIRCUIT';
export type TransportPricingBasis = TariffBasis;

export interface VehicleVendorDto {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  settlementTerms?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleVendorInput {
  businessName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  settlementTerms?: string;
  isActive?: boolean;
}

export interface UpdateVehicleVendorInput {
  businessName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  settlementTerms?: string;
  isActive?: boolean;
}

export interface VehicleDto {
  id: string;
  vendorId: string;
  vendorName?: string;
  model: string;
  category: VehicleCategory;
  registrationNumber: string;
  seatingCapacity: number;
  hasAC: boolean;
  insuranceExpiry?: string;
  fitnessExpiry?: string;
  serviceArea?: string;
  status: VehicleStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVehicleInput {
  vendorId: string;
  model: string;
  category: VehicleCategory;
  registrationNumber: string;
  seatingCapacity: number;
  hasAC?: boolean;
  insuranceExpiry?: string;
  fitnessExpiry?: string;
  serviceArea?: string;
  status?: VehicleStatus;
}

export interface UpdateVehicleInput {
  vendorId?: string;
  model?: string;
  category?: VehicleCategory;
  registrationNumber?: string;
  seatingCapacity?: number;
  hasAC?: boolean;
  insuranceExpiry?: string;
  fitnessExpiry?: string;
  serviceArea?: string;
  status?: VehicleStatus;
}

export interface DriverDto {
  id: string;
  vendorId: string;
  vendorName?: string;
  assignedVehicleId?: string;
  assignedVehicleRegistration?: string;
  fullName: string;
  mobile: string;
  licenseNumber: string;
  licenseExpiry?: string;
  languages?: string[];
  status: DriverStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDriverInput {
  vendorId: string;
  assignedVehicleId?: string;
  fullName: string;
  mobile: string;
  licenseNumber: string;
  licenseExpiry?: string;
  languages?: string[];
  status?: DriverStatus;
}

export interface UpdateDriverInput {
  vendorId?: string;
  assignedVehicleId?: string;
  fullName?: string;
  mobile?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  languages?: string[];
  status?: DriverStatus;
}

export interface TransportTariffDto {
  id: string;
  destinationId: string;
  destinationName?: string;
  vehicleCategory: VehicleCategory;
  seasonType: SeasonType;
  tariffBasis: TariffBasis;
  circuitName?: string;
  baseSupplierCost: number; // ADMIN ONLY
  driverDailyAllowanceCost: number; // Driver Bhatta
  standardSellingRate: number;
  includedKmPerDay?: number;
  extraKmRate?: number;
  extraHourRate?: number;
  isTollParkingIncluded: boolean;
  isNightHaltIncluded: boolean;
  nightHaltCharge?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTransportTariffInput {
  destinationId: string;
  vehicleCategory: VehicleCategory;
  seasonType?: SeasonType;
  tariffBasis: TariffBasis;
  circuitName?: string;
  baseSupplierCost: number;
  driverDailyAllowanceCost?: number;
  standardSellingRate: number;
  includedKmPerDay?: number;
  extraKmRate?: number;
  extraHourRate?: number;
  isTollParkingIncluded?: boolean;
  isNightHaltIncluded?: boolean;
  nightHaltCharge?: number;
  isActive?: boolean;
}

export interface UpdateTransportTariffInput {
  destinationId?: string;
  vehicleCategory?: VehicleCategory;
  seasonType?: SeasonType;
  tariffBasis?: TariffBasis;
  circuitName?: string;
  baseSupplierCost?: number;
  driverDailyAllowanceCost?: number;
  standardSellingRate?: number;
  includedKmPerDay?: number;
  extraKmRate?: number;
  extraHourRate?: number;
  isTollParkingIncluded?: boolean;
  isNightHaltIncluded?: boolean;
  nightHaltCharge?: number;
  isActive?: boolean;
}
