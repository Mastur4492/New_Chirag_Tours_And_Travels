export interface CompanyBrandingConfig {
  name: string;
  owner: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  website?: string;
  logoBadgeUrl: string;
  logoFullUrl: string;
  logoIconUrl: string;
  isPhoneConfigured: boolean;
  isEmailConfigured: boolean;
  isGstinConfigured: boolean;
}

/**
 * Centrally manages company branding and commercial contact information.
 * Uses official owner-supplied assets and credentials.
 * Unconfirmed commercial details remain unconfigured until authorized.
 */
/**
 * Upgrades legacy ampersand agency names while preserving intentional casing.
 */
export function normalizeCompanyBrandName(rawName?: string | null): string {
  const trimmed = rawName?.trim() || 'New Chirag Tours and Travels';
  if (trimmed === 'NEW CHIRAG TOURS & TRAVELS') {
    return 'NEW CHIRAG TOURS AND TRAVELS';
  }
  if (trimmed.toLowerCase() === 'new chirag tours & travels') {
    return 'New Chirag Tours and Travels';
  }
  return trimmed;
}

export function getCompanyBrandingConfig(): CompanyBrandingConfig {
  const phone = process.env.COMPANY_PHONE?.trim();
  const email = process.env.COMPANY_EMAIL?.trim() || 'newchiragtoursandtravels@gmail.com';
  const address = process.env.COMPANY_ADDRESS?.trim();
  const gstin = process.env.COMPANY_GSTIN?.trim();

  const name = normalizeCompanyBrandName(process.env.COMPANY_NAME);

  return {
    name,
    owner: process.env.COMPANY_OWNER?.trim() || 'Faisal Bikanerwala',
    phone: phone && phone.length > 0 ? phone : undefined,
    email: email && email.length > 0 ? email : undefined,
    address: address && address.length > 0 ? address : undefined,
    gstin: gstin && gstin.length > 0 ? gstin : undefined,
    website: process.env.COMPANY_WEBSITE?.trim() || undefined,
    logoBadgeUrl: '/branding/nc-logo.jpg',
    logoFullUrl: '/branding/nc-logo.jpg',
    logoIconUrl: '/branding/logo-icon.jpg',
    isPhoneConfigured: !!(phone && phone.length > 0),
    isEmailConfigured: !!(email && email.length > 0),
    isGstinConfigured: !!(gstin && gstin.length > 0),
  };
}
