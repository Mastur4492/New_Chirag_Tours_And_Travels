import nodemailer from 'nodemailer';

export interface LeadEmailPayload {
  leadNumber: string;
  customerName: string;
  mobile: string;
  email?: string;
  destinationName: string;
  packageName?: string;
  durationNights?: number;
  numberOfAdults?: number;
  numberOfChildren?: number;
  budgetEstimate?: number;
  tentativeTravelDate?: string;
  specialRequirements?: string;
}

class EmailService {
  private transporter: any = null;
  private readonly adminEmail: string;
  private readonly companyName: string;
  private readonly adminWebUrl: string;

  constructor() {
    this.adminEmail = process.env.COMPANY_EMAIL || 'newchiragtoursandtravels@gmail.com';
    this.companyName = process.env.COMPANY_NAME || 'New Chirag Tours and Travels';
    this.adminWebUrl = process.env.ADMIN_WEB_URL || 'http://localhost:3001';

    // Configure SMTP if provided in environment
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        console.log('[EmailService] SMTP Transporter initialized successfully.');
      } catch (err) {
        console.error('[EmailService] Failed to initialize SMTP transporter:', err);
      }
    } else {
      console.log('[EmailService] No SMTP credentials configured. Email notifications will be logged to console and dispatched via simulated mailer.');
    }
  }

  /**
   * Send notification to Admin when a new holiday enquiry / self-service quote is submitted
   */
  async notifyAdminNewEnquiry(payload: LeadEmailPayload): Promise<void> {
    const subject = `🔔 [New Enquiry] ${payload.leadNumber} — ${payload.destinationName} (${payload.customerName})`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background: #0B192C; color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #34D399; }
          .header p { margin: 6px 0 0; font-size: 13px; color: #94a3b8; }
          .content { padding: 24px; }
          .badge { display: inline-block; background: #ECFDF5; color: #047857; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 9999px; border: 1px solid #A7F3D0; }
          .grid { width: 100%; border-collapse: collapse; margin-top: 16px; }
          .grid td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          .grid td.label { font-weight: 600; color: #64748b; width: 35%; }
          .grid td.value { font-weight: 700; color: #0f172a; }
          .notes-box { background: #f8fafc; border-left: 4px solid #059669; padding: 14px; margin-top: 20px; border-radius: 0 8px 8px 0; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
          .btn-cta { display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 24px; border-radius: 8px; margin-top: 24px; text-align: center; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${this.companyName}</h1>
            <p>New Customer Travel Enquiry Notification</p>
          </div>
          <div class="content">
            <span class="badge">Reference: ${payload.leadNumber}</span>
            <table class="grid">
              <tr>
                <td class="label">Customer Name</td>
                <td class="value">${payload.customerName}</td>
              </tr>
              <tr>
                <td class="label">Mobile / WhatsApp</td>
                <td class="value"><a href="tel:${payload.mobile}">${payload.mobile}</a> (<a href="https://wa.me/${payload.mobile.replace(/[^0-9]/g, '')}">WhatsApp</a>)</td>
              </tr>
              ${payload.email ? `<tr><td class="label">Email</td><td class="value"><a href="mailto:${payload.email}">${payload.email}</a></td></tr>` : ''}
              <tr>
                <td class="label">Destination</td>
                <td class="value">${payload.destinationName}</td>
              </tr>
              ${payload.packageName ? `<tr><td class="label">Package</td><td class="value">${payload.packageName}</td></tr>` : ''}
              ${payload.durationNights ? `<tr><td class="label">Duration</td><td class="value">${payload.durationNights} Nights / ${payload.durationNights + 1} Days</td></tr>` : ''}
              <tr>
                <td class="label">Travelers</td>
                <td class="value">${payload.numberOfAdults || 2} Adults ${payload.numberOfChildren ? `, ${payload.numberOfChildren} Children` : ''}</td>
              </tr>
              ${payload.budgetEstimate ? `<tr><td class="label">Estimated Budget</td><td class="value" style="color: #047857; font-size: 16px;">₹${payload.budgetEstimate.toLocaleString('en-IN')}</td></tr>` : ''}
              ${payload.tentativeTravelDate ? `<tr><td class="label">Travel Date</td><td class="value">${payload.tentativeTravelDate}</td></tr>` : ''}
            </table>

            ${payload.specialRequirements ? `
              <div style="font-weight: 700; margin-top: 20px; font-size: 13px; color: #334155;">Customer Notes / Specifications:</div>
              <div class="notes-box">${payload.specialRequirements}</div>
            ` : ''}

            <div style="text-align: center;">
              <a href="${this.adminWebUrl}/leads" class="btn-cta">Open Lead in Admin Portal</a>
            </div>
          </div>
          <div class="footer">
            Sent to ${this.adminEmail} • Owner Desk: Faisal Bikanerwala (+91 88660 06640 / +91 70430 46833)<br>
            Danilimda, Ahmedabad, Gujarat
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`\n======================================================`);
    console.log(`[EMAIL NOTIFICATION TO ADMIN]`);
    console.log(`To: ${this.adminEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Customer: ${payload.customerName} (${payload.mobile})`);
    console.log(`Destination: ${payload.destinationName} | Budget: ₹${payload.budgetEstimate || 0}`);
    console.log(`Lead Reference: ${payload.leadNumber}`);
    console.log(`======================================================\n`);

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"${this.companyName}" <${this.adminEmail}>`,
          to: this.adminEmail,
          subject,
          html: htmlContent,
        });
        console.log(`[EmailService] SMTP Email successfully delivered to ${this.adminEmail}`);
      } catch (err) {
        console.error(`[EmailService] SMTP delivery failed, but lead logged:`, err);
      }
    }
  }
}

export const emailService = new EmailService();
