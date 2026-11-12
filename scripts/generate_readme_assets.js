const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ASSETS_DIR = path.join(__dirname, '..', 'docs', 'assets');

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Common styles & themes
const baseStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #080c14;
    color: #f1f5f9;
    padding: 0;
    margin: 0;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
  .gradient-text-emerald {
    background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #065f46 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .gradient-text-gold {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .gradient-text-cyan {
    background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .glass-card {
    background: rgba(15, 23, 42, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(16px);
    border-radius: 16px;
    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
  }
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .tag-emerald {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  .tag-blue {
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }
  .tag-purple {
    background: rgba(168, 85, 247, 0.15);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.3);
  }
  .tag-amber {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
`;

// 1. HERO BANNER
const bannerHtml = `
<!DOCTYPE html>
<html>
<head>
<style>
${baseStyles}
.container {
  width: 1200px;
  height: 480px;
  position: relative;
  background: radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 20% 80%, rgba(14, 165, 233, 0.1) 0%, transparent 40%),
              #070a12;
  border-bottom: 2px solid rgba(16, 185, 129, 0.2);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 48px 60px;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.badge-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
}
.brand-crest {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  border: 1px solid rgba(52, 211, 153, 0.4);
  box-shadow: 0 0 25px rgba(16, 185, 129, 0.4);
}
.brand-text h1 {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #ffffff;
  line-height: 1.1;
}
.brand-text p {
  font-size: 14px;
  font-weight: 500;
  color: #94a3b8;
  margin-top: 4px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.status-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  color: #34d399;
}
.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}
.hero-tagline {
  font-size: 20px;
  font-weight: 400;
  color: #cbd5e1;
  line-height: 1.5;
  max-width: 900px;
  margin-top: 10px;
}
.hero-tagline strong {
  color: #f8fafc;
  font-weight: 700;
}
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 24px;
}
.metric-box {
  padding: 16px 20px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.metric-box .label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 4px;
}
.metric-box .val {
  font-size: 18px;
  font-weight: 700;
  color: #f1f5f9;
}
.metric-box .desc {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}
.footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.tech-pills {
  display: flex;
  gap: 8px;
}
</style>
</head>
<body>
<div class="container">
  <div class="header-row">
    <div class="badge-wrapper">
      <div class="brand-crest">NCT</div>
      <div class="brand-text">
        <h1>NEW CHIRAG TOURS AND TRAVELS</h1>
        <p>Enterprise Travel Sales, Quotations, Operations & Ledger Platform</p>
      </div>
    </div>
    <div class="status-pill">
      <div class="pulse-dot"></div>
      Production-Ready Architecture
    </div>
  </div>

  <div class="hero-tagline">
    A unified <strong>multi-portal operating system</strong> for Indian outbound & domestic tour operations — replacing fragmented WhatsApp chats, Excel proposals, and manual ledgers with <strong>deterministic server-side pricing</strong> and <strong>autonomous AI copilots</strong>.
  </div>

  <div class="metrics-grid">
    <div class="metric-box">
      <div class="label">Architecture</div>
      <div class="val" style="color: #38bdf8;">Turborepo Monorepo</div>
      <div class="desc">3 Web Portals + 1 Express Core</div>
    </div>
    <div class="metric-box">
      <div class="label">Pricing Integrity</div>
      <div class="val" style="color: #34d399;">Deterministic Math</div>
      <div class="desc">Zero Rate & Margin Leakage</div>
    </div>
    <div class="metric-box">
      <div class="label">AI Intelligence</div>
      <div class="val" style="color: #c084fc;">Gemini 3.5 Copilots</div>
      <div class="desc">Multi-Turn Tool Orchestration</div>
    </div>
    <div class="metric-box">
      <div class="label">Code Quality</div>
      <div class="val" style="color: #fbbf24;">412+ Passing Tests</div>
      <div class="desc">Strict Zod Runtime Validation</div>
    </div>
  </div>

  <div class="footer-row">
    <div class="tech-pills">
      <span class="tag tag-blue">Next.js 14 App Router</span>
      <span class="tag tag-emerald">TypeScript 5</span>
      <span class="tag tag-purple">Google Gemini 3.5</span>
      <span class="tag tag-amber">MongoDB Atlas Cloud</span>
      <span class="tag tag-emerald">Express REST API</span>
    </div>
    <div style="font-size: 12px; color: #64748b; font-weight: 500;">
      Managed by Faisal Bikanerwala • Ahmedabad, Gujarat
    </div>
  </div>
</div>
</body>
</html>
`;

// 2. SYSTEM ARCHITECTURE DIAGRAM
const archHtml = `
<!DOCTYPE html>
<html>
<head>
<style>
${baseStyles}
.container {
  width: 1200px;
  height: 800px;
  background: radial-gradient(circle at 50% 10%, rgba(16, 185, 129, 0.08) 0%, transparent 60%), #07090e;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.title-header {
  text-align: center;
  margin-bottom: 24px;
}
.title-header h2 {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
}
.title-header p {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 4px;
}
.tier-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tier-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.tier-label::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}
.portals-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.portal-card {
  padding: 18px 20px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
}
.portal-card.emerald { border-top: 3px solid #10b981; }
.portal-card.blue { border-top: 3px solid #38bdf8; }
.portal-card.purple { border-top: 3px solid #a855f7; }
.portal-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.portal-port {
  font-size: 11px;
  font-family: monospace;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}
.portal-features {
  margin-top: 10px;
  list-style: none;
}
.portal-features li {
  font-size: 12px;
  color: #94a3b8;
  padding: 3px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.portal-features li::before {
  content: "•";
  color: #10b981;
  font-weight: bold;
}
.connector-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #64748b;
  padding: 4px 0;
}
.connector-line {
  height: 12px;
  width: 2px;
  background: linear-gradient(to bottom, #10b981, #0ea5e9);
  margin: 0 auto;
}
.core-box {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 14px;
  padding: 18px 24px;
}
.core-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}
.core-subbox {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px 16px;
}
.core-subbox h4 {
  font-size: 13px;
  font-weight: 700;
  color: #38bdf8;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.core-subbox p {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
}
.infra-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 4px;
}
.infra-card {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.infra-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
}
.infra-info h5 {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}
.infra-info span {
  font-size: 11px;
  color: #64748b;
}
</style>
</head>
<body>
<div class="container">
  <div class="title-header">
    <h2>SYSTEM TOPOLOGY & PACKAGE ARCHITECTURE</h2>
    <p>High-Cohesion Monorepo Architecture with Strict Domain & Network Isolation</p>
  </div>

  <div class="tier-wrapper">
    <!-- TIER 1 -->
    <div>
      <div class="tier-label">Tier 1: Client Web Portals (Next.js 14 App Router)</div>
      <div class="portals-grid">
        <div class="portal-card emerald">
          <div class="portal-name">
            <span>Customer Web Portal</span>
            <span class="portal-port">:3000</span>
          </div>
          <ul class="portal-features">
            <li>Holiday Circuit Catalog & Enquiry Ingestion</li>
            <li>Public Cryptographic Token Proposal Viewer</li>
            <li>Interactive Itinerary Revision & Acceptance</li>
            <li>24x7 Customer AI Concierge (Gemini 3.5)</li>
          </ul>
        </div>

        <div class="portal-card blue">
          <div class="portal-name">
            <span>Admin & Operations Console</span>
            <span class="portal-port">:3001</span>
          </div>
          <ul class="portal-features">
            <li>Executive Financials & Advance Ledgers</li>
            <li>Omni-Channel Lead Pipeline & Scoring</li>
            <li>Master Tariff Matrices (Hotels, Cab Rates, GST)</li>
            <li>Hotel Vouchers & Chauffeur Duty Slips Dispatch</li>
          </ul>
        </div>

        <div class="portal-card purple">
          <div class="portal-name">
            <span>Partner Agent Desk</span>
            <span class="portal-port">:3002</span>
          </div>
          <ul class="portal-features">
            <li>Tenant-Isolated CRM Queue & Inquiries</li>
            <li>Sub-2-Minute Quotation Proposal Wizard</li>
            <li>Strict Discount Threshold Enforcement</li>
            <li>Agent AI Copilot for Fast Inventory & Leads</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- TIER 2 -->
    <div>
      <div class="tier-label">Tier 2: Central Business Core (Express & TypeScript Engine — :5000)</div>
      <div class="core-box">
        <div class="core-grid">
          <div class="core-subbox">
            <h4>Deterministic Pricing Engine (@chirag/pricing)</h4>
            <p>Guarantees zero floating-point arithmetic errors. Calculates seasonal hotel tiers, room meal plans (EP/CP/MAP/AP), vehicle per-km slabs, driver DA, permitted markups, and statutory 5% & 18% GST rules.</p>
          </div>
          <div class="core-subbox">
            <h4>Security & Role Isolation</h4>
            <p>Dual JWT token rotation with HttpOnly cookies, bcrypt (12 rounds), tenant row-level queries ({ assignedAgentId: req.user.id }), and immutable audit logging on financial mutations.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- TIER 3 -->
    <div>
      <div class="tier-label">Tier 3: Intelligence & Data Persistence Infrastructure</div>
      <div class="infra-grid">
        <div class="infra-card">
          <div class="infra-icon" style="background: rgba(168, 85, 247, 0.2); color: #c084fc;">AI</div>
          <div class="infra-info">
            <h5>Google Gemini 3.5 Engine</h5>
            <span>Multi-turn tool orchestration & streaming</span>
          </div>
        </div>
        <div class="infra-card">
          <div class="infra-icon" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">DB</div>
          <div class="infra-info">
            <h5>MongoDB Atlas Cluster</h5>
            <span>Replica-set ACID document transactions</span>
          </div>
        </div>
        <div class="infra-card">
          <div class="infra-icon" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8;">RT</div>
          <div class="infra-info">
            <h5>Real-Time SSE Streams</h5>
            <span>Server-Sent Events for live portal sync</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div style="text-align: center; font-size: 11px; color: #64748b;">
    Monorepo Root Packages: @chirag/types • @chirag/validation • @chirag/pricing • @chirag/ui • @chirag/utils
  </div>
</div>
</body>
</html>
`;

// 3. BUSINESS LIFECYCLE WORKFLOW
const workflowHtml = `
<!DOCTYPE html>
<html>
<head>
<style>
${baseStyles}
.container {
  width: 1200px;
  height: 700px;
  background: radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.08) 0%, transparent 50%), #07090e;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.title-header {
  text-align: center;
  margin-bottom: 24px;
}
.title-header h2 {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
}
.title-header p {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 4px;
}
.timeline-container {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  position: relative;
  margin-top: 10px;
}
.step-card {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}
.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 12px;
}
.step-title {
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.3;
  margin-bottom: 6px;
}
.step-actor {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #38bdf8;
  margin-bottom: 8px;
}
.step-desc {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.4;
}
.step-tag {
  margin-top: 12px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.guardrails-box {
  background: rgba(30, 41, 59, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 20px 24px;
  margin-top: 16px;
}
.guardrails-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.guardrail-item h4 {
  font-size: 13px;
  font-weight: 700;
  color: #fbbf24;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.guardrail-item p {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.4;
}
</style>
</head>
<body>
<div class="container">
  <div class="title-header">
    <h2>FULL TOUR OPERATIONS & MONETARY LIFECYCLE</h2>
    <p>From First Traveler Inquiry to Verified Bank Ledger & Departure Dispatch</p>
  </div>

  <div class="timeline-container">
    <div class="step-card">
      <div>
        <div class="step-num">01</div>
        <div class="step-actor">Customer Web</div>
        <div class="step-title">Enquiry Ingestion</div>
        <div class="step-desc">Traveler enters circuit, dates, traveler counts, and special requests. Master CRM generates unique lead ID.</div>
      </div>
      <div class="step-tag">Status: NEW LEAD</div>
    </div>

    <div class="step-card">
      <div>
        <div class="step-num">02</div>
        <div class="step-actor">Operations Admin</div>
        <div class="step-title">Partner Assignment</div>
        <div class="step-desc">Admin assigns lead to Partner Travel Agent with designated commission cap & discount allowance threshold.</div>
      </div>
      <div class="step-tag">Status: ASSIGNED</div>
    </div>

    <div class="step-card">
      <div>
        <div class="step-num">03</div>
        <div class="step-actor">Agent Desk</div>
        <div class="step-title">Deterministic Quote</div>
        <div class="step-desc">Agent builds quotation using server-authoritative rates. Zero supplier cost leakage; discount validated server-side.</div>
      </div>
      <div class="step-tag">Status: ISSUED</div>
    </div>

    <div class="step-card">
      <div>
        <div class="step-num">04</div>
        <div class="step-actor">Traveler</div>
        <div class="step-title">Proposal Review</div>
        <div class="step-desc">Traveler inspects interactive proposal via cryptographic token. One-click itinerary acceptance locks quotation version.</div>
      </div>
      <div class="step-tag">Status: ACCEPTED</div>
    </div>

    <div class="step-card">
      <div>
        <div class="step-num">05</div>
        <div class="step-actor">Accounts Admin</div>
        <div class="step-title">Payment Audit</div>
        <div class="step-desc">Bank transfer / UPI UTR verified. Advance ledger updated with immutable audit log. Booking moves to Confirmed.</div>
      </div>
      <div class="step-tag">Status: CONFIRMED</div>
    </div>

    <div class="step-card">
      <div>
        <div class="step-num">06</div>
        <div class="step-actor">Operations Team</div>
        <div class="step-title">Voucher & Dispatch</div>
        <div class="step-desc">Official Hotel Reservation Voucher & Driver Duty Slip generated. Cab locks and trip moves to Ready for Departure!</div>
      </div>
      <div class="step-tag" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">READY FOR TRIP</div>
    </div>
  </div>

  <div class="guardrails-box">
    <div class="guardrails-grid">
      <div class="guardrail-item">
        <h4>🔒 Commercial Rate Isolation</h4>
        <p>Agents and sub-agents only receive calculated retail rates. Confidential supplier room contracts and vehicle fleet tariffs remain strictly inaccessible.</p>
      </div>
      <div class="guardrail-item">
        <h4>⚡ Discount Threshold Authorization</h4>
        <p>If an agent attempts to offer discounts exceeding their allowed threshold (e.g. > 5%), quote issuance is blocked until Admin provides electronic sign-off.</p>
      </div>
      <div class="guardrail-item">
        <h4>📑 Immutable Audit Ledger</h4>
        <p>Every advance payment, quotation revision, hotel voucher generation, and role permission change creates an append-only cryptographic audit trail.</p>
      </div>
    </div>
  </div>

  <div style="text-align: center; font-size: 11px; color: #64748b;">
    New Chirag Tours and Travels • Operating System Architecture
  </div>
</div>
</body>
</html>
`;

// 4. THREE PORTALS MATRIX
const matrixHtml = `
<!DOCTYPE html>
<html>
<head>
<style>
${baseStyles}
.container {
  width: 1200px;
  height: 640px;
  background: radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 50%), #07090e;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.title-header {
  text-align: center;
  margin-bottom: 24px;
}
.title-header h2 {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
}
.title-header p {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 4px;
}
.matrix-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.portal-column {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.portal-column.cust { border-top: 4px solid #10b981; }
.portal-column.admin { border-top: 4px solid #38bdf8; }
.portal-column.agent { border-top: 4px solid #a855f7; }
.portal-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}
.portal-heading {
  font-size: 18px;
  font-weight: 800;
  color: #fff;
}
.portal-url {
  font-size: 11px;
  font-family: monospace;
  color: #64748b;
  margin-top: 4px;
  margin-bottom: 16px;
}
.feature-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.feature-item {
  font-size: 12px;
  color: #cbd5e1;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.4;
}
.feature-bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
}
.cust-bullet { background: #10b981; }
.admin-bullet { background: #38bdf8; }
.agent-bullet { background: #a855f7; }
.persona-tag {
  margin-top: 20px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}
.persona-tag .p-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}
.persona-tag .p-val {
  font-size: 12px;
  font-weight: 600;
  color: #f1f5f9;
  margin-top: 2px;
}
</style>
</head>
<body>
<div class="container">
  <div class="title-header">
    <h2>THE THREE PORTAL ECOSYSTEM COMPARISON</h2>
    <p>Tailored Web Workspaces Serving Every Stakeholder in the Travel Distribution Chain</p>
  </div>

  <div class="matrix-grid">
    <!-- Customer Web -->
    <div class="portal-column cust">
      <div>
        <div class="portal-badge" style="color: #34d399;">Public Traveler Portal</div>
        <div class="portal-heading">Customer Web</div>
        <div class="portal-url">newchirag-customer.vercel.app (:3000)</div>
        <ul class="feature-list">
          <li class="feature-item"><span class="feature-bullet cust-bullet"></span><span><strong>Catalog & Circuit Explorer:</strong> Kashmir, Rajasthan, Himachal, Kerala, Goa holiday packages.</span></li>
          <li class="feature-item"><span class="feature-bullet cust-bullet"></span><span><strong>Direct CRM Ingestion:</strong> Ingests lead with full guest details and dates.</span></li>
          <li class="feature-item"><span class="feature-bullet cust-bullet"></span><span><strong>Dynamic Quote Viewer:</strong> Cryptographic token view with day-wise itinerary.</span></li>
          <li class="feature-item"><span class="feature-bullet cust-bullet"></span><span><strong>AI Travel Assistant:</strong> 24x7 Gemini Copilot streaming answers and package quotes.</span></li>
        </ul>
      </div>
      <div class="persona-tag">
        <div class="p-label">Primary Persona</div>
        <div class="p-val">Direct Retail Travelers & Honeymooners</div>
      </div>
    </div>

    <!-- Admin Operations -->
    <div class="portal-column admin">
      <div>
        <div class="portal-badge" style="color: #38bdf8;">Command & Control</div>
        <div class="portal-heading">Admin & Operations</div>
        <div class="portal-url">newchirag-admin.vercel.app (:3001)</div>
        <ul class="feature-list">
          <li class="feature-item"><span class="feature-bullet admin-bullet"></span><span><strong>Executive Ledger:</strong> Live cash flow, pending balances, UTR verification.</span></li>
          <li class="feature-item"><span class="feature-bullet admin-bullet"></span><span><strong>Omni-Channel CRM:</strong> Priority follow-up tracking and lead conversions.</span></li>
          <li class="feature-item"><span class="feature-bullet admin-bullet"></span><span><strong>Master Inventory:</strong> Seasonal hotel rates, meal plans, cab tariffs, 5% GST.</span></li>
          <li class="feature-item"><span class="feature-bullet admin-bullet"></span><span><strong>Dispatch Logistics:</strong> Hotel reservation vouchers & chauffeur duty slips.</span></li>
        </ul>
      </div>
      <div class="persona-tag">
        <div class="p-label">Primary Persona</div>
        <div class="p-val">Agency Owner, Branch Managers, Accounts</div>
      </div>
    </div>

    <!-- Agent Desk -->
    <div class="portal-column agent">
      <div>
        <div class="portal-badge" style="color: #c084fc;">B2B Partner Workspace</div>
        <div class="portal-heading">Travel Agent Desk</div>
        <div class="portal-url">newchirag-agent.vercel.app (:3002)</div>
        <ul class="feature-list">
          <li class="feature-item"><span class="feature-bullet agent-bullet"></span><span><strong>Tenant Isolation:</strong> Agents strictly view only their assigned leads.</span></li>
          <li class="feature-item"><span class="feature-bullet agent-bullet"></span><span><strong>Proposal Wizard:</strong> Generates white-labeled quotations under 2 minutes.</span></li>
          <li class="feature-item"><span class="feature-bullet agent-bullet"></span><span><strong>Commercial Guardrails:</strong> Automatic lock if discount exceeds threshold.</span></li>
          <li class="feature-item"><span class="feature-bullet agent-bullet"></span><span><strong>Agent Copilot:</strong> Gemini AI summarizes overdue follow-ups & inquiries.</span></li>
        </ul>
      </div>
      <div class="persona-tag">
        <div class="p-label">Primary Persona</div>
        <div class="p-val">Verified External Partner Travel Agents</div>
      </div>
    </div>
  </div>

  <div style="text-align: center; font-size: 11px; color: #64748b;">
    Single Unified Turborepo • Shared Zod Schemas • Zero Drift Between Micro-Frontends
  </div>
</div>
</body>
</html>
`;

async function renderAssets() {
  console.log('🚀 Launching Chrome for High-Res Asset Generation...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });

  const tasks = [
    { name: 'hero-banner.png', html: bannerHtml, width: 1200, height: 480 },
    { name: 'system-architecture.png', html: archHtml, width: 1200, height: 800 },
    { name: 'business-lifecycle.png', html: workflowHtml, width: 1200, height: 700 },
    { name: 'three-portals-matrix.png', html: matrixHtml, width: 1200, height: 640 },
  ];

  for (const t of tasks) {
    console.log(`Rendering ${t.name}...`);
    await page.setViewport({ width: t.width, height: t.height, deviceScaleFactor: 2 });
    await page.setContent(t.html, { waitUntil: 'domcontentloaded', timeout: 10000 });
    const outPath = path.join(ASSETS_DIR, t.name);
    await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: t.width, height: t.height } });
    console.log(`✅ Saved: ${outPath} (${fs.statSync(outPath).size} bytes)`);
  }

  await browser.close();
  console.log('🎉 All assets rendered successfully!');
}

renderAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});

