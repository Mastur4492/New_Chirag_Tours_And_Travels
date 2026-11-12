import { QuotationDto, QuotationPublicDto, MEAL_PLAN_LABELS, MealPlan, AgencySettingsDto } from '@chirag/types';
import { jobQueueService } from './jobQueue.service';
import { agencySettingsService } from './agencySettings.service';

export class PdfService {
  /**
   * Render a pixel-perfect, printer-ready luxury travel proposal / invoice HTML document.
   * Compatible with Puppeteer PDF export as well as direct browser print / PDF download.
   */
  generateQuotationHtml(quote: QuotationDto | QuotationPublicDto, settings?: AgencySettingsDto | null): string {
    const anyQuote = quote as any;
    const quoteNum = quote.quoteNumber || anyQuote.quotationNumber || 'PROPOSAL';
    const destination = quote.destinationName || 'India Tour';
    const nights = quote.durationNights || 1;
    const days = (quote as any).durationDays || (nights + 1);
    const adults = quote.numberOfAdults || 2;
    const children = quote.numberOfChildren || 0;
    const totalPax = adults + children;
    const rawStartDate = (quote as any).travelStartDate || anyQuote.startDate;
    const travelDate = rawStartDate
      ? new Date(rawStartDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Flexible';
    const expiryDate = quote.validUntil
      ? new Date(quote.validUntil).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Valid for 7 Days';

    const totalAmount = (
      quote.pricingSummary?.finalSellingPrice ??
      anyQuote.pricing?.totalAmount ??
      0
    ).toLocaleString('en-IN');
    const taxAmount = (
      quote.pricingSummary?.taxAmount ??
      anyQuote.pricing?.taxAmount ??
      0
    ).toLocaleString('en-IN');
    const netBaseAmount = Math.max(
      0,
      quote.pricingSummary?.taxableAmount ??
        anyQuote.pricing?.baseCost ??
        0
    ).toLocaleString('en-IN');

    const customerMobile =
      anyQuote.customerMobile || (quote as any).companyInfo?.phone || '+91 88660 06640';
    const customerEmail = anyQuote.customerEmail || (quote as any).companyInfo?.email;

    // Build itinerary rows
    let itineraryRows = '';
    if (Array.isArray(anyQuote.itinerary) && anyQuote.itinerary.length > 0) {
      itineraryRows = anyQuote.itinerary
        .map((day: any) => {
          const meal =
            MEAL_PLAN_LABELS[day.mealPlan as MealPlan] || day.mealPlan || 'Complimentary Breakfast';
          return `
            <tr class="itinerary-row">
              <td class="day-col">
                <span class="day-badge">Day ${day.dayNumber}</span>
              </td>
              <td class="details-col">
                <div class="day-title">${day.title || `Sightseeing & Excursions`}</div>
                <div class="day-desc">${day.description || 'Full day guided tour, scenic transfers, and leisure evening.'}</div>
                <div class="day-specs">
                  ${day.hotelName ? `<span class="spec-tag">🏨 ${day.hotelName} ${day.roomCategoryName ? `(${day.roomCategoryName})` : ''}</span>` : ''}
                  <span class="spec-tag">🍽️ ${meal}</span>
                  ${day.vehicleModel ? `<span class="spec-tag">🚗 ${day.vehicleModel}</span>` : ''}
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    } else if (Array.isArray(quote.hotels) && quote.hotels.length > 0) {
      itineraryRows = quote.hotels
        .map((h: any, idx: number) => {
          const meal =
            MEAL_PLAN_LABELS[h.mealPlan as MealPlan] || h.mealPlan || 'Complimentary Breakfast';
          const tr =
            quote.transports && quote.transports[idx]
              ? (quote.transports[idx] as any).vehicleName || (quote.transports[idx] as any).vehicleModel
              : '';
          return `
            <tr class="itinerary-row">
              <td class="day-col">
                <span class="day-badge">Night ${idx + 1}</span>
              </td>
              <td class="details-col">
                <div class="day-title">${h.hotelName || 'Curated Accommodation'}</div>
                <div class="day-desc">${h.numberOfNights || 1} Night(s) Stay • ${h.numberOfRooms || 1} Room(s)</div>
                <div class="day-specs">
                  <span class="spec-tag">🏨 ${h.hotelName || 'Boutique Resort'} ${h.roomCategoryName ? `(${h.roomCategoryName})` : ''}</span>
                  <span class="spec-tag">🍽️ ${meal}</span>
                  ${tr ? `<span class="spec-tag">🚗 ${tr}</span>` : ''}
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposal_${quoteNum}_${destination.replace(/\s+/g, '_')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0F172A;
      background-color: #F8FAFC;
      line-height: 1.45;
      font-size: 13px;
    }
    .page-container {
      max-width: 820px;
      margin: 20px auto;
      background: #FFFFFF;
      padding: 32px 36px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    }
    @media print {
      body { background: transparent; }
      .page-container {
        margin: 0;
        padding: 0;
        box-shadow: none;
        border-radius: 0;
      }
      .no-print { display: none !important; }
    }
    /* Action Bar (Only on Screen) */
    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #04140D;
      color: #FFFFFF;
      padding: 12px 20px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .btn-print {
      background: #10B981;
      color: #04140D;
      font-weight: 700;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      transition: opacity 0.2s;
    }
    .btn-print:hover { opacity: 0.9; }

    /* Header */
    .header-table {
      width: 100%;
      border-bottom: 2px solid #04140D;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 26px;
      font-weight: 700;
      color: #04140D;
      letter-spacing: -0.5px;
    }
    .brand-subtitle {
      font-size: 12px;
      color: #059669;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .company-meta {
      text-align: right;
      font-size: 11px;
      color: #475569;
      line-height: 1.5;
    }
    .company-meta strong { color: #0F172A; }

    /* Proposal Banner */
    .proposal-banner {
      background: linear-gradient(135deg, #04140D 0%, #064E3B 100%);
      color: #FFFFFF;
      border-radius: 8px;
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .banner-dest {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22px;
      font-weight: 700;
      color: #F8FAFC;
    }
    .banner-tags {
      margin-top: 6px;
      display: flex;
      gap: 10px;
      font-size: 12px;
      color: #A7F3D0;
    }
    .banner-price-box {
      text-align: right;
    }
    .price-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94A3B8;
    }
    .price-value {
      font-size: 24px;
      font-weight: 800;
      color: #10B981;
    }

    /* Grid Info */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .info-card {
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 12px 16px;
    }
    .info-card h4 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      margin-bottom: 6px;
    }
    .info-card p {
      font-size: 13px;
      color: #1E293B;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .info-card span {
      font-size: 11px;
      color: #64748B;
    }

    /* Itinerary Section */
    .section-heading {
      font-size: 15px;
      font-weight: 700;
      color: #04140D;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 8px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .itinerary-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .itinerary-row {
      border-bottom: 1px solid #F1F5F9;
    }
    .itinerary-row:last-child { border-bottom: none; }
    .day-col {
      width: 80px;
      vertical-align: top;
      padding: 12px 8px 12px 0;
    }
    .day-badge {
      display: inline-block;
      background: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
      font-weight: 700;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .details-col {
      padding: 12px 0;
      vertical-align: top;
    }
    .day-title {
      font-weight: 700;
      color: #0F172A;
      font-size: 13px;
    }
    .day-desc {
      color: #475569;
      font-size: 12px;
      margin-top: 3px;
    }
    .day-specs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 6px;
    }
    .spec-tag {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 4px;
      color: #334155;
    }

    /* Financials & Payment */
    .financials-box {
      background: #FAFAFA;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .fin-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 12px;
      color: #475569;
    }
    .fin-row.total {
      border-top: 1px solid #CBD5E1;
      margin-top: 6px;
      padding-top: 8px;
      font-size: 15px;
      font-weight: 800;
      color: #04140D;
    }
    .bank-box {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed #CBD5E1;
      font-size: 11px;
      color: #334155;
      line-height: 1.6;
    }

    /* Footer */
    .footer-note {
      text-align: center;
      font-size: 10px;
      color: #94A3B8;
      border-top: 1px solid #F1F5F9;
      padding-top: 14px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Screen-only Print Bar -->
    <div class="action-bar no-print">
      <div>
        <strong>Official Quotation Proposal</strong> • Reference: ${quoteNum}
      </div>
      <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>

    <!-- Company Letterhead -->
    <table class="header-table">
      <tr>
        <td>
          <div class="brand-title">${settings?.agencyName || 'New Chirag Tours and Travels'}</div>
          <div class="brand-subtitle">${settings?.tagline || 'Luxury Tailor-Made Holidays & Expeditions'}</div>
        </td>
        <td class="company-meta">
          <strong>Owner Desk:</strong> ${settings?.founderName || 'Faisal Bikanerwala'}<br>
          <strong>Direct Line:</strong> ${settings?.supportPhoneDisplay || '+91 88660 06640'} / +91 70430 46833<br>
          <strong>${settings?.city || 'Ahmedabad'}, ${settings?.state || 'Gujarat'}, India</strong><br>
          <strong>Email:</strong> ${settings?.supportEmail || 'newchiragtoursandtravels@gmail.com'}
        </td>
      </tr>
    </table>

    <!-- Banner -->
    <div class="proposal-banner">
      <div>
        <div class="banner-dest">${destination} Holiday Package</div>
        <div class="banner-tags">
          <span>🗓️ ${nights} Nights / ${days} Days</span>
          <span>👥 ${totalPax} Guests (${adults} Adults${children > 0 ? `, ${children} Children` : ''})</span>
          <span>📍 Reference: ${quoteNum}</span>
        </div>
      </div>
      <div class="banner-price-box">
        <div class="price-label">All-Inclusive Quotation</div>
        <div class="price-value">₹${totalAmount}</div>
      </div>
    </div>

    <!-- Client & Booking Info Grid -->
    <div class="info-grid">
      <div class="info-card">
        <h4>Traveler Details</h4>
        <p>${quote.customerName || 'Valued Guest'}</p>
        <span>📞 ${customerMobile} ${customerEmail ? `• ✉️ ${customerEmail}` : ''}</span>
      </div>
      <div class="info-card">
        <h4>Schedule & Validity</h4>
        <p>Departs: ${travelDate}</p>
        <span>Quote Valid Until: ${expiryDate}</span>
      </div>
    </div>

    <!-- Detailed Itinerary -->
    <div class="section-heading">Detailed Itinerary & Accommodations</div>
    <table class="itinerary-table">
      ${itineraryRows}
    </table>

    <!-- Financial Breakdown & Bank Details -->
    <div class="section-heading">Cost Summary & Official Remittance</div>
    <div class="financials-box">
      <div class="fin-row">
        <span>Curated Tour & Transport Package Base</span>
        <span>₹${netBaseAmount}</span>
      </div>
      <div class="fin-row">
        <span>Applicable GST (Taxes & Regulatory Surcharges)</span>
        <span>₹${taxAmount}</span>
      </div>
      <div class="fin-row total">
        <span>Grand Total Payable (INR)</span>
        <span>₹${totalAmount}</span>
      </div>

      <div class="bank-box">
        <strong>Official Bank Remittance & Instant UPI Details:</strong><br>
        A/C Name: <strong>${settings?.accountHolderName || 'NEW CHIRAG TOURS AND TRAVELS'}</strong> • Bank: <strong>${settings?.bankName || 'HDFC Bank Ltd'}</strong><br>
        Account Number: <strong>${settings?.accountNumber || '50200084920194'}</strong> (${settings?.accountType || 'Current Account'}) • IFSC: <strong>${settings?.ifscCode || 'HDFC0001842'}</strong> (${settings?.branchName || 'Danilimda Branch, Ahmedabad'})<br>
        UPI ID: <strong>${settings?.upiId || '8866006640@upi'}</strong> • PhonePe/GPay: <strong>${settings?.upiNumber || '+91 88660 06640'}</strong><br>
        <em>Policy: ${settings?.paymentTerms || '25% Advance to Lock Allotments • Balance 75% on Arrival / Prior to Hotel Check-in'}</em>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer-note">
      This is an official computer-generated quotation proposal issued by ${settings?.agencyName || 'New Chirag Tours and Travels'}.<br>
      Rates are subject to room & vehicle availability at the time of final confirmation and advance token deposit.<br>
      Registered Office: ${settings?.headOfficeAddress || 'Shop No 3, Al-Rehman Plaza, nr. Nagori Complex, Danilimda, Ahmedabad, Gujarat 382405'}<br>
      © ${new Date().getFullYear()} ${settings?.agencyName || 'New Chirag Tours and Travels'}. All rights reserved.
    </div>
  </div>

  <script>
    // Auto-trigger print if requested via query param ?print=true
    if (window.location.search.includes('print=true')) {
      window.onload = function() {
        setTimeout(function() { window.print(); }, 400);
      };
    }
  </script>
</body>
</html>`;
  }
}

export const pdfService = new PdfService();

// Register PDF worker handler with the asynchronous job queue
jobQueueService.registerHandler('GENERATE_PDF_QUOTATION', async (payload: { quote: any }) => {
  const settings = await agencySettingsService.getSettings();
  const html = pdfService.generateQuotationHtml(payload.quote, settings);
  return {
    quoteNumber: payload.quote?.quoteNumber || payload.quote?.quotationNumber,
    htmlBytes: Buffer.byteLength(html, 'utf8'),
    status: 'READY_FOR_DOWNLOAD',
    timestamp: new Date().toISOString(),
  };
});
