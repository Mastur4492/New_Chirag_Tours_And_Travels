import { SeasonType, TariffBasis, TransportTariffDto, VehicleCategory } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITransportTariffDocument extends Document {
  destinationId: mongoose.Types.ObjectId;
  vehicleCategory: VehicleCategory;
  seasonType: SeasonType;
  tariffBasis: TariffBasis;
  circuitName?: string;
  baseSupplierCost: number;
  driverDailyAllowanceCost: number;
  standardSellingRate: number;
  includedKmPerDay?: number;
  extraKmRate?: number;
  extraHourRate?: number;
  isTollParkingIncluded: boolean;
  isNightHaltIncluded: boolean;
  nightHaltCharge: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  toDto(options?: { includeSupplierCost?: boolean }): TransportTariffDto;
}

const TransportTariffSchema = new Schema<ITransportTariffDocument>(
  {
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: 'Destination',
      required: [true, 'Destination ID is required'],
      index: true,
    },
    vehicleCategory: {
      type: String,
      enum: ['HATCHBACK', 'SEDAN', 'SUV', 'PREMIUM_SUV', 'TEMPO_TRAVELLER', 'BUS'],
      required: true,
      index: true,
    },
    seasonType: {
      type: String,
      enum: ['REGULAR', 'PEAK', 'SUPER_PEAK', 'OFF_SEASON', 'FESTIVAL'],
      default: 'REGULAR',
      index: true,
    },
    tariffBasis: {
      type: String,
      enum: ['PER_DAY', 'PER_KM', 'FIXED_CIRCUIT'],
      required: true,
      index: true,
    },
    circuitName: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    baseSupplierCost: {
      type: Number,
      required: [true, 'Base supplier cost is required'],
      min: [0, 'Base supplier cost must be non-negative'],
    },
    driverDailyAllowanceCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    standardSellingRate: {
      type: Number,
      required: [true, 'Standard selling rate is required'],
      min: [0, 'Standard selling rate must be non-negative'],
    },
    includedKmPerDay: {
      type: Number,
      min: 0,
    },
    extraKmRate: {
      type: Number,
      min: 0,
    },
    extraHourRate: {
      type: Number,
      min: 0,
    },
    isTollParkingIncluded: {
      type: Boolean,
      default: false,
    },
    isNightHaltIncluded: {
      type: Boolean,
      default: false,
    },
    nightHaltCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

TransportTariffSchema.index({
  destinationId: 1,
  vehicleCategory: 1,
  seasonType: 1,
  tariffBasis: 1,
  circuitName: 1,
});

TransportTariffSchema.methods.toDto = function (
  options = { includeSupplierCost: true }
): TransportTariffDto {
  const includeCost = options.includeSupplierCost !== false;
  return {
    id: this._id ? this._id.toString() : '',
    destinationId: this.destinationId ? this.destinationId.toString() : '',
    vehicleCategory: this.vehicleCategory,
    seasonType: this.seasonType,
    tariffBasis: this.tariffBasis,
    circuitName: this.circuitName,
    baseSupplierCost: includeCost ? this.baseSupplierCost : 0,
    driverDailyAllowanceCost: this.driverDailyAllowanceCost,
    standardSellingRate: this.standardSellingRate,
    includedKmPerDay: this.includedKmPerDay,
    extraKmRate: this.extraKmRate,
    extraHourRate: this.extraHourRate,
    isTollParkingIncluded: this.isTollParkingIncluded,
    isNightHaltIncluded: this.isNightHaltIncluded,
    nightHaltCharge: this.nightHaltCharge,
    isActive: this.isActive,
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    updatedAt: (this.updatedAt instanceof Date ? this.updatedAt : new Date()).toISOString(),
  };
};

export const TransportTariffModel: Model<ITransportTariffDocument> =
  mongoose.models.TransportTariff ||
  mongoose.model<ITransportTariffDocument>('TransportTariff', TransportTariffSchema);
