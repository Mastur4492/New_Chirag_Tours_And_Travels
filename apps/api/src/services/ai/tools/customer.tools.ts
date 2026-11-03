import { z } from 'zod';
import { AiToolDefinition } from '../ai.types';
import { destinationRepository } from '../../../repositories/destination.repository';
import { tourPackageRepository } from '../../../repositories/package.repository';
import { bookingRepository } from '../../../repositories/booking.repository';
import { leadService } from '../../lead.service';
import { calculateQuotationTotals, roundHalfUp } from '@chirag/pricing';

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
    return {
      count: filtered.length,
      destinations: filtered.slice(0, 6).map((d) => ({
        id: d._id.toString(),
        name: d.name,
        slug: d.slug,
        description: d.description || '',
        highlights: d.highlights || [],
        state: d.state || 'India',
        region: d.region,
      })),
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
 * 3. Calculate Trip Price Tool (RULE 1: AI must never calculate prices itself!)
 */
const CalculateTripPriceSchema = z.object({
  destinationName: z.string().optional().describe('Destination name'),
  nights: z.number().min(1).default(5).describe('Total nights of stay'),
  adults: z.number().min(1).default(2).describe('Total adult travelers'),
  children: z.number().min(0).default(0).describe('Total child travelers'),
  hotelTier: z.enum(['Comfort', 'Deluxe', 'Luxury']).default('Deluxe').describe('Preferred hotel tier'),
  vehicleType: z.enum(['Sedan', 'SUV', 'Innova Crysta', 'Tempo Traveller']).default('Sedan').describe('Preferred vehicle'),
});

export const calculateTripPriceTool: AiToolDefinition<z.infer<typeof CalculateTripPriceSchema>> = {
  name: 'calculateTripPrice',
  description: 'Calculate an accurate, all-inclusive tour quotation using the official New Chirag Tours & Travels pricing engine.',
  schema: CalculateTripPriceSchema,
  parametersJsonSchema: {
    type: 'object',
    properties: {
      destinationName: { type: 'string', description: 'Destination name' },
      nights: { type: 'number', description: 'Number of nights' },
      adults: { type: 'number', description: 'Number of adult travelers' },
      children: { type: 'number', description: 'Number of children' },
      hotelTier: { type: 'string', enum: ['Comfort', 'Deluxe', 'Luxury'], description: 'Hotel category' },
      vehicleType: { type: 'string', enum: ['Sedan', 'SUV', 'Innova Crysta', 'Tempo Traveller'], description: 'Vehicle type' },
    },
    required: ['nights', 'adults'],
  },
  execute: async (args) => {
    const roomsCount = Math.max(1, Math.ceil(args.adults / 2));
    
    // Benchmark rack rates per tier
    const roomRatePerNight =
      args.hotelTier === 'Luxury' ? 7500 : args.hotelTier === 'Deluxe' ? 4500 : 2800;
    const vehicleRatePerDay =
      args.vehicleType === 'Innova Crysta'
        ? 4500
        : args.vehicleType === 'SUV'
        ? 3500
        : args.vehicleType === 'Tempo Traveller'
        ? 6500
        : 2500;

    const totalDays = args.nights + 1;
    const totalHotelBase = roomRatePerNight * roomsCount * args.nights;
    const totalTransportBase = vehicleRatePerDay * totalDays;
    const baseSupplierCost = totalHotelBase + totalTransportBase;

    // Call pure calculation engine from @chirag/pricing
    const pricing = calculateQuotationTotals({
      baseSupplierCost,
      markupType: 'PERCENT',
      markupPercent: 12, // Standard company margin
      taxRatePercent: 5,  // 5% Tour Package GST
      isTaxApplicable: true,
      isTaxConfirmed: true,
    });

    const perPersonPrice = roundHalfUp(pricing.finalSellingPrice / args.adults);

    return {
      currency: 'INR (₹)',
      nights: args.nights,
      days: totalDays,
      adults: args.adults,
      children: args.children,
      roomsAllocated: roomsCount,
      hotelTier: args.hotelTier,
      vehicleType: args.vehicleType,
      financials: {
        totalSellingPrice: pricing.finalSellingPrice,
        perPersonPrice,
        gstRatePercent: 5,
        gstAmountIncluded: pricing.taxAmount,
        advanceToLock25Percent: roundHalfUp(pricing.finalSellingPrice * 0.25),
      },
      inclusions: [
        `${roomsCount} Room(s) at verified ${args.hotelTier} partner hotels`,
        'Daily Breakfast & Dinner (MAP Meal Plan)',
        `Private Dedicated AC ${args.vehicleType} for all ${totalDays} days sightseeing`,
        'All Tolls, State Border Permits, Parking & Driver Night Allowances',
        '5% Tour GST included with zero hidden charges',
      ],
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
    const bookingPhone = (dto.customerPhone || '').replace(/\D/g, '').slice(-10);

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
