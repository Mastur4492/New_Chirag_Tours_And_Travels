import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/database';
import { AuditLogModel } from '../models/auditLog.model';
import { CustomerModel } from '../models/customer.model';
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

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response
  }

  return { status: res.status, ok: res.ok, body: data };
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: Live test verification scripts cannot run against a production environment.');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('🏁 STARTING PHASE 3 LIVE END-TO-END VERIFICATION AUDIT');
  console.log('======================================================\n');

  await connectDB();

  try {
    // ----------------------------------------------------
    // STEP 1: Admin Authentication
    // ----------------------------------------------------
    console.log('\n--- 1. Authentication & Agent Setup ---');
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        mobile: process.env.BOOTSTRAP_ADMIN_MOBILE || '9999999999',
        password: process.env.BOOTSTRAP_ADMIN_PASSWORD || 'TestAdmin@12345!',
      },
    });
    assert(adminLogin.status === 200, 'Admin login succeeded', `HTTP ${adminLogin.status}`);
    const adminToken = adminLogin.body?.data?.accessToken;
    assert(!!adminToken, 'Admin access token acquired');

    // Create / ensure an Agent exists for row-level testing
    const agentMobile = '9876543299';
    let agent = await UserModel.findOne({ mobile: agentMobile });
    if (!agent) {
      const passwordHash = await bcrypt.hash(process.env.TEST_AGENT_PASSWORD || 'TestAgentPass@123!', 10);
      agent = await UserModel.create({
        fullName: 'Phase 3 Verification Agent',
        mobile: agentMobile,
        email: 'agent_phase3@chirag.test',
        passwordHash,
        role: 'AGENT',
        status: 'ACTIVE',
        agentProfile: {
          maxDiscountPercent: 5,
          maxMarkupPercent: 20,
          canApproveFinalPrice: false,
        },
      });
    }

    const agentLogin = await request('/auth/login', {
      method: 'POST',
      body: { mobile: agentMobile, password: process.env.TEST_AGENT_PASSWORD || 'TestAgentPass@123!' },
    });
    assert(agentLogin.status === 200, 'Agent login succeeded', `HTTP ${agentLogin.status}`);
    const agentToken = agentLogin.body?.data?.accessToken;
    const agentId = agent._id.toString();

    // ----------------------------------------------------
    // STEP 2: Customer Deduplication & Mobile Normalization
    // ----------------------------------------------------
    console.log('\n--- 2. Customer Ingestion & Phone Deduplication ---');
    const custRawMobile = '+91 98111 22334';
    // Clean existing test record if re-running
    await CustomerModel.deleteOne({ mobile: '9811122334' });

    const custCreate = await request('/customers', {
      method: 'POST',
      token: adminToken,
      body: {
        fullName: 'Vikram Malhotra',
        mobile: custRawMobile,
        email: 'vikram.malhotra@test.com',
        city: 'Delhi',
      },
    });

    assert(custCreate.status === 201, 'Customer created with formatted mobile', `HTTP ${custCreate.status}`);
    assert(custCreate.body?.data?.mobile === '9811122334', 'Mobile number normalized to 10 digits', custCreate.body?.data?.mobile);
    const customerId = custCreate.body?.data?.id;

    // Test Deduplication Collision
    const custDuplicate = await request('/customers', {
      method: 'POST',
      token: adminToken,
      body: {
        fullName: 'Vikram Malhotra Duplicate',
        mobile: '09811122334', // Different formatting, same normalized number
      },
    });
    assert(custDuplicate.status === 409, 'Duplicate customer mobile rejected with 409 Conflict', `HTTP ${custDuplicate.status}`);

    // ----------------------------------------------------
    // STEP 3: Lead Creation & Admin Reassignment
    // ----------------------------------------------------
    console.log('\n--- 3. Lead Creation & Reassignment ---');
    // Fetch a real destination
    const destList = await request('/destinations?limit=1');
    const destinationId = destList.body?.data?.[0]?.id;
    assert(!!destinationId, 'Existing destination loaded for lead creation', destList.body?.data?.[0]?.name);

    const leadCreate = await request('/leads', {
      method: 'POST',
      token: adminToken,
      body: {
        customerId,
        destinationId,
        tentativeTravelDate: '2026-05-15',
        durationNights: 3,
        numberOfAdults: 2,
        numberOfChildren: 1,
        specialRequirements: 'Near Dal lake preferred',
      },
    });

    assert(leadCreate.status === 201, 'Lead created', `HTTP ${leadCreate.status}`);
    const leadNumber = leadCreate.body?.data?.leadNumber;
    assert(/^NCT-LD-\d{4}-\d{5}$/.test(leadNumber), 'Lead number matches NCT-LD-YYYY-XXXXX format', leadNumber);
    const leadId = leadCreate.body?.data?.id;

    // Reassign lead to agent
    const leadReassign = await request(`/leads/${leadId}/assign`, {
      method: 'POST',
      token: adminToken,
      body: { assignedAgentId: agentId },
    });
    assert(leadReassign.status === 200, 'Admin reassigned lead to agent', `HTTP ${leadReassign.status}`);
    assert(leadReassign.body?.data?.assignedAgentId === agentId, 'Assigned agent updated correctly');
    assert(leadReassign.body?.data?.status === 'ASSIGNED', 'Lead status transitioned to ASSIGNED');

    // ----------------------------------------------------
    // STEP 4: Quotation Calculation & Guardrails
    // ----------------------------------------------------
    console.log('\n--- 4. Quotation Calculation & Agent Limits ---');
    // Load a hotel and room category
    const hotelList = await request('/hotels?limit=5');
    let hotelId: string | undefined;
    let roomCategoryId: string | undefined;

    for (const h of hotelList.body?.data || []) {
      if (h.roomCategories && h.roomCategories.length > 0) {
        hotelId = h.id;
        roomCategoryId = h.roomCategories[0].id;
        break;
      }
    }

    // Load a transport tariff if available
    const tariffList = await request('/transport/tariffs?limit=1');
    const tariffId = tariffList.body?.data?.[0]?.id;

    const calcPreview = await request('/quotations/calculate', {
      method: 'POST',
      token: agentToken,
      body: {
        leadId,
        destinationId,
        travelStartDate: '2026-05-15',
        travelEndDate: '2026-05-18', // 3 nights
        numberOfAdults: 2,
        numberOfChildren: 0,
        hotels: hotelId && roomCategoryId ? [
          {
            hotelId,
            roomCategoryId,
            checkInDate: '2026-05-15',
            checkOutDate: '2026-05-18',
            numberOfRooms: 1,
            adultsCount: 2,
            mealPlan: 'CP',
          },
        ] : [],
        transports: tariffId ? [
          {
            tariffId,
            pricingBasis: tariffList.body.data[0].tariffBasis,
            numberOfDays: 3,
          },
        ] : [],
        markupPercent: 12,
        discountPercent: 2,
        isTaxApplicable: true,
      },
    });

    assert(calcPreview.status === 200, 'Quotation calculation preview succeeded', `HTTP ${calcPreview.status}`);
    assert(calcPreview.body?.data?.pricingSummary?.finalSellingPrice > 0, 'Final selling price calculated deterministically');

    // Create quote exceeding agent discount limit (8% discount > 5% agent max limit)
    const quoteOverLimit = await request('/quotations', {
      method: 'POST',
      token: agentToken,
      body: {
        leadId,
        destinationId,
        travelStartDate: '2026-05-15',
        travelEndDate: '2026-05-18',
        numberOfAdults: 2,
        numberOfChildren: 0,
        hotels: hotelId && roomCategoryId ? [
          {
            hotelId,
            roomCategoryId,
            checkInDate: '2026-05-15',
            checkOutDate: '2026-05-18',
            numberOfRooms: 1,
            adultsCount: 2,
            mealPlan: 'CP',
          },
        ] : [],
        transports: tariffId ? [
          {
            tariffId,
            pricingBasis: tariffList.body.data[0].tariffBasis,
            numberOfDays: 3,
          },
        ] : [],
        markupPercent: 12,
        discountPercent: 8, // VIOLATES AGENT 5% LIMIT!
        isTaxApplicable: true,
      },
    });

    assert(quoteOverLimit.status === 201, 'Quotation created', `HTTP ${quoteOverLimit.status}`);
    assert(quoteOverLimit.body?.data?.status === 'PENDING_ADMIN_APPROVAL', 'Status forced to PENDING_ADMIN_APPROVAL due to discount violation');
    const quoteNumber = quoteOverLimit.body?.data?.quoteNumber;
    assert(/^NCT-QT-\d{4}-\d{5}$/.test(quoteNumber), 'Quote number matches NCT-QT-YYYY-XXXXX format', quoteNumber);
    const quoteId = quoteOverLimit.body?.data?.id;

    // Verify confidential fields masked for Agent
    assert(quoteOverLimit.body?.data?.pricingSummary?.totalBaseSupplierCost === undefined, 'Supplier cost masked in agent response');
    assert(quoteOverLimit.body?.data?.pricingSummary?.projectedGrossProfit === undefined, 'Projected profit masked in agent response');

    // ----------------------------------------------------
    // STEP 5: Admin Approval & Issuance
    // ----------------------------------------------------
    console.log('\n--- 5. Admin Approval & Token Issuance ---');
    // Agent attempts to issue quote while pending approval -> should fail
    const prematureIssue = await request(`/quotations/${quoteId}/issue`, {
      method: 'POST',
      token: agentToken,
    });
    assert(prematureIssue.status === 400, 'Issuance blocked while pending admin approval', `HTTP ${prematureIssue.status}`);

    // Admin approves override
    const adminApprove = await request(`/quotations/${quoteId}/approve`, {
      method: 'POST',
      token: adminToken,
      body: { decision: 'APPROVE', notes: 'Approved 8% discount for seasonal promotion' },
    });
    assert(adminApprove.status === 200, 'Admin approved quotation override', `HTTP ${adminApprove.status}`);
    assert(adminApprove.body?.data?.status === 'APPROVED', 'Quotation status updated to APPROVED');

    // Agent issues quote now that it is approved
    const issueQuote = await request(`/quotations/${quoteId}/issue`, {
      method: 'POST',
      token: agentToken,
    });
    assert(issueQuote.status === 200, 'Quotation issued successfully', `HTTP ${issueQuote.status}`);
    const rawShareableToken = issueQuote.body?.data?.shareableToken;
    assert(!!rawShareableToken && rawShareableToken.length === 64, 'Raw 64-char crypto token returned on issuance', rawShareableToken?.slice(0, 16) + '...');

    // ----------------------------------------------------
    // STEP 6: Public Customer Access & Zero Cost Leakage
    // ----------------------------------------------------
    console.log('\n--- 6. Public Customer Access & Confidentiality ---');
    const publicQuote = await request(`/quotations/public/${rawShareableToken}`);
    assert(publicQuote.status === 200, 'Public customer endpoint accessed without auth token', `HTTP ${publicQuote.status}`);
    assert(publicQuote.body?.data?.quoteNumber === quoteNumber, 'Public quotation matches quote number');

    const publicJson = JSON.stringify(publicQuote.body?.data);
    assert(!publicJson.includes('totalBaseSupplierCost'), 'ZERO LEAKAGE: totalBaseSupplierCost omitted from public view');
    assert(!publicJson.includes('projectedGrossProfit'), 'ZERO LEAKAGE: projectedGrossProfit omitted from public view');
    assert(!publicJson.includes('supplierCost'), 'ZERO LEAKAGE: line-item supplierCost omitted from public view');
    assert(!publicJson.includes('markupPercent'), 'ZERO LEAKAGE: markupPercent omitted from public view');

    // ----------------------------------------------------
    // STEP 7: Revision & Immutable Version History
    // ----------------------------------------------------
    console.log('\n--- 7. Quotation Revision & Immutable History ---');
    const quoteRevise = await request(`/quotations/${quoteId}/revise`, {
      method: 'POST',
      token: agentToken,
      body: {
        leadId,
        destinationId,
        travelStartDate: '2026-05-15',
        travelEndDate: '2026-05-19', // extended by 1 night
        numberOfAdults: 2,
        numberOfChildren: 0,
        hotels: hotelId && roomCategoryId ? [
          {
            hotelId,
            roomCategoryId,
            checkInDate: '2026-05-15',
            checkOutDate: '2026-05-19',
            numberOfRooms: 1,
            adultsCount: 2,
            mealPlan: 'CP',
          },
        ] : [],
        transports: [],
        markupPercent: 15,
        discountPercent: 0,
        changeReason: 'Client requested 1 extra night extension',
      },
    });

    assert(quoteRevise.status === 200, 'Quotation revised', `HTTP ${quoteRevise.status}`);
    assert(quoteRevise.body?.data?.currentVersion === 2, 'Current version incremented to 2');

    // Check version archive
    const versionsList = await request(`/quotations/${quoteId}/versions`, {
      token: agentToken,
    });
    assert(versionsList.status === 200, 'Quotation versions retrieved', `HTTP ${versionsList.status}`);
    assert(versionsList.body?.data?.length >= 1, 'Previous version archived in QuotationVersion collection');
    assert(versionsList.body?.data?.[0]?.versionNumber === 1, 'Archived version preserved as v1');
    assert(versionsList.body?.data?.[0]?.changeReason === 'Client requested 1 extra night extension', 'Change reason preserved');

    // ----------------------------------------------------
    // STEP 8: Audit Logging Integrity
    // ----------------------------------------------------
    console.log('\n--- 8. Audit Logging Verification ---');
    const custAudit = await AuditLogModel.findOne({ entityType: 'CUSTOMER', entityId: customerId });
    assert(!!custAudit, 'CUSTOMER_CREATED audit log found in MongoDB');

    const leadAudit = await AuditLogModel.findOne({ entityType: 'LEAD', entityId: leadId, action: 'LEAD_CREATED' });
    assert(!!leadAudit, 'LEAD_CREATED audit log found in MongoDB');

    const leadAssignAudit = await AuditLogModel.findOne({ entityType: 'LEAD', entityId: leadId, action: 'LEAD_ASSIGNED' });
    assert(!!leadAssignAudit, 'LEAD_ASSIGNED audit log found in MongoDB');

    const quoteAudit = await AuditLogModel.findOne({ entityType: 'QUOTATION', entityId: quoteId, action: 'QUOTATION_CREATED' });
    assert(!!quoteAudit, 'QUOTATION_CREATED audit log found in MongoDB');

    const quoteOverrideAudit = await AuditLogModel.findOne({ entityType: 'QUOTATION', entityId: quoteId, action: 'QUOTATION_PRICE_OVERRIDE_APPROVED' });
    assert(!!quoteOverrideAudit, 'QUOTATION_PRICE_OVERRIDE_APPROVED audit log found in MongoDB');

    const quoteReviseAudit = await AuditLogModel.findOne({ entityType: 'QUOTATION', entityId: quoteId, action: 'QUOTATION_REVISED' });
    assert(!!quoteReviseAudit, 'QUOTATION_REVISED audit log found in MongoDB');

    const quoteVersionAudit = await AuditLogModel.findOne({ entityType: 'QUOTATION', entityId: quoteId, action: 'QUOTATION_VERSION_CREATED' });
    assert(!!quoteVersionAudit, 'QUOTATION_VERSION_CREATED audit log found in MongoDB');

  } catch (err: any) {
    console.error('💥 Unhandled error in live verification:', err);
    assert(false, 'Unexpected error', err.message);
  } finally {
    await disconnectDB();
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log('\n======================================================');
  console.log(`📊 PHASE 3 AUDIT RESULTS: ${passed}/${results.length} PASSED (${failed} FAILED)`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main();
