import { connectDB, disconnectDB } from '../config/database';
import { DestinationModel } from '../models/destination.model';
import { VehicleVendorModel } from '../models/vehicleVendor.model';
import { VehicleModel } from '../models/vehicle.model';
import { TransportTariffModel } from '../models/transportTariff.model';
import { DriverModel } from '../models/driver.model';
import { logger } from '../utils/logger';

export async function seedTransport(): Promise<void> {
  await connectDB();

  logger.info('Starting transport fleet and tariffs seed...');

  // 1. Ensure at least one primary Vendor exists
  let vendor = await VehicleVendorModel.findOne({ businessName: 'Chirag Fleet & Chauffeur Services' });
  if (!vendor) {
    vendor = await VehicleVendorModel.create({
      businessName: 'Chirag Fleet & Chauffeur Services',
      contactPerson: 'Faisal Bikanerwala',
      phone: '+918866006640',
      email: 'transport@chiragtravels.com',
      city: 'Srinagar',
      state: 'Jammu & Kashmir',
      settlementTerms: 'Weekly Direct B2B Bank Transfer',
      isActive: true,
    });
    logger.info(`Created primary vehicle vendor: ${vendor.businessName}`);
  }

  // 2. Ensure Fleet Vehicles exist
  const fleetVehicles = [
    {
      model: 'AC Sedan (Dzire / Etios)',
      category: 'SEDAN',
      registrationNumber: 'JK01AB1101',
      seatingCapacity: 4,
      hasAC: true,
      serviceArea: 'Kashmir & Pan-India Circuits',
      status: 'AVAILABLE',
    },
    {
      model: 'AC SUV (Innova / Ertiga)',
      category: 'SUV',
      registrationNumber: 'JK01AB2202',
      seatingCapacity: 7,
      hasAC: true,
      serviceArea: 'Kashmir & Pan-India Circuits',
      status: 'AVAILABLE',
    },
    {
      model: 'Innova Crysta Premium',
      category: 'PREMIUM_SUV',
      registrationNumber: 'JK01AB3303',
      seatingCapacity: 7,
      hasAC: true,
      serviceArea: 'Kashmir & Pan-India Circuits',
      status: 'AVAILABLE',
    },
    {
      model: 'Tempo Traveller (12-17 Seater)',
      category: 'TEMPO_TRAVELLER',
      registrationNumber: 'JK01AB4404',
      seatingCapacity: 17,
      hasAC: true,
      serviceArea: 'Kashmir & Pan-India Circuits',
      status: 'AVAILABLE',
    },
  ];

  for (const veh of fleetVehicles) {
    const existing = await VehicleModel.findOne({ registrationNumber: veh.registrationNumber });
    if (!existing) {
      await VehicleModel.create({
        ...veh,
        vendorId: vendor._id,
      });
      logger.info(`Created fleet vehicle: ${veh.model} (${veh.registrationNumber})`);
    } else {
      await VehicleModel.updateOne({ _id: existing._id }, { $set: { status: 'AVAILABLE', model: veh.model } });
    }
  }

  // 3. Ensure Transport Tariffs exist for each destination
  const destinations = await DestinationModel.find({ isActive: true });
  const categoryRates = [
    { category: 'SEDAN', rate: 2800, cost: 2200 },
    { category: 'SUV', rate: 4200, cost: 3400 },
    { category: 'PREMIUM_SUV', rate: 5500, cost: 4500 },
    { category: 'TEMPO_TRAVELLER', rate: 7500, cost: 6200 },
  ];

  for (const dest of destinations) {
    for (const cr of categoryRates) {
      const existingTariff = await TransportTariffModel.findOne({
        destinationId: dest._id,
        vehicleCategory: cr.category,
      });

      if (!existingTariff) {
        await TransportTariffModel.create({
          destinationId: dest._id,
          vehicleCategory: cr.category,
          seasonType: 'REGULAR',
          tariffBasis: 'PER_DAY',
          circuitName: `${dest.name} Standard Tour Circuit`,
          baseSupplierCost: cr.cost,
          driverDailyAllowanceCost: 400,
          standardSellingRate: cr.rate,
          includedKmPerDay: 250,
          extraKmRate: 15,
          isTollParkingIncluded: true,
          isNightHaltIncluded: true,
          nightHaltCharge: 500,
          isActive: true,
        });
        logger.info(`Created tariff for ${dest.name} - ${cr.category} @ ₹${cr.rate}/day`);
      }
    }
  }

  // 4. Ensure Professional Chauffeurs / Drivers exist
  const sampleDrivers = [
    {
      fullName: 'Tariq Ahmad Lone',
      mobile: '+919419012345',
      licenseNumber: 'JK012018DL00984',
      languages: ['Kashmiri', 'Hindi', 'English', 'Urdu'],
      status: 'ACTIVE',
      vehicleReg: 'JK01AB3303', // Innova Crysta
    },
    {
      fullName: 'Rameshwar Sharma',
      mobile: '+919829055432',
      licenseNumber: 'RJ142019DL00561',
      languages: ['Hindi', 'Gujarati', 'English'],
      status: 'ACTIVE',
      vehicleReg: 'JK01AB1101', // Sedan
    },
    {
      fullName: 'Rajesh Nair',
      mobile: '+919847066781',
      licenseNumber: 'KL072020DL00329',
      languages: ['Malayalam', 'Hindi', 'English'],
      status: 'ACTIVE',
      vehicleReg: 'JK01AB2202', // SUV
    },
    {
      fullName: 'Gurpreet Singh',
      mobile: '+919816077890',
      licenseNumber: 'HP012017DL00412',
      languages: ['Punjabi', 'Hindi', 'English'],
      status: 'ACTIVE',
      vehicleReg: 'JK01AB4404', // Tempo Traveller
    },
  ];

  for (const drv of sampleDrivers) {
    const existing = await DriverModel.findOne({ licenseNumber: drv.licenseNumber });
    const assignedVeh = await VehicleModel.findOne({ registrationNumber: drv.vehicleReg });

    if (!existing) {
      await DriverModel.create({
        vendorId: vendor._id,
        assignedVehicleId: assignedVeh?._id,
        fullName: drv.fullName,
        mobile: drv.mobile,
        licenseNumber: drv.licenseNumber,
        languages: drv.languages,
        status: drv.status,
      });
      logger.info(`Created chauffeur: ${drv.fullName} (${drv.licenseNumber})`);
    } else {
      await DriverModel.updateOne(
        { _id: existing._id },
        {
          $set: {
            assignedVehicleId: assignedVeh?._id,
            status: drv.status,
            mobile: drv.mobile,
          },
        }
      );
    }
  }

  logger.info('Transport seed complete!');
}

if (require.main === module) {
  seedTransport()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error('Failed to seed transport fleet:', err);
      await disconnectDB();
      process.exit(1);
    });
}
