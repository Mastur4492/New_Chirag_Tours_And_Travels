import {
  calculateGST,
  calculateHotelStayPricing,
  calculateQuotationTotals,
  calculateTax,
  calculateTransportPricing,
  roundBankers,
  roundCurrency,
  roundHalfUp,
  validateRoomOccupancy,
} from '@chirag/pricing';
import { normalizeMealPlan } from '@chirag/types';
import { describe, expect, it } from 'vitest';

describe('Pricing & Dynamic Tax Engine', () => {
  describe('calculateTax', () => {
    it('should compute tax with default domestic GST rule (5%)', () => {
      const result = calculateTax(10000);
      expect(result.ratePercent).toBe(5);
      expect(result.taxType).toBe('GST');
      expect(result.taxableAmount).toBe(10000);
      expect(result.taxAmount).toBe(500);
      expect(result.totalWithTax).toBe(10500);
      expect(result.isApplicable).toBe(true);
    });

    it('should support dynamic configurable tax rates (e.g. 18% hotel luxury tax)', () => {
      const result = calculateTax(25000, {
        name: 'Hotel High-End GST',
        taxType: 'GST',
        ratePercent: 18,
        isApplicable: true,
      });

      expect(result.ratePercent).toBe(18);
      expect(result.taxAmount).toBe(4500);
      expect(result.totalWithTax).toBe(29500);
      expect(result.name).toBe('Hotel High-End GST');
    });

    it('should support no-tax / exemption scenarios when permitted by business rule', () => {
      const result = calculateTax(50000, {
        name: 'SEZ / Zero-Rated Exemption',
        taxType: 'ZERO_RATED',
        ratePercent: 0,
        isApplicable: false,
        exemptionReason: 'Special Economic Zone traveler exemption',
      });

      expect(result.isApplicable).toBe(false);
      expect(result.taxAmount).toBe(0);
      expect(result.totalWithTax).toBe(50000);
      expect(result.exemptionReason).toBe('Special Economic Zone traveler exemption');
    });

    it('should accurately handle two-decimal rounding on fractional sums', () => {
      // 3333.33 * 5% = 166.6665 -> rounds to 166.67
      const result = calculateTax(3333.33, { ratePercent: 5 });
      expect(result.taxAmount).toBe(166.67);
      expect(result.totalWithTax).toBe(3500);
    });

    it('should reject invalid or out-of-bound tax rates', () => {
      expect(() => calculateTax(1000, { ratePercent: -5 })).toThrow(
        'Tax rate percent must be a valid number between 0 and 100'
      );
      expect(() => calculateTax(1000, { ratePercent: 105 })).toThrow(
        'Tax rate percent must be a valid number between 0 and 100'
      );
      expect(() => calculateTax(1000, { ratePercent: NaN })).toThrow(
        'Tax rate percent must be a valid number between 0 and 100'
      );
    });

    it('should reject negative taxable amounts', () => {
      expect(() => calculateTax(-500)).toThrow('Taxable amount must be a non-negative number');
    });
  });

  describe('calculateGST (backward compatibility wrapper)', () => {
    it('should compute standard GST using wrapper function', () => {
      const result = calculateGST(10000, 5);
      expect(result.ratePercent).toBe(5);
      expect(result.taxAmount).toBe(500);
      expect(result.totalWithTax).toBe(10500);
    });
  });

  describe('calculateQuotationTotals', () => {
    it('should compute base cost, markup, discount, tax and gross profit accurately', () => {
      // Prompt example: Base cost ₹6000, Markup ₹800, Discount ₹200
      // Taxable = 6000 + 800 - 200 = 6600
      // Tax 5% = 330
      // Final Selling = 6930
      // Gross profit = 6600 - 6000 = 600
      const result = calculateQuotationTotals({
        baseSupplierCost: 6000,
        markupAmount: 800,
        discountAmount: 200,
        taxRatePercent: 5,
      });

      expect(result.totalBaseSupplierCost).toBe(6000);
      expect(result.totalMarkupAmount).toBe(800);
      expect(result.discountAmount).toBe(200);
      expect(result.taxableAmount).toBe(6600);
      expect(result.taxAmount).toBe(330);
      expect(result.finalSellingPrice).toBe(6930);
      expect(result.projectedGrossProfit).toBe(600);
    });

    it('should support dynamic tax rules inside quotations (e.g. 12% transport slab)', () => {
      const result = calculateQuotationTotals({
        baseSupplierCost: 10000,
        markupPercent: 20, // 2000
        taxRule: {
          name: 'Transport 12% Slab',
          ratePercent: 12,
          isApplicable: true,
        },
      });

      expect(result.taxableAmount).toBe(12000);
      expect(result.taxRatePercent).toBe(12);
      expect(result.taxAmount).toBe(1440);
      expect(result.finalSellingPrice).toBe(13440);
      expect(result.projectedGrossProfit).toBe(2000);
    });

    it('should support tax-exempt quotations when permitted by admin configuration', () => {
      const result = calculateQuotationTotals({
        baseSupplierCost: 10000,
        markupAmount: 2000,
        isTaxApplicable: false,
      });

      expect(result.taxableAmount).toBe(12000);
      expect(result.taxAmount).toBe(0);
      expect(result.isTaxApplicable).toBe(false);
      expect(result.finalSellingPrice).toBe(12000);
      expect(result.projectedGrossProfit).toBe(2000);
    });

    it('should prevent negative costs or negative selling prices', () => {
      const result = calculateQuotationTotals({
        baseSupplierCost: -500,
        markupAmount: 0,
        discountAmount: 1000,
      });

      expect(result.totalBaseSupplierCost).toBe(0);
      expect(result.finalSellingPrice).toBe(0);
      expect(result.projectedGrossProfit).toBe(0);
    });
  });

  // ==========================================
  // PHASE 3: HOTEL STAY PRICING & OCCUPANCY
  // ==========================================
  describe('calculateHotelStayPricing', () => {
    const mockRoomCategory: any = {
      id: 'room-101',
      hotelId: 'hotel-001',
      name: 'Deluxe Heritage Room',
      baseOccupancy: 2,
      maxAdults: 3,
      maxChildren: 2,
      extraBedSupported: true,
      maxExtraBeds: 1,
      allowedMealPlans: ['RO', 'CP', 'MAP', 'AP'],
      isActive: true,
    };

    const mockRegularSeason: any = {
      id: 'season-reg',
      name: 'Summer Regular',
      seasonType: 'REGULAR',
      destinationId: 'dest-kashmir',
      startDate: '2026-05-01',
      endDate: '2026-06-30',
      priority: 10,
    };

    const mockPeakSeason: any = {
      id: 'season-peak',
      name: 'Tulip Festival Rush',
      seasonType: 'PEAK',
      destinationId: 'dest-kashmir',
      startDate: '2026-05-10',
      endDate: '2026-05-20',
      priority: 50,
    };

    const mockRateCards: any[] = [
      {
        id: 'rc-reg-map',
        hotelId: 'hotel-001',
        roomCategoryId: 'room-101',
        seasonId: 'season-reg',
        mealPlan: 'MAP',
        baseCostPerNight: 4000,
        extraAdultBedCost: 1000,
        childWithBedCost: 800,
        childWithoutBedCost: 400,
        standardSellingPrice: 6000,
        validFrom: '2026-05-01',
        validTo: '2026-06-30',
        isActive: true,
      },
      {
        id: 'rc-peak-map',
        hotelId: 'hotel-001',
        roomCategoryId: 'room-101',
        seasonId: 'season-peak',
        mealPlan: 'MAP',
        baseCostPerNight: 6500,
        extraAdultBedCost: 1500,
        childWithBedCost: 1200,
        childWithoutBedCost: 600,
        standardSellingPrice: 9000,
        validFrom: '2026-05-10',
        validTo: '2026-05-20',
        isActive: true,
      },
    ];

    it('should calculate multi-night stays with mid-stay seasonal transition and overlapping priority', () => {
      // 4-night stay from 2026-05-08 to 2026-05-12
      // Night 1 (May 08): REGULAR (Base 4000, Selling 6000)
      // Night 2 (May 09): REGULAR (Base 4000, Selling 6000)
      // Night 3 (May 10): PEAK (Base 6500, Selling 9000) -> Priority 50 overrides
      // Night 4 (May 11): PEAK (Base 6500, Selling 9000)
      const result = calculateHotelStayPricing({
        checkInDate: '2026-05-08',
        numberOfNights: 4,
        roomCategory: mockRoomCategory,
        mealPlan: 'MAP',
        numberOfRooms: 1,
        adultsCount: 2,
        candidateSeasons: [mockRegularSeason, mockPeakSeason],
        rateCards: mockRateCards,
      });

      expect(result.numberOfNights).toBe(4);
      expect(result.nightlyBreakdown[0]?.seasonType).toBe('REGULAR');
      expect(result.nightlyBreakdown[0]?.baseCostPerNight).toBe(4000);
      expect(result.nightlyBreakdown[1]?.seasonType).toBe('REGULAR');
      expect(result.nightlyBreakdown[2]?.seasonType).toBe('PEAK');
      expect(result.nightlyBreakdown[2]?.baseCostPerNight).toBe(6500);
      expect(result.nightlyBreakdown[3]?.seasonType).toBe('PEAK');

      // Total supplier cost = 4000 + 4000 + 6500 + 6500 = 21000
      expect(result.totalStaySupplierCost).toBe(21000);
      // Total selling = 6000 + 6000 + 9000 + 9000 = 30000
      expect(result.totalStayStandardSelling).toBe(30000);
    });

    it('should calculate extra adult beds and child without bed (CNB) within max extra bed limits', () => {
      // 2 nights in regular season: 1 room with 3 adults (1 extra) and 1 child without bed (CNB)
      // Base: 4000/night
      // Extra adult: 1000/night
      // Child without bed: 400/night
      // Night total supplier cost = 4000 + 1000 + 400 = 5400/night * 2 = 10800
      const result = calculateHotelStayPricing({
        checkInDate: '2026-05-01',
        numberOfNights: 2,
        roomCategory: mockRoomCategory,
        mealPlan: 'MAP',
        numberOfRooms: 1,
        adultsCount: 3,
        childrenWithoutBedCount: 1,
        candidateSeasons: [mockRegularSeason],
        rateCards: mockRateCards,
      });

      expect(result.totalExtraAdults).toBe(1);
      expect(result.totalChildrenWithoutBed).toBe(1);
      expect(result.nightlyBreakdown[0]?.totalNightSupplierCost).toBe(5400);
      expect(result.totalStaySupplierCost).toBe(10800);
    });

    it('should calculate extra adult bed and child with bed (CWB) when room supports 2 extra beds', () => {
      const familyRoom = {
        ...mockRoomCategory,
        maxAdults: 4,
        maxExtraBeds: 2,
      };

      // 2 nights: 3 adults (1 extra adult) + 1 child with bed (1 extra bed) = 2 extra beds total
      // Base: 4000 + Extra Adult: 1000 + Child with bed: 800 = 5800/night * 2 = 11600
      const result = calculateHotelStayPricing({
        checkInDate: '2026-05-01',
        numberOfNights: 2,
        roomCategory: familyRoom,
        mealPlan: 'MAP',
        numberOfRooms: 1,
        adultsCount: 3,
        childrenWithBedCount: 1,
        candidateSeasons: [mockRegularSeason],
        rateCards: mockRateCards,
      });

      expect(result.totalExtraAdults).toBe(1);
      expect(result.totalChildrenWithBed).toBe(1);
      expect(result.nightlyBreakdown[0]?.totalNightSupplierCost).toBe(5800);
      expect(result.totalStaySupplierCost).toBe(11600);
    });

    it('should reject meal plan when not compatible with room category', () => {
      const restrictedCategory = {
        ...mockRoomCategory,
        allowedMealPlans: ['CP', 'MAP'],
      };

      expect(() =>
        calculateHotelStayPricing({
          checkInDate: '2026-05-01',
          numberOfNights: 2,
          roomCategory: restrictedCategory,
          mealPlan: 'AP', // Disallowed
          numberOfRooms: 1,
          adultsCount: 2,
          candidateSeasons: [mockRegularSeason],
          rateCards: mockRateCards,
        })
      ).toThrow('Meal plan "AP" is not available for room category');
    });

    it('should reject when group size exceeds room category maximum limits', () => {
      // Exceeds maxAdults of 3 per room
      expect(() =>
        calculateHotelStayPricing({
          checkInDate: '2026-05-01',
          numberOfNights: 1,
          roomCategory: mockRoomCategory,
          mealPlan: 'MAP',
          numberOfRooms: 1,
          adultsCount: 5, // Exceeds max 3
          candidateSeasons: [mockRegularSeason],
          rateCards: mockRateCards,
        })
      ).toThrow('Adults count (5) exceeds maximum capacity');
    });

    it('should reject when extra bed is required but not supported', () => {
      const noExtraBedRoom = {
        ...mockRoomCategory,
        extraBedSupported: false,
        maxExtraBeds: 0,
      };

      expect(() =>
        calculateHotelStayPricing({
          checkInDate: '2026-05-01',
          numberOfNights: 1,
          roomCategory: noExtraBedRoom,
          mealPlan: 'MAP',
          numberOfRooms: 1,
          adultsCount: 3, // Requires 1 extra bed
          candidateSeasons: [mockRegularSeason],
          rateCards: mockRateCards,
        })
      ).toThrow('does not support extra beds');
    });

    it('should throw clear error when no matching seasonal rate card exists for a night', () => {
      expect(() =>
        calculateHotelStayPricing({
          checkInDate: '2026-07-15', // No season or rate card exists in July
          numberOfNights: 2,
          roomCategory: mockRoomCategory,
          mealPlan: 'MAP',
          numberOfRooms: 1,
          adultsCount: 2,
          candidateSeasons: [mockRegularSeason],
          rateCards: mockRateCards,
        })
      ).toThrow('No applicable rate card found for night 2026-07-15');
    });
  });

  // ==========================================
  // PHASE 3: TRANSPORT PRICING TARIFF BASES
  // ==========================================
  describe('calculateTransportPricing', () => {
    it('should calculate PER_DAY tariff with included km and extra km', () => {
      const perDayTariff: any = {
        id: 'tariff-per-day',
        vehicleCategory: 'SUV',
        tariffBasis: 'PER_DAY',
        baseSupplierCost: 3500,
        standardSellingRate: 5000,
        driverDailyAllowanceCost: 500,
        includedKmPerDay: 100,
        extraKmRate: 20,
        isTollParkingIncluded: false,
        isNightHaltIncluded: false,
      };

      // 3 days, total 350 km (included is 300 km -> 50 km extra @ 20 = 1000)
      // Driver allowance = 3 * 500 = 1500
      // Base supplier cost = 3 * 3500 = 10500
      // Total supplier cost = 10500 + 1500 + 1000 = 13000
      // Standard selling = 3 * 5000 + 1500 + 1000 = 17500
      const result = calculateTransportPricing({
        tariff: perDayTariff,
        numberOfDays: 3,
        totalEstimatedKm: 350,
      });

      expect(result.baseSupplierCost).toBe(10500);
      expect(result.driverAllowanceCost).toBe(1500);
      expect(result.extraKm).toBe(50);
      expect(result.extraKmCost).toBe(1000);
      expect(result.totalSupplierCost).toBe(13000);
      expect(result.totalStandardSelling).toBe(17500);
    });

    it('should calculate FIXED_CIRCUIT tariff with night halts and tolls', () => {
      const circuitTariff: any = {
        id: 'tariff-circuit',
        vehicleCategory: 'SUV',
        tariffBasis: 'FIXED_CIRCUIT',
        circuitName: 'Srinagar - Gulmarg - Pahalgam 5D',
        baseSupplierCost: 18000,
        standardSellingRate: 25000,
        driverDailyAllowanceCost: 500,
        isTollParkingIncluded: false,
        isNightHaltIncluded: false,
        nightHaltCharge: 600,
      };

      // 5 days, 2 night halts @ 600 = 1200, estimated toll = 800
      // Driver allowance = 5 * 500 = 2500
      // Total supplier = 18000 + 2500 + 1200 + 800 = 22500
      // Total selling = 25000 + 2500 + 1200 + 800 = 29500
      const result = calculateTransportPricing({
        tariff: circuitTariff,
        numberOfDays: 5,
        numberOfNightHalts: 2,
        estimatedTollParking: 800,
      });

      expect(result.baseSupplierCost).toBe(18000);
      expect(result.nightHaltCost).toBe(1200);
      expect(result.tollParkingCost).toBe(800);
      expect(result.driverAllowanceCost).toBe(2500);
      expect(result.totalSupplierCost).toBe(22500);
      expect(result.totalStandardSelling).toBe(29500);
    });

    it('should calculate PER_KM tariff with minimum daily mileage threshold', () => {
      const perKmTariff: any = {
        id: 'tariff-km',
        vehicleCategory: 'SEDAN',
        tariffBasis: 'PER_KM',
        baseSupplierCost: 15,
        standardSellingRate: 22,
        driverDailyAllowanceCost: 400,
        includedKmPerDay: 200, // Min 200 km/day
        isTollParkingIncluded: true,
        isNightHaltIncluded: true,
      };

      // 2 days: min km is 400 km. Estimated is 300 km -> billed for 400 km
      // Supplier cost = 400 * 15 = 6000 + 800 (allowance) = 6800
      // Selling rate = 400 * 22 = 8800 + 800 = 9600
      const result = calculateTransportPricing({
        tariff: perKmTariff,
        numberOfDays: 2,
        totalEstimatedKm: 300,
      });

      expect(result.billableKm).toBe(400);
      expect(result.totalSupplierCost).toBe(6800);
      expect(result.totalStandardSelling).toBe(9600);
    });

    it('should reject invalid negative inputs for transport calculations', () => {
      const mockTariff: any = {
        vehicleCategory: 'SEDAN',
        tariffBasis: 'PER_DAY',
        baseSupplierCost: 2000,
        standardSellingRate: 3000,
      };

      expect(() =>
        calculateTransportPricing({
          tariff: mockTariff,
          numberOfDays: 0,
        })
      ).toThrow('Transport duration (days) must be at least 1');

      expect(() =>
        calculateTransportPricing({
          tariff: mockTariff,
          numberOfDays: 2,
          totalEstimatedKm: -50,
        })
      ).toThrow('Estimated kilometres cannot be negative');
    });
  });

  describe('Precision Monetary Rounding Engine', () => {
    describe('roundHalfUp (Standard Commercial Half-Up Rounding)', () => {
      it('should round positive midpoints away from zero (half-up)', () => {
        expect(roundHalfUp(1.005, 2)).toBe(1.01);
        expect(roundHalfUp(1.004, 2)).toBe(1.0);
        expect(roundHalfUp(1.0051, 2)).toBe(1.01);
        expect(roundHalfUp(125.555, 2)).toBe(125.56);
        expect(roundHalfUp(125.554, 2)).toBe(125.55);
        expect(roundHalfUp(0.005, 2)).toBe(0.01);
        expect(roundHalfUp(0.004, 2)).toBe(0.0);
      });

      it('should round negative midpoints symmetrically away from zero', () => {
        expect(roundHalfUp(-1.005, 2)).toBe(-1.01);
        expect(roundHalfUp(-1.004, 2)).toBe(-1.0);
        expect(roundHalfUp(-125.555, 2)).toBe(-125.56);
        expect(roundHalfUp(-125.554, 2)).toBe(-125.55);
        expect(roundHalfUp(-0.005, 2)).toBe(-0.01);
      });

      it('should default to 2 decimal places and handle NaN/Infinity safely', () => {
        expect(roundHalfUp(10.555)).toBe(10.56);
        expect(roundHalfUp(NaN)).toBe(0);
        expect(roundHalfUp(Infinity)).toBe(0);
      });
    });

    describe('roundBankers (Round Half to Even)', () => {
      it('should round positive exact midpoints to the nearest even digit', () => {
        // 1.025: 2 is even -> 1.02
        expect(roundBankers(1.025, 2)).toBe(1.02);
        // 1.035: 3 is odd -> rounds to 4 -> 1.04
        expect(roundBankers(1.035, 2)).toBe(1.04);
        // Non-midpoints
        expect(roundBankers(1.026, 2)).toBe(1.03);
        expect(roundBankers(1.024, 2)).toBe(1.02);

        // Integer rounding
        expect(roundBankers(2.5, 0)).toBe(2); // 2 is even
        expect(roundBankers(3.5, 0)).toBe(4); // 3 is odd -> 4
      });

      it('should round negative exact midpoints symmetrically to the nearest even digit', () => {
        expect(roundBankers(-1.025, 2)).toBe(-1.02);
        expect(roundBankers(-1.035, 2)).toBe(-1.04);
        expect(roundBankers(-2.5, 0)).toBe(-2);
        expect(roundBankers(-3.5, 0)).toBe(-4);
      });
    });

    describe('roundCurrency (New Chirag Canonical Rule)', () => {
      it('should enforce standard commercial half-up rounding for all travel billing', () => {
        expect(roundCurrency(100.555)).toBe(100.56);
        expect(roundCurrency(100.554)).toBe(100.55);
        expect(roundCurrency(999.005)).toBe(999.01);
      });
    });
  });

  describe('Meal Plan Canonicalization & Backward Compatibility (RO vs EP)', () => {
    const mockRoomCategory: any = {
      id: 'rc-1',
      hotelId: 'h-1',
      name: 'Deluxe Room',
      baseOccupancy: 2,
      maxAdults: 3,
      maxChildren: 2,
      extraBedSupported: true,
      maxExtraBeds: 1,
      allowedMealPlans: ['RO', 'CP', 'MAP'],
    };

    it('should normalize EP to RO in normalizeMealPlan', () => {
      expect(normalizeMealPlan('EP')).toBe('RO');
      expect(normalizeMealPlan('ep')).toBe('RO');
      expect(normalizeMealPlan('RO')).toBe('RO');
      expect(normalizeMealPlan('CP')).toBe('CP');
      expect(normalizeMealPlan('MAP')).toBe('MAP');
      expect(normalizeMealPlan('AP')).toBe('AP');
    });

    it('should allow EP input in validateRoomOccupancy when allowedMealPlans has RO', () => {
      // EP is accepted and does not throw
      const resultEP = validateRoomOccupancy(mockRoomCategory, 1, 2, 0, 0, 'EP');
      expect(resultEP.extraAdults).toBe(0);

      // RO is also accepted
      const resultRO = validateRoomOccupancy(mockRoomCategory, 1, 2, 0, 0, 'RO');
      expect(resultRO.extraAdults).toBe(0);
    });

    it('should produce identical pricing and return canonical RO whether EP or RO is supplied', () => {
      const mockSeasons: any[] = [
        {
          id: 's-reg',
          name: 'Regular Season',
          type: 'REGULAR',
          startDate: '2026-11-01',
          endDate: '2026-11-30',
          priority: 1,
          isActive: true,
        },
      ];

      const mockRateCards: any[] = [
        {
          id: 'rc-card-1',
          roomCategoryId: 'rc-1',
          seasonId: 's-reg',
          mealPlan: 'RO',
          baseCostPerNight: 3000,
          standardSellingPrice: 4000,
          extraAdultBedCost: 800,
          childWithBedCost: 500,
          childWithoutBedCost: 200,
          isActive: true,
        },
      ];

      const calcRO = calculateHotelStayPricing({
        checkInDate: '2026-11-10',
        numberOfNights: 2,
        roomCategory: mockRoomCategory,
        mealPlan: 'RO',
        numberOfRooms: 1,
        adultsCount: 2,
        candidateSeasons: mockSeasons,
        rateCards: mockRateCards,
      });

      const calcEP = calculateHotelStayPricing({
        checkInDate: '2026-11-10',
        numberOfNights: 2,
        roomCategory: mockRoomCategory,
        mealPlan: 'EP',
        numberOfRooms: 1,
        adultsCount: 2,
        candidateSeasons: mockSeasons,
        rateCards: mockRateCards,
      });

      // Both must calculate identical costs
      expect(calcRO.totalStaySupplierCost).toBe(6000);
      expect(calcEP.totalStaySupplierCost).toBe(6000);
      expect(calcRO.totalStayStandardSelling).toBe(8000);
      expect(calcEP.totalStayStandardSelling).toBe(8000);

      // Both must return canonical 'RO'
      expect(calcRO.mealPlan).toBe('RO');
      expect(calcEP.mealPlan).toBe('RO');
    });
  });
});

