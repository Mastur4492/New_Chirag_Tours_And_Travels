import { z } from 'zod';
import { AiToolDefinition } from '../ai.types';
import { destinationRepository } from '../../../repositories/destination.repository';
import { tourPackageRepository } from '../../../repositories/package.repository';
import { bookingRepository } from '../../../repositories/booking.repository';
import { hotelService } from '../../hotel.service';
import { transportRepository } from '../../../repositories/transport.repository';
import { leadService } from '../../lead.service';
import { VehicleCategory } from '@chirag/types';

/**
 * 1. Search Destinations Tool
 */
const SearchDestinationsSchema = z.object({
  query: z.string().optional().describe('Search keyword e.g. "Kashmir", "Ladakh", "Gulmarg", "Kerala"'),
});

export const searchDestinationsTool: AiToolDefinition<z.infer<typeof SearchDestinationsSchema>> = {
  name: 'searchDestinations',
  description: 'Search available holiday destinations, recommended nights, and top attractions at New Chirag Tours & Travels.',
  schema: SearchDestinationsSchema,
  parametersJsonSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search keyword like Kashmir, Ladakh, Kerala' },
    },
  },
  execute: async (args) => {
    const { destinations } = await destinationRepository.findMany({ isActive: true });
    let filtered = destinations;
    if (args.query && args.query.trim()) {
      const q = args.query.toLowerCase().trim();
      filtered = destinations.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.slug.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q))
      );
    }
    const PORTAL_CIRCUITS_META: Record<string, { startingFrom: number; defaultNights: number; bestSeason: string; tagline: string }> = {
      kashmir: { startingFrom: 24500, defaultNights: 5, bestSeason: 'Apr–Oct & Dec–Feb (Snow)', tagline: 'Srinagar Shikara • Gulmarg Gondola • Pahalgam Lidder Valley' },
      kerala: { startingFrom: 21500, defaultNights: 6, bestSeason: 'Sep–Mar (Peak Season)', tagline: 'Munnar Tea Hills • Alleppey Houseboat • Thekkady Forest' },
      himachal: { startingFrom: 18500, defaultNights: 5, bestSeason: 'Mar–Jun & Dec–Feb (Snow)', tagline: 'Shimla Ridge • Manali Snow Valley • Rohtang Pass' },
      rajasthan: { startingFrom: 19500, defaultNights: 6, bestSeason: 'Oct–Mar (Pleasant Winter)', tagline: 'Jaipur Amber Fort • Jodhpur Blue City • Udaipur Lake Palace' },
      goa: { startingFrom: 16500, defaultNights: 4, bestSeason: 'Nov–Feb (Peak Beach Season)', tagline: 'Calangute Baga Beaches • Old Goa Heritage • Sunset River Cruise' },
      andaman: { startingFrom: 28500, defaultNights: 5, bestSeason: 'Oct–May (Calm Seas)', tagline: 'Radhanagar White Sands • Havelock Coral Reefs • Cellular Jail' },
      uttarakhand: { startingFrom: 17500, defaultNights: 5, bestSeason: 'Mar–Jun & Sep–Nov', tagline: 'Nainital Lake Boating • Mussoorie Kempty Falls • Rishikesh Ganga Aarti' },
    };

    return {
      count: filtered.length,
      destinations: filtered.slice(0, 7).map((d) => {
        const slugLower = (d.slug || '').toLowerCase();
        const nameLower = (d.name || '').toLowerCase();
        const metaKey = Object.keys(PORTAL_CIRCUITS_META).find((k) => slugLower.includes(k) || nameLower.includes(k)) || 'kashmir';
        const meta = PORTAL_CIRCUITS_META[metaKey];
        return {
          id: d._id.toString(),
          name: d.name,
          slug: d.slug,
          description: d.description || meta?.tagline || '',
          highlights: d.highlights || [],
          state: d.state || 'India',
          region: d.region,
          startingFromPerPerson: meta ? meta.startingFrom : 21000,
          recommendedNights: meta ? meta.defaultNights : 5,
          bestSeason: meta ? meta.bestSeason : 'Round the year',
          portalCustomizerAvailable: true,
        };
      }),
    };
  },
};

/**
 * 2. Search Tour Packages Tool
 */
const SearchPackagesSchema = z.object({
  destinationName: z.string().optional().describe('Destination filter e.g. "Kashmir"'),
  durationDays: z.number().optional().describe('Preferred duration in days'),
});

export const searchTourPackagesTool: AiToolDefinition<z.infer<typeof SearchPackagesSchema>> = {
  name: 'searchTourPackages',
  description: 'Search handcrafted holiday itineraries with day-by-day sightseeing and inclusions.',
  schema: SearchPackagesSchema,
  parametersJsonSchema: {
    type: 'object',
    properties: {
      destinationName: { type: 'string', description: 'Destination name e.g. Kashmir' },
      durationDays: { type: 'number', description: 'Duration in days' },
    },
  },
  execute: async (args) => {
    const { packages } = await tourPackageRepository.findMany({ isPublished: true });
    let filtered = packages;
    if (args.destinationName) {
      const dName = args.destinationName.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(dName) ||
          (p.destinationId as any)?.name?.toLowerCase()?.includes(dName)
      );
    }
    if (args.durationDays) {
      filtered = filtered.filter((p) => p.durationDays === args.durationDays);
    }
    return {
      count: filtered.length,
      packages: filtered.slice(0, 5).map((p) => ({
        id: p._id.toString(),
        title: p.title,
        slug: p.slug,
        durationDays: p.durationDays,
        durationNights: p.durationNights,
        overview: p.overview || '',
        startingPrice: p.startingPrice || 0,
        inclusions: p.inclusions || ['Hotel Stay', 'Daily Breakfast & Dinner (MAP)', 'Private Dedicated Cab', 'All Tolls & Permits'],
      })),
    };
  },
};

/**
 * 3. Calculate Trip Price Tool (Synchronized 100% with Customer Portal Trip Customizer)
 */
const CalculateTripPriceSchema = z.object({
  destinationName: z.string().optional().describe('Destination name e.g. "Kashmir", "Kerala", "Himachal", "Goa", "Rajasthan", "Andaman", "Uttarakhand"'),
  nights: z.number().min(1).default(5).describe('Total nights of stay (default is 5 nights)'),
  adults: z.number().min(1).default(2).describe('Total adult travelers (1 room per 2 adults)'),
  children: z.number().min(0).default(0).describe('Total child travelers'),
  hotelTier: z.string().optional().default('Deluxe').describe('Hotel category: Comfort / 3 Star, Deluxe / 4 Star, or Luxury / 5 Star'),
  hotelName: z.string().optional().describe('Specific hotel property name e.g. "Kolahoi Green Resort", "The Lalit Grand Palace", "The Khyber"'),
  mealPlan: z.string().optional().default('MAP').describe('Meal plan: MAP (Breakfast + Dinner included - standard) or CP (Breakfast only)'),
  vehicleType: z.string().optional().default('Sedan').describe('Dedicated private vehicle: Sedan (up to 4 pax), SUV (up to 7 pax), Innova Crysta, or Tempo Traveller'),
});

export const calculateTripPriceTool: AiToolDefinition<z.infer<typeof CalculateTripPriceSchema>> = {
  name: 'calculateTripPrice',
  description: 'Calculate an accurate, all-inclusive tour quotation strictly synchronized with the New Chirag Tours & Travels Customer Portal pricing customizer.',
  schema: CalculateTripPriceSchema,
  parametersJsonSchema: {
    type: 'object',
    properties: {
      destinationName: { type: 'string', description: 'Destination name e.g. Kashmir, Kerala, Himachal, Rajasthan, Goa, Andaman, Uttarakhand' },
      nights: { type: 'number', description: 'Number of nights' },
      adults: { type: 'number', description: 'Number of adult travelers' },
      children: { type: 'number', description: 'Number of children' },
      hotelTier: { type: 'string', description: 'Hotel category: Comfort / 3 Star, Deluxe / 4 Star, or Luxury / 5 Star' },
      hotelName: { type: 'string', description: 'Optional specific hotel name e.g. Kolahoi Green Resort, The Lalit Grand Palace' },
      mealPlan: { type: 'string', description: 'Meal plan: MAP (Breakfast + Dinner) or CP (Breakfast only)' },
      vehicleType: { type: 'string', description: 'Vehicle type: Sedan, SUV, Innova Crysta, or Tempo Traveller' },
    },
    required: ['nights', 'adults'],
  },
  execute: async (args) => {
    const adults = Math.max(1, args.adults || 2);
    const children = Math.max(0, args.children || 0);
    const nights = Math.max(1, args.nights || 5);
    const totalDays = nights + 1;
    const roomsCount = Math.max(1, Math.ceil(adults / 2));

    // Resolve Hotel Star Rating & Base Rate (Strict match to Customer Portal page.tsx)
    const rawTier = (args.hotelTier || 'Deluxe').toLowerCase();
    let starRating = 4; // Default Deluxe
    if (rawTier.includes('deluxe') || rawTier.includes('4')) {
      starRating = 4;
    } else if (rawTier.includes('lux') || rawTier.includes('5')) {
      starRating = 5;
    } else if (rawTier.includes('comf') || rawTier.includes('stan') || rawTier.includes('3')) {
      starRating = 3;
    }
    const hotelTierLabel = starRating === 5 ? 'Luxury (5★)' : starRating === 3 ? 'Standard (3★)' : 'Deluxe (4★)';

    // Benchmark rates in Customer Portal page.tsx line 559 & 822: 5★ = 7500, 4★ = 4800, 3★ = 3500
    let baseHotelRate = starRating === 5 ? 7500 : starRating === 3 ? 3500 : 4800;
    let hotelName = starRating === 5 ? 'The Lalit Grand Palace Srinagar' : starRating === 3 ? 'Comfort Heritage 3★ Partner Hotel' : 'Kolahoi Green Resort Pahalgam';
    let roomCategoryName = starRating === 5 ? 'Heritage Lake View Suite' : starRating === 3 ? 'Standard Room' : 'Deluxe Pine Room';

    // Resolve Destination from Database (Prefer live production circuits over demo records)
    let destinationDoc: any = null;
    let destDisplayName = args.destinationName || 'Kashmir';
    try {
      const { destinations } = await destinationRepository.findMany({ isActive: true });
      if (args.destinationName) {
        const q = args.destinationName.toLowerCase();
        destinationDoc = destinations.find(
          (d) =>
            !d.name.toLowerCase().includes('demo') &&
            !d.slug.toLowerCase().includes('demo') &&
            (d.name.toLowerCase().includes(q) || d.slug.toLowerCase().includes(q))
        ) || destinations.find(
          (d) => d.name.toLowerCase().includes(q) || d.slug.toLowerCase().includes(q)
        );
      }
      if (!destinationDoc && destinations.length > 0) {
        destinationDoc = destinations.find(
          (d) => !d.slug.includes('demo') && d.slug.includes('kashmir')
        ) || destinations.find((d) => d.slug.includes('kashmir')) || destinations[0];
      }
      if (destinationDoc) {
        destDisplayName = destinationDoc.name;
        // Query live hotels with room categories from hotelService (identical to Customer Portal /api/proxy/hotels)
        const { items: destinationHotels } = await hotelService.listHotels({
          destinationId: destinationDoc._id.toString(),
          isActive: true,
          limit: 50,
        });

        if (destinationHotels && destinationHotels.length > 0) {
          // Check if specific hotel name was requested or match by star rating
          let matchedHotel = destinationHotels.find((h) => {
            if (args.hotelName && h.name.toLowerCase().includes(args.hotelName.toLowerCase())) return true;
            if (args.hotelTier && h.name.toLowerCase().includes(args.hotelTier.toLowerCase())) return true;
            return false;
          });
          if (!matchedHotel) {
            matchedHotel = destinationHotels.find((h) => h.starRating === starRating) || destinationHotels[0];
          }

          if (matchedHotel) {
            hotelName = matchedHotel.name;
            const firstRoom = matchedHotel.roomCategories && matchedHotel.roomCategories[0];
            if (firstRoom) {
              roomCategoryName = firstRoom.name;
              if (firstRoom.pricePerNight && firstRoom.pricePerNight > 0) {
                baseHotelRate = firstRoom.pricePerNight;
              }
            } else {
              baseHotelRate = matchedHotel.starRating >= 5 ? 7500 : matchedHotel.starRating === 3 ? 3500 : 4800;
            }
          }
        }
      }
    } catch {
      // Graceful fallback to portal defaults
    }

    // Meal Plan: MAP (Breakfast + Dinner) is standard. CP (Breakfast only) gives 10% discount on hotel rate (page.tsx line 823)
    const isCP = (args.mealPlan || '').toUpperCase().includes('CP');
    const effectiveHotelRate = isCP ? Math.round(baseHotelRate * 0.9) : baseHotelRate;
    const mealPlanLabel = isCP ? 'CP (Daily Breakfast Included)' : 'MAP (Daily Breakfast & Dinner Included)';

    // Resolve Vehicle & Per Day Cost (Strict match to Customer Portal VEHICLE_TIER_RATES page.tsx line 235 & line 824)
    const rawVeh = (args.vehicleType || 'Sedan').toLowerCase();
    let resolvedVehicle = 'Sedan';
    let targetCategory: VehicleCategory = 'SEDAN';
    let defaultRate = 2800;
    let vehicleModel = 'AC Sedan (Dzire / Etios)';

    if (rawVeh.includes('tempo') || rawVeh.includes('traveller')) {
      resolvedVehicle = 'Tempo Traveller';
      targetCategory = 'TEMPO_TRAVELLER';
      defaultRate = 7500;
      vehicleModel = 'Tempo Traveller (12-17 Seater)';
    } else if (rawVeh.includes('crysta') || rawVeh.includes('premium')) {
      resolvedVehicle = 'Innova Crysta';
      targetCategory = 'PREMIUM_SUV';
      defaultRate = 5500;
      vehicleModel = 'Innova Crysta Premium';
    } else if (rawVeh.includes('suv') || rawVeh.includes('ertiga') || rawVeh.includes('innova')) {
      resolvedVehicle = 'SUV';
      targetCategory = 'SUV';
      defaultRate = 4200;
      vehicleModel = 'AC SUV (Innova / Ertiga)';
    }

    // Auto-upgrade to SUV if passenger count exceeds 4 (page.tsx line 794)
    if (adults + children > 4 && resolvedVehicle === 'Sedan') {
      resolvedVehicle = 'SUV';
      targetCategory = 'SUV';
      defaultRate = 4200;
      vehicleModel = 'AC SUV (Innova / Ertiga)';
    }

    let vehicleRatePerDay = defaultRate;
    try {
      const { tariffs } = await transportRepository.findTariffs({ isActive: true });
      const matchedTariff = tariffs.find(
        (t) =>
          t.vehicleCategory === targetCategory &&
          (!t.destinationId || (destinationDoc && t.destinationId.toString() === destinationDoc._id.toString()))
      ) || tariffs.find((t) => t.vehicleCategory === targetCategory);

      if (matchedTariff && matchedTariff.standardSellingRate > 0) {
        vehicleRatePerDay = matchedTariff.standardSellingRate;
      }
    } catch {
      // Fallback to defaultRate
    }

    // Exact Customer Portal Financial Calculation (page.tsx lines 826-838)
    const totalHotelCost = nights * roomsCount * effectiveHotelRate;
    const totalVehicleCost = totalDays * vehicleRatePerDay;
    const subtotal = totalHotelCost + totalVehicleCost;

    // 10% Standard Agency Margin (page.tsx line 830)
    const agencyMargin = Math.round(subtotal * 0.10);
    const taxableAmount = subtotal + agencyMargin;
    // 5% Tour Package GST (page.tsx line 832)
    const gstAmount = Math.round(taxableAmount * 0.05);
    const finalTotal = taxableAmount + gstAmount;

    const effectiveTravelers = adults + (children > 0 ? children * 0.5 : 0);
    const perPersonPrice = Math.round(finalTotal / (effectiveTravelers || 1));
    const advancePayable = Math.round(finalTotal * 0.25);

    return {
      currency: 'INR (₹)',
      destination: destDisplayName,
      nights,
      days: totalDays,
      adults,
      children,
      roomsAllocated: roomsCount,
      hotelTier: hotelTierLabel,
      hotelName,
      roomCategory: roomCategoryName,
      mealPlan: mealPlanLabel,
      vehicleType: resolvedVehicle,
      vehicleModel,
      financials: {
        totalSellingPrice: finalTotal,
        perPersonPrice,
        gstRatePercent: 5,
        gstAmountIncluded: gstAmount,
        advanceToLock25Percent: advancePayable,
        breakdown: {
          hotelPerNight: effectiveHotelRate,
          totalHotelCost,
          vehiclePerDay: vehicleRatePerDay,
          totalVehicleCost,
          subtotal,
          agencyMargin10Percent: agencyMargin,
          taxableAmount,
          gst5Percent: gstAmount,
        },
      },
      inclusions: [
        `${roomsCount} Room(s) at verified ${hotelName} (${roomCategoryName}) on ${mealPlanLabel}`,
        `Dedicated Private ${vehicleModel} for all ${totalDays} days of transfers & sightseeing`,
        'All Toll Taxes, State Border Permits, Parking & Driver Night Allowances 100% Included',
        '5% Tour GST fully included with zero hidden charges',
      ],
      portalMatchNote: 'This quotation is 100% synchronized with the Customer Portal Trip Customizer.',
    };
  },
};

/**
 * 4. Submit Trip Enquiry Tool
 */
const SubmitTripEnquirySchema = z.object({
  fullName: z.string().min(2).describe('Customer full name'),
  mobile: z.string().min(10).describe('Customer 10-digit mobile number'),
  destinationName: z.string().describe('Target destination e.g. Kashmir'),
  durationNights: z.number().min(1).default(5).describe('Tour duration in nights'),
  numberOfAdults: z.number().min(1).default(2).describe('Number of adult travelers'),
  numberOfChildren: z.number().min(0).default(0).describe('Number of children'),
  specialNotes: z.string().optional().describe('Custom requirements or travel dates'),
});

export const submitTripEnquiryTool: AiToolDefinition<z.infer<typeof SubmitTripEnquirySchema>> = {
  name: 'submitTripEnquiry',
  description: 'Create an official trip enquiry for New Chirag Tours & Travels travel desk. A consultant will follow up on WhatsApp or phone.',
  schema: SubmitTripEnquirySchema,
  parametersJsonSchema: {
    type: 'object',
    properties: {
      fullName: { type: 'string', description: 'Customer full name' },
      mobile: { type: 'string', description: 'Customer mobile number' },
      destinationName: { type: 'string', description: 'Destination name' },
      durationNights: { type: 'number', description: 'Nights' },
      numberOfAdults: { type: 'number', description: 'Adults' },
      numberOfChildren: { type: 'number', description: 'Children' },
      specialNotes: { type: 'string', description: 'Special requirements' },
    },
    required: ['fullName', 'mobile', 'destinationName'],
  },
  execute: async (args, context) => {
    const { destinations } = await destinationRepository.findMany({ isActive: true });
    const dest =
      destinations.find((d) => d.name.toLowerCase().includes(args.destinationName.toLowerCase())) ||
      destinations[0];

    if (!dest) {
      throw new Error('Destination not found. Please specify a valid destination.');
    }

    const result = await leadService.createPublicEnquiry(
      {
        fullName: args.fullName,
        mobile: args.mobile,
        destinationId: dest._id.toString(),
        durationNights: args.durationNights,
        numberOfAdults: args.numberOfAdults,
        numberOfChildren: args.numberOfChildren,
        specialRequirements: args.specialNotes || 'Enquiry generated via AI Travel Concierge',
      },
      {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      }
    );

    return {
      status: 'SUCCESS',
      leadNumber: result.leadNumber,
      customerName: result.customerName,
      destinationName: result.destinationName,
      message: `Enquiry #${result.leadNumber} successfully registered! Faisal Bikanerwala or a dedicated senior consultant from New Chirag Tours & Travels will connect on ${args.mobile} within 15-30 minutes.`,
    };
  },
};

/**
 * 5. Check Booking Status Tool
 */
const CheckBookingStatusSchema = z.object({
  bookingNumber: z.string().describe('Official booking reference e.g. "NCT-BK-2026-..."'),
  customerMobile: z.string().min(10).describe('10-digit mobile number for identity verification'),
});

export const checkBookingStatusTool: AiToolDefinition<z.infer<typeof CheckBookingStatusSchema>> = {
  name: 'checkBookingStatus',
  description: 'Check the real-time status of an existing tour booking using official booking number and verified mobile number.',
  schema: CheckBookingStatusSchema,
  parametersJsonSchema: {
    type: 'object',
    properties: {
      bookingNumber: { type: 'string', description: 'Booking reference number' },
      customerMobile: { type: 'string', description: 'Mobile number for verification' },
    },
    required: ['bookingNumber', 'customerMobile'],
  },
  execute: async (args) => {
    const booking = await bookingRepository.findByBookingNumber(args.bookingNumber.trim().toUpperCase());
    if (!booking) {
      return {
        found: false,
        message: `No booking found matching "${args.bookingNumber}". Please double check your booking reference.`,
      };
    }

    const dto = booking.toDto('CUSTOMER');
    const cleanInputPhone = args.customerMobile.replace(/\D/g, '').slice(-10);
    const bookingPhone = (dto.customerPhone || (booking.customerId as any)?.mobile || '').replace(/\D/g, '').slice(-10);

    if (cleanInputPhone !== bookingPhone) {
      return {
        found: false,
        message: 'The mobile number provided does not match the contact number registered for this booking.',
      };
    }

    return {
      found: true,
      bookingNumber: dto.bookingNumber,
      customerName: dto.customerName,
      destinationName: dto.destinationName,
      tourDates: `${new Date(dto.travelStartDate).toLocaleDateString('en-IN')} to ${new Date(dto.travelEndDate).toLocaleDateString('en-IN')}`,
      status: dto.status,
      hotelVoucherGenerated: dto.hotelVoucherGenerated,
      driverDutySlipGenerated: dto.driverDutySlipGenerated,
      paymentSummary: {
        totalAmount: dto.financials.totalAmount,
        totalPaid: dto.financials.totalPaid,
        balancePending: dto.financials.balancePending,
      },
    };
  },
};

export const customerTools: AiToolDefinition[] = [
  searchDestinationsTool,
  searchTourPackagesTool,
  calculateTripPriceTool,
  submitTripEnquiryTool,
  checkBookingStatusTool,
];
