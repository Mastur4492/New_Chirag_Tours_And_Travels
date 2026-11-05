export interface AgencySettingsDto {
  id?: string;
  agencyName: string;
  founderName: string;
  tagline?: string;
  supportPhone: string;
  supportPhoneDisplay: string;
  supportEmail: string;
  operatingHours: string;
  headOfficeAddress: string;
  city: string;
  state: string;
  pincode: string;
  websiteUrl?: string;

  // Official Banking
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  accountType: string;

  // UPI & Payments
  upiId: string;
  upiNumber: string;
  advancePercentage: number;
  paymentTerms: string;

  updatedAt?: string;
}

