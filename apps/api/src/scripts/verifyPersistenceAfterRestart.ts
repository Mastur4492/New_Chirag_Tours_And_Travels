import { env } from '../config/env';

const API_BASE = 'http://localhost:5000/api/v1';

const CREATED_IDS = {
  destinationId: '6ac8ab924b3d37a5b88a46fe',
  hotelId: '6ac8ab924b3d37a5b88a4714',
  roomId: '6ac8ab924b3d37a5b88a471b',
  regSeasonId: '6ac8ab924b3d37a5b88a4729',
  peakSeasonId: '6ac8ab924b3d37a5b88a472f',
  rateCardId: '6ac8ab924b3d37a5b88a473b',
  vendorId: '6ac8ab924b3d37a5b88a4744',
  vehicleId: '6ac8ab924b3d37a5b88a474b',
  driverId: '6ac8ab924b3d37a5b88a4753',
  tariffId: '6ac8ab924b3d37a5b88a4759',
  packageId: '6ac8ab924b3d37a5b88a4760',
  taxId: '6ac8ab924b3d37a5b88a476c',
};

async function verifyAllRecords() {
  console.log('--- Verifying persistence across API server restart ---');

  // Login
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobile: env.BOOTSTRAP_ADMIN_MOBILE || '9999999999',
      password: env.BOOTSTRAP_ADMIN_PASSWORD || 'TestAdmin@12345!',
    }),
  });
  const loginData: any = await loginRes.json();
  const token = loginData?.data?.accessToken;
  if (!token) {
    throw new Error('Failed to obtain admin token');
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 1. Destination
  const destRes = await fetch(`${API_BASE}/destinations/${CREATED_IDS.destinationId}`);
  const dest = (await destRes.json()) as any;
  console.log(`1. Destination: HTTP ${destRes.status} | Name: ${dest.data?.name} | Active: ${dest.data?.isActive}`);
  if (destRes.status !== 200 || !dest.data) throw new Error('Destination not found');

  // 2. Hotel
  const hotelRes = await fetch(`${API_BASE}/hotels/${CREATED_IDS.hotelId}`, { headers: authHeaders });
  const hotel = (await hotelRes.json()) as any;
  console.log(`2. Hotel: HTTP ${hotelRes.status} | Name: ${hotel.data?.name} | Vendor: ${hotel.data?.vendorName}`);
  if (hotelRes.status !== 200 || !hotel.data) throw new Error('Hotel not found');

  // 3. Room Categories under Hotel
  const roomsRes = await fetch(`${API_BASE}/hotels/${CREATED_IDS.hotelId}/rooms`, { headers: authHeaders });
  const rooms = (await roomsRes.json()) as any;
  const room = rooms.data?.find((r: any) => r.id === CREATED_IDS.roomId);
  console.log(`3. Room Category: HTTP ${roomsRes.status} | Name: ${room?.name} | Total: ${rooms.data?.length}`);
  if (!room) throw new Error('Room category not found');

  // 4. Regular Season
  const regSeasonRes = await fetch(`${API_BASE}/seasons/${CREATED_IDS.regSeasonId}`);
  const regSeason = (await regSeasonRes.json()) as any;
  console.log(`4. Regular Season: HTTP ${regSeasonRes.status} | Type: ${regSeason.data?.seasonType} | Priority: ${regSeason.data?.priority}`);
  if (regSeasonRes.status !== 200) throw new Error('Regular season not found');

  // 5. Peak Season
  const peakSeasonRes = await fetch(`${API_BASE}/seasons/${CREATED_IDS.peakSeasonId}`);
  const peakSeason = (await peakSeasonRes.json()) as any;
  console.log(`5. Peak Season: HTTP ${peakSeasonRes.status} | Type: ${peakSeason.data?.seasonType} | Priority: ${peakSeason.data?.priority}`);
  if (peakSeasonRes.status !== 200) throw new Error('Peak season not found');

  // 6. Seasonal Rate Card
  const rcRes = await fetch(`${API_BASE}/hotels/rate-cards?hotelId=${CREATED_IDS.hotelId}`, { headers: authHeaders });
  const rcList = (await rcRes.json()) as any;
  const rc = rcList.data?.find((r: any) => r.id === CREATED_IDS.rateCardId);
  console.log(`6. Rate Card: HTTP ${rcRes.status} | MealPlan: ${rc?.mealPlan} | BaseCost: ₹${rc?.baseCostPerNight}`);
  if (!rc) throw new Error('Rate card not found');

  // 7. Transport Vendor
  const vendorRes = await fetch(`${API_BASE}/transport/vendors/${CREATED_IDS.vendorId}`, { headers: authHeaders });
  const vendor = (await vendorRes.json()) as any;
  console.log(`7. Transport Vendor: HTTP ${vendorRes.status} | Business: ${vendor.data?.businessName}`);
  if (vendorRes.status !== 200) throw new Error('Vendor not found');

  // 8. Vehicle
  const vehicleRes = await fetch(`${API_BASE}/transport/vehicles/${CREATED_IDS.vehicleId}`);
  const vehicle = (await vehicleRes.json()) as any;
  console.log(`8. Vehicle: HTTP ${vehicleRes.status} | Model: ${vehicle.data?.model} | Reg: ${vehicle.data?.registrationNumber}`);
  if (vehicleRes.status !== 200) throw new Error('Vehicle not found');

  // 9. Driver
  const driverRes = await fetch(`${API_BASE}/transport/drivers/${CREATED_IDS.driverId}`);
  const driver = (await driverRes.json()) as any;
  console.log(`9. Driver: HTTP ${driverRes.status} | Name: ${driver.data?.fullName} | License: ${driver.data?.licenseNumber}`);
  if (driverRes.status !== 200) throw new Error('Driver not found');

  // 10. Transport Tariff
  const tariffRes = await fetch(`${API_BASE}/transport/tariffs/${CREATED_IDS.tariffId}`, { headers: authHeaders });
  const tariff = (await tariffRes.json()) as any;
  console.log(`10. Transport Tariff: HTTP ${tariffRes.status} | Rate: ₹${tariff.data?.standardSellingRate} | Cost: ₹${tariff.data?.baseSupplierCost}`);
  if (tariffRes.status !== 200) throw new Error('Tariff not found');

  // 11. Tour Package
  const pkgRes = await fetch(`${API_BASE}/packages/${CREATED_IDS.packageId}`);
  const pkg = (await pkgRes.json()) as any;
  console.log(`11. Tour Package: HTTP ${pkgRes.status} | Title: ${pkg.data?.title} | Published: ${pkg.data?.isPublished} | Days: ${pkg.data?.durationDays}`);
  if (pkgRes.status !== 200 || !pkg.data?.isPublished) throw new Error('Package not found or not published');

  // 12. Tax Rule
  const taxRes = await fetch(`${API_BASE}/taxes/${CREATED_IDS.taxId}`);
  const tax = (await taxRes.json()) as any;
  console.log(`12. Tax Rule: HTTP ${taxRes.status} | Name: ${tax.data?.name} | Rate: ${tax.data?.ratePercent}%`);
  if (taxRes.status !== 200) throw new Error('Tax rule not found');

  console.log('\n✅ ALL 12 MASTER DATA RECORDS FULLY PERSISTED AND INTACT IN MONGODB!');
}

verifyAllRecords().catch((err) => {
  console.error('❌ Verification failed:', err.message);
  process.exit(1);
});
