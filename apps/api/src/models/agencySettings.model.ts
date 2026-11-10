import { AgencySettingsDto } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAgencySettingsDocument extends Document {
  agencyName: string;
  founderName: string;
  tagline: string;
  supportPhone: string;
  supportPhoneDisplay: string;
  altPhone?: string;
  altPhoneDisplay?: string;
  supportEmail: string;
  operatingHours: string;
  headOfficeAddress: string;
  city: string;
  state: string;
  pincode: string;
  websiteUrl: string;

  // Banking
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  accountType: string;

  // UPI
  upiId: string;
  upiNumber: string;
  advancePercentage: number;
  paymentTerms: string;

  createdAt: Date;
  updatedAt: Date;
  toDto(): AgencySettingsDto;
}

const AgencySettingsSchema = new Schema<IAgencySettingsDocument>(
  {
    agencyName: {
      type: String,
      default: 'New Chirag Tours & Travels',
      trim: true,
    },
    founderName: {
      type: String,
      default: 'Faisal Bikanerwala',
      trim: true,
    },
    tagline: {
      type: String,
      default: 'Ahmedabad Travel Desk • Customized Holidays & Tour Packages',
      trim: true,
    },
    supportPhone: {
      type: String,
      default: '+918866006640',
      trim: true,
    },
    supportPhoneDisplay: {
      type: String,
      default: '+91 88660 06640',
      trim: true,
    },
    altPhone: {
      type: String,
      default: '+917043046833',
      trim: true,
    },
    altPhoneDisplay: {
      type: String,
      default: '+91 70430 46833',
      trim: true,
    },
    supportEmail: {
      type: String,
      default: 'newchiragtoursandtravels@gmail.com',
      trim: true,
      lowercase: true,
    },
    operatingHours: {
      type: String,
      default: 'Daily 10:00 AM – 8:30 PM',
      trim: true,
    },
    headOfficeAddress: {
      type: String,
      default: 'Shop No 3, Al-Rehman Plaza, nr. Nagori Complex, opp. Alishan Complex, Shakti Society, Danilimda, Ahmedabad, Gujarat 382405',
      trim: true,
    },
    city: {
      type: String,
      default: 'Ahmedabad',
      trim: true,
    },
    state: {
      type: String,
      default: 'Gujarat',
      trim: true,
    },
    pincode: {
      type: String,
      default: '382405',
      trim: true,
    },
    websiteUrl: {
      type: String,
      default: 'http://localhost:3000',
      trim: true,
    },

    // Bank Details
    bankName: {
      type: String,
      default: 'HDFC Bank Ltd',
      trim: true,
    },
    accountHolderName: {
      type: String,
      default: 'NEW CHIRAG TOURS AND TRAVELS',
      trim: true,
    },
    accountNumber: {
      type: String,
      default: '50200084920194',
      trim: true,
    },
    ifscCode: {
      type: String,
      default: 'HDFC0001842',
      trim: true,
      uppercase: true,
    },
    branchName: {
      type: String,
      default: 'Danilimda Branch, Ahmedabad',
      trim: true,
    },
    accountType: {
      type: String,
      default: 'Current Account',
      trim: true,
    },

    // UPI & Payment Terms
    upiId: {
      type: String,
      default: '8866006640@upi',
      trim: true,
    },
    upiNumber: {
      type: String,
      default: '+91 88660 06640',
      trim: true,
    },
    advancePercentage: {
      type: Number,
      default: 25,
      min: 0,
      max: 100,
    },
    paymentTerms: {
      type: String,
      default: '25% Advance to Lock Allotments • Balance 75% on Arrival / Prior to Hotel Check-in',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

AgencySettingsSchema.methods.toDto = function (): AgencySettingsDto {
  return {
    id: this._id ? this._id.toString() : undefined,
    agencyName: this.agencyName,
    founderName: this.founderName,
    tagline: this.tagline,
    supportPhone: this.supportPhone,
    supportPhoneDisplay: this.supportPhoneDisplay,
    altPhone: this.altPhone,
    altPhoneDisplay: this.altPhoneDisplay,
    supportEmail: this.supportEmail,
    operatingHours: this.operatingHours,
    headOfficeAddress: this.headOfficeAddress,
    city: this.city,
    state: this.state,
    pincode: this.pincode,
    websiteUrl: this.websiteUrl,
    bankName: this.bankName,
    accountHolderName: this.accountHolderName,
    accountNumber: this.accountNumber,
    ifscCode: this.ifscCode,
    branchName: this.branchName,
    accountType: this.accountType,
    upiId: this.upiId,
    upiNumber: this.upiNumber,
    advancePercentage: this.advancePercentage,
    paymentTerms: this.paymentTerms,
    updatedAt: this.updatedAt ? (this.updatedAt instanceof Date ? this.updatedAt.toISOString() : new Date(this.updatedAt).toISOString()) : undefined,
  };
};

export const AgencySettingsModel: Model<IAgencySettingsDocument> =
  mongoose.models.AgencySettings ||
  mongoose.model<IAgencySettingsDocument>('AgencySettings', AgencySettingsSchema);

