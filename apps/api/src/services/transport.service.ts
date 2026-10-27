import {
  CreateDriverInput,
  CreateTransportTariffInput,
  CreateVehicleInput,
  CreateVehicleVendorInput,
  DriverDto,
  DriverStatus,
  SeasonType,
  TariffBasis,
  TransportTariffDto,
  UpdateDriverInput,
  UpdateTransportTariffInput,
  UpdateVehicleInput,
  UpdateVehicleVendorInput,
  UserRole,
  VehicleCategory,
  VehicleDto,
  VehicleStatus,
  VehicleVendorDto,
} from '@chirag/types';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { destinationRepository } from '../repositories/destination.repository';
import { transportRepository } from '../repositories/transport.repository';
import { transportScheduleLockRepository } from '../repositories/transportScheduleLock.repository';
import { AppError } from '../utils/appError';
import { ActorContext } from './destination.service';

export class TransportService {
  // ===================== VENDORS =====================
  async createVendor(
    input: CreateVehicleVendorInput,
    actor: ActorContext
  ): Promise<VehicleVendorDto> {
    const created = await transportRepository.createVendor({
      businessName: input.businessName,
      contactPerson: input.contactPerson,
      phone: input.phone,
      email: input.email,
      city: input.city,
      state: input.state,
      settlementTerms: input.settlementTerms,
      isActive: input.isActive !== undefined ? input.isActive : true,
    });

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_CREATED',
      entityType: 'VEHICLE_VENDOR',
      entityId: created._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: created.toDto({ includeTerms: true }) as unknown as Record<string, unknown>,
      notes: `Created vehicle vendor ${created.businessName}`,
    });

    return created.toDto({ includeTerms: actor.role === 'ADMIN' });
  }

  async updateVendor(
    id: string,
    input: UpdateVehicleVendorInput,
    actor: ActorContext
  ): Promise<VehicleVendorDto> {
    const vendor = await transportRepository.findVendorById(id);
    if (!vendor) {
      throw AppError.notFound('Vehicle vendor not found');
    }

    if (input.isActive === false) {
      const [vendorVehicles, vendorDrivers] = await Promise.all([
        transportRepository.findVehicles({ vendorId: id, limit: 200 }),
        transportRepository.findDrivers({ vendorId: id, limit: 200 }),
      ]);
      const resourceIds = [
        ...vendorVehicles.vehicles.map((v) => v._id.toString()),
        ...vendorDrivers.drivers.map((d) => d._id.toString()),
      ];
      const activeLocksCount = await transportScheduleLockRepository.countActiveLocksForResources(resourceIds);
      if (activeLocksCount > 0) {
        throw AppError.conflict(
          `Cannot deactivate vendor "${vendor.businessName}": vendor has ${activeLocksCount} active vehicle/driver schedule lock(s) for upcoming operations. Reassign or complete those trips first.`
        );
      }
    }

    const previousState = vendor.toDto({ includeTerms: true });
    const updated = await transportRepository.updateVendor(id, input as any);
    if (!updated) {
      throw AppError.notFound('Vehicle vendor could not be updated');
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_UPDATED',
      entityType: 'VEHICLE_VENDOR',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updated.toDto({ includeTerms: true }) as unknown as Record<string, unknown>,
      notes: `Updated vehicle vendor ${updated.businessName}`,
    });

    return updated.toDto({ includeTerms: actor.role === 'ADMIN' });
  }

  async getVendorById(id: string, role?: UserRole): Promise<VehicleVendorDto> {
    const vendor = await transportRepository.findVendorById(id);
    if (!vendor) {
      throw AppError.notFound('Vehicle vendor not found');
    }
    return vendor.toDto({ includeTerms: role === 'ADMIN' });
  }

  async listVendors(options: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    role?: UserRole;
  }): Promise<{ items: VehicleVendorDto[]; total: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const skip = (page - 1) * limit;

    const { vendors, total } = await transportRepository.findVendors({
      search: options.search,
      isActive: options.isActive,
      skip,
      limit,
    });

    return {
      items: vendors.map((v) => v.toDto({ includeTerms: options.role === 'ADMIN' })),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // ===================== VEHICLES =====================
  async createVehicle(input: CreateVehicleInput, actor: ActorContext): Promise<VehicleDto> {
    const vendor = await transportRepository.findVendorById(input.vendorId);
    if (!vendor) {
      throw AppError.badRequest(`Vehicle vendor with ID "${input.vendorId}" does not exist`);
    }

    const existingReg = await transportRepository.findVehicleByRegistration(
      input.registrationNumber
    );
    if (existingReg) {
      throw AppError.conflict(
        `Vehicle with registration number "${input.registrationNumber}" already exists`
      );
    }

    const created = await transportRepository.createVehicle({
      vendorId: vendor._id,
      model: input.model,
      category: input.category,
      registrationNumber: input.registrationNumber.toUpperCase(),
      seatingCapacity: input.seatingCapacity,
      hasAC: input.hasAC !== undefined ? input.hasAC : true,
      insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : undefined,
      fitnessExpiry: input.fitnessExpiry ? new Date(input.fitnessExpiry) : undefined,
      serviceArea: input.serviceArea,
      status: input.status || 'AVAILABLE',
    });

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_CREATED',
      entityType: 'VEHICLE',
      entityId: created._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: created.toDto() as unknown as Record<string, unknown>,
      notes: `Created vehicle ${created.registrationNumber} (${created.model})`,
    });

    const dto = created.toDto();
    dto.vendorName = vendor.businessName;
    return dto;
  }

  async updateVehicle(
    id: string,
    input: UpdateVehicleInput,
    actor: ActorContext
  ): Promise<VehicleDto> {
    const vehicle = await transportRepository.findVehicleById(id);
    if (!vehicle) {
      throw AppError.notFound('Vehicle not found');
    }

    if (input.vendorId && input.vendorId !== vehicle.vendorId.toString()) {
      const vendor = await transportRepository.findVendorById(input.vendorId);
      if (!vendor) {
        throw AppError.badRequest(`Vendor with ID "${input.vendorId}" does not exist`);
      }
    }

    if (input.registrationNumber && input.registrationNumber.toUpperCase() !== vehicle.registrationNumber) {
      const existing = await transportRepository.findVehicleByRegistration(input.registrationNumber);
      if (existing && existing._id.toString() !== id) {
        throw AppError.conflict(`Registration number "${input.registrationNumber}" is already in use`);
      }
    }

    if (input.status && (input.status === 'INACTIVE' || input.status === 'MAINTENANCE')) {
      const activeLocksCount = await transportScheduleLockRepository.countActiveLocksForResource(id);
      if (activeLocksCount > 0) {
        throw AppError.conflict(
          `Cannot set vehicle to ${input.status}: vehicle has ${activeLocksCount} active schedule lock(s) for upcoming operations. Reassign or complete those trips first.`
        );
      }
    }

    const previousState = vehicle.toDto();
    const updatePayload: Record<string, unknown> = { ...input };
    if (input.registrationNumber) {
      updatePayload.registrationNumber = input.registrationNumber.toUpperCase();
    }
    if (input.insuranceExpiry) {
      updatePayload.insuranceExpiry = new Date(input.insuranceExpiry);
    }
    if (input.fitnessExpiry) {
      updatePayload.fitnessExpiry = new Date(input.fitnessExpiry);
    }

    const updated = await transportRepository.updateVehicle(id, updatePayload as any);
    if (!updated) {
      throw AppError.notFound('Vehicle could not be updated');
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_UPDATED',
      entityType: 'VEHICLE',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updated.toDto() as unknown as Record<string, unknown>,
      notes: `Updated vehicle ${updated.registrationNumber}`,
    });

    return updated.toDto();
  }

  async getVehicleById(id: string): Promise<VehicleDto> {
    const vehicle = await transportRepository.findVehicleById(id);
    if (!vehicle) {
      throw AppError.notFound('Vehicle not found');
    }
    const vendor = await transportRepository.findVendorById(vehicle.vendorId.toString());
    const dto = vehicle.toDto();
    dto.vendorName = vendor?.businessName;
    return dto;
  }

  async listVehicles(options: {
    page?: number;
    limit?: number;
    vendorId?: string;
    category?: VehicleCategory;
    status?: VehicleStatus;
    search?: string;
  }): Promise<{ items: VehicleDto[]; total: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const skip = (page - 1) * limit;

    const { vehicles, total } = await transportRepository.findVehicles({
      vendorId: options.vendorId,
      category: options.category,
      status: options.status,
      search: options.search,
      skip,
      limit,
    });

    return {
      items: vehicles.map((v) => v.toDto()),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // ===================== DRIVERS =====================
  async createDriver(input: CreateDriverInput, actor: ActorContext): Promise<DriverDto> {
    const vendor = await transportRepository.findVendorById(input.vendorId);
    if (!vendor) {
      throw AppError.badRequest(`Vehicle vendor with ID "${input.vendorId}" does not exist`);
    }

    if (input.assignedVehicleId) {
      const vehicle = await transportRepository.findVehicleById(input.assignedVehicleId);
      if (!vehicle) {
        throw AppError.badRequest(`Vehicle with ID "${input.assignedVehicleId}" does not exist`);
      }
    }

    const existingLicense = await transportRepository.findDriverByLicense(input.licenseNumber);
    if (existingLicense) {
      throw AppError.conflict(
        `Driver with license number "${input.licenseNumber}" already exists`
      );
    }

    const created = await transportRepository.createDriver({
      vendorId: vendor._id,
      assignedVehicleId: input.assignedVehicleId ? (input.assignedVehicleId as any) : undefined,
      fullName: input.fullName,
      mobile: input.mobile,
      licenseNumber: input.licenseNumber.toUpperCase(),
      licenseExpiry: input.licenseExpiry ? new Date(input.licenseExpiry) : undefined,
      languages: input.languages || ['Hindi', 'English'],
      status: input.status || 'ACTIVE',
    });

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_CREATED',
      entityType: 'DRIVER',
      entityId: created._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: created.toDto() as unknown as Record<string, unknown>,
      notes: `Created driver ${created.fullName}`,
    });

    const dto = created.toDto();
    dto.vendorName = vendor.businessName;
    return dto;
  }

  async updateDriver(
    id: string,
    input: UpdateDriverInput,
    actor: ActorContext
  ): Promise<DriverDto> {
    const driver = await transportRepository.findDriverById(id);
    if (!driver) {
      throw AppError.notFound('Driver not found');
    }

    if (input.vendorId && input.vendorId !== driver.vendorId.toString()) {
      const vendor = await transportRepository.findVendorById(input.vendorId);
      if (!vendor) {
        throw AppError.badRequest(`Vendor with ID "${input.vendorId}" does not exist`);
      }
    }

    if (input.assignedVehicleId && input.assignedVehicleId !== driver.assignedVehicleId?.toString()) {
      const vehicle = await transportRepository.findVehicleById(input.assignedVehicleId);
      if (!vehicle) {
        throw AppError.badRequest(`Vehicle with ID "${input.assignedVehicleId}" does not exist`);
      }
    }

    if (input.licenseNumber && input.licenseNumber.toUpperCase() !== driver.licenseNumber) {
      const existing = await transportRepository.findDriverByLicense(input.licenseNumber);
      if (existing && existing._id.toString() !== id) {
        throw AppError.conflict(`License number "${input.licenseNumber}" already exists`);
      }
    }

    if (input.status && (input.status === 'OFF_DUTY' || input.status === 'BLACKLISTED')) {
      const activeLocksCount = await transportScheduleLockRepository.countActiveLocksForResource(id);
      if (activeLocksCount > 0) {
        throw AppError.conflict(
          `Cannot set driver to ${input.status}: driver has ${activeLocksCount} active schedule lock(s) for upcoming operations. Reassign or complete those trips first.`
        );
      }
    }

    const previousState = driver.toDto();
    const updatePayload: Record<string, unknown> = { ...input };
    if (input.licenseNumber) {
      updatePayload.licenseNumber = input.licenseNumber.toUpperCase();
    }
    if (input.licenseExpiry) {
      updatePayload.licenseExpiry = new Date(input.licenseExpiry);
    }

    const updated = await transportRepository.updateDriver(id, updatePayload as any);
    if (!updated) {
      throw AppError.notFound('Driver could not be updated');
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_UPDATED',
      entityType: 'DRIVER',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updated.toDto() as unknown as Record<string, unknown>,
      notes: `Updated driver ${updated.fullName}`,
    });

    return updated.toDto();
  }

  async getDriverById(id: string): Promise<DriverDto> {
    const driver = await transportRepository.findDriverById(id);
    if (!driver) {
      throw AppError.notFound('Driver not found');
    }
    return driver.toDto();
  }

  async listDrivers(options: {
    page?: number;
    limit?: number;
    vendorId?: string;
    status?: DriverStatus;
    search?: string;
  }): Promise<{ items: DriverDto[]; total: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const skip = (page - 1) * limit;

    const { drivers, total } = await transportRepository.findDrivers({
      vendorId: options.vendorId,
      status: options.status,
      search: options.search,
      skip,
      limit,
    });

    return {
      items: drivers.map((d) => d.toDto()),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // ===================== TARIFFS =====================
  async createTariff(
    input: CreateTransportTariffInput,
    actor: ActorContext
  ): Promise<TransportTariffDto> {
    const destination = await destinationRepository.findById(input.destinationId);
    if (!destination) {
      throw AppError.badRequest(`Destination with ID "${input.destinationId}" does not exist`);
    }

    const created = await transportRepository.createTariff({
      destinationId: destination._id,
      vehicleCategory: input.vehicleCategory,
      seasonType: input.seasonType || 'REGULAR',
      tariffBasis: input.tariffBasis,
      circuitName: input.circuitName,
      baseSupplierCost: input.baseSupplierCost,
      driverDailyAllowanceCost: input.driverDailyAllowanceCost ?? 0,
      standardSellingRate: input.standardSellingRate,
      includedKmPerDay: input.includedKmPerDay,
      extraKmRate: input.extraKmRate,
      extraHourRate: input.extraHourRate,
      isTollParkingIncluded: input.isTollParkingIncluded ?? false,
      isNightHaltIncluded: input.isNightHaltIncluded ?? false,
      nightHaltCharge: input.nightHaltCharge ?? 0,
      isActive: input.isActive !== undefined ? input.isActive : true,
    });

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_CREATED',
      entityType: 'TARIFF',
      entityId: created._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: created.toDto({ includeSupplierCost: true }) as unknown as Record<string, unknown>,
      notes: `Created transport tariff for ${destination.name} - ${created.vehicleCategory}`,
    });

    const dto = created.toDto({ includeSupplierCost: actor.role === 'ADMIN' });
    dto.destinationName = destination.name;
    return dto;
  }

  async updateTariff(
    id: string,
    input: UpdateTransportTariffInput,
    actor: ActorContext
  ): Promise<TransportTariffDto> {
    const tariff = await transportRepository.findTariffById(id);
    if (!tariff) {
      throw AppError.notFound('Transport tariff not found');
    }

    if (input.destinationId && input.destinationId !== tariff.destinationId.toString()) {
      const dest = await destinationRepository.findById(input.destinationId);
      if (!dest) {
        throw AppError.badRequest(`Destination with ID "${input.destinationId}" does not exist`);
      }
    }

    const previousState = tariff.toDto({ includeSupplierCost: true });
    const updated = await transportRepository.updateTariff(id, input as any);
    if (!updated) {
      throw AppError.notFound('Transport tariff could not be updated');
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_UPDATED',
      entityType: 'TARIFF',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updated.toDto({ includeSupplierCost: true }) as unknown as Record<string, unknown>,
      notes: `Updated transport tariff ${id}`,
    });

    return updated.toDto({ includeSupplierCost: actor.role === 'ADMIN' });
  }

  async getTariffById(id: string, role?: UserRole): Promise<TransportTariffDto> {
    const tariff = await transportRepository.findTariffById(id);
    if (!tariff) {
      throw AppError.notFound('Transport tariff not found');
    }
    const destination = await destinationRepository.findById(tariff.destinationId.toString());
    const dto = tariff.toDto({ includeSupplierCost: role === 'ADMIN' });
    dto.destinationName = destination?.name;
    return dto;
  }

  async listTariffs(options: {
    page?: number;
    limit?: number;
    destinationId?: string;
    vehicleCategory?: VehicleCategory;
    seasonType?: SeasonType;
    tariffBasis?: TariffBasis;
    isActive?: boolean;
    role?: UserRole;
  }): Promise<{ items: TransportTariffDto[]; total: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const skip = (page - 1) * limit;

    const { tariffs, total } = await transportRepository.findTariffs({
      destinationId: options.destinationId,
      vehicleCategory: options.vehicleCategory,
      seasonType: options.seasonType,
      tariffBasis: options.tariffBasis,
      isActive: options.isActive,
      skip,
      limit,
    });

    return {
      items: tariffs.map((t) => t.toDto({ includeSupplierCost: options.role === 'ADMIN' })),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const transportService = new TransportService();
