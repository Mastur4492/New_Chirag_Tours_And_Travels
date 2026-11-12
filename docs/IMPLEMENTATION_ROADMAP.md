# NEW CHIRAG TOURS AND TRAVELS
## Implementation Roadmap & Milestone Guide

**Product:** NEW CHIRAG TOURS AND TRAVELS  
**Business Owner:** Faisal Bikanerwala  
**Document Version:** 1.0.0 (Phase 0 Baseline)  
**Status:** Approved for Phased Execution  

---

## Roadmap Overview

```
Phase 0: Architecture & Foundation (Current Phase)
   ↓
Phase 1: Monorepo Setup, Shared Packages & Core Backend Infrastructure
   ↓
Phase 2: Master Data & Inventory Engine (Destinations, Hotels, Vehicles, Tariffs, Seasons)
   ↓
Phase 3: Central Deterministic Pricing Engine & Quotation System
   ↓
Phase 4: CRM, Lead Management & Agent Assignment
   ↓
Phase 5: Booking Management, Manual Payment Verification & Operations
   ↓
Phase 6: Admin Web Portal (Control Center for Faisal Bikanerwala)
   ↓
Phase 7: Agent Web Portal (Travel Desk & Fast Quote Workflow)
   ↓
Phase 8: Customer Web Portal (Discovery & Public Quote Viewer)
   ↓
Phase 9: Real-Time Reporting, Analytics & Profit Auditing
   ↓
Phase 10: Production Hardening, Security Audit & Launch Preparation
```

---

## Detailed Phase Breakdown

### Phase 0: Production Architecture & Project Foundation (CURRENT PHASE)
- **Objective:** Establish the comprehensive architectural blueprint, business requirements, entity diagrams, lifecycle state machines, and monorepo workspace foundation.
- **Key Deliverables:**
  - `docs/ARCHITECTURE.md` (20 core architectural domains detailed)
  - `docs/PRODUCT_REQUIREMENTS.md` (Full PRD for Faisal Bikanerwala)
  - `docs/IMPLEMENTATION_ROADMAP.md` (This document)
  - Monorepo root setup (`package.json`, `turbo.json`, `.gitignore`, `.env.example`, `README.md`)
  - App and package directory scaffolding.
- **Exit Criteria:**
  - Architecture verified and frozen.
  - Zero application code written prematurely.
  - Review and sign-off by user before initiating Phase 1.

---

### Phase 1: Monorepo Setup, Shared Packages & Core Backend Infrastructure
- **Objective:** Configure workspace package resolution, establish type libraries, build base Express server with security middleware, and establish MongoDB connection with health check.
- **Key Deliverables:**
  - `@chirag/types`: Core TypeScript definitions for users, roles, destinations, inventory, quotes, and bookings.
  - `@chirag/validation`: Zod schemas for authentication and master data.
  - `@chirag/config`: Shared TypeScript, ESLint, and Tailwind configurations.
  - `apps/api`: Express TypeScript setup with Helmet, CORS, standard error handler, logging, rate limiting, and MongoDB connection.
  - User model, JWT authentication controllers, and RBAC middleware (`requireRole('ADMIN' | 'AGENT' | 'CUSTOMER')`).
- **Exit Criteria:**
  - Clean `npm run build` and `npm run lint` across monorepo.
  - Automated tests validating JWT issuance, token refresh, and RBAC route guarding.

---

### Phase 2: Master Data & Inventory Engine
- **Objective:** Build database models, repositories, services, and REST APIs for travel inventory.
- **Key Deliverables:**
  - Destination Master (CRUD, multi-destination support: Kashmir, Goa, Himachal, Kerala, Rajasthan, Andaman, etc.).
  - Hotel & Room Category Master (Star categories, property types, amenities, meal plan associations).
  - Seasonal Rate Cards (Base cost per night by room category, season, and meal plan: RO, CP, MAP, AP; extra adult/child bed logic).
  - Vehicle Vendor, Vehicle & Driver Master.
  - Transport Tariff Master (Day-wise / circuit rates, season modifiers, driver allowance).
  - Tour Package Master (Day-wise itineraries, inclusions, exclusions, terms).
- **Exit Criteria:**
  - Full CRUD operational via API with Zod validation.
  - Audit logging active for inventory price adjustments.

---

### Phase 3: Central Deterministic Pricing Engine & Quotation System
- **Objective:** Implement the core business logic package `@chirag/pricing` and quotation lifecycle in `apps/api`.
- **Key Deliverables:**
  - `@chirag/pricing`: Pure calculation library resolving day-by-day seasonal rates, room occupancy, transport tariff, markups, discounts, and Indian GST (5%).
  - Quotation API: Create quote, calculate live pricing, versioning engine (`QuotationVersion` snapshots: v1, v2, v3), status progression (`DRAFT` → `ISSUED` → `SENT` → `ACCEPTED`).
  - Agent financial permission enforcement (checking discount and markup thresholds; auto-routing to `PENDING_ADMIN_APPROVAL` if discount exceeds agent cap).
  - Public shareable token generation for customer web quote viewing.
- **Exit Criteria:**
  - Comprehensive Vitest unit test suite covering complex multi-night seasonal stays, extra bed combinations, and markup/discount edge cases.

---

### Phase 4: CRM, Lead Management & Agent Assignment
- **Objective:** Centralized customer and lead tracking with origin attribution and admin assignment workflows.
- **Key Deliverables:**
  - Customer Master (Deduplication by mobile/email, travel history).
  - Lead Ingestion API supporting all sources: `ADMIN_DIRECT`, `CUSTOMER_WEB`, `CUSTOMER_APP`, `AGENT`, `PHONE`, `WALK_IN`, `OTHER`.
  - Admin Agent Assignment & Re-assignment endpoints with audit logging.
  - Lead lifecycle state machine transitions (`NEW` → `ASSIGNED` → `CONTACTED` → `QUOTED` → `NEGOTIATING` → `CONVERTED` / `LOST` / `JUNK`).
  - Agent-specific lead views (row-level isolation preventing agents from accessing unassigned leads).
- **Exit Criteria:**
  - Inbound lead creates record, triggers attribution, and can be assigned to an agent by Admin.

---

### Phase 5: Booking Management, Manual Payment Verification & Operations
- **Objective:** Convert accepted quotations into confirmed bookings, track manual payments, and generate operational vouchers.
- **Key Deliverables:**
  - Booking API: Conversion from accepted quotation version, immutable pricing lock.
  - Manual Payment Ledger: Proof submission (UTR/receipt upload), Admin verification workflow (`SUBMITTED` → `VERIFIED` → `REJECTED`), automatic booking balance update.
  - Operations Module: Hotel confirmation voucher generator, driver & vehicle duty slip allocation.
  - Supplier Payables tracking (hotelier and transporter cost liabilities).
- **Exit Criteria:**
  - Confirmed booking updates financial balances and audit logs without manual math errors.
  - **Official Branding Verification Check:** All client vouchers, receipts, and operations duty slips must render official New Chirag branding (`/branding/logo-full.jpg` and `/branding/logo-icon.jpg`), owner contact (`Faisal Bikanerwala`), verified email (`newchiragtoursandtravels@gmail.com`), with zero unconfirmed placeholders or hardcoded contact data.

---

### Phase 6: Admin Web Portal (Faisal Bikanerwala Control Center)
- **Objective:** Build the Next.js control center for the business owner and operations team.
- **Key Deliverables:**
  - Secure Admin authentication & session management.
  - Inventory management interfaces (Destinations, Hotels, Rate Cards, Vehicles, Tariffs, Packages, Seasons).
  - Central CRM & Lead Assignment Board (Kanban / Data Table with quick agent assign).
  - Quotation approval queue for agent discount overrides.
  - Booking & Operations Management (Manual payment verification, voucher issuance).
  - Comprehensive audit log viewer.
- **Exit Criteria:**
  - Responsive, desktop-optimized dashboard with fast data filtering and no mock data.

---

### Phase 7: Agent Web Portal (Travel Desk & Fast Quote Workflow)
- **Objective:** Build the streamlined Next.js portal for travel agents.
- **Key Deliverables:**
  - Agent authentication with permission guardrails.
  - Walk-in / Phone customer quick intake form.
  - Fast quotation builder (selecting destination, dates, hotel tiers, vehicle category, and allowed markup/discount).
  - My Leads & My Quotations views (scoped strictly to the logged-in agent).
  - Customer quotation link sharing (WhatsApp message template & printable summary).
  - Agent personal commission & performance overview.
- **Exit Criteria:**
  - High-speed quote generation under 2 minutes for walk-in clients; 100% mobile and desktop responsive.

---

### Phase 8: Customer Web Portal (Discovery & Public Quote Viewer)
- **Objective:** Build the modern, customer-facing Next.js travel discovery site and quote viewer.
- **Key Deliverables:**
  - Mobile-first, visual destination showcase and package browser.
  - Interactive itinerary explorer with day-by-day highlights and photo galleries.
  - Direct inquiry submission form (automatically tagging source as `CUSTOMER_WEB`).
  - Interactive Public Quotation View page accessed via cryptographic token (displaying itinerary, inclusions, exclusions, hotels, vehicles, and customer selling price with zero internal B2B pricing details).
  - Direct WhatsApp & Call CTAs.
- **Exit Criteria:**
  - Fast page loads, mobile responsiveness, zero internal ERP jargon visible to the traveler.

---

### Phase 9: Real-Time Reporting, Analytics & Profit Auditing
- **Objective:** Calculate live business performance metrics directly from database transactions.
- **Key Deliverables:**
  - Admin Executive Dashboard: Total Sales, Net Supplier Costs, Realized Gross Profit, Pending Receivables, Conversion Rates.
  - Agent-wise performance breakdown (Leads, Quotations, Bookings, Sales, Cost, Gross Profit, Conversion %).
  - Destination-wise and Season-wise profitability reports.
  - Outstanding customer balance and supplier payable ledgers.
- **Exit Criteria:**
  - Zero hardcoded numbers; all figures reconcilable against verified payments and booking costs.

---

### Phase 10: Production Hardening, Security Audit & Launch Preparation
- **Objective:** End-to-end verification, load testing, security review, and production deployment.
- **Key Deliverables:**
  - Automated Playwright end-to-end test suites across critical user journeys.
  - OWASP security vulnerability audit (rate limiting, header verification, token leakage checks).
  - Database indexing optimization and query performance profiling.
  - Production environment configuration and deployment runbook.
- **Exit Criteria:**
  - System fully verified, secure, and ready for live business operations under Faisal Bikanerwala.

---

*End of Implementation Roadmap.*
