import { env } from '../config/env';

export interface WhatsAppQuotePayload {
  token: string;
  quotationNumber: string;
  customerName: string;
  customerMobile: string;
  destinationName: string;
  durationNights: number;
  totalAmount: number;
}

export interface WhatsAppBookingPayload {
  bookingNumber: string;
  customerName: string;
  customerMobile: string;
  destinationName: string;
  travelDate: string;
  totalAmount: number;
  advancePaid: number;
}

export interface WhatsAppAgentLeadPayload {
  agentMobile: string;
  agentName: string;
  leadNumber: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  destinationName: string;
  durationNights?: number;
  numberOfAdults: number;
  numberOfChildren: number;
  travelDate?: string;
  specialRequirements?: string;
  assignedByName?: string;
}

export class WhatsAppService {
  private readonly isConfigured: boolean;
  private readonly apiToken?: string;
  private readonly phoneNumberId?: string;
  private readonly businessMobile: string;
  private readonly customerWebUrl: string;

  constructor() {
    this.apiToken = env.WHATSAPP_API_TOKEN;
    this.phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    this.businessMobile = env.WHATSAPP_BUSINESS_MOBILE || '+918866006640';
    this.customerWebUrl = process.env.CUSTOMER_WEB_URL || 'http://localhost:3000';
    this.isConfigured = Boolean(this.apiToken && this.phoneNumberId);

    if (this.isConfigured) {
      console.log('[WhatsAppService] Meta WhatsApp Cloud API credentials configured.');
    } else {
      console.log(
        '[WhatsAppService] No WhatsApp API credentials configured. Notifications will be logged to console and dispatched via simulated WhatsApp carrier.'
      );
    }
  }

  /**
   * Send WhatsApp itinerary brochure & quotation link to customer
   */
  async sendQuoteBrochure(payload: WhatsAppQuotePayload): Promise<{ success: boolean; messageId?: string }> {
    const quoteUrl = `${this.customerWebUrl}/quote/${payload.token}`;
    const message =
      `*Hello ${payload.customerName}!* Your customized travel proposal for *${payload.destinationName}* (${payload.durationNights} Nights) is ready.\n\n` +
      `📋 *Quotation Reference:* ${payload.quotationNumber}\n` +
      `💰 *Total Package Cost:* ₹${payload.totalAmount.toLocaleString('en-IN')}\n\n` +
      `🔗 *View Your Interactive Proposal & PDF:* \n${quoteUrl}\n\n` +
      `Need custom changes or special arrangements? Reply directly to this message or call Faisal Bikanerwala at *+91 88660 06640 / +91 70430 46833*.\n` +
      `_New Chirag Tours & Travels — Luxury Tailor-Made Holidays_`;

    return this.dispatchMessage(payload.customerMobile, message);
  }

  /**
   * Send booking confirmation and receipt voucher to customer
   */
  async sendBookingConfirmation(payload: WhatsAppBookingPayload): Promise<{ success: boolean; messageId?: string }> {
    const balanceDue = Math.max(0, payload.totalAmount - payload.advancePaid);
    const message =
      `🎉 *Booking Confirmed!* Welcome aboard *New Chirag Tours & Travels*.\n\n` +
      `🎫 *Booking Reference:* ${payload.bookingNumber}\n` +
      `📍 *Destination:* ${payload.destinationName}\n` +
      `🗓️ *Travel Date:* ${payload.travelDate}\n` +
      `💳 *Advance Received:* ₹${payload.advancePaid.toLocaleString('en-IN')}\n` +
      `⚖️ *Balance Due:* ₹${balanceDue.toLocaleString('en-IN')}\n\n` +
      `Our operations desk will dispatch your vehicle registration & chauffeur details 24 hours prior to departure.\n\n` +
      `Support Helpline: *+91 88660 06640 / +91 70430 46833* (Faisal Bikanerwala). Have a wonderful holiday!`;

    return this.dispatchMessage(payload.customerMobile, message);
  }

  /**
   * Send high-priority instant lead alert to Admin / Faisal Bikanerwala
   */
  async sendAdminAlert(alertText: string): Promise<{ success: boolean }> {
    const adminMessage = `🔔 *[NEW CHIRAG HOT LEAD ALERT]*\n\n${alertText}\n\n_Check Admin Portal to assign or follow up immediately._`;
    return this.dispatchMessage(this.businessMobile, adminMessage);
  }

  /**
   * Send WhatsApp lead assignment alert with complete customer details to the assigned agent
   */
  async sendLeadAssignmentAlert(payload: WhatsAppAgentLeadPayload): Promise<{ success: boolean; messageId?: string }> {
    const message =
      `🎯 *New Customer Lead Assigned to You!*\n\n` +
      `Hello *${payload.agentName}*, a new traveler inquiry has been assigned to you by ${payload.assignedByName || 'Admin'}.\n\n` +
      `📋 *Lead Reference:* ${payload.leadNumber}\n` +
      `👤 *Traveler Name:* ${payload.customerName}\n` +
      `📱 *Customer Phone:* ${payload.customerMobile}\n` +
      (payload.customerEmail ? `✉️ *Email:* ${payload.customerEmail}\n` : '') +
      `📍 *Destination:* ${payload.destinationName}\n` +
      `⏳ *Duration:* ${payload.durationNights || 1} Nights / ${(payload.durationNights || 1) + 1} Days\n` +
      `👥 *Travelers:* ${payload.numberOfAdults} Adults${payload.numberOfChildren ? `, ${payload.numberOfChildren} Children` : ''}\n` +
      (payload.travelDate ? `🗓️ *Dates:* ${payload.travelDate}\n` : '') +
      (payload.specialRequirements ? `📝 *Requirements:* ${payload.specialRequirements}\n` : '') +
      `\n👉 Open Agent CRM to quote & connect with the traveler.\n` +
      `_New Chirag Tours & Travels Internal Dispatch Desk_`;

    return this.dispatchMessage(payload.agentMobile, message);
  }

  /**
   * Process inbound WhatsApp webhook message from Meta / Twilio
   */
  async handleIncomingWebhook(payload: any): Promise<{ handled: boolean; replyText?: string }> {
    try {
      // 1. Extract message text and sender from Meta WhatsApp Cloud API format
      let fromMobile = '';
      let textBody = '';

      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (message) {
        fromMobile = message.from || '';
        textBody = message.text?.body?.trim() || '';
      } else if (payload?.From && payload?.Body) {
        // Twilio format fallback
        fromMobile = payload.From;
        textBody = payload.Body.trim();
      }

      if (!fromMobile && !textBody) {
        return { handled: false };
      }

      console.log(`\n======================================================`);
      console.log(`[INCOMING WHATSAPP WEBHOOK]`);
      console.log(`From: ${fromMobile}`);
      console.log(`Message: "${textBody}"`);
      console.log(`======================================================\n`);

      const upper = textBody.toUpperCase();
      let reply = '';

      if (upper === 'HI' || upper === 'HELLO' || upper === 'HEY' || upper === 'NAMASTE') {
        reply =
          `Hello! Welcome to *New Chirag Tours & Travels*.\n\n` +
          `How can we assist you today?\n` +
          `1️⃣ Type *PACKAGES* to browse our top luxury circuits\n` +
          `2️⃣ Type *QUOTE <Reference>* to check your travel quote status\n` +
          `3️⃣ Type *AGENT* to speak directly with Faisal Bikanerwala\n\n` +
          `Direct Helpline: *+91 88660 06640 / +91 70430 46833*`;
      } else if (upper.startsWith('QUOTE')) {
        const parts = upper.split(/\s+/);
        const ref = parts[1] || 'your reference';
        reply =
          `We have received your quotation request for *${ref}*. Our holiday specialist is reviewing room availability and vehicle tariffs. We will message you the finalized proposal shortly!\n\n` +
          `Helpline: *+91 88660 06640 / +91 70430 46833*`;
      } else if (upper.includes('CALL') || upper.includes('AGENT') || upper.includes('HELP')) {
        reply =
          `Our Senior Tour Specialist *Faisal Bikanerwala* has been notified and will call you on ${fromMobile} within 15 minutes.\n\n` +
          `Direct Desk: *+91 88660 06640 / +91 70430 46833*\nOffice: Danilimda, Ahmedabad, Gujarat.`;
      } else {
        reply =
          `Thank you for contacting *New Chirag Tours & Travels*! We have logged your request: "${textBody}".\n` +
          `A travel manager will connect with you shortly. Urgent assistance: *+91 88660 06640 / +91 70430 46833*.`;
      }

      // Dispatch auto-reply back to the customer
      if (fromMobile) {
        await this.dispatchMessage(fromMobile, reply);
      }

      // Also alert Admin about the incoming message
      await this.sendAdminAlert(
        `💬 *Incoming WhatsApp Customer Message*\n` +
        `Customer Mobile: ${fromMobile}\n` +
        `Message: "${textBody}"`
      );

      return { handled: true, replyText: reply };
    } catch (err) {
      console.error('[WhatsAppService] Error parsing incoming webhook:', err);
      return { handled: false };
    }
  }

  /**
   * Internal message dispatcher: uses Meta Cloud API when configured, else logs simulated dispatch
   */
  private async dispatchMessage(toMobile: string, text: string): Promise<{ success: boolean; messageId?: string }> {
    const cleanMobile = toMobile.replace(/[^\d+]/g, '');

    console.log(`\n======================================================`);
    console.log(`[WHATSAPP MESSAGE DISPATCH]`);
    console.log(`Recipient: ${cleanMobile}`);
    console.log(`Message Content:\n${text}`);
    console.log(`======================================================\n`);

    if (this.isConfigured && this.apiToken && this.phoneNumberId) {
      try {
        const url = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanMobile.replace(/^\+/, ''),
            type: 'text',
            text: { preview_url: true, body: text },
          }),
        });

        if (!res.ok) {
          const errorData = await res.text();
          console.error('[WhatsAppService] Meta API returned non-200:', errorData);
          return { success: false };
        }

        const data: any = await res.json();
        const messageId = data?.messages?.[0]?.id;
        console.log(`[WhatsAppService] Meta API successfully sent message ID: ${messageId}`);
        return { success: true, messageId };
      } catch (err) {
        console.error('[WhatsAppService] Failed to dispatch via Meta API:', err);
        return { success: false };
      }
    }

    // Simulated carrier delivery for local / development / CI environments
    return {
      success: true,
      messageId: `sim_wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
  }
}

export const whatsappService = new WhatsAppService();
