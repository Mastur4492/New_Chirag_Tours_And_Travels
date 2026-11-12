# NEW CHIRAG TOURS AND TRAVELS
## Product Requirements Document (PRD) — Master Specification

**Product Name:** NEW CHIRAG TOURS AND TRAVELS  
**Business Owner:** Faisal Bikanerwala  
**Document Version:** 1.0.0 (Phase 0 Baseline)  
**Status:** Approved Architectural Foundation  

---

## 1. Executive Summary & Vision

**New Chirag Tours and Travels** is a next-generation, production-grade travel business platform designed and operated for Faisal Bikanerwala. It unifies the entire lifecycle of domestic (and future international) holiday package operations into an integrated system:
$$\text{Travel Sales} + \text{Quotation Engine} + \text{Booking Management} + \text{CRM} + \text{Operations} + \text{Profit Governance}$$

### 1.1 The Core Business Problem
Traditional travel businesses rely on fragmented phone calls, WhatsApp messages, disconnected Excel rate cards, paper vouchers, and untracked agent commissions. This results in:
- Revenue leakage through unrecorded discounts and pricing errors.
- Quotation calculation delays causing lost bookings.
- Zero auditability over who quoted what price or who authorized discounts.
- Inability to accurately determine gross profit per booking, per agent, or per destination.
- Bottlenecks where the business owner is trapped manually pricing every lead.

### 1.2 The Strategic Solution
A centralized multi-portal web architecture backed by a single deterministic backend API and database:
1. **Admin Portal:** Control center for owner Faisal Bikanerwala and core operations managers.
2. **Agent Portal:** Streamlined portal for in-house and affiliated travel agents to generate rapid quotes, service walk-ins, and track commissions.
3. **Customer Portal:** Clean, modern, mobile-first web storefront for travelers to discover packages, request quotes, and track bookings without viewing internal B2B cost breakdowns.
4. **Future Mobile App:** Flutter client directly consuming the same central REST API (post-web stabilization).

---

## 2. Scope & Geographical Strategy

### 2.1 Dynamic Multi-Destination Architecture
The application **MUST NOT** be hardcoded around any single destination (e.g., Goa). Goa is merely one destination among many.

Initial Domestic Destinations:
- **Goa** (North Goa, South Goa, Coastal)
- **Kashmir** (Srinagar, Gulmarg, Pahalgam, Sonmarg)
- **Jammu** (Katra, Vaishno Devi, Patnitop)
- **Himachal Pradesh** (Shimla, Manali, Dharamshala, Dalhousie, Spiti)
- **Kerala** (Munnar, Thekkady, Alleppey, Kovalam, Wayanad)
- **Rajasthan** (Jaipur, Udaipur, Jodhpur, Jaisalmer, Pushkar)
- **Andaman & Nicobar Islands** (Port Blair, Havelock, Neil)
- **Uttarakhand & Other Indian States** (Rishikesh, Mussoorie, Nainital, Char Dham)

### 2.2 Future International Expansion
The domain models for destinations, hotels, tariffs, and taxes must support:
- Multi-currency structures (INR primary, USD/EUR/AED secondary).
- Visa requirements flags.
- Country/State/City geographic hierarchies.
- Region-specific tax configurations (e.g., Indian GST vs. International VAT).

---

## 3. User Personas & Portal Boundaries

| Persona | Portal | Primary Objectives | Access Constraints |
| :--- | :--- | :--- | :--- |
| **Super Admin / Business Owner** (Faisal Bikanerwala) | Admin Web | Full operational authority: view net supplier costs, define markups, configure inventory, assign leads, monitor gross profit, audit all actions. | Complete system read/write access. |
| **Operations Manager** | Admin Web | Allocate drivers/vehicles, issue hotel vouchers, verify advance payments, manage vendor balances. | Configurable operational access; no owner-level financial overrides without approval. |
| **Travel Agent** | Agent Web | Intake walk-ins/phone leads, configure custom itineraries, generate customer quotations, request bookings, monitor personal sales. | Strict boundary: Cannot view supplier base costs or global business profit; cannot view other agents' customers or leads. |
| **End Customer / Traveler** | Customer Web | Browse destinations & itineraries, submit travel inquiries, view interactive quotes, request bookings, communicate via WhatsApp/Phone. | Strict boundary: Sees only customer-facing selling prices and package inclusions; zero access to internal CRM or margin logic. |

---

## 4. Master Data & Inventory Management

### 4.1 Destination Master
- `name`: Destination title (e.g., "Kashmir").
- `slug`: URL-friendly identifier.
- `country`, `state`, `region`: Geographic hierarchy.
- `coverImages`, `description`, `highlights`, `bestTimeToVisit`.
- `isActive`: Operational availability switch.

### 4.2 Hotel & Room Inventory Master
- **Hotel Details:** Name, star rating (1–5 Star, Heritage, Boutique), destination link, full address, geolocation, contact details, vendor contract references, amenities list, check-in/out policies, images.
- **Room Categories:** Standard, Deluxe, Super Deluxe, Premium, Suite, Family Room, Luxury Tent.
- **Meal Plans (Industry Standard Codes):**
  - **RO / EP (Room Only / European Plan):** Lodging only, no meals.
  - **CP (Continental Plan):** Lodging + Daily Breakfast.
  - **MAP (Modified American Plan):** Lodging + Breakfast + Dinner (or Lunch).
  - **AP (American Plan):** Lodging + Breakfast + Lunch + Dinner.
- **Occupancy Rules:** Base adults, max adults, max children, extra adult bed pricing, child with bed (CWB) pricing, child without bed (CNB) pricing.

### 4.3 Transport & Fleet Master
Strict entity separation:
1. **Vehicle Owner / Fleet Vendor:** Business legal name, contact person, phone, settlement terms, GSTIN/PAN.
2. **Vehicle:** Registration number, model (e.g., Innova Crysta, Dzire, Tempo Traveller 12-seater, Urbania), category (Sedan, SUV, Luxury SUV, Van), seating capacity, luggage capacity, AC/Non-AC, insurance/fitness document expiry, status.
3. **Driver:** Full name, mobile number, alternate contact, driving license number, assigned vehicle ID, language proficiencies, verification status.
4. **Transport Tariff:** Route/slab-based pricing (e.g., "Srinagar local 3 days", "Goa airport transfer North", "Manali-Rohtang day excursion"), rate per day, rate per km, extra hour/km charges, driver daily allowance (bhatta), toll/parking inclusion flags.

### 4.4 Tour Packages Master
Pre-configured ready-to-sell itineraries:
- Title (e.g., "5N/6D Enchanting Kashmir Family Special").
- Destination reference, duration (Nights & Days).
- Day-wise itinerary with title, description, activity tags, and sightseeing highlights.
- Inclusions (e.g., "Daily breakfast & dinner", "Private AC Innova for all transfers & sightseeing", "Shikara ride on Dal Lake 1 hour").
- Exclusions (e.g., "Airfare", "Gondola ticket phase 2", "Pony rides", "Personal expenses").
- Default hotel tiers (Budget, Standard, Deluxe, Luxury).
- Terms & cancellation policy.

---

## 5. Dynamic Seasonal Pricing Engine Requirements

The seasonal pricing engine is a core requirement of New Chirag Tours and Travels. Peak seasons (Christmas/New Year in Goa, Tulip Festival in Kashmir, Diwali in Rajasthan) carry radically different supplier costs and retail markups.

### 5.1 Season Configuration
- **Season Tiers:**
  - `REGULAR` (Standard baseline rates)
  - `PEAK` (High demand periods)
  - `SUPER_PEAK` (Christmas/New Year: Dec 20 – Jan 05)
  - `OFF_SEASON` (Monsoon/summer dips)
  - `FESTIVAL` (Diwali, Eid, Pushkar Fair, Durga Puja)
- **Season Definition Fields:** Destination reference, start date, end date, priority level (1–100, where higher numbers override lower overlapping ranges).

### 5.2 Deterministic Pricing Resolution
- The system must prevent conflicting season rules through priority resolution:
  $$\text{Resolved Season} = \arg\max_{\text{season} \in S(\text{date})} (\text{season.priority})$$
- For a multi-night stay straddling multiple seasons (e.g., Dec 18 to Dec 23):
  The engine must evaluate each individual night against the calendar season to produce accurate day-by-day itemized room rates.

---

## 6. Lead Management & Source Attribution

### 6.1 Lead Sources
Every lead ingested into the CRM must be strictly tagged with its origin:
- `ADMIN_DIRECT`: Inbound call/meeting directly to Faisal Bikanerwala.
- `CUSTOMER_WEB`: Form submission from the customer storefront.
- `CUSTOMER_APP`: Inbound submission from mobile app (future).
- `AGENT`: Walk-in or phone enquiry captured by a designated agent.
- `PHONE`: General inbound inquiry to office landline/mobile.
- `WALK_IN`: Physical walk-in to main Chirag office.
- `OTHER`: Referral, social media campaign, or partner desk.

### 6.2 Agent Assignment & Re-Assignment Workflow
- Inbound inquiries from `CUSTOMER_WEB` enter the central pool with status `UNASSIGNED`.
- Admin reviews the lead and explicitly assigns it to an agent based on destination specialization or agent capacity.
- The lead retains `assignedAgentId`, `assignedBy`, and `assignedAt`.
- Admin can reassign a lead at any stage if the agent is unresponsive.
- Customers cannot pick or reassign their own agent.

---

## 7. Quotation Engine Requirements

### 7.1 Quotation Structure
A quotation represents a formal financial and operational proposal:
- Unique Reference Code: e.g., `NCT-QT-2026-0001`.
- Customer Reference (Name, Phone, Email, City).
- Lead Reference & Assigned Agent Reference.
- Travel Dates, Total Nights/Days, Pax Count (Adults, Children above 5, Infants).
- Selected Destination, Hotels by Night, Room Category, Meal Plan.
- Allocated Vehicle Type & Transport Tariff.
- Itemized Inclusions & Exclusions.
- Comprehensive Financial Breakdown:
  $$\text{Base Supplier Cost} + \text{Agent/Admin Markup} - \text{Discount} + \text{Taxes (GST)} = \text{Final Selling Price}$$
- Gross Profit Calculation:
  $$\text{Gross Profit} = \text{Selling Price} - \text{Base Cost} - \text{Taxes Payable}$$
- Validity Expiration Date (e.g., valid for 7 days or till season change).

### 7.2 Strict Versioning & Audit Trail
- Edits to an active quotation must increment its version (`v1`, `v2`, `v3`).
- Previous versions must be archived as immutable snapshots.
- No silent overwrites of price quotes that were already shown or sent to a customer.

### 7.3 Agent Pricing Boundaries & Permission Controls
The backend must enforce per-agent financial caps:
- `maxDiscountPercent`: e.g., Agent Rahul cannot offer more than 5% discount without Admin approval.
- `maxMarkupPercent` / `minMarkupPercent`: Guardrails against uncompetitive over-quoting or unprofitable under-quoting.
- `canApproveFinalPrice`: If `false`, quotes with non-zero discounts enter `PENDING_ADMIN_APPROVAL` status.

---

## 8. Booking & Operations Lifecycle

### 8.1 From Quotation to Booking
```
Lead Ingestion 
  → Quotation Generated (v1) 
  → Customer Approves 
  → Booking Request Created 
  → Advance Payment Verified (Manual) 
  → Booking Confirmed 
  → Vouchers Issued 
  → Operational Trip Execution 
  → Balance Payment Settled 
  → Completed
```

### 8.2 Manual Payment Verification
- Initial phase strictly uses **manual payment verification** (Bank Transfer / NEFT / IMPS / UPI screenshot / Cash at office).
- No payment gateway (Razorpay/Stripe) integration in Phase 0 or Phase 1.
- Each payment record tracks:
  - `amount`, `paymentMethod` (UPI, NEFT, CASH, CHEQUE), `referenceNumber` (UTR/Transaction ID), `paymentDate`, `receiptNumber`, `verifiedBy` (Admin/Finance ID), `status` (`SUBMITTED`, `VERIFIED`, `REJECTED`).
- Confirmed booking status requires minimum configured advance (e.g., 30% or 50%).

### 8.3 Operational Vouchers & Payables
- **Hotel Service Voucher:** Issued to hotel containing guest names, check-in/out, meal plan, room category, special notes. Must hide selling price and agent margin.
- **Driver Duty Slip:** Vehicle details, guest name, contact, pickup location, day-wise route.
- **Supplier Payables Ledger:** Tracks outstanding amounts owed to hotels and fleet owners.

---

## 9. Agent Performance & Analytics Requirements

All metrics in Admin and Agent dashboards must be calculated directly from live database transactions (no mock or hardcoded numbers):
- **Volume Metrics:** Total Leads Assigned, Total Quotes Generated, Total Bookings Closed.
- **Conversion Rates:** Lead-to-Quote %, Quote-to-Booking %, Overall Win Rate %.
- **Financial Metrics:** Gross Sales (₹), Net Supplier Cost (₹), Realized Gross Profit (₹), Average Deal Size (₹).
- **Payment Metrics:** Advance Collected (₹), Outstanding Balance Pending from Customers (₹).
- **Date-Range Filtering:** Today, This Week, This Month, Custom Date Range.

---

## 10. Auditability & Security Requirements

- **Audit Log Trail:** Every write/update on pricing, user permissions, lead assignment, booking confirmation, and payment verification must write an immutable audit log record.
- **Access Isolation:**
  - Agents can only query their own leads, quotations, and bookings.
  - Customers can only view their own quote link / booking summary.
  - Base costs, vendor contracts, and profit margins are stripped at the backend controller level for all non-Admin roles.
- **Authentication Security:**
  - Passwords hashed with bcrypt (minimum 12 salt rounds).
  - Short-lived JWT Access Tokens (15 minutes).
  - Secure HTTP-only Refresh Tokens (7 days) with sliding rotation.
  - Rate limiting on authentication and quotation endpoints.

---

## 11. Customer Experience Requirements

- Visual, high-impact design showcasing destinations and premium holiday photography.
- Zero ERP jargon shown to customers (no "B2B rates", "CP/MAP codes" without friendly descriptions, "vendor payables", or "markup percentages").
- Mobile-first responsiveness (smooth touch targets, fast load times, lightweight bundle).
- Direct WhatsApp & Phone contact CTAs pre-populated with inquiry references.

---

*End of Product Requirements Document.*
