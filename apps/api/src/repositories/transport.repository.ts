import {
  DriverStatus,
  SeasonType,
  TariffBasis,
  VehicleCategory,
  VehicleStatus,
} from '@chirag/types';
import { DriverModel, IDriverDocument } from '../models/driver.model';
import { ITransportTariffDocument, TransportTariffModel } from '../models/transportTariff.model';
import { IVehicleDocument, VehicleModel } from '../models/vehicle.model';
import { IVehicleVendorDocument, VehicleVendorModel } from '../models/vehicleVendor.model';

export class TransportRepository {
  // --- VENDORS ---
  async findVendorById(id: string): Promise<IVehicleVendorDocument | null> {
    return VehicleVendorModel.findById(id).exec();
  }

  async findVendors(filter: { search?: string; isActive?: boolean; skip?: number; limit?: number } = {}): Promise<{
    vendors: IVehicleVendorDocument[];
    total: number;
  }> {
    const query: Record<string, unknown> = {};
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ businessName: regex }, { contactPerson: regex }, { phone: regex }, { city: regex }];
    }
    const skip = filter.skip || 0;
    const limit = filter.limit || 50;

    const [vendors, total] = await Promise.all([
      VehicleVendorModel.find(query).sort({ businessName: 1 }).skip(skip).limit(limit).exec(),
      VehicleVendorModel.countDocuments(query).exec(),
    ]);
    return { vendors, total };
  }

  async createVendor(data: Partial<IVehicleVendorDocument>): Promise<IVehicleVendorDocument> {
    const vendor = new VehicleVendorModel(data);
    return vendor.save();
  }

  async updateVendor(
    id: string,
    updateData: Partial<IVehicleVendorDocument>
  ): Promise<IVehicleVendorDocument | null> {
    return VehicleVendorModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }

  // --- VEHICLES ---
  async findVehicleById(id: string): Promise<IVehicleDocument | null> {
    return VehicleModel.findById(id).exec();
  }

  async findVehicleByRegistration(regNo: string): Promise<IVehicleDocument | null> {
    return VehicleModel.findOne({ registrationNumber: regNo.toUpperCase() }).exec();
  }

  async findVehicles(filter: {
    vendorId?: string;
    category?: VehicleCategory;
    status?: VehicleStatus;
    search?: string;
    skip?: number;
    limit?: number;
  } = {}): Promise<{ vehicles: IVehicleDocument[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (filter.vendorId) query.vendorId = filter.vendorId;
    if (filter.category) query.category = filter.category;
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ registrationNumber: regex }, { model: regex }];
    }
    const skip = filter.skip || 0;
    const limit = filter.limit || 50;

    const [vehicles, total] = await Promise.all([
      VehicleModel.find(query).sort({ model: 1 }).skip(skip).limit(limit).exec(),
      VehicleModel.countDocuments(query).exec(),
    ]);
    return { vehicles, total };
  }

  async createVehicle(data: Partial<IVehicleDocument>): Promise<IVehicleDocument> {
    const vehicle = new VehicleModel(data);
    return vehicle.save();
  }

  async updateVehicle(
    id: string,
    updateData: Partial<IVehicleDocument>
  ): Promise<IVehicleDocument | null> {
    return VehicleModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }

  // --- DRIVERS ---
  async findDriverById(id: string): Promise<IDriverDocument | null> {
    return DriverModel.findById(id).exec();
  }

  async findDriverByLicense(licenseNumber: string): Promise<IDriverDocument | null> {
    return DriverModel.findOne({ licenseNumber: licenseNumber.toUpperCase() }).exec();
  }

  async findDrivers(filter: {
    vendorId?: string;
    status?: DriverStatus;
    search?: string;
    skip?: number;
    limit?: number;
  } = {}): Promise<{ drivers: IDriverDocument[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (filter.vendorId) query.vendorId = filter.vendorId;
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ fullName: regex }, { mobile: regex }, { licenseNumber: regex }];
    }
    const skip = filter.skip || 0;
    const limit = filter.limit || 50;

    const [drivers, total] = await Promise.all([
      DriverModel.find(query).sort({ fullName: 1 }).skip(skip).limit(limit).exec(),
      DriverModel.countDocuments(query).exec(),
    ]);
    return { drivers, total };
  }

  async createDriver(data: Partial<IDriverDocument>): Promise<IDriverDocument> {
    const driver = new DriverModel(data);
    return driver.save();
  }

  async updateDriver(
    id: string,
    updateData: Partial<IDriverDocument>
  ): Promise<IDriverDocument | null> {
    return DriverModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }

  // --- TARIFFS ---
  async findTariffById(id: string): Promise<ITransportTariffDocument | null> {
    return TransportTariffModel.findById(id).exec();
  }

  async findTariffs(filter: {
    destinationId?: string;
    vehicleCategory?: VehicleCategory;
    seasonType?: SeasonType;
    tariffBasis?: TariffBasis;
    isActive?: boolean;
    skip?: number;
    limit?: number;
  } = {}): Promise<{ tariffs: ITransportTariffDocument[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (filter.destinationId) query.destinationId = filter.destinationId;
    if (filter.vehicleCategory) query.vehicleCategory = filter.vehicleCategory;
    if (filter.seasonType) query.seasonType = filter.seasonType;
    if (filter.tariffBasis) query.tariffBasis = filter.tariffBasis;
    if (filter.isActive !== undefined) query.isActive = filter.isActive;

    const skip = filter.skip || 0;
    const limit = filter.limit || 50;

    const [tariffs, total] = await Promise.all([
      TransportTariffModel.find(query).sort({ standardSellingRate: 1 }).skip(skip).limit(limit).exec(),
      TransportTariffModel.countDocuments(query).exec(),
    ]);
    return { tariffs, total };
  }

  async createTariff(data: Partial<ITransportTariffDocument>): Promise<ITransportTariffDocument> {
    const tariff = new TransportTariffModel(data);
    return tariff.save();
  }

  async updateTariff(
    id: string,
    updateData: Partial<ITransportTariffDocument>
  ): Promise<ITransportTariffDocument | null> {
    return TransportTariffModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }
}

export const transportRepository = new TransportRepository();
