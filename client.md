# New Chirag Tours & Travels — Client Feedback Implementation Log

1. **mo: 8866006640** — [COMPLETED] Updated primary contact number across branding, footers, headers, contact pages, and WhatsApp dispatch templates.
2. **altmo: 7043046833** — [COMPLETED] Updated secondary contact number across branding, footers, and support channels.
3. **adv payment -35% from customer** — [COMPLETED] Advance percentage locked to 35% in MongoDB `AgencySettings` and Admin Profile (`/profile`). Duplicate conflicting policy controls removed from Customer Portal Settings.
4. **meal : ap add** — [COMPLETED] Added **AP (All Meals — Breakfast, Lunch & Dinner)** and **EP (Room Only)** across Customer Web (`TripCustomizer`), Quote Proposals, Admin & Agent Quotation desks.
5. **vehcle number last me addon** — [COMPLETED] Vehicle registration numbers removed from public customer quotes and customer customizer. Registration numbers are exclusively assigned at final Operations Dispatch stage.
6. **extra bed in customer portal** — [COMPLETED] Added full interactive extra bed stepper (+ / -), transparent per-night charge (₹1,200/night or custom room rate), and dynamic total trip calculation in Customer Customizer.
7. **ro change to ep admin side** — [COMPLETED] Replaced all occurrences of 'RO' (Room Only) with standardized hotel industry 'EP' (European Plan) across Admin Hotels, Seasonal Rate Cards, and Quotation selectors.
8. **notification glitch** — [COMPLETED] Fixed live notification delivery in `realtime.service.ts` and `NotificationBell.tsx`. Agent notifications no longer leak to Admin; admin self-actions do not trigger self-toasts; background data sync is silent.
9. **admin side view proposal not working in live and pdf also not working** — [COMPLETED] Fixed URLs to dynamically resolve live production Vercel customer portal (`https://newchirag-customer.vercel.app`) and live Render backend. Removed forced localhost redirects.
10. **2 rate sheet customer and agent admin side b2b setting whole change** — [COMPLETED]:
    - **Dual Rate Sheet Architecture**: `TourPackage` now supports both `startingPrice` (B2C Retail MRP) and `b2bStartingPrice` (B2B Wholesale Net).
    - **Packages Desk Catalog**: Displays both B2C MRP, B2B Net Rate, and calculated Agent Margin Scope.
    - **B2B Travel Agent Settings**: Abolished confusing 5% commission cap. Agents are assigned Wholesale Net Rate Tiers with 100% pricing autonomy.
    - **Agent Quotation Autonomy**: Removed artificial `isDiscountOverCap` warnings and `PENDING_ADMIN_APPROVAL` blocks so agents can quote custom markups or client discounts with full commercial autonomy.
11. **extra bed charge add in hotels and rooms also** — [COMPLETED] Admin Hotel Room Drawer includes Extra Bed Supported toggle, Max Extra Beds count, and Custom Extra Bed Price Per Night.
12. **transport redesigned & completed** — [COMPLETED] Completely overhauled `/transport` into 3 intuitive tabs:
    - Tab 1: 💰 Cab Rate Cards & Tariffs (Destination-wise selling price, net supplier cost, margin, pax)
    - Tab 2: 🚗 Fleet & Chauffeurs Directory (Vehicle model, category, plate, chauffeur WhatsApp/Call)
    - Tab 3: 🏢 Transporters & Taxi Unions (Partner directory & settlement terms)
13. **system-wide dropdown searching & typeahead navigation** — [COMPLETED]:
    - Built and integrated modern custom `SearchableSelect` across Customer Portal, Admin Desk, and Agent Portal.
    - Added instant search filter bar with tiered prefix matching (`startsWith` first, then word starts, then contains).
    - Integrated keyboard typeahead navigation: typing any letter (e.g. 'A') immediately jumps and highlights the first matching option with a high-contrast **Blue Bar** (`#eff6ff` background, `#1d4ed8` text, and `3.5px solid #2563eb` left border).
    - Full keyboard accessibility with `ArrowUp`, `ArrowDown`, `Enter` to select, and `Escape` to close.
    - Enhanced global native `<select>` styles with modern 10px rounded borders, teal focus halos, and custom SVG chevrons.

---
*Monorepo Verification Status: 10/10 packages built successfully with 0 errors (types, api, customer-web, agent-web, admin-web).*
*Git Remote: 0 commits pushed to origin/main (all changes remain local as requested).*
