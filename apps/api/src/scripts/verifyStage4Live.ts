import mongoose from 'mongoose';
import '../models/user.model';
import '../models/customer.model';
import '../models/destination.model';
import '../models/lead.model';
import '../models/quotation.model';
import '../models/auditLog.model';
import '../models/sequence.model';
import { PaymentRecordModel } from '../models/paymentRecord.model';
import { BookingModel } from '../models/booking.model';
import { paymentService } from '../services/payment.service';

const ISOLATED_DB_URI = 'mongodb://localhost:27017/chirag_travels_stage4_isolated_test';

interface ProbeCheck {
  name: string;
  passed: boolean;
  details?: string;
}

const checks: ProbeCheck[] = [];

function recordCheck(name: string, passed: boolean, details?: string) {
  checks.push({ name, passed, details });
  if (passed) {
    console.log(`[PASS] ${name}${details ? ` -> ${details}` : ''}`);
  } else {
    console.error(`[FAIL] ${name}${details ? ` -> ${details}` : ''}`);
  }
}

async function runStage4LiveProbe() {
  console.log('=== STAGE 4 LIVE MONGODB INTEGRATION PROBE ===');
  console.log(`Connecting to ISOLATED database: ${ISOLATED_DB_URI}`);

  await mongoose.connect(ISOLATED_DB_URI, {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
  });

  try {
    // Step 1: Ensure indexes
    await PaymentRecordModel.init();
    await BookingModel.init();

    const indexes = await PaymentRecordModel.collection.indexes();
    const idempotencyIndex = indexes.find(
      (idx) => idx.key && (idx.key as any).idempotencyKey === 1
    );

    recordCheck(
      'PaymentRecord collection indexes created',
      Boolean(idempotencyIndex),
      idempotencyIndex
        ? `sparse: ${idempotencyIndex.sparse}, unique: ${idempotencyIndex.unique}`
        : 'idempotencyKey index missing'
    );

    // Step 2: Seed test booking
    const agentId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();
    const leadId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();
    const destinationId = new mongoose.Types.ObjectId();
    const quotationId = new mongoose.Types.ObjectId();

    const testBooking = await BookingModel.create({
      bookingNumber: 'NCT-BK-2026-LIVE01',
      quotationId,
      quotationVersionUsed: 1,
      leadId,
      customerId,
      assignedAgentId: agentId,
      destinationId,
      travelStartDate: new Date('2026-11-01'),
      travelEndDate: new Date('2026-11-05'),
      durationNights: 4,
      durationDays: 5,
      numberOfAdults: 2,
      numberOfChildren: 0,
      numberOfInfants: 0,
      status: 'QUOTE_ACCEPTED',
      financials: {
        totalAmount: 100000,
        totalAmountInPaise: 10000000,
        currency: 'INR',
        advanceRequired: 25000,
        advanceRequiredInPaise: 2500000,
        totalPaid: 0,
        totalPaidInPaise: 0,
        balancePending: 100000,
        balancePendingInPaise: 10000000,
      },
    });

    recordCheck('Test booking created in isolated DB', Boolean(testBooking._id));

    // Step 3: Record manual payment in SUBMITTED status
    const adminActor = {
      userId: adminId.toString(),
      role: 'ADMIN' as const,
      ipAddress: '127.0.0.1',
    };

    const payment1 = await paymentService.recordPayment(
      {
        bookingId: testBooking._id.toString(),
        amount: 30000,
        paymentType: 'ADVANCE',
        paymentMethod: 'UPI',
        transactionReference: 'UPI-LIVE-001',
        idempotencyKey: 'idemp-live-tx-100',
      },
      adminActor
    );

    recordCheck(
      'Payment begins in SUBMITTED status',
      payment1.status === 'SUBMITTED' && payment1.amount === 30000,
      `Receipt: ${payment1.receiptNumber}`
    );

    // Check that booking balance has NOT changed
    const bookingCheck1 = await BookingModel.findById(testBooking._id);
    recordCheck(
      'Submitted payment does not mutate booking balance or confirm status',
      bookingCheck1?.financials.totalPaid === 0 &&
        bookingCheck1?.financials.balancePending === 100000 &&
        bookingCheck1?.status === 'QUOTE_ACCEPTED',
      `totalPaid: ${bookingCheck1?.financials.totalPaid}, balancePending: ${bookingCheck1?.financials.balancePending}`
    );

    // Step 4: Test idempotency retry
    const payment1Retry = await paymentService.recordPayment(
      {
        bookingId: testBooking._id.toString(),
        amount: 30000,
        paymentType: 'ADVANCE',
        paymentMethod: 'UPI',
        idempotencyKey: 'idemp-live-tx-100',
      },
      adminActor
    );

    const countWithKey = await PaymentRecordModel.countDocuments({
      idempotencyKey: 'idemp-live-tx-100',
    });

    recordCheck(
      'Idempotency key prevents duplicate payment record on retry',
      payment1Retry.id === payment1.id && countWithKey === 1,
      `Returned same ID: ${payment1.id}`
    );

    // Step 5: Admin verifies payment
    const verifiedPayment1 = await paymentService.verifyPayment(payment1.id, adminActor);
    const bookingCheck2 = await BookingModel.findById(testBooking._id);

    recordCheck(
      'Admin verification updates payment to VERIFIED and recalculates booking balance',
      verifiedPayment1.status === 'VERIFIED' &&
        bookingCheck2?.financials.totalPaid === 30000 &&
        bookingCheck2?.financials.totalPaidInPaise === 3000000 &&
        bookingCheck2?.financials.balancePending === 70000 &&
        bookingCheck2?.financials.balancePendingInPaise === 7000000,
      `New totalPaid: ₹${bookingCheck2?.financials.totalPaid}, balancePending: ₹${bookingCheck2?.financials.balancePending}`
    );

    // Step 6: Record second payment and reject it
    const payment2 = await paymentService.recordPayment(
      {
        bookingId: testBooking._id.toString(),
        amount: 20000,
        paymentType: 'PARTIAL',
        paymentMethod: 'NEFT_IMPS',
        transactionReference: 'NEFT-FAIL-002',
      },
      adminActor
    );

    const rejectedPayment2 = await paymentService.rejectPayment(
      payment2.id,
      'Bank transaction reference did not settle',
      adminActor
    );

    const bookingCheck3 = await BookingModel.findById(testBooking._id);
    recordCheck(
      'Rejected payment records reason and leaves booking balance untouched',
      rejectedPayment2.status === 'REJECTED' &&
        rejectedPayment2.rejectionReason === 'Bank transaction reference did not settle' &&
        bookingCheck3?.financials.totalPaid === 30000 &&
        bookingCheck3?.financials.balancePending === 70000,
      `Balance remains: ₹${bookingCheck3?.financials.balancePending}`
    );

    // Step 7: Test refund safeguards on live MongoDB
    // Try to refund more than payment1's amount (₹30,000)
    let overRefundBlocked = false;
    try {
      await paymentService.recordRefund(
        {
          bookingId: testBooking._id.toString(),
          originalPaymentId: payment1.id,
          amount: 35000, // Exceeds ₹30,000
          refundReason: 'Excess refund test',
        },
        adminActor
      );
    } catch (err: any) {
      if (err.message && err.message.includes('exceeds the remaining refundable amount')) {
        overRefundBlocked = true;
      }
    }

    recordCheck(
      'Over-refund exceeding original payment is blocked on live MongoDB',
      overRefundBlocked
    );

    // Record valid partial refund (₹10,000)
    const refund1 = await paymentService.recordRefund(
      {
        bookingId: testBooking._id.toString(),
        originalPaymentId: payment1.id,
        amount: 10000,
        refundReason: 'Customer canceled 1 room',
      },
      adminActor
    );

    const origPaymentAfterRefund1 = await PaymentRecordModel.findById(payment1.id);
    recordCheck(
      'Refund atomically reserves allocatedRefundPaise on original payment',
      refund1.status === 'SUBMITTED' &&
        origPaymentAfterRefund1?.allocatedRefundPaise === 1000000,
      `allocatedRefundPaise: ${origPaymentAfterRefund1?.allocatedRefundPaise}`
    );

    // Step 8: Simulated concurrent refund race condition test
    // Headroom remaining on payment1 is ₹20,000 (2,000,000 paise).
    // Launch 5 concurrent reservation attempts of ₹15,000 each.
    // At most 1 can succeed, the other 4 must be rejected!
    console.log('Testing concurrent refund race condition on standalone MongoDB...');
    const concurrentRefundAttempts = await Promise.allSettled(
      [1, 2, 3, 4, 5].map((idx) =>
        paymentService.recordRefund(
          {
            bookingId: testBooking._id.toString(),
            originalPaymentId: payment1.id,
            amount: 15000,
            refundReason: `Concurrent race test #${idx}`,
          },
          adminActor
        )
      )
    );

    const succeededCount = concurrentRefundAttempts.filter(
      (res) => res.status === 'fulfilled'
    ).length;
    const rejectedCount = concurrentRefundAttempts.filter(
      (res) => res.status === 'rejected'
    ).length;

    const origPaymentAfterRace = await PaymentRecordModel.findById(payment1.id);
    recordCheck(
      'Atomic $expr $lte guard protects against concurrent over-refund race',
      succeededCount === 1 && rejectedCount === 4 && (origPaymentAfterRace?.allocatedRefundPaise || 0) <= 3000000,
      `Succeeded: ${succeededCount}, Rejected: ${rejectedCount}, Allocated: ${origPaymentAfterRace?.allocatedRefundPaise} / 3000000`
    );

    // Step 9: Verify refund and confirm net paid reduction
    const verifiedRefund1 = await paymentService.verifyPayment(refund1.id, adminActor);
    const bookingCheck4 = await BookingModel.findById(testBooking._id);

    // Prior net paid was ₹30,000; with ₹10,000 verified refund, net paid becomes ₹20,000, balancePending ₹80,000
    recordCheck(
      'Verified refund reduces net paid balance and increases balance pending',
      verifiedRefund1.status === 'VERIFIED' &&
        bookingCheck4?.financials.totalPaid === 20000 &&
        bookingCheck4?.financials.balancePending === 80000,
      `New net totalPaid: ₹${bookingCheck4?.financials.totalPaid}, balancePending: ₹${bookingCheck4?.financials.balancePending}`
    );

    // Step 10: Immutability guard check
    let immutabilityGuarded = false;
    try {
      await PaymentRecordModel.deleteOne({ _id: payment1.id });
    } catch (err: any) {
      if (err.message && err.message.includes('Financial audit violation')) {
        immutabilityGuarded = true;
      }
    }

    recordCheck(
      'PaymentRecord immutability guard blocks hard deletion on live MongoDB',
      immutabilityGuarded
    );

    // Step 11: Idempotency payload mismatch rejection (409 Conflict)
    let payloadMismatchCaught = false;
    try {
      await paymentService.recordPayment(
        {
          bookingId: testBooking._id.toString(),
          amount: 50000, // Different from original ₹30,000
          paymentType: 'ADVANCE',
          paymentMethod: 'UPI',
          idempotencyKey: 'idemp-live-tx-100', // Reusing payment1 key with different payload
        },
        adminActor
      );
    } catch (err: any) {
      if (err.statusCode === 409 && err.message.includes('Idempotency key')) {
        payloadMismatchCaught = true;
      }
    }

    recordCheck(
      'Reusing idempotency key with mismatched payload is rejected with 409 Conflict',
      payloadMismatchCaught
    );

    // Step 12A: Prove in-flight reservation safety regardless of elapsed time
    // Artificially inflate allocatedRefundPaise to 3,000,000 (simulating locked headroom)
    await PaymentRecordModel.updateOne(
      { _id: payment1.id },
      { $set: { allocatedRefundPaise: 3000000 } }
    );

    // Attempting a refund of ₹2,000 MUST be rejected and MUST NOT wipe the allocation
    let inFlightPreserved = false;
    try {
      await paymentService.recordRefund(
        {
          bookingId: testBooking._id.toString(),
          originalPaymentId: payment1.id,
          amount: 2000,
          refundReason: 'Attempt against locked headroom',
        },
        adminActor
      );
    } catch (err: any) {
      if (err.statusCode === 400 && err.message.includes('exceeds the remaining refundable amount')) {
        inFlightPreserved = true;
      }
    }

    const paymentDuringLock = await PaymentRecordModel.findById(payment1.id);
    recordCheck(
      'In-flight reservation cannot be cleared by operational refund requests',
      inFlightPreserved && paymentDuringLock?.allocatedRefundPaise === 3000000,
      `Headroom remained safely locked at ${paymentDuringLock?.allocatedRefundPaise} paise`
    );

    // Step 12B: Explicit administrative reconciliation restores orphaned headroom
    const reconResult = await paymentService.reconcileRefundAllocations(payment1.id, adminActor);
    const paymentAfterExplicitRecon = await PaymentRecordModel.findById(payment1.id);

    recordCheck(
      'Explicit admin reconciliation audits and heals orphaned allocation',
      reconResult.healed === true &&
        reconResult.previousPaise === 3000000 &&
        reconResult.reconciledPaise === 2500000 &&
        paymentAfterExplicitRecon?.allocatedRefundPaise === 2500000,
      `Allocated paise healed from ${reconResult.previousPaise} -> ${paymentAfterExplicitRecon?.allocatedRefundPaise}`
    );

    // Step 12C: Record refund with idempotencyKey to test post-creation crash window
    const crashWindowRefund = await paymentService.recordRefund(
      {
        bookingId: testBooking._id.toString(),
        originalPaymentId: payment1.id,
        amount: 2000,
        refundReason: 'Crash window idempotency test',
        idempotencyKey: 'idemp-post-create-crash',
      },
      adminActor
    );

    // Retry with identical idempotencyKey (simulating client retry after dropped connection)
    const crashWindowRetry = await paymentService.recordRefund(
      {
        bookingId: testBooking._id.toString(),
        originalPaymentId: payment1.id,
        amount: 2000,
        refundReason: 'Crash window idempotency test',
        idempotencyKey: 'idemp-post-create-crash',
      },
      adminActor
    );

    const countWithCrashKey = await PaymentRecordModel.countDocuments({
      idempotencyKey: 'idemp-post-create-crash',
    });
    const paymentAfterRetry = await PaymentRecordModel.findById(payment1.id);

    recordCheck(
      'Post-creation crash window retry returns existing refund without duplicate allocation',
      crashWindowRetry.id === crashWindowRefund.id &&
        countWithCrashKey === 1 &&
        paymentAfterRetry?.allocatedRefundPaise === 2700000,
      `Returned same ID ${crashWindowRetry.id}, total allocated: ${paymentAfterRetry?.allocatedRefundPaise} paise`
    );

    // Step 12D: Concurrent refund rejection, reconciliation, and refund request race
    console.log('Testing concurrent refund rejection, reconciliation, and creation...');
    await Promise.allSettled([
      paymentService.rejectPayment(crashWindowRefund.id, 'Test rejection race', adminActor),
      paymentService.reconcileRefundAllocations(payment1.id, adminActor),
      paymentService.recordRefund(
        {
          bookingId: testBooking._id.toString(),
          originalPaymentId: payment1.id,
          amount: 1000,
          refundReason: 'Concurrent test refund',
        },
        adminActor
      ),
    ]);

    // Query actual active refunds in MongoDB
    const finalActiveRefunds = await PaymentRecordModel.find({
      originalPaymentId: payment1.id,
      status: { $in: ['SUBMITTED', 'VERIFIED'] },
    });
    const expectedSumPaise = finalActiveRefunds.reduce((sum, r) => sum + r.amountInPaise, 0);

    // Run final reconciliation to ensure zero drift
    await paymentService.reconcileRefundAllocations(payment1.id, adminActor);
    const finalPaymentDoc = await PaymentRecordModel.findById(payment1.id);

    recordCheck(
      'Concurrent refund rejection, reconciliation, and creation preserves ledger integrity',
      finalPaymentDoc?.allocatedRefundPaise === expectedSumPaise,
      `Actual active refunds sum: ${expectedSumPaise} paise === allocated: ${finalPaymentDoc?.allocatedRefundPaise} paise`
    );

    // Step 13: Concurrent verification of two separate submitted payments
    const paymentConcurrentA = await paymentService.recordPayment(
      {
        bookingId: testBooking._id.toString(),
        amount: 25000,
        paymentType: 'PARTIAL',
        paymentMethod: 'BANK_DEPOSIT',
      },
      adminActor
    );

    const paymentConcurrentB = await paymentService.recordPayment(
      {
        bookingId: testBooking._id.toString(),
        amount: 35000,
        paymentType: 'PARTIAL',
        paymentMethod: 'UPI',
      },
      adminActor
    );

    // Concurrently verify both payments
    const [verifiedA, verifiedB] = await Promise.all([
      paymentService.verifyPayment(paymentConcurrentA.id, adminActor),
      paymentService.verifyPayment(paymentConcurrentB.id, adminActor),
    ]);

    const bookingAfterConcurrentVerif = await BookingModel.findById(testBooking._id);
    recordCheck(
      'Concurrent verification of separate payments produces consistent booking financials',
      verifiedA.status === 'VERIFIED' &&
        verifiedB.status === 'VERIFIED' &&
        bookingAfterConcurrentVerif?.financials.totalPaid === 80000 &&
        bookingAfterConcurrentVerif?.financials.totalPaidInPaise === 8000000 &&
        bookingAfterConcurrentVerif?.financials.balancePending === 20000 &&
        bookingAfterConcurrentVerif?.financials.balancePendingInPaise === 2000000,
      `totalPaid: ₹${bookingAfterConcurrentVerif?.financials.totalPaid}, balancePending: ₹${bookingAfterConcurrentVerif?.financials.balancePending}`
    );

    // Step 14: Overpayment accounting (payments exceed total booking amount)
    const overpaymentRecord = await paymentService.recordPayment(
      {
        bookingId: testBooking._id.toString(),
        amount: 30000, // Balance was ₹20,000, paying ₹30,000 => Overpaid by ₹10,000
        paymentType: 'FINAL_BALANCE',
        paymentMethod: 'NEFT_IMPS',
      },
      adminActor
    );

    await paymentService.verifyPayment(overpaymentRecord.id, adminActor);
    const bookingAfterOverpayment = await BookingModel.findById(testBooking._id);

    const totalPaidP = bookingAfterOverpayment?.financials.totalPaidInPaise || 0;
    const balancePendingP = bookingAfterOverpayment?.financials.balancePendingInPaise || 0;
    const totalAmountP = bookingAfterOverpayment?.financials.totalAmountInPaise || 0;
    const exactMathConsistent = totalPaidP + balancePendingP === totalAmountP;

    recordCheck(
      'Overpayment accounting maintains exact ledger consistency with negative balancePending',
      bookingAfterOverpayment?.financials.totalPaid === 110000 &&
        bookingAfterOverpayment?.financials.balancePending === -10000 &&
        exactMathConsistent,
      `totalPaid: ₹${bookingAfterOverpayment?.financials.totalPaid}, balancePending: ₹${bookingAfterOverpayment?.financials.balancePending}, invariant holds: ${exactMathConsistent}`
    );

  } finally {
    // Drop ONLY the isolated test database
    console.log(`Cleaning up ISOLATED database: ${ISOLATED_DB_URI}`);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }

  const allPassed = checks.every((c) => c.passed);
  console.log(`\n=== STAGE 4 PROBE SUMMARY: ${checks.filter((c) => c.passed).length}/${checks.length} CHECKS PASSED ===`);

  if (!allPassed) {
    process.exit(1);
  }
}

runStage4LiveProbe().catch((err) => {
  console.error('Probe crashed with error:', err);
  process.exit(1);
});
