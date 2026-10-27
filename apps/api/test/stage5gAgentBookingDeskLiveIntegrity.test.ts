import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BookingModel } from '../src/models/booking.model';
import { CustomerModel } from '../src/models/customer.model';
import { DestinationModel } from '../src/models/destination.model';
import { HotelModel } from '../src/models/hotel.model';
import { HotelReservationModel } from '../src/models/hotelReservation.model';
import { LeadModel } from '../src/models/lead.model';
import { PaymentRecordModel } from '../src/models/paymentRecord.model';
import { QuotationModel } from '../src/models/quotation.model';
import { RoomCategoryModel } from '../src/models/roomCategory.model';
import { TransportAssignmentModel } from '../src/models/transportAssignment.model';
import { UserModel } from '../src/models/user.model';
import { authService } from '../src/services/auth.service';
import { bookingService } from '../src/services/booking.service';
import { operationsService } from '../src/services/operations.service';
import { paymentService } from '../src/services/payment.service';

const testDbName = `chirag_test_phase_c_agent_booking_${Date.now()}`;
const testMongoUri = `mongodb://localhost:27017/${testDbName}`;

describe('Phase C: Agent Bookings, Payment Requests & Booking Workflow Live MongoDB Integrity', () => {
  let agentAUser: any;
  let agentBUser: any;
  let adminUser: any;
  let customerA: any;
  let customerB: any;
  let destinationKashmir: any;
  let hotelPahalgam: any;
  let roomCatDeluxe: any;
  let bookingA: any;
  let bookingB: any;

  const agentAActor = {
    userId: '',
    role: 'AGENT' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'AgentWebTestRunner/1.0',
  };

  const agentBActor = {
    userId: '',
    role: 'AGENT' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'AgentWebTestRunner/1.0',
  };

  const adminActor = {
    userId: '',
    role: 'ADMIN' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'AgentWebTestRunner/1.0',
  };

  beforeAll(async () => {
    await mongoose.connect(testMongoUri);

    await Promise.all([
      UserModel.syncIndexes(),
      CustomerModel.syncIndexes(),
      BookingModel.syncIndexes(),
      PaymentRecordModel.syncIndexes(),
      HotelReservationModel.syncIndexes(),
      TransportAssignmentModel.syncIndexes(),
    ]);

    // 1. Create Admin User
    adminUser = await UserModel.create({
      fullName: 'Faisal Bikanerwala',
      mobile: '9811100001',
      passwordHash: await authService.hashPassword('AdminPass@2026!'),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminActor.userId = adminUser._id.toString();

    // 2. Create Agent A
    agentAUser = await UserModel.create({
      fullName: 'Agent Tariq Bhat',
      mobile: '9811100002',
      passwordHash: await authService.hashPassword('DemoAgent@2026!'),
      role: 'AGENT',
      status: 'ACTIVE',
      agentProfile: {
        agencyName: 'Tariq Travel Desk Srinagar',
        city: 'Srinagar',
        commissionRatePercent: 10,
        maxDiscountPercent: 5,
        maxMarkupPercent: 20,
        canApproveFinalPrice: false,
      },
    });
    agentAActor.userId = agentAUser._id.toString();

    // 3. Create Agent B
    agentBUser = await UserModel.create({
      fullName: 'Agent Meena Kumari',
      mobile: '9811100003',
      passwordHash: await authService.hashPassword('DemoAgent@2026!'),
      role: 'AGENT',
      status: 'ACTIVE',
      agentProfile: {
        agencyName: 'Meena Travel Desk Jammu',
        city: 'Jammu',
        commissionRatePercent: 8,
        maxDiscountPercent: 5,
        maxMarkupPercent: 15,
        canApproveFinalPrice: false,
      },
    });
    agentBActor.userId = agentBUser._id.toString();

    // 4. Create Customers
    customerA = await CustomerModel.create({
      fullName: 'Sanjay Kapoor',
      mobile: '9822200001',
      email: 'sanjay.kapoor@example.com',
      assignedAgentId: agentAUser._id,
      createdBy: agentAUser._id,
    });

    customerB = await CustomerModel.create({
      fullName: 'Vikram Seth',
      mobile: '9822200002',
      email: 'vikram.seth@example.com',
      assignedAgentId: agentBUser._id,
      createdBy: agentBUser._id,
    });

    // 5. Create Master Data
    destinationKashmir = await DestinationModel.create({
      name: 'Kashmir Valley & Gulmarg',
      slug: 'kashmir-valley-gulmarg',
      region: 'NORTH',
      state: 'Jammu & Kashmir',
      isActive: true,
      popularAttractions: ['Dal Lake', 'Gulmarg Gondola', 'Pahalgam'],
    });

    hotelPahalgam = await HotelModel.create({
      destinationId: destinationKashmir._id,
      name: 'Pine Spring Pahalgam',
      city: 'Pahalgam',
      starRating: 4,
      propertyType: 'RESORT',
      isActive: true,
      amenities: ['Heating', 'Restaurant', 'WiFi'],
    });

    roomCatDeluxe = await RoomCategoryModel.create({
      hotelId: hotelPahalgam._id,
      name: 'Deluxe Valley View',
      baseCapacityAdults: 2,
      maxCapacityAdults: 3,
      maxCapacityChildren: 1,
      isActive: true,
    });

    // 5b. Create Leads
    const leadA = await LeadModel.create({
      leadNumber: 'NCT-LD-2026-00001',
      customerId: customerA._id,
      destinationId: destinationKashmir._id,
      numberOfAdults: 2,
      numberOfChildren: 1,
      source: 'AGENT',
      status: 'CONVERTED',
      assignedAgentId: agentAUser._id,
      createdBy: agentAUser._id,
    });

    const leadB = await LeadModel.create({
      leadNumber: 'NCT-LD-2026-00002',
      customerId: customerB._id,
      destinationId: destinationKashmir._id,
      numberOfAdults: 2,
      numberOfChildren: 0,
      source: 'AGENT',
      status: 'CONVERTED',
      assignedAgentId: agentBUser._id,
      createdBy: agentBUser._id,
    });

    const quoteAId = new mongoose.Types.ObjectId();
    const quoteBId = new mongoose.Types.ObjectId();

    // 6. Create Seed Bookings
    bookingA = await BookingModel.create({
      bookingNumber: 'NCT-BK-2026-00001',
      quotationId: quoteAId,
      quotationVersionUsed: 1,
      leadId: leadA._id,
      customerId: customerA._id,
      assignedAgentId: agentAUser._id,
      destinationId: destinationKashmir._id,
      travelStartDate: new Date('2026-11-10'),
      travelEndDate: new Date('2026-11-15'),
      durationNights: 5,
      durationDays: 6,
      numberOfAdults: 2,
      numberOfChildren: 1,
      numberOfInfants: 0,
      status: 'QUOTE_ACCEPTED',
      financials: {
        totalAmount: 75000,
        totalAmountInPaise: 7500000,
        currency: 'INR',
        advanceRequired: 25000,
        advanceRequiredInPaise: 2500000,
        totalPaid: 0,
        totalPaidInPaise: 0,
        balancePending: 75000,
        balancePendingInPaise: 7500000,
        supplierCostTotal: 52000,
        supplierCostTotalInPaise: 5200000,
        realizedGrossProfit: 23000,
      },
      itinerarySnapshot: {
        hotels: [
          {
            hotelId: hotelPahalgam._id,
            hotelName: 'Pine Spring Pahalgam',
            roomCategoryId: roomCatDeluxe._id,
            roomCategoryName: 'Deluxe Valley View',
            numberOfRooms: 1,
            numberOfNights: 5,
            mealPlan: 'CP',
            supplierCost: 35000,
          },
        ],
        transports: [
          {
            vehicleCategory: 'SEDAN',
            vehicleModel: 'Toyota Etios AC',
            serviceType: 'Tour Circuit Dedicated Chauffeur',
          },
        ],
      },
    });

    bookingB = await BookingModel.create({
      bookingNumber: 'NCT-BK-2026-00002',
      quotationId: quoteBId,
      quotationVersionUsed: 1,
      leadId: leadB._id,
      customerId: customerB._id,
      assignedAgentId: agentBUser._id,
      destinationId: destinationKashmir._id,
      travelStartDate: new Date('2026-12-01'),
      travelEndDate: new Date('2026-12-05'),
      durationNights: 4,
      durationDays: 5,
      numberOfAdults: 2,
      numberOfChildren: 0,
      numberOfInfants: 0,
      status: 'QUOTE_ACCEPTED',
      financials: {
        totalAmount: 60000,
        totalAmountInPaise: 6000000,
        currency: 'INR',
        advanceRequired: 20000,
        advanceRequiredInPaise: 2000000,
        totalPaid: 0,
        totalPaidInPaise: 0,
        balancePending: 60000,
        balancePendingInPaise: 6000000,
        supplierCostTotal: 40000,
        supplierCostTotalInPaise: 4000000,
        realizedGrossProfit: 20000,
      },
    });

    // Initialize operations for bookingA
    await operationsService.initializeBookingOperations(bookingA._id.toString(), agentAActor);
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  });

  describe('1. Booking Desk Scoping & RBAC', () => {
    it('allows Agent A to list only bookings assigned to Agent A', async () => {
      const res = await bookingService.listBookings({}, agentAActor);
      expect(res.bookings.length).toBe(1);
      expect(res.bookings[0].bookingNumber).toBe('NCT-BK-2026-00001');
      expect(res.bookings[0].assignedAgentId).toBe(agentAUser._id.toString());
    });

    it('prevents Agent B from seeing Agent A bookings in list', async () => {
      const res = await bookingService.listBookings({}, agentBActor);
      expect(res.bookings.length).toBe(1);
      expect(res.bookings[0].bookingNumber).toBe('NCT-BK-2026-00002');
      expect(res.bookings[0].assignedAgentId).toBe(agentBUser._id.toString());
    });

    it('allows Admin to list all bookings across all agents', async () => {
      const res = await bookingService.listBookings({}, adminActor);
      expect(res.bookings.length).toBe(2);
    });

    it('allows Agent A to retrieve Agent A booking details by ID', async () => {
      const booking = await bookingService.getBookingById(bookingA._id.toString(), agentAActor);
      expect(booking.bookingNumber).toBe('NCT-BK-2026-00001');
      expect(booking.status).toBe('QUOTE_ACCEPTED');
    });

    it('strictly forbids Agent B from retrieving Agent A booking by ID (HTTP 403)', async () => {
      await expect(
        bookingService.getBookingById(bookingA._id.toString(), agentBActor)
      ).rejects.toThrow(/not authorized to access this booking/i);
    });

    it('strictly forbids Agent from updating booking status (HTTP 403 Forbidden)', async () => {
      await expect(
        bookingService.updateBookingStatus(
          bookingA._id.toString(),
          { status: 'CONFIRMED' },
          agentAActor
        )
      ).rejects.toThrow(/only administrators can update booking statuses/i);
    });

    it('masks confidential supplier cost and profit margins for Agent role', async () => {
      const agentDto = await bookingService.getBookingById(bookingA._id.toString(), agentAActor);
      expect(agentDto.financials.supplierCostTotal).toBeUndefined();
      expect(agentDto.financials.supplierCostTotalInPaise).toBeUndefined();
      expect(agentDto.financials.realizedGrossProfit).toBeUndefined();

      const adminDto = await bookingService.getBookingById(bookingA._id.toString(), adminActor);
      expect(adminDto.financials.supplierCostTotal).toBe(52000);
      expect(adminDto.financials.realizedGrossProfit).toBe(23000);
    });
  });

  describe('2. Agent Payment Submission & Ledger Invariants', () => {
    let recordedPaymentA: any;

    it('allows Agent A to record a payment submission against authorized booking', async () => {
      recordedPaymentA = await paymentService.recordPayment(
        {
          bookingId: bookingA._id.toString(),
          amount: 25000,
          paymentType: 'ADVANCE',
          paymentMethod: 'UPI',
          transactionReference: 'UPI-7788990011',
          notes: 'Customer transferred advance via GPay',
          idempotencyKey: 'idemp-test-pay-001',
        },
        agentAActor
      );

      expect(recordedPaymentA.status).toBe('SUBMITTED');
      expect(recordedPaymentA.amount).toBe(25000);
      expect(recordedPaymentA.amountInPaise).toBe(2500000);
      expect(recordedPaymentA.receiptNumber).toMatch(/^NCT-RCT-\d{4}-\d{5}$/);
      expect(recordedPaymentA.isRefund).toBe(false);
    });

    it('strictly forbids Agent B from recording payment against Agent A booking (HTTP 403)', async () => {
      await expect(
        paymentService.recordPayment(
          {
            bookingId: bookingA._id.toString(),
            amount: 10000,
            paymentType: 'PARTIAL',
            paymentMethod: 'CASH',
          },
          agentBActor
        )
      ).rejects.toThrow(/not authorized to record payments for this booking/i);
    });

    it('verifies SUBMITTED payment does NOT increase verified paid totals or alter balance pending', async () => {
      const freshBooking = await BookingModel.findById(bookingA._id);
      expect(freshBooking?.financials.totalPaid).toBe(0);
      expect(freshBooking?.financials.totalPaidInPaise).toBe(0);
      expect(freshBooking?.financials.balancePending).toBe(75000);
      expect(freshBooking?.financials.balancePendingInPaise).toBe(7500000);

      // Verify payment ledger query
      const ledger = await paymentService.getPaymentsForBooking(bookingA._id.toString(), agentAActor);
      expect(ledger.payments.length).toBe(1);
      expect(ledger.payments[0].status).toBe('SUBMITTED');
      expect(ledger.summary.totalPaid).toBe(0);
      expect(ledger.summary.netPaid).toBe(0);
      expect(ledger.summary.balancePending).toBe(75000);
    });

    it('idempotently handles duplicate payment submission with same idempotency key', async () => {
      const retry = await paymentService.recordPayment(
        {
          bookingId: bookingA._id.toString(),
          amount: 25000,
          paymentType: 'ADVANCE',
          paymentMethod: 'UPI',
          transactionReference: 'UPI-7788990011',
          idempotencyKey: 'idemp-test-pay-001',
        },
        agentAActor
      );

      expect(retry.id).toBe(recordedPaymentA.id);
      expect(retry.receiptNumber).toBe(recordedPaymentA.receiptNumber);

      const allRecords = await PaymentRecordModel.find({ bookingId: bookingA._id });
      expect(allRecords.length).toBe(1);
    });

    it('detects mismatched payload with same idempotency key and rejects with 409 Conflict', async () => {
      await expect(
        paymentService.recordPayment(
          {
            bookingId: bookingA._id.toString(),
            amount: 30000, // Different amount
            paymentType: 'ADVANCE',
            paymentMethod: 'UPI',
            idempotencyKey: 'idemp-test-pay-001',
          },
          agentAActor
        )
      ).rejects.toThrow(/already used for a different payment request/i);
    });

    it('strictly forbids Agent from verifying submitted payments (HTTP 403 Forbidden)', async () => {
      await expect(
        paymentService.verifyPayment(recordedPaymentA.id, agentAActor)
      ).rejects.toThrow(/only administrators can verify payments/i);
    });

    it('updates authoritative booking financials when Admin verifies the payment', async () => {
      const verified = await paymentService.verifyPayment(recordedPaymentA.id, adminActor);
      expect(verified.status).toBe('VERIFIED');
      expect(verified.verifiedBy).toBe(adminActor.userId);

      const updatedBooking = await BookingModel.findById(bookingA._id);
      expect(updatedBooking?.financials.totalPaid).toBe(25000);
      expect(updatedBooking?.financials.totalPaidInPaise).toBe(2500000);
      expect(updatedBooking?.financials.balancePending).toBe(50000);
      expect(updatedBooking?.financials.balancePendingInPaise).toBe(5000000);

      const ledger = await paymentService.getPaymentsForBooking(bookingA._id.toString(), agentAActor);
      expect(ledger.summary.totalPaid).toBe(25000);
      expect(ledger.summary.netPaid).toBe(25000);
      expect(ledger.summary.balancePending).toBe(50000);
    });
  });

  describe('3. Agent Refund Request Workflow & Headroom Safety', () => {
    let verifiedPaymentDoc: any;
    let submittedRefund: any;

    beforeAll(async () => {
      verifiedPaymentDoc = await PaymentRecordModel.findOne({
        bookingId: bookingA._id,
        status: 'VERIFIED',
      });
    });

    it('strictly forbids Agent B from requesting refund on Agent A booking (HTTP 403)', async () => {
      await expect(
        paymentService.recordRefund(
          {
            bookingId: bookingA._id.toString(),
            originalPaymentId: verifiedPaymentDoc._id.toString(),
            amount: 5000,
            refundReason: 'Customer requested cancellation',
          },
          agentBActor
        )
      ).rejects.toThrow(/not authorized to request refunds for this booking/i);
    });

    it('strictly forbids refund request exceeding available verified payment headroom', async () => {
      await expect(
        paymentService.recordRefund(
          {
            bookingId: bookingA._id.toString(),
            originalPaymentId: verifiedPaymentDoc._id.toString(),
            amount: 30000, // Exceeds 25000
            refundReason: 'Exorbitant refund request',
          },
          agentAActor
        )
      ).rejects.toThrow(/exceeds the remaining refundable amount/i);
    });

    it('allows Agent A to submit refund request with atomic reservation of headroom', async () => {
      submittedRefund = await paymentService.recordRefund(
        {
          bookingId: bookingA._id.toString(),
          originalPaymentId: verifiedPaymentDoc._id.toString(),
          amount: 5000,
          refundReason: 'Customer adjusted package options',
          idempotencyKey: 'idemp-ref-001',
        },
        agentAActor
      );

      expect(submittedRefund.status).toBe('SUBMITTED');
      expect(submittedRefund.isRefund).toBe(true);
      expect(submittedRefund.amount).toBe(5000);
      expect(submittedRefund.amountInPaise).toBe(500000);

      // Verify original payment allocatedRefundPaise is reserved atomically
      const refreshedOriginal = await PaymentRecordModel.findById(verifiedPaymentDoc._id);
      expect(refreshedOriginal?.allocatedRefundPaise).toBe(500000);
    });

    it('blocks subsequent refund request that would exceed remaining unallocated headroom', async () => {
      // Remaining headroom is 25000 - 5000 = 20000
      await expect(
        paymentService.recordRefund(
          {
            bookingId: bookingA._id.toString(),
            originalPaymentId: verifiedPaymentDoc._id.toString(),
            amount: 21000, // Exceeds 20000
            refundReason: 'Attempting to exceed remaining reserved headroom',
          },
          agentAActor
        )
      ).rejects.toThrow(/exceeds the remaining refundable amount/i);
    });

    it('unverified refund request does NOT alter verified ledger totals', async () => {
      const ledger = await paymentService.getPaymentsForBooking(bookingA._id.toString(), agentAActor);
      expect(ledger.summary.totalPaid).toBe(25000);
      expect(ledger.summary.totalRefunded).toBe(0);
      expect(ledger.summary.netPaid).toBe(25000);
    });

    it('strictly forbids Agent from verifying or approving refund request (HTTP 403 Forbidden)', async () => {
      await expect(
        paymentService.verifyPayment(submittedRefund.id, agentAActor)
      ).rejects.toThrow(/only administrators can verify payments/i);
    });

    it('releases reserved refund paise on original payment if Admin rejects refund', async () => {
      const rejected = await paymentService.rejectPayment(
        submittedRefund.id,
        'Refund policy window expired for this booking',
        adminActor
      );

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.rejectionReason).toBe('Refund policy window expired for this booking');

      // Headroom released on original payment record
      const refreshedOriginal = await PaymentRecordModel.findById(verifiedPaymentDoc._id);
      expect(refreshedOriginal?.allocatedRefundPaise).toBe(0);
    });
  });

  describe('4. Operational Readiness Read-Only Scoping', () => {
    it('allows Agent A to view read-only operational summary for Agent A booking', async () => {
      const summary = await operationsService.getOperationalSummary(
        bookingA._id.toString(),
        agentAActor
      );

      expect(summary.bookingNumber).toBe('NCT-BK-2026-00001');
      expect(summary.hotelReservations.length).toBeGreaterThan(0);
      expect(summary.transportAssignments.length).toBeGreaterThan(0);
      expect(typeof summary.operationalReadinessPercent).toBe('number');

      // Masked supplier cost for Agent
      expect(summary.hotelReservations[0].supplierCost).toBeUndefined();
    });

    it('strictly forbids Agent B from viewing operational summary for Agent A booking (HTTP 403)', async () => {
      await expect(
        operationsService.getOperationalSummary(bookingA._id.toString(), agentBActor)
      ).rejects.toThrow(/not authorized to view operations for this booking/i);
    });

    it('strictly forbids Agent from dispatching transport or reissuing duty slips', async () => {
      const assignments = await TransportAssignmentModel.find({ bookingId: bookingA._id });
      expect(assignments.length).toBeGreaterThan(0);
      const assignmentId = assignments[0]._id.toString();

      await expect(
        operationsService.dispatchTransport(
          assignmentId,
          { odometerStartKm: 12000 },
          agentAActor as any
        )
      ).rejects.toThrow(/only administrators can dispatch/i);
    });
  });

  describe('5. Concurrency & Race-Condition Invariants Matrix', () => {
    let raceTestPayment: any;

    beforeAll(async () => {
      // Record and verify a fresh ₹20,000 payment for concurrency testing
      const submitted = await paymentService.recordPayment(
        {
          bookingId: bookingA._id.toString(),
          amount: 20000,
          paymentType: 'PARTIAL',
          paymentMethod: 'NEFT_IMPS',
          transactionReference: 'NEFT-CONCUR-20K',
          idempotencyKey: 'idemp-concur-base',
        },
        agentAActor
      );
      raceTestPayment = await paymentService.verifyPayment(submitted.id, adminActor);
    });

    it('Scenario 1: Two concurrent refund requests whose combined total is within headroom both succeed', async () => {
      // Payment has 20,000 headroom. Two concurrent requests: 6,000 and 8,000 (total 14,000 <= 20,000)
      const [res1, res2] = await Promise.all([
        paymentService.recordRefund(
          {
            bookingId: bookingA._id.toString(),
            originalPaymentId: raceTestPayment.id,
            amount: 6000,
            refundReason: 'Concurrent refund request A',
            idempotencyKey: 'concur-ref-1',
          },
          agentAActor
        ),
        paymentService.recordRefund(
          {
            bookingId: bookingA._id.toString(),
            originalPaymentId: raceTestPayment.id,
            amount: 8000,
            refundReason: 'Concurrent refund request B',
            idempotencyKey: 'concur-ref-2',
          },
          agentAActor
        ),
      ]);

      expect(res1.status).toBe('SUBMITTED');
      expect(res2.status).toBe('SUBMITTED');
      expect(res1.amount + res2.amount).toBe(14000);

      // Verify atomic sum on original payment document
      const doc = await PaymentRecordModel.findById(raceTestPayment.id);
      expect(doc?.allocatedRefundPaise).toBe(1400000); // 14,000 in paise
    });

    it('Scenario 2: Two concurrent requests whose combined total exceeds remaining headroom: exactly one succeeds, one fails', async () => {
      // Remaining headroom is 20,000 - 14,000 = 6,000.
      // Issue two concurrent requests of 5,000 each (total 10,000 > 6,000)
      const results = await Promise.allSettled([
        paymentService.recordRefund(
          {
            bookingId: bookingA._id.toString(),
            originalPaymentId: raceTestPayment.id,
            amount: 5000,
            refundReason: 'Concurrent competing request C1',
            idempotencyKey: 'concur-ref-3',
          },
          agentAActor
        ),
        paymentService.recordRefund(
          {
            bookingId: bookingA._id.toString(),
            originalPaymentId: raceTestPayment.id,
            amount: 5000,
            refundReason: 'Concurrent competing request C2',
            idempotencyKey: 'concur-ref-4',
          },
          agentAActor
        ),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Invariant: Exactly one must succeed and one must be rejected by atomic $expr $lte
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      const errReason = (rejected[0] as PromiseRejectedResult).reason;
      expect(errReason.message).toMatch(/exceeds the remaining refundable amount/i);

      // Invariant: Total allocated paise must be 14,000 + 5,000 = 19,000 <= 20,000
      const doc = await PaymentRecordModel.findById(raceTestPayment.id);
      expect(doc?.allocatedRefundPaise).toBe(1900000);
    });

    it('Scenario 3: Concurrent Admin verification on the same payment cannot double-credit ledger', async () => {
      // Create a fresh submitted payment
      const sub = await paymentService.recordPayment(
        {
          bookingId: bookingA._id.toString(),
          amount: 5000,
          paymentType: 'PARTIAL',
          paymentMethod: 'CASH',
          idempotencyKey: 'idemp-double-verify-test',
        },
        agentAActor
      );

      const bookingBefore = await BookingModel.findById(bookingA._id);
      const paidBeforeInPaise = bookingBefore?.financials.totalPaidInPaise || 0;

      // Two simultaneous verification calls
      const results = await Promise.allSettled([
        paymentService.verifyPayment(sub.id, adminActor),
        paymentService.verifyPayment(sub.id, adminActor),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // One must succeed, one must reject (either 400 Bad Request or state change conflict)
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // Invariant: totalPaidInPaise increases by EXACTLY 5,000 (500,000 paise), never 10,000
      const bookingAfter = await BookingModel.findById(bookingA._id);
      expect(bookingAfter?.financials.totalPaidInPaise).toBe(paidBeforeInPaise + 500000);
    });

    it('Scenario 4: Concurrent duplicate payment submission with same idempotency key creates exactly one persistent record', async () => {
      const results = await Promise.all([
        paymentService.recordPayment(
          {
            bookingId: bookingA._id.toString(),
            amount: 3500,
            paymentType: 'PARTIAL',
            paymentMethod: 'UPI',
            idempotencyKey: 'idemp-race-exact-001',
          },
          agentAActor
        ),
        paymentService.recordPayment(
          {
            bookingId: bookingA._id.toString(),
            amount: 3500,
            paymentType: 'PARTIAL',
            paymentMethod: 'UPI',
            idempotencyKey: 'idemp-race-exact-001',
          },
          agentAActor
        ),
      ]);

      expect(results[0].id).toBe(results[1].id);
      expect(results[0].receiptNumber).toBe(results[1].receiptNumber);

      const recordsInDb = await PaymentRecordModel.find({ idempotencyKey: 'idemp-race-exact-001' });
      expect(recordsInDb.length).toBe(1);
    });

    it('Scenario 5: Admin recovery reconciliation self-heals orphaned refund reservations', async () => {
      // Artificially corrupt allocatedRefundPaise to simulate process crash between reservation and record
      await PaymentRecordModel.updateOne(
        { _id: raceTestPayment.id },
        { $set: { allocatedRefundPaise: 2000000 } } // 20,000 allocated (0 headroom)
      );

      // Reconcile allocations
      const healResult = await paymentService.reconcileRefundAllocations(
        raceTestPayment.id,
        adminActor
      );

      expect(healResult.healed).toBe(true);
      // Reconciled paise equals active refunds created in Scenario 1 (6k + 8k) + Scenario 2 (5k) = 19k (1,900,000 paise)
      expect(healResult.reconciledPaise).toBe(1900000);
      expect(healResult.headroomPaise).toBe(100000); // 1,000 headroom restored!

      const doc = await PaymentRecordModel.findById(raceTestPayment.id);
      expect(doc?.allocatedRefundPaise).toBe(1900000);
    });
  });
});
