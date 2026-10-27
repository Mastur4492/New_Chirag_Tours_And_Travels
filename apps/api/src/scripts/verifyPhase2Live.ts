import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/database';
import { env } from '../config/env';
import { AuditLogModel } from '../models/auditLog.model';
import { UserModel } from '../models/user.model';

const API_BASE = 'http://localhost:5000/api/v1';

interface TestResult {
  step: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, step: string, details?: string) {
  if (condition) {
    results.push({ step, passed: true, details });
    console.log(`✅ [PASS] ${step}${details ? ` (${details})` : ''}`);
  } else {
    results.push({ step, passed: false, details });
    console.error(`❌ [FAIL] ${step}${details ? ` (${details})` : ''}`);
  }
}

async function request(
  endpoint: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
  } = {}
) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { status: res.status, ok: res.ok, body: json };
}

export async function runLiveVerification() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: Live test verification scripts cannot run against a production environment.');
    process.exit(1);
  }

  console.log('====================================================');
  console.log('🚀 STARTING PHASE 2 LIVE END-TO-END VERIFICATION');
  console.log('====================================================\n');

  // Step 0: Ensure database connected and Agent test user exists
  await connectDB();
  const agentMobile = '9876543211';
  let agentUser = await UserModel.findOne({ mobile: agentMobile });
  if (!agentUser) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('DemoAgent@2026!', salt);
    agentUser = await UserModel.create({
      fullName: 'Verification Test Agent',
      mobile: agentMobile,
      passwordHash,
      role: 'AGENT',
      status: 'ACTIVE',
      agentProfile: {
        agencyName: 'Test Agency Srinagar',
        city: 'Srinagar',
        commissionRatePercent: 10,
      },
    });
    console.log('Created Agent test user in MongoDB');
  }

  // 1. Authenticate Admin
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      mobile: env.BOOTSTRAP_ADMIN_MOBILE || '9876543210',
      password: env.BOOTSTRAP_ADMIN_PASSWORD || 'ChiragAdmin@2026!',
    },
  });
  assert(
    adminLogin.status === 200 && !!adminLogin.body?.data?.accessToken,
    'Admin Authentication',
    `HTTP ${adminLogin.status}`
  );
  const adminToken = adminLogin.body?.data?.accessToken;

  // 2. Authenticate Agent
  const agentLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      mobile: agentMobile,
      password: 'DemoAgent@2026!',
    },
  });
  assert(
    agentLogin.status === 200 && !!agentLogin.body?.data?.accessToken,
    'Agent Authentication',
    `HTTP ${agentLogin.status}`
  );
  const agentToken = agentLogin.body?.data?.accessToken;

  // 3. Unauthenticated Mutation Protection (401)
  const unauthPost = await request('/destinations', {
    method: 'POST',
    body: { name: 'Unauthorized Land', region: 'NORTH' },
  });
  assert(
    unauthPost.status === 401 && unauthPost.body?.error?.code === 'UNAUTHORIZED',
    'Unauthenticated Request Rejected (401)',
    `Status ${unauthPost.status}`
  );

  // 4. Non-Admin (Agent) RBAC Mutation Protection (403)
  const agentPost = await request('/destinations', {
    method: 'POST',
    token: agentToken,
    body: { name: 'Agent Created Land', region: 'NORTH' },
  });
  assert(
    agentPost.status === 403 && agentPost.body?.error?.code === 'FORBIDDEN',
    'Non-Admin Mutation Rejected (403 Forbidden)',
    `Status ${agentPost.status}`
  );

  // 5. CRUD: Destination
  const destName = `Kashmir Valley ${Date.now()}`;
  const createDest = await request('/destinations', {
    method: 'POST',
    token: adminToken,
    body: {
      name: destName,
      region: 'NORTH',
      state: 'Jammu and Kashmir',
      country: 'India',
      description: 'Paradise on Earth with scenic lakes and snow-capped peaks.',
      highlights: ['Dal Lake', 'Gulmarg Gondola', 'Pahalgam Valley'],
      coverImages: ['https://images.unsplash.com/photo-kashmir.jpg'],
      isActive: true,
    },
  });
  assert(
    createDest.status === 201 && createDest.body?.data?.id,
    'Destination Created in MongoDB',
    `ID: ${createDest.body?.data?.id}`
  );
  const destinationId = createDest.body?.data?.id;

  const getDest = await request(`/destinations/${destinationId}`);
  assert(
    getDest.status === 200 && getDest.body?.data?.name === destName,
    'Destination Retrieved from MongoDB',
    `Name: ${getDest.body?.data?.name}`
  );

  const updateDest = await request(`/destinations/${destinationId}`, {
    method: 'PATCH',
    token: adminToken,
    body: {
      description: 'Updated Paradise description with premier winter sports.',
      highlights: ['Dal Lake', 'Gulmarg Gondola', 'Pahalgam Valley', 'Sonamarg'],
    },
  });
  assert(
    updateDest.status === 200 && updateDest.body?.data?.highlights?.length === 4,
    'Destination Updated in MongoDB',
    `Highlights count: ${updateDest.body?.data?.highlights?.length}`
  );

  const deactDest = await request(`/destinations/${destinationId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { isActive: false },
  });
  assert(
    deactDest.status === 200 && deactDest.body?.data?.isActive === false,
    'Destination Deactivated (isActive=false)',
    `isActive: ${deactDest.body?.data?.isActive}`
  );

  const reactDest = await request(`/destinations/${destinationId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { isActive: true },
  });
  assert(
    reactDest.status === 200 && reactDest.body?.data?.isActive === true,
    'Destination Re-activated (isActive=true)'
  );

  // 6. CRUD: Hotel and Room Category
  const createHotel = await request('/hotels', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `Grand Palace Srinagar ${Date.now()}`,
      destinationId,
      starRating: 5,
      propertyType: 'HOTEL',
      address: 'Gupkar Road, Boulevard',
      city: 'Srinagar',
      contactPhone: '9876543210',
      contactEmail: 'gm@grandpalace.com',
      vendorName: 'Palace Hospitality Pvt Ltd',
      amenities: ['WiFi', 'Central Heating', 'Spa', 'Restaurant'],
      checkInTime: '14:00',
      checkOutTime: '11:00',
      isActive: true,
    },
  });
  assert(
    createHotel.status === 201 && !!createHotel.body?.data?.id,
    'Hotel Created in MongoDB',
    `ID: ${createHotel.body?.data?.id}`
  );
  const hotelId = createHotel.body?.data?.id;

  const createRoom = await request(`/hotels/${hotelId}/rooms`, {
    method: 'POST',
    token: adminToken,
    body: {
      name: 'Deluxe Heritage Suite',
      baseOccupancy: 2,
      maxAdults: 3,
      maxChildren: 2,
      extraBedSupported: true,
      maxExtraBeds: 1,
      allowedMealPlans: ['RO', 'CP', 'MAP', 'AP'],
      totalRooms: 15,
      isActive: true,
    },
  });
  assert(
    createRoom.status === 201 && !!createRoom.body?.data?.id,
    'Room Category Created under Hotel',
    `Room ID: ${createRoom.body?.data?.id}`
  );
  const roomId = createRoom.body?.data?.id;

  // Duplicate room category name in same hotel rejection
  const dupRoom = await request(`/hotels/${hotelId}/rooms`, {
    method: 'POST',
    token: adminToken,
    body: {
      name: 'Deluxe Heritage Suite',
      baseOccupancy: 2,
      maxAdults: 3,
    },
  });
  assert(
    dupRoom.status === 409,
    'Duplicate Room Category Name Rejected (409 Conflict)',
    `Status ${dupRoom.status}`
  );

  // Invalid hotel ID relationship rejection
  const fakeHotelRoom = await request(`/hotels/507f1f77bcf86cd799439011/rooms`, {
    method: 'POST',
    token: adminToken,
    body: {
      name: 'Ghost Room',
    },
  });
  assert(
    fakeHotelRoom.status === 400 || fakeHotelRoom.status === 404,
    'Non-existent Hotel Room Category Rejected (400 Bad Request)',
    `Status ${fakeHotelRoom.status}`
  );

  // 7. Season Overlap, Validation & Rate Card
  // 7a. Invalid dates rejection (endDate < startDate)
  const invalidSeason = await request('/seasons', {
    method: 'POST',
    token: adminToken,
    body: {
      name: 'Invalid Season',
      seasonType: 'PEAK',
      destinationId,
      startDate: '2026-09-30',
      endDate: '2026-05-01',
    },
  });
  assert(
    invalidSeason.status === 400,
    'Invalid Season Dates (endDate < startDate) Rejected (400 Bad Request)',
    `Status ${invalidSeason.status}`
  );

  // 7b. Invalid destinationId relationship rejection
  const invalidDestSeason = await request('/seasons', {
    method: 'POST',
    token: adminToken,
    body: {
      name: 'Nonexistent Dest Season',
      seasonType: 'REGULAR',
      destinationId: '507f1f77bcf86cd799439011',
      startDate: '2026-05-01',
      endDate: '2026-08-31',
    },
  });
  assert(
    invalidDestSeason.status === 400,
    'Non-existent Destination for Season Rejected (400 Bad Request)',
    `Status ${invalidDestSeason.status}`
  );

  // 7c. Regular Season
  const regSeason = await request('/seasons', {
    method: 'POST',
    token: adminToken,
    body: {
      name: 'Summer Season 2026',
      seasonType: 'REGULAR',
      destinationId,
      startDate: '2026-05-01',
      endDate: '2026-08-31',
      priority: 10,
      description: 'Pleasant summer valley conditions',
    },
  });
  assert(
    regSeason.status === 201 && !!regSeason.body?.data?.id,
    'Regular Season Created',
    `ID: ${regSeason.body?.data?.id}`
  );
  const regSeasonId = regSeason.body?.data?.id;

  // 7d. Peak Overlapping Season (higher priority)
  const peakSeason = await request('/seasons', {
    method: 'POST',
    token: adminToken,
    body: {
      name: 'Tulip Festival Rush',
      seasonType: 'PEAK',
      destinationId,
      startDate: '2026-05-10',
      endDate: '2026-05-25',
      priority: 50,
      description: 'Peak blooming period with heavy tourist volume',
    },
  });
  assert(
    peakSeason.status === 201 && !!peakSeason.body?.data?.id,
    'Peak Overlapping Season Created',
    `ID: ${peakSeason.body?.data?.id}`
  );
  const peakSeasonId = peakSeason.body?.data?.id;

  // 7e. Deterministic Priority Resolution Test
  const resolveRegBefore = await request(
    `/seasons/resolve?destinationId=${destinationId}&date=2026-05-05`
  );
  assert(
    resolveRegBefore.status === 200 && resolveRegBefore.body?.data?.seasonType === 'REGULAR',
    'Deterministic Season Resolution on 2026-05-05 (Expected REGULAR)',
    `Result: ${resolveRegBefore.body?.data?.seasonType}`
  );

  const resolvePeakOver = await request(
    `/seasons/resolve?destinationId=${destinationId}&date=2026-05-18`
  );
  assert(
    resolvePeakOver.status === 200 && resolvePeakOver.body?.data?.seasonType === 'PEAK',
    'Deterministic Season Resolution on 2026-05-18 Overlap (Priority 50 wins -> PEAK)',
    `Result: ${resolvePeakOver.body?.data?.seasonType}`
  );

  const resolveRegAfter = await request(
    `/seasons/resolve?destinationId=${destinationId}&date=2026-06-05`
  );
  assert(
    resolveRegAfter.status === 200 && resolveRegAfter.body?.data?.seasonType === 'REGULAR',
    'Deterministic Season Resolution on 2026-06-05 (Expected REGULAR)',
    `Result: ${resolveRegAfter.body?.data?.seasonType}`
  );

  // 7f. Create Seasonal Rate Card
  const createRateCard = await request('/hotels/rate-cards', {
    method: 'POST',
    token: adminToken,
    body: {
      hotelId,
      roomCategoryId: roomId,
      seasonId: regSeasonId,
      mealPlan: 'MAP',
      baseCostPerNight: 5200,
      extraAdultBedCost: 1500,
      childWithBedCost: 1000,
      childWithoutBedCost: 500,
      standardSellingPrice: 7800,
      validFrom: '2026-05-01',
      validTo: '2026-08-31',
      isActive: true,
    },
  });
  assert(
    createRateCard.status === 201 && !!createRateCard.body?.data?.id,
    'Seasonal Rate Card Created in MongoDB',
    `ID: ${createRateCard.body?.data?.id}`
  );
  const rateCardId = createRateCard.body?.data?.id;

  // 7g. Invalid Rate Card Relationship (Nonexistent Room)
  const invalidRateCard = await request('/hotels/rate-cards', {
    method: 'POST',
    token: adminToken,
    body: {
      hotelId,
      roomCategoryId: '507f1f77bcf86cd799439011',
      seasonId: regSeasonId,
      mealPlan: 'MAP',
      baseCostPerNight: 5000,
      standardSellingPrice: 7000,
      validFrom: '2026-05-01',
      validTo: '2026-08-31',
    },
  });
  assert(
    invalidRateCard.status === 400,
    'Rate Card with Invalid Room Category Rejected (400 Bad Request)',
    `Status ${invalidRateCard.status}`
  );

  // 8. CRUD: Transport Vendor, Vehicle, Driver and Tariff
  const createVendor = await request('/transport/vendors', {
    method: 'POST',
    token: adminToken,
    body: {
      businessName: `Kashmir Cabs & Logistics ${Date.now()}`,
      contactPerson: 'Mohammad Farooq',
      phone: '9876543222',
      email: 'farooq@kashmircabs.com',
      city: 'Srinagar',
      state: 'Jammu and Kashmir',
      settlementTerms: 'Net 15 days via NEFT, driver batta weekly cash',
      isActive: true,
    },
  });
  assert(
    createVendor.status === 201 && !!createVendor.body?.data?.id,
    'Vehicle Vendor Created in MongoDB',
    `ID: ${createVendor.body?.data?.id}`
  );
  const vendorId = createVendor.body?.data?.id;

  const regNum = `JK01Z${Math.floor(1000 + Math.random() * 9000)}`;
  const createVehicle = await request('/transport/vehicles', {
    method: 'POST',
    token: adminToken,
    body: {
      vendorId,
      model: 'Toyota Innova Crysta',
      category: 'SUV',
      registrationNumber: regNum,
      seatingCapacity: 6,
      hasAC: true,
      serviceArea: 'Kashmir Valley & Ladakh',
      status: 'AVAILABLE',
    },
  });
  assert(
    createVehicle.status === 201 && !!createVehicle.body?.data?.id,
    'Vehicle Created in MongoDB',
    `Registration: ${regNum}`
  );
  const vehicleId = createVehicle.body?.data?.id;

  const licNum = `JK012026${Math.floor(100000 + Math.random() * 900000)}`;
  const createDriver = await request('/transport/drivers', {
    method: 'POST',
    token: adminToken,
    body: {
      vendorId,
      assignedVehicleId: vehicleId,
      fullName: 'Tariq Hussain',
      mobile: '9876543233',
      licenseNumber: licNum,
      languages: ['Kashmiri', 'Urdu', 'Hindi', 'English'],
      status: 'ACTIVE',
    },
  });
  assert(
    createDriver.status === 201 && !!createDriver.body?.data?.id,
    'Driver Created in MongoDB',
    `License: ${licNum}`
  );
  const driverId = createDriver.body?.data?.id;

  const createTariff = await request('/transport/tariffs', {
    method: 'POST',
    token: adminToken,
    body: {
      destinationId,
      vehicleCategory: 'SUV',
      seasonType: 'PEAK',
      tariffBasis: 'PER_DAY',
      circuitName: 'Srinagar - Gulmarg - Pahalgam Circuit',
      baseSupplierCost: 3800,
      driverDailyAllowanceCost: 600,
      standardSellingRate: 5500,
      includedKmPerDay: 150,
      extraKmRate: 22,
      isTollParkingIncluded: false,
      isNightHaltIncluded: true,
      nightHaltCharge: 500,
      isActive: true,
    },
  });
  assert(
    createTariff.status === 201 && !!createTariff.body?.data?.id,
    'Transport Tariff Created in MongoDB',
    `ID: ${createTariff.body?.data?.id}`
  );
  const tariffId = createTariff.body?.data?.id;

  // 9. CRUD & Publish: Tour Package
  const pkgTitle = `Enchanting Kashmir Escapade ${Date.now()}`;
  const createPackage = await request('/packages', {
    method: 'POST',
    token: adminToken,
    body: {
      title: pkgTitle,
      destinationId,
      durationNights: 4,
      durationDays: 5,
      overview: 'Experience the magic of Srinagar houseboats and Gulmarg meadows.',
      dayWiseItinerary: [
        {
          dayNumber: 1,
          title: 'Arrival in Srinagar & Dal Lake Shikara',
          description: 'Transfer to luxury Dal Lake houseboat, afternoon Shikara sunset ride.',
          nightStayDestination: 'Srinagar Houseboat',
          mealsIncluded: ['Dinner'],
          activities: ['Shikara ride', 'Floating market'],
        },
        {
          dayNumber: 2,
          title: 'Mughal Gardens & Old Srinagar City',
          description: 'Visit Nishat Bagh, Shalimar Bagh and Jama Masjid.',
          nightStayDestination: 'Srinagar Hotel',
          mealsIncluded: ['Breakfast', 'Dinner'],
          activities: ['Garden walking tour', 'Handicrafts shopping'],
        },
        {
          dayNumber: 3,
          title: 'Gulmarg Gondola & Meadow Excursion',
          description: 'Full day excursion to Gulmarg with Phase 1 & 2 Gondola ride.',
          nightStayDestination: 'Srinagar Hotel',
          mealsIncluded: ['Breakfast', 'Dinner'],
          activities: ['Gondola ride', 'Snow activities'],
        },
        {
          dayNumber: 4,
          title: 'Pahalgam Valley & Betaab Valley Excursion',
          description: 'Drive along saffron fields of Pampore to scenic Lidder valley.',
          nightStayDestination: 'Pahalgam Resort',
          mealsIncluded: ['Breakfast', 'Dinner'],
          activities: ['Lidder river walk', 'Betaab valley sightseeing'],
        },
        {
          dayNumber: 5,
          title: 'Departure Transfer to Srinagar Airport',
          description: 'Morning breakfast and timely airport drop for return flight.',
          nightStayDestination: 'Departure',
          mealsIncluded: ['Breakfast'],
          activities: ['Airport transfer'],
        },
      ],
      inclusions: ['All hotel and houseboat stays', 'Daily breakfast and dinner', 'AC Innova Crysta for all transfers'],
      exclusions: ['Airfare', 'Pony rides', 'Personal laundry and tips'],
      termsAndConditions: ['50% advance to confirm booking', 'Valid photo ID required at check-in'],
      cancellationPolicy: ['Full refund up to 15 days before travel', '50% charge within 7 days'],
      defaultMealPlan: 'MAP',
      defaultVehicleCategory: 'SUV',
      startingPrice: 38500,
      isPublished: false,
    },
  });
  assert(
    createPackage.status === 201 && !!createPackage.body?.data?.id,
    'Tour Package Created in MongoDB',
    `ID: ${createPackage.body?.data?.id}, Days: 5`
  );
  const packageId = createPackage.body?.data?.id;

  const publishPkg = await request(`/packages/${packageId}/publish`, {
    method: 'PATCH',
    token: adminToken,
    body: { isPublished: true },
  });
  assert(
    publishPkg.status === 200 && publishPkg.body?.data?.isPublished === true,
    'Tour Package Published in MongoDB (isPublished=true)'
  );

  // 10. CRUD: Tax Rule
  const createTax = await request('/taxes', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `GST Domestic Tour Services ${Date.now()}`,
      taxType: 'GST',
      ratePercent: 5,
      isApplicable: true,
      jurisdiction: 'IN',
      description: 'Standard 5% GST for composite tour operator packages in India without ITC.',
      isDefault: true,
    },
  });
  assert(
    createTax.status === 201 && !!createTax.body?.data?.id,
    'Tax Rule Created in MongoDB',
    `ID: ${createTax.body?.data?.id}, Rate: 5%`
  );
  const taxId = createTax.body?.data?.id;

  const updateTax = await request(`/taxes/${taxId}`, {
    method: 'PATCH',
    token: adminToken,
    body: {
      description: 'Updated tax rule with official GST council guideline reference.',
    },
  });
  assert(
    updateTax.status === 200 && updateTax.body?.data?.ratePercent === 5,
    'Tax Rule Updated in MongoDB'
  );

  // 11. Confidentiality & Non-Admin Data Masking Checks
  // 11a. Seasonal Rate Card: baseCostPerNight
  const adminRc = await request(`/hotels/rate-cards?hotelId=${hotelId}`, { token: adminToken });
  const adminRcItem = adminRc.body?.data?.find((i: any) => i.id === rateCardId);
  assert(
    adminRcItem?.baseCostPerNight === 5200,
    'Confidentiality: Admin CAN view Rate Card baseCostPerNight',
    `Value: ₹${adminRcItem?.baseCostPerNight}`
  );

  const agentRc = await request(`/hotels/rate-cards?hotelId=${hotelId}`, { token: agentToken });
  const agentRcItem = agentRc.body?.data?.find((i: any) => i.id === rateCardId);
  assert(
    agentRcItem?.baseCostPerNight === 0,
    'Confidentiality: Non-Admin (Agent) CANNOT view Rate Card baseCostPerNight (Masked to 0)',
    `Value: ₹${agentRcItem?.baseCostPerNight}`
  );

  // 11b. Transport Tariff: baseSupplierCost
  const adminTariff = await request(`/transport/tariffs/${tariffId}`, { token: adminToken });
  assert(
    adminTariff.body?.data?.baseSupplierCost === 3800,
    'Confidentiality: Admin CAN view Tariff baseSupplierCost',
    `Value: ₹${adminTariff.body?.data?.baseSupplierCost}`
  );

  const agentTariff = await request(`/transport/tariffs/${tariffId}`, { token: agentToken });
  assert(
    agentTariff.body?.data?.baseSupplierCost === 0,
    'Confidentiality: Non-Admin (Agent) CANNOT view Tariff baseSupplierCost (Masked to 0)',
    `Value: ₹${agentTariff.body?.data?.baseSupplierCost}`
  );

  // 11c. Vehicle Vendor: settlementTerms
  const adminVendor = await request(`/transport/vendors/${vendorId}`, { token: adminToken });
  assert(
    adminVendor.body?.data?.settlementTerms === 'Net 15 days via NEFT, driver batta weekly cash',
    'Confidentiality: Admin CAN view Vendor settlementTerms',
    `Terms: "${adminVendor.body?.data?.settlementTerms}"`
  );

  const agentVendor = await request(`/transport/vendors/${vendorId}`, { token: agentToken });
  assert(
    agentVendor.body?.data?.settlementTerms === undefined,
    'Confidentiality: Non-Admin (Agent) CANNOT view Vendor settlementTerms (Field omitted)',
    `Terms: ${agentVendor.body?.data?.settlementTerms}`
  );

  // 11d. Hotel: vendorName and contact info
  const adminHotel = await request(`/hotels/${hotelId}`, { token: adminToken });
  assert(
    adminHotel.body?.data?.vendorName === 'Palace Hospitality Pvt Ltd' &&
      adminHotel.body?.data?.contactPhone === '9876543210',
    'Confidentiality: Admin CAN view Hotel vendorName & contact info',
    `Vendor: ${adminHotel.body?.data?.vendorName}`
  );

  const agentHotel = await request(`/hotels/${hotelId}`, { token: agentToken });
  assert(
    agentHotel.body?.data?.vendorName === undefined && agentHotel.body?.data?.contactPhone === undefined,
    'Confidentiality: Non-Admin (Agent) CANNOT view Hotel vendorName & contact info (Omitted)',
    `Vendor: ${agentHotel.body?.data?.vendorName}`
  );

  // 12. Audit Log Verification
  // Check that successful mutations created audit logs
  const destAudit = await AuditLogModel.findOne({
    entityId: destinationId,
    action: 'MASTER_DATA_CREATED',
  });
  assert(
    !!destAudit && destAudit.entityType === 'DESTINATION',
    'Audit Log: Created for Destination mutation',
    `Action: ${destAudit?.action}, Entity: ${destAudit?.entityType}`
  );

  const hotelAudit = await AuditLogModel.findOne({
    entityId: hotelId,
    action: 'MASTER_DATA_CREATED',
  });
  assert(
    !!hotelAudit && hotelAudit.entityType === 'HOTEL',
    'Audit Log: Created for Hotel mutation',
    `Action: ${hotelAudit?.action}, Entity: ${hotelAudit?.entityType}`
  );

  // Failed mutation must NOT create success audit entry
  const logsCountBefore = await AuditLogModel.countDocuments();
  const failingMutation = await request('/destinations', {
    method: 'POST',
    token: adminToken,
    body: {
      // Missing name, invalid region
      region: 'INVALID_GALAXY',
    },
  });
  const logsCountAfter = await AuditLogModel.countDocuments();
  assert(
    failingMutation.status === 400 && logsCountAfter === logsCountBefore,
    'Audit Log: Failed mutation does NOT write success audit log',
    `Status ${failingMutation.status}, Log count delta: ${logsCountAfter - logsCountBefore}`
  );

  await disconnectDB();

  console.log('\n====================================================');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('====================================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total Checks: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  // Print created IDs for persistence test
  const createdIds = {
    destinationId,
    hotelId,
    roomId,
    regSeasonId,
    peakSeasonId,
    rateCardId,
    vendorId,
    vehicleId,
    driverId,
    tariffId,
    packageId,
    taxId,
  };
  console.log('\nCREATED_IDS_JSON:' + JSON.stringify(createdIds));

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveVerification().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
