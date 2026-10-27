import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BookingModel } from '../src/models/booking.model';
import { CustomerModel } from '../src/models/customer.model';
import { DestinationModel } from '../src/models/destination.model';
import { DriverModel } from '../src/models/driver.model';
import { HotelModel } from '../src/models/hotel.model';
import { HotelReservationModel } from '../src/models/hotelReservation.model';
import { LeadModel } from '../src/models/lead.model';
import { PaymentRecordModel } from '../src/models/paymentRecord.model';
import { QuotationModel } from '../src/models/quotation.model';
import { RoomCategoryModel } from '../src/models/roomCategory.model';
import { TransportAssignmentModel } from '../src/models/transportAssignment.model';
import { UserModel } from '../src/models/user.model';
import { VehicleModel } from '../src/models/vehicle.model';
import { VehicleVendorModel } from '../src/models/vehicleVendor.model';
import { authService } from '../src/services/auth.service';
import { bookingService } from '../src/services/booking.service';
import { operationsService } from '../src/services/operations.service';
import { paymentService } from '../src/services/payment.service';
import {
  MAX_MONETARY_RUPEES,
  monetaryAmountSchema,
  recordPaymentSchema,
  recordRefundSchema,
  verifyPaymentSchema,
} from '@chirag/validation';

const testDbName = `chirag_test_phase_c1_financial_${Date.now()}`;
const testMongoUri = `mongodb://localhost:27017/${testDbName}`;

describe('Phase C.1: Financial Ledger Consistency & Refund Settlement Gate Live Tests', () => {
  let adminUser: any;
  let agentAUser: any;
  let agentBUser: any;
  let customer: any;
  let destination: any;
  let testDriver: any;
  let testVehicle: any;
  let bookingTotal50k: any;

  const adminActor = {
    userId: '',
    role: 'ADMIN' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'PhaseC1TestRunner/1.0',
  };

  const agentAActor = {
    userId: '',
    role: 'AGENT' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'PhaseC1TestRunner/1.0',
  };

  const agentBActor = {
    userId: '',
    role: 'AGENT' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'PhaseC1TestRunner/1.0',
  };

  beforeAll(async () => {
    await mongoose.connect(testMongoUri);

    await Promise.all([
      UserModel.syncIndexes(),
      CustomerModel.syncIndexes(),
      BookingModel.syncIndexes(),
      PaymentRecordModel.syncIndexes(),
      DriverModel.syncIndexes(),
      VehicleModel.syncIndexes(),
      TransportAssignmentModel.syncIndexes(),
    ]);

    // 1. Users
    adminUser = await UserModel.create({
      fullName: 'Admin Chirag',
      mobile: '9811100010',
      passwordHash: await authService.hashPassword('AdminPass@2026!'),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminActor.userId = adminUser._id.toString();

    agentAUser = await UserModel.create({
      fullName: 'Agent Altaf',
      mobile: '9811100011',
      passwordHash: await authService.hashPassword('DemoAgent@2026!'),
      role: 'AGENT',
      status: 'ACTIVE',
    });
    agentAActor.userId = agentAUser._id.toString();

    agentBUser = await UserModel.create({
      fullName: 'Agent Bilquis',
      mobile: '9811100012',
      passwordHash: await authService.hashPassword('DemoAgent@2026!'),
      role: 'AGENT',
      status: 'ACTIVE',
    });
    agentBActor.userId = agentBUser._id.toString();

    // 2. Customer
    customer = await CustomerModel.create({
      fullName: 'Ramesh Patel',
      mobile: '9822200001',
      email: 'ramesh.patel@example.com',
      city: 'Ahmedabad',
      state: 'Gujarat',
      leadSource: 'REFERRAL',
      assignedAgentId: agentAUser._id,
      createdBy: agentAUser._id,
    });

    // 3. Destination
    destination = await DestinationModel.create({
      name: 'Kashmir Paradise Valley',
      slug: 'kashmir-paradise-valley',
      region: 'NORTH',
      state: 'Jammu and Kashmir',
      description: 'Scenic valleys of Pahalgam and Gulmarg',
      isActive: true,
    });

    // 4. Vendor, Driver and Vehicle
    const testVendor = await VehicleVendorModel.create({
      businessName: 'Royal Kashmir Cabs',
      contactPerson: 'Farooq Ahmad',
      phone: '+919419011111',
      isActive: true,
    });

    testDriver = await DriverModel.create({
      vendorId: testVendor._id,
      fullName: 'Ghulam Rasool',
      mobile: '9419000001',
      licenseNumber: 'JK01-20150009988',
      licenseExpiry: new Date(Date.now() + 86400000 * 365),
      status: 'ACTIVE',
    });

    testVehicle = await VehicleModel.create({
      vendorId: testVendor._id,
      model: 'Toyota Innova Crysta',
      category: 'SUV',
      registrationNumber: 'JK01AB1234',
      seatingCapacity: 6,
      hasAC: true,
      insuranceExpiry: new Date(Date.now() + 86400000 * 365),
      status: 'AVAILABLE',
    });

    // 5. Baseline Booking: Selling price ₹50,000 (5,000,000 paise)
    bookingTotal50k = await BookingModel.create({
      bookingNumber: 'NCT-BK-2026-90001',
      quotationId: new mongoose.Types.ObjectId(),
      quotationVersionUsed: 1,
      leadId: new mongoose.Types.ObjectId(),
      customerId: customer._id,
      assignedAgentId: agentAUser._id,
      destinationId: destination._id,
      travelStartDate: new Date('2026-11-01'),
      travelEndDate: new Date('2026-11-06'),
      durationNights: 5,
      durationDays: 6,
      numberOfAdults: 2,
      numberOfChildren: 0,
      numberOfInfants: 0,
      status: 'CONFIRMED',
      financials: {
        totalAmount: 50000,
        totalAmountInPaise: 5000000,
        currency: 'INR',
        advanceRequired: 15000,
        advanceRequiredInPaise: 1500000,
        totalPaid: 0,
        totalPaidInPaise: 0,
        balancePending: 50000,
        balancePendingInPaise: 5000000,
        excessPaid: 0,
        excessPaidInPaise: 0,
      },
    });
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  });

  // =========================================================================
  // SECTION 1: Audit A — Overpayment & Balance Consistency Across Endpoints
  // =========================================================================
  describe('Audit A — Overpayment and Balance Consistency Across Endpoints', () => {
    it('Case 1: No payments -> balancePending equals totalAmount, excessPaid is zero, non-negative', async () => {
      const bookingDto = await bookingService.getBookingById(bookingTotal50k._id.toString(), agentAActor);
      const ledger = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);

      expect(bookingDto.financials.balancePendingInPaise).toBe(5000000);
      expect(bookingDto.financials.balancePending).toBe(50000);
      expect(bookingDto.financials.excessPaidInPaise).toBe(0);
      expect(bookingDto.financials.excessPaid).toBe(0);

      // Endpoint agreement parity
      expect(ledger.summary.balancePending).toBe(bookingDto.financials.balancePending);
      expect(ledger.summary.balancePendingInPaise).toBe(bookingDto.financials.balancePendingInPaise);
      expect(ledger.summary.excessPaid).toBe(0);
      expect(ledger.summary.netPaid).toBe(0);
    });

    it('Case 2: One submitted payment -> balancePending remains totalAmount, totalPaid remains zero', async () => {
      const p1 = await paymentService.recordPayment(
        {
          bookingId: bookingTotal50k._id.toString(),
          amount: 15000,
          paymentType: 'ADVANCE',
          paymentMethod: 'UPI',
          transactionReference: 'UPI-TEST-001',
        },
        agentAActor
      );

      expect(p1.status).toBe('SUBMITTED');

      const bookingDto = await bookingService.getBookingById(bookingTotal50k._id.toString(), agentAActor);
      const ledger = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);

      // Financial invariants: SUBMITTED payments do NOT credit authoritative balance
      expect(bookingDto.financials.balancePendingInPaise).toBe(5000000);
      expect(bookingDto.financials.totalPaidInPaise).toBe(0);
      expect(ledger.summary.netPaid).toBe(0);
      expect(ledger.summary.balancePending).toBe(50000);
    });

    it('Case 3: One verified partial payment -> balancePending = totalAmount - paid, totalPaid = paid', async () => {
      const records = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);
      const submitted = records.payments.find((p) => p.status === 'SUBMITTED');
      expect(submitted).toBeDefined();

      const verified = await paymentService.verifyPayment(submitted!.id, adminActor, {
        settlementReference: 'BANK-UTR-VERIFY-001',
        notes: 'Verified against bank statement',
      });
      expect(verified.status).toBe('VERIFIED');

      const bookingDto = await bookingService.getBookingById(bookingTotal50k._id.toString(), agentAActor);
      const ledger = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);

      expect(bookingDto.financials.totalPaidInPaise).toBe(1500000);
      expect(bookingDto.financials.balancePendingInPaise).toBe(3500000);
      expect(bookingDto.financials.balancePending).toBe(35000);
      expect(bookingDto.financials.excessPaidInPaise).toBe(0);

      // Parity check
      expect(ledger.summary.netPaid).toBe(15000);
      expect(ledger.summary.balancePending).toBe(35000);
      expect(ledger.summary.excessPaid).toBe(0);
    });

    it('Case 4: Multiple verified partial payments -> balancePending strictly decreases, netPaid increases', async () => {
      const p2 = await paymentService.recordPayment(
        {
          bookingId: bookingTotal50k._id.toString(),
          amount: 20000,
          paymentType: 'PARTIAL',
          paymentMethod: 'NEFT_IMPS',
          transactionReference: 'NEFT-TEST-002',
        },
        agentAActor
      );

      await paymentService.verifyPayment(p2.id, adminActor);

      const bookingDto = await bookingService.getBookingById(bookingTotal50k._id.toString(), agentAActor);
      const ledger = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);

      expect(bookingDto.financials.totalPaidInPaise).toBe(3500000); // 15k + 20k
      expect(bookingDto.financials.balancePendingInPaise).toBe(1500000); // 50k - 35k
      expect(bookingDto.financials.balancePending).toBe(15000);
      expect(bookingDto.financials.excessPaidInPaise).toBe(0);

      expect(ledger.summary.netPaid).toBe(35000);
      expect(ledger.summary.balancePending).toBe(15000);
      expect(ledger.summary.excessPaid).toBe(0);
    });

    it('Case 5: A rejected payment -> verified total and balance pending unchanged; rejectionReason recorded', async () => {
      const p3 = await paymentService.recordPayment(
        {
          bookingId: bookingTotal50k._id.toString(),
          amount: 10000,
          paymentType: 'PARTIAL',
          paymentMethod: 'CASH',
        },
        agentAActor
      );

      // Support reason alias
      const rejected = await paymentService.rejectPayment(
        p3.id,
        'Cash receipt verification failed; customer cancelled deposit slip',
        adminActor
      );
      expect(rejected.status).toBe('REJECTED');
      expect(rejected.rejectionReason).toContain('verification failed');

      const bookingDto = await bookingService.getBookingById(bookingTotal50k._id.toString(), agentAActor);
      const ledger = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);

      expect(bookingDto.financials.totalPaidInPaise).toBe(3500000);
      expect(bookingDto.financials.balancePendingInPaise).toBe(1500000);
      expect(ledger.summary.netPaid).toBe(35000);
      expect(ledger.summary.balancePending).toBe(15000);
    });

    it('Case 6: Exact payment of the selling price -> balancePending = 0, excessPaid = 0', async () => {
      const p4 = await paymentService.recordPayment(
        {
          bookingId: bookingTotal50k._id.toString(),
          amount: 15000,
          paymentType: 'FINAL_BALANCE',
          paymentMethod: 'UPI',
        },
        agentAActor
      );

      await paymentService.verifyPayment(p4.id, adminActor);

      const bookingDto = await bookingService.getBookingById(bookingTotal50k._id.toString(), agentAActor);
      const ledger = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);

      expect(bookingDto.financials.totalPaidInPaise).toBe(5000000);
      expect(bookingDto.financials.balancePendingInPaise).toBe(0);
      expect(bookingDto.financials.balancePending).toBe(0);
      expect(bookingDto.financials.excessPaidInPaise).toBe(0);
      expect(bookingDto.financials.excessPaid).toBe(0);

      expect(ledger.summary.netPaid).toBe(50000);
      expect(ledger.summary.balancePending).toBe(0);
      expect(ledger.summary.excessPaid).toBe(0);
    });

    it('Case 8: OVERPAYMENT — Verified payments above selling price -> balancePending is strictly 0 (never negative), excessPaid is explicitly tracked', async () => {
      // Customer makes an extra payment of ₹10,000 above the ₹50,000 selling price
      const pOver = await paymentService.recordPayment(
        {
          bookingId: bookingTotal50k._id.toString(),
          amount: 10000,
          paymentType: 'PARTIAL',
          paymentMethod: 'UPI',
          transactionReference: 'UPI-OVERPAY-001',
        },
        agentAActor
      );

      await paymentService.verifyPayment(pOver.id, adminActor);

      const bookingDto = await bookingService.getBookingById(bookingTotal50k._id.toString(), agentAActor);
      const ledger = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);

      // INVARIANT 1: balancePending must NOT be negative
      expect(bookingDto.financials.balancePendingInPaise).toBe(0);
      expect(bookingDto.financials.balancePending).toBe(0);

      // INVARIANT 2: excessPaid explicitly captures surplus funds
      expect(bookingDto.financials.totalPaidInPaise).toBe(6000000); // 60,000 paid
      expect(bookingDto.financials.excessPaidInPaise).toBe(1000000); // 10,000 surplus
      expect(bookingDto.financials.excessPaid).toBe(10000);

      // INVARIANT 3: Authoritative consistency between GET /bookings/:id and GET /payments/booking/:id
      expect(ledger.summary.balancePending).toBe(0);
      expect(ledger.summary.balancePendingInPaise).toBe(0);
      expect(ledger.summary.excessPaid).toBe(10000);
      expect(ledger.summary.excessPaidInPaise).toBe(1000000);
      expect(ledger.summary.netPaid).toBe(60000);

      // Database direct inspection: Booking document in MongoDB must NOT have negative balance
      const rawDoc = await BookingModel.findById(bookingTotal50k._id).exec();
      expect(rawDoc?.financials.balancePendingInPaise).toBe(0);
      expect(rawDoc?.financials.balancePending).toBe(0);
      expect(rawDoc?.financials.excessPaidInPaise).toBe(1000000);
      expect(rawDoc?.financials.excessPaid).toBe(10000);
    });

    it('Case 9: A verified payment followed by a verified refund -> net receipts decrease, excess is reduced', async () => {
      // Find the overpayment record to refund ₹10,000
      const records = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);
      const overpaymentRecord = records.payments.find((p) => p.transactionReference === 'UPI-OVERPAY-001');
      expect(overpaymentRecord).toBeDefined();

      // Agent records refund request
      const rfdReq = await paymentService.recordRefund(
        {
          bookingId: bookingTotal50k._id.toString(),
          originalPaymentId: overpaymentRecord!.id,
          amount: 10000,
          refundReason: 'Excess payment returned to customer',
        },
        agentAActor
      );

      expect(rfdReq.status).toBe('SUBMITTED');

      // Admin verifies and settles refund with bank payout UTR
      const settled = await paymentService.verifyPayment(rfdReq.id, adminActor, {
        settlementReference: 'UTR-PAYOUT-REFUND-001',
        notes: 'Transferred back to customer HDFC account',
      });

      expect(settled.status).toBe('VERIFIED');
      expect(settled.settlementReference).toBe('UTR-PAYOUT-REFUND-001');
      expect(settled.settledAt).toBeDefined();
      expect(settled.settledBy).toBe(adminActor.userId);

      // Booking financials updated
      const bookingDto = await bookingService.getBookingById(bookingTotal50k._id.toString(), agentAActor);
      const ledger = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);

      expect(bookingDto.financials.totalPaidInPaise).toBe(5000000); // 60k - 10k refund = 50k
      expect(bookingDto.financials.balancePendingInPaise).toBe(0);
      expect(bookingDto.financials.excessPaidInPaise).toBe(0); // Excess resolved

      expect(ledger.summary.totalPaid).toBe(60000);
      expect(ledger.summary.totalRefunded).toBe(10000);
      expect(ledger.summary.netPaid).toBe(50000);
      expect(ledger.summary.balancePending).toBe(0);
      expect(ledger.summary.excessPaid).toBe(0);
    });

    it('Case 10: Multiple refunds and partial payments in sequence maintain integer paise precision', async () => {
      // Find payment 2 (amount 20,000) and issue partial refund of ₹5,000
      const records = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);
      const p2 = records.payments.find((p) => p.amount === 20000 && p.status === 'VERIFIED');
      expect(p2).toBeDefined();

      const rfd2 = await paymentService.recordRefund(
        {
          bookingId: bookingTotal50k._id.toString(),
          originalPaymentId: p2!.id,
          amount: 5000,
          refundReason: 'Partial itinerary reduction refund',
        },
        agentAActor
      );

      await paymentService.verifyPayment(rfd2.id, adminActor, {
        settlementReference: 'UTR-PAYOUT-PARTIAL-002',
      });

      const bookingDto = await bookingService.getBookingById(bookingTotal50k._id.toString(), agentAActor);
      const ledger = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);

      // Net paid: 50,000 - 5,000 = 45,000
      expect(bookingDto.financials.totalPaidInPaise).toBe(4500000);
      expect(bookingDto.financials.balancePendingInPaise).toBe(500000); // ₹5,000 now pending again
      expect(bookingDto.financials.balancePending).toBe(5000);
      expect(bookingDto.financials.excessPaidInPaise).toBe(0);

      expect(ledger.summary.netPaid).toBe(45000);
      expect(ledger.summary.balancePending).toBe(5000);
    });

    it('Case 11: Duplicate verification attempts throw 400 Bad Request idempotently without double-credit', async () => {
      const records = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);
      const verifiedPayment = records.payments.find((p) => p.status === 'VERIFIED' && !p.isRefund);
      expect(verifiedPayment).toBeDefined();

      // Attempting to verify an already verified payment
      await expect(
        paymentService.verifyPayment(verifiedPayment!.id, adminActor)
      ).rejects.toThrow('Payment record is already verified');

      // Financials unchanged
      const bookingDto = await bookingService.getBookingById(bookingTotal50k._id.toString(), agentAActor);
      expect(bookingDto.financials.totalPaidInPaise).toBe(4500000);
    });

    it('Case 12: Concurrent verification attempts on the same payment cannot double-credit ledger', async () => {
      const pFresh = await paymentService.recordPayment(
        {
          bookingId: bookingTotal50k._id.toString(),
          amount: 5000,
          paymentType: 'FINAL_BALANCE',
          paymentMethod: 'UPI',
        },
        agentAActor
      );

      // Fire 2 concurrent verification requests
      const verifyResults = await Promise.allSettled([
        paymentService.verifyPayment(pFresh.id, adminActor),
        paymentService.verifyPayment(pFresh.id, adminActor),
      ]);

      const fulfilled = verifyResults.filter((r) => r.status === 'fulfilled');
      const rejected = verifyResults.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // Financials accurately credited exactly once (45,000 + 5,000 = 50,000)
      const bookingDto = await bookingService.getBookingById(bookingTotal50k._id.toString(), agentAActor);
      expect(bookingDto.financials.totalPaidInPaise).toBe(5000000);
      expect(bookingDto.financials.balancePendingInPaise).toBe(0);
    });

    it('Case 13: Repeated ledger reads immediately after verification return deterministic identical results', async () => {
      const [read1, read2, read3] = await Promise.all([
        paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor),
        paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor),
        paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor),
      ]);

      expect(read1.summary).toEqual(read2.summary);
      expect(read2.summary).toEqual(read3.summary);
    });
  });

  // =========================================================================
  // SECTION 2: Audit B — Refund Request Approval vs Settlement Semantics
  // =========================================================================
  describe('Audit B — Refund Request Approval vs Settlement Semantics', () => {
    let sourcePayment: any;

    beforeAll(async () => {
      // Create a fresh verified payment of ₹40,000 (4,000,000 paise)
      sourcePayment = await paymentService.recordPayment(
        {
          bookingId: bookingTotal50k._id.toString(),
          amount: 40000,
          paymentType: 'PARTIAL',
          paymentMethod: 'NEFT_IMPS',
          transactionReference: 'NEFT-SOURCE-40K',
        },
        agentAActor
      );
      sourcePayment = await paymentService.verifyPayment(sourcePayment.id, adminActor);
    });

    it('1. Agent action creates ONLY a refund request (SUBMITTED) without moving money or reducing net receipts', async () => {
      const initialLedger = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);

      const rfd = await paymentService.recordRefund(
        {
          bookingId: bookingTotal50k._id.toString(),
          originalPaymentId: sourcePayment.id,
          amount: 12000,
          refundReason: 'Customer requested cancellation of excursion tour',
        },
        agentAActor
      );

      expect(rfd.status).toBe('SUBMITTED');
      expect(rfd.isRefund).toBe(true);
      expect(rfd.settledAt).toBeUndefined();
      expect(rfd.settlementReference).toBeUndefined();

      // Net paid is UNCHANGED while refund is in SUBMITTED status
      const currentLedger = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);
      expect(currentLedger.summary.netPaid).toBe(initialLedger.summary.netPaid);
      expect(currentLedger.summary.totalRefunded).toBe(initialLedger.summary.totalRefunded);

      // However, headroom is atomically reserved on the original payment document
      const origDoc = await PaymentRecordModel.findById(sourcePayment.id);
      expect(origDoc?.allocatedRefundPaise).toBe(1200000);
    });

    it('2. Admin settlement records payout UTR reference, settledAt timestamp, and settledBy administrator', async () => {
      const records = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);
      const submittedRfd = records.payments.find(
        (p) => p.status === 'SUBMITTED' && p.amount === 12000 && p.isRefund
      );
      expect(submittedRfd).toBeDefined();

      const settled = await paymentService.verifyPayment(submittedRfd!.id, adminActor, {
        settlementReference: 'HDFC-NEFT-PAYOUT-998877',
        notes: 'Processed through commercial banking portal',
      });

      expect(settled.status).toBe('VERIFIED');
      expect(settled.settlementReference).toBe('HDFC-NEFT-PAYOUT-998877');
      expect(settled.settledAt).toBeDefined();
      expect(settled.settledBy).toBe(adminActor.userId);
      expect(settled.notes).toBe('Processed through commercial banking portal');

      // Database verification
      const dbDoc = await PaymentRecordModel.findById(submittedRfd!.id);
      expect(dbDoc?.status).toBe('VERIFIED');
      expect(dbDoc?.settlementReference).toBe('HDFC-NEFT-PAYOUT-998877');
      expect(dbDoc?.settledAt).toBeDefined();
      expect(dbDoc?.settledBy?.toString()).toBe(adminActor.userId);
    });

    it('3. Rejection releases reserved headroom exactly once and accepts reason alias', async () => {
      // Create another refund request of ₹8,000 against sourcePayment (has 40k total, 12k allocated -> 28k headroom)
      const rfd2 = await paymentService.recordRefund(
        {
          bookingId: bookingTotal50k._id.toString(),
          originalPaymentId: sourcePayment.id,
          amount: 8000,
          refundReason: 'Customer disputed transport surcharge',
        },
        agentAActor
      );

      const beforeRejectDoc = await PaymentRecordModel.findById(sourcePayment.id);
      expect(beforeRejectDoc?.allocatedRefundPaise).toBe(2000000); // 12k + 8k = 20k allocated

      // Admin rejects with reason
      const rejected = await paymentService.rejectPayment(
        rfd2.id,
        'Transport surcharge was contractually agreed; refund rejected',
        adminActor
      );
      expect(rejected.status).toBe('REJECTED');

      // Headroom restored: 8,000 released
      const afterRejectDoc = await PaymentRecordModel.findById(sourcePayment.id);
      expect(afterRejectDoc?.allocatedRefundPaise).toBe(1200000); // Back to 12k

      // Repeated rejection attempt is rejected and cannot double-release headroom
      await expect(
        paymentService.rejectPayment(rfd2.id, 'Duplicate reject attempt', adminActor)
      ).rejects.toThrow('Payment record is already rejected');

      const repeatedDoc = await PaymentRecordModel.findById(sourcePayment.id);
      expect(repeatedDoc?.allocatedRefundPaise).toBe(1200000); // Still 12k, NOT reduced again!
    });

    it('4. Rejection cannot be performed on already verified/settled refund records', async () => {
      const records = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);
      const settledRfd = records.payments.find((p) => p.status === 'VERIFIED' && p.isRefund);
      expect(settledRfd).toBeDefined();

      await expect(
        paymentService.rejectPayment(settledRfd!.id, 'Cannot reject settled refund', adminActor)
      ).rejects.toThrow('Cannot reject an already verified payment record');
    });

    it('5. Cannot request refund exceeding remaining headroom on original payment', async () => {
      // sourcePayment has ₹40,000 total, ₹12,000 allocated -> ₹28,000 headroom remaining
      await expect(
        paymentService.recordRefund(
          {
            bookingId: bookingTotal50k._id.toString(),
            originalPaymentId: sourcePayment.id,
            amount: 28001, // 1 rupee over headroom
            refundReason: 'Exceeding refund attempt',
          },
          agentAActor
        )
      ).rejects.toThrow('exceeds the remaining refundable amount');
    });

    it('6. Idempotency key replay protection: identical payload returns existing, altered payload throws 409 conflict', async () => {
      const key = `idemp-rfd-${Date.now()}`;

      const rfdFirst = await paymentService.recordRefund(
        {
          bookingId: bookingTotal50k._id.toString(),
          originalPaymentId: sourcePayment.id,
          amount: 5000,
          refundReason: 'Hotel refund',
          idempotencyKey: key,
        },
        agentAActor
      );

      // Replay with identical payload
      const rfdReplay = await paymentService.recordRefund(
        {
          bookingId: bookingTotal50k._id.toString(),
          originalPaymentId: sourcePayment.id,
          amount: 5000,
          refundReason: 'Hotel refund',
          idempotencyKey: key,
        },
        agentAActor
      );

      expect(rfdReplay.id).toBe(rfdFirst.id);
      expect(rfdReplay.receiptNumber).toBe(rfdFirst.receiptNumber);

      // Replay with altered amount throws 409 Conflict
      await expect(
        paymentService.recordRefund(
          {
            bookingId: bookingTotal50k._id.toString(),
            originalPaymentId: sourcePayment.id,
            amount: 7000, // Altered amount!
            refundReason: 'Hotel refund',
            idempotencyKey: key,
          },
          agentAActor
        )
      ).rejects.toThrow('used for a different refund request');
    });

    it('7. Reconcile refund allocations self-heals orphaned reservations without disturbing legitimate active reservations', async () => {
      // Manually simulate a crashed reservation that allocated 30,000 paise without creating a refund
      await PaymentRecordModel.updateOne(
        { _id: sourcePayment.id },
        { $inc: { allocatedRefundPaise: 300000 } } // Extra 3,000 paise orphaned
      );

      const healResult = await paymentService.reconcileRefundAllocations(sourcePayment.id, adminActor);
      expect(healResult.healed).toBe(true);

      // True active refunds on sourcePayment: 12,000 settled + 5,000 submitted = 17,000 (1,700,000 paise)
      expect(healResult.reconciledPaise).toBe(1700000);
      expect(healResult.headroomPaise).toBe(2300000); // 40,000 - 17,000 = 23,000 headroom
    });
  });

  // =========================================================================
  // SECTION 3: Audit C — Authorization & Least-Privilege Regressions
  // =========================================================================
  describe('Audit C — Authorization & Least-Privilege Regressions', () => {
    it('Cross-agent scoping: Agent B cannot view or request refunds on Agent A booking (403 Forbidden)', async () => {
      await expect(
        bookingService.getBookingById(bookingTotal50k._id.toString(), agentBActor)
      ).rejects.toThrow('You are not authorized to access this booking');

      await expect(
        paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentBActor)
      ).rejects.toThrow('You are not authorized to view payments for this booking');

      await expect(
        paymentService.recordRefund(
          {
            bookingId: bookingTotal50k._id.toString(),
            originalPaymentId: bookingTotal50k._id.toString(),
            amount: 1000,
            refundReason: 'Unauthorized cross-agent refund attempt',
          },
          agentBActor
        )
      ).rejects.toThrow('You are not authorized to request refunds for this booking');
    });

    it('Role security: Agent cannot verify or reject payments (403 Forbidden)', async () => {
      const records = await paymentService.getPaymentsForBooking(bookingTotal50k._id.toString(), agentAActor);
      const submitted = records.payments.find((p) => p.status === 'SUBMITTED');
      expect(submitted).toBeDefined();

      await expect(
        paymentService.verifyPayment(submitted!.id, agentAActor)
      ).rejects.toThrow('Only administrators can verify payments');

      await expect(
        paymentService.rejectPayment(submitted!.id, 'Unauthorized reject attempt', agentAActor)
      ).rejects.toThrow('Only administrators can reject payments');
    });

    it('Least-privilege operational driver PII: driverLicenseNumber is omitted for AGENT role but visible to ADMIN', async () => {
      // Assign driver and vehicle to booking transport
      await TransportAssignmentModel.create({
        bookingId: bookingTotal50k._id,
        bookingNumber: bookingTotal50k.bookingNumber,
        transportItemIndex: 0,
        assignedVehicleId: testVehicle._id,
        assignedDriverId: testDriver._id,
        status: 'ASSIGNED',
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-06'),
        pickupLocation: 'Srinagar Airport',
        dropLocation: 'Pahalgam Resort',
      });

      // 1. Agent operational summary query
      const agentOps = await operationsService.getOperationalSummary(
        bookingTotal50k._id.toString(),
        agentAActor
      );
      expect(agentOps.transportAssignments.length).toBeGreaterThan(0);
      const agentTrans = agentOps.transportAssignments[0];

      // Agent receives driver name and mobile for customer coordination
      expect(agentTrans.driverName).toBe('Ghulam Rasool');
      expect(agentTrans.driverMobile).toBe('9419000001');
      // Driver license number is sensitive PII and must be REDACTED
      expect(agentTrans.driverLicenseNumber).toBeUndefined();

      // 2. Admin operational summary query
      const adminOps = await operationsService.getOperationalSummary(
        bookingTotal50k._id.toString(),
        adminActor
      );
      const adminTrans = adminOps.transportAssignments[0];
      // Admin receives complete records including driver license number for compliance
      expect(adminTrans.driverLicenseNumber).toBe('JK01-20150009988');
    });
  });

  describe('Section 4: Final Settlement Metadata Integrity & Exact Integer Arithmetic', () => {
    let basePaymentForSec4: any;

    beforeAll(async () => {
      // Record and verify a fresh baseline payment of ₹25,000 for Section 4 tests
      const sub = await paymentService.recordPayment(
        {
          bookingId: bookingTotal50k._id.toString(),
          amount: 25000,
          paymentType: 'PARTIAL',
          paymentMethod: 'NEFT_IMPS',
          transactionReference: 'NEFT-SEC4-BASE-001',
        },
        adminActor
      );
      basePaymentForSec4 = await paymentService.verifyPayment(sub.id, adminActor, {
        settlementReference: 'BANK-SETTLE-SEC4-BASE',
      });
    });

    it('A.1 & A.2: settledBy is derived strictly from server admin session and settledAt is server-assigned timestamp', async () => {
      // Record a refund request
      const rfdReq = await paymentService.recordRefund(
        {
          bookingId: bookingTotal50k._id.toString(),
          originalPaymentId: basePaymentForSec4.id,
          amount: 2000,
          refundReason: 'Customer itinerary change adjustment',
        },
        adminActor
      );

      const beforeSettlement = Date.now();
      const settled = await paymentService.verifyPayment(rfdReq.id, adminActor, {
        settlementReference: 'UTR-REFUND-PAYOUT-VALID',
        notes: 'Admin manual bank payout confirmed',
      });
      const afterSettlement = Date.now();

      expect(settled.status).toBe('VERIFIED');
      expect(settled.isRefund).toBe(true);
      expect(settled.settlementReference).toBe('UTR-REFUND-PAYOUT-VALID');

      // 1. settledBy is strictly derived from adminActor.userId
      expect(settled.settledBy).toBe(adminActor.userId);

      // 2. settledAt is server-assigned timestamp within execution window
      expect(settled.settledAt).toBeDefined();
      const settledTime = new Date(settled.settledAt!).getTime();
      expect(settledTime).toBeGreaterThanOrEqual(beforeSettlement - 1000);
      expect(settledTime).toBeLessThanOrEqual(afterSettlement + 1000);
    });

    it('A.3: settlementReference is validated, trimmed, and strictly required to settle a refund', async () => {
      const rfdReq = await paymentService.recordRefund(
        {
          bookingId: bookingTotal50k._id.toString(),
          originalPaymentId: basePaymentForSec4.id,
          amount: 1500,
          refundReason: 'Customer discount adjustment',
        },
        adminActor
      );

      // 1. Fails if settlementReference is completely omitted
      await expect(
        paymentService.verifyPayment(rfdReq.id, adminActor)
      ).rejects.toThrow(
        'Settlement reference (e.g. bank payout UTR or transaction ID) is required to settle a refund payout'
      );

      // 2. Fails if settlementReference is empty or whitespace-only
      await expect(
        paymentService.verifyPayment(rfdReq.id, adminActor, {
          settlementReference: '     ',
        })
      ).rejects.toThrow(
        'Settlement reference (e.g. bank payout UTR or transaction ID) is required to settle a refund payout'
      );

      // 3. Succeeds and trims whitespace if valid reference provided
      const settled = await paymentService.verifyPayment(rfdReq.id, adminActor, {
        settlementReference: '   UTR-BANK-TRIMMED-9988   ',
      });
      expect(settled.status).toBe('VERIFIED');
      expect(settled.settlementReference).toBe('UTR-BANK-TRIMMED-9988');
    });

    it('A.5 & A.6: Already settled refund cannot be settled again, double-counted, or have metadata silently overwritten', async () => {
      const rfdReq = await paymentService.recordRefund(
        {
          bookingId: bookingTotal50k._id.toString(),
          originalPaymentId: basePaymentForSec4.id,
          amount: 1000,
          refundReason: 'Duplicate room charge adjustment',
        },
        adminActor
      );

      const originalSettled = await paymentService.verifyPayment(rfdReq.id, adminActor, {
        settlementReference: 'UTR-ORIGINAL-SETTLE-001',
        notes: 'Original audit note',
      });

      // Capture original metadata
      const origSettledAt = originalSettled.settledAt;
      const origSettledBy = originalSettled.settledBy;
      const origSettlementRef = originalSettled.settlementReference;

      // Attempting to settle again must be rejected with 400 Bad Request
      await expect(
        paymentService.verifyPayment(rfdReq.id, adminActor, {
          settlementReference: 'UTR-SPOOFED-OVERWRITE',
          notes: 'Malicious overwrite attempt',
        })
      ).rejects.toThrow('Payment record is already verified');

      // Verify in DB that document metadata was NOT mutated
      const reRead = await PaymentRecordModel.findById(rfdReq.id);
      expect(reRead!.status).toBe('VERIFIED');
      expect(reRead!.settlementReference).toBe(origSettlementRef);
      expect(reRead!.settledAt?.toISOString()).toBe(origSettledAt);
      expect(reRead!.settledBy?.toString()).toBe(origSettledBy);
    });

    it('A.7: Rejection releases reserved refund headroom exactly once and cannot release headroom for settled refund', async () => {
      // Read current allocated refund paise on base payment
      const origBefore = await PaymentRecordModel.findById(basePaymentForSec4.id);
      const initialAllocated = origBefore!.allocatedRefundPaise || 0;

      // Create a refund request for ₹3,000 (300,000 paise)
      const rfdReq = await paymentService.recordRefund(
        {
          bookingId: bookingTotal50k._id.toString(),
          originalPaymentId: basePaymentForSec4.id,
          amount: 3000,
          refundReason: 'Activity cancellation refund request',
        },
        adminActor
      );

      // Verify allocated paise reserved +300,000
      const origAfterReserve = await PaymentRecordModel.findById(basePaymentForSec4.id);
      expect(origAfterReserve!.allocatedRefundPaise).toBe(initialAllocated + 300000);

      // Reject the refund request
      const rejected = await paymentService.rejectPayment(
        rfdReq.id,
        'Booking activity could not be cancelled with hotel partner',
        adminActor
      );
      expect(rejected.status).toBe('REJECTED');

      // Headroom released exactly once back to initialAllocated
      const origAfterReject = await PaymentRecordModel.findById(basePaymentForSec4.id);
      expect(origAfterReject!.allocatedRefundPaise).toBe(initialAllocated);

      // Attempting to reject again rejects with 400 and does NOT release headroom again
      await expect(
        paymentService.rejectPayment(rfdReq.id, 'Second rejection attempt', adminActor)
      ).rejects.toThrow('Payment record is already rejected');

      const origAfterSecondReject = await PaymentRecordModel.findById(basePaymentForSec4.id);
      expect(origAfterSecondReject!.allocatedRefundPaise).toBe(initialAllocated);

      // Now verify that an already settled refund CANNOT be rejected and headroom cannot be released
      const settledRefundReq = await paymentService.recordRefund(
        {
          bookingId: bookingTotal50k._id.toString(),
          originalPaymentId: basePaymentForSec4.id,
          amount: 1000,
          refundReason: 'Settled refund rejection guard test',
        },
        adminActor
      );
      await paymentService.verifyPayment(settledRefundReq.id, adminActor, {
        settlementReference: 'UTR-SETTLE-GUARD-999',
      });

      await expect(
        paymentService.rejectPayment(settledRefundReq.id, 'Rejecting settled refund attempt', adminActor)
      ).rejects.toThrow('Cannot reject an already verified payment record');
    });

    it('B.1, B.2 & B.3: Exact integer arithmetic and safe integer bounds validation', () => {
      // 1. Valid monetary amounts pass schema and are safe integers in paise
      expect(monetaryAmountSchema.safeParse(500).success).toBe(true);
      expect(monetaryAmountSchema.safeParse(1250.75).success).toBe(true);
      expect(monetaryAmountSchema.safeParse(100_000_000).success).toBe(true); // Maximum supported ceiling (₹10 Crore)

      // 2. Reject non-finite values (Infinity, -Infinity, NaN)
      expect(monetaryAmountSchema.safeParse(Infinity).success).toBe(false);
      expect(monetaryAmountSchema.safeParse(-Infinity).success).toBe(false);
      expect(monetaryAmountSchema.safeParse(NaN).success).toBe(false);

      // 3. Reject negative, zero, or non-numeric values
      expect(monetaryAmountSchema.safeParse(0).success).toBe(false);
      expect(monetaryAmountSchema.safeParse(-100).success).toBe(false);
      expect(monetaryAmountSchema.safeParse('500').success).toBe(false);

      // 4. Reject amounts exceeding maximum supported ceiling (> ₹10 Crore)
      expect(monetaryAmountSchema.safeParse(100_000_001).success).toBe(false);
      expect(monetaryAmountSchema.safeParse(1e12).success).toBe(false);

      // 5. Verify runtime representation safe-integer reality
      // JavaScript Number.isSafeInteger guarantees exact integer arithmetic up to 2^53 - 1
      const maxPaiseCeiling = MAX_MONETARY_RUPEES * 100;
      expect(Number.isSafeInteger(maxPaiseCeiling)).toBe(true);
      expect(maxPaiseCeiling).toBeLessThan(Number.MAX_SAFE_INTEGER);

      // Ensure aggregation cannot exceed safe integer without trigger
      const simulatedTotal = maxPaiseCeiling * 10;
      expect(Number.isSafeInteger(simulatedTotal)).toBe(true);
      expect(simulatedTotal).toBeLessThan(Number.MAX_SAFE_INTEGER);
    });
  });
});
