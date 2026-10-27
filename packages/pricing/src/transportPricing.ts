import { TariffBasis, TransportTariffDto, VehicleCategory } from '@chirag/types';
import { PricingValidationError } from './hotelPricing';
import { roundHalfUp } from './rounding';

export interface TransportPricingInput {
  tariff: TransportTariffDto;
  numberOfDays: number;
  totalEstimatedKm?: number;
  extraHours?: number;
  numberOfNightHalts?: number;
  estimatedTollParking?: number;
}

export interface TransportPricingResult {
  tariffId: string;
  vehicleCategory: VehicleCategory;
  tariffBasis: TariffBasis;
  circuitName?: string;
  numberOfDays: number;
  baseSupplierCost: number;
  standardSellingRate: number;
  driverAllowanceCost: number;
  extraKmCost: number;
  extraHoursCost: number;
  nightHaltCost: number;
  tollParkingCost: number;
  billableKm: number;
  includedKm: number;
  extraKm: number;
  totalSupplierCost: number;
  totalStandardSelling: number;
}

/**
 * Calculates transport pricing based on the configured tariff basis (PER_DAY, PER_KM, FIXED_CIRCUIT).
 */
export function calculateTransportPricing(input: TransportPricingInput): TransportPricingResult {
  const {
    tariff,
    numberOfDays,
    totalEstimatedKm = 0,
    extraHours = 0,
    numberOfNightHalts = 0,
    estimatedTollParking = 0,
  } = input;

  if (numberOfDays < 1 || !Number.isInteger(numberOfDays)) {
    throw new PricingValidationError('Transport duration (days) must be at least 1');
  }
  if (totalEstimatedKm < 0) {
    throw new PricingValidationError('Estimated kilometres cannot be negative');
  }
  if (extraHours < 0) {
    throw new PricingValidationError('Extra hours cannot be negative');
  }
  if (numberOfNightHalts < 0) {
    throw new PricingValidationError('Night halts count cannot be negative');
  }
  if (estimatedTollParking < 0) {
    throw new PricingValidationError('Toll and parking charges cannot be negative');
  }

  const driverAllowancePerDay = tariff.driverDailyAllowanceCost || 0;
  const totalDriverAllowance = driverAllowancePerDay * numberOfDays;

  let baseSupplierCost = 0;
  let standardSellingRate = 0;
  let includedKm = 0;
  let extraKm = 0;
  let billableKm = 0;
  let extraKmCost = 0;

  switch (tariff.tariffBasis) {
    case 'PER_DAY': {
      baseSupplierCost = tariff.baseSupplierCost * numberOfDays;
      standardSellingRate = tariff.standardSellingRate * numberOfDays;

      if (tariff.includedKmPerDay && tariff.includedKmPerDay > 0) {
        includedKm = tariff.includedKmPerDay * numberOfDays;
        if (totalEstimatedKm > includedKm) {
          extraKm = totalEstimatedKm - includedKm;
          extraKmCost = extraKm * (tariff.extraKmRate || 0);
        }
      }
      billableKm = Math.max(totalEstimatedKm, includedKm);
      break;
    }

    case 'PER_KM': {
      // Min km threshold per day if configured
      const minDailyKm = tariff.includedKmPerDay || 0;
      const minTotalKm = minDailyKm * numberOfDays;
      billableKm = Math.max(totalEstimatedKm, minTotalKm);
      includedKm = minTotalKm;

      baseSupplierCost = billableKm * tariff.baseSupplierCost;
      standardSellingRate = billableKm * tariff.standardSellingRate;
      break;
    }

    case 'FIXED_CIRCUIT': {
      // Fixed flat rate for the circuit
      baseSupplierCost = tariff.baseSupplierCost;
      standardSellingRate = tariff.standardSellingRate;

      if (tariff.includedKmPerDay && tariff.includedKmPerDay > 0) {
        includedKm = tariff.includedKmPerDay;
        if (totalEstimatedKm > includedKm) {
          extraKm = totalEstimatedKm - includedKm;
          extraKmCost = extraKm * (tariff.extraKmRate || 0);
        }
      }
      billableKm = Math.max(totalEstimatedKm, includedKm);
      break;
    }

    default: {
      throw new PricingValidationError(`Unsupported tariff basis: ${(tariff as any).tariffBasis}`);
    }
  }

  // Extra hours calculation
  const extraHoursCost = extraHours * (tariff.extraHourRate || 0);

  // Night halts calculation
  let nightHaltCost = 0;
  if (!tariff.isNightHaltIncluded && numberOfNightHalts > 0) {
    nightHaltCost = numberOfNightHalts * (tariff.nightHaltCharge || 0);
  }

  // Toll and parking
  let tollParkingCost = 0;
  if (!tariff.isTollParkingIncluded && estimatedTollParking > 0) {
    tollParkingCost = estimatedTollParking;
  }

  const totalSupplierCost =
    baseSupplierCost +
    totalDriverAllowance +
    extraKmCost +
    extraHoursCost +
    nightHaltCost +
    tollParkingCost;

  const totalStandardSelling =
    standardSellingRate +
    totalDriverAllowance +
    extraKmCost +
    extraHoursCost +
    nightHaltCost +
    tollParkingCost;

  return {
    tariffId: tariff.id,
    vehicleCategory: tariff.vehicleCategory,
    tariffBasis: tariff.tariffBasis,
    circuitName: tariff.circuitName,
    numberOfDays,
    baseSupplierCost: roundHalfUp(baseSupplierCost, 2),
    standardSellingRate: roundHalfUp(standardSellingRate, 2),
    driverAllowanceCost: roundHalfUp(totalDriverAllowance, 2),
    extraKmCost: roundHalfUp(extraKmCost, 2),
    extraHoursCost: roundHalfUp(extraHoursCost, 2),
    nightHaltCost: roundHalfUp(nightHaltCost, 2),
    tollParkingCost: roundHalfUp(tollParkingCost, 2),
    billableKm: roundHalfUp(billableKm, 2),
    includedKm: roundHalfUp(includedKm, 2),
    extraKm: roundHalfUp(extraKm, 2),
    totalSupplierCost: roundHalfUp(totalSupplierCost, 2),
    totalStandardSelling: roundHalfUp(totalStandardSelling, 2),
  };
}
