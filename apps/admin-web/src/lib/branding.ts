/**
 * NEW CHIRAG TOURS & TRAVELS — CENTRALIZED BRANDING & OFFICIAL DETAILS
 * 
 * Verified from the owner's Google Business Profile & official records.
 * Single source of truth for company identity, logos, address, and contact info.
 */

export interface CompanyBranding {
  name: string;
  shortName: string;
  owner: string;
  role: string;
  email: string;
  phone: string;
  phoneDisplay: string;
  phoneRaw: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  fullAddress: string;
  hours: string;
  services: string[];
  gstin?: string;
  website?: string;
  tagline: string;
  logos: {
    badge: string; // High-res presentation badge
    full: string;  // Standard brand logo on white with typography
    icon: string;  // Compact NC emblem mark (for favicon)
    main: string;  // Official New Chirag brand logo
  };
  googleRating: {
    score: string;
    reviewsCount: number;
    quote: string;
  };
  isPhoneConfigured: boolean;
  isAddressConfigured: boolean;
  isGstinConfigured: boolean;
}

export const COMPANY_BRANDING: CompanyBranding = {
  name: 'New Chirag Tours & Travels',
  shortName: 'New Chirag',
  owner: 'Faisal Bikanerwala',
  role: 'Managing Director & Operations',
  email: 'newchiragtoursandtravels@gmail.com',
  phone: '+91 99786 55529',
  phoneDisplay: '+91 99786 55529',
  phoneRaw: '9978655529',
  address: 'Shop No 3, Al-Rehman Plaza, nr. Nagori Complex, opp. Alishan Complex, Shakti Society, Danilimda',
  city: 'Ahmedabad',
  state: 'Gujarat',
  pincode: '382405',
  fullAddress: 'Shop No 3, Al-Rehman Plaza, nr. Nagori Complex, opp. Alishan Complex, Shakti Society, Danilimda, Ahmedabad, Gujarat 382405',
  hours: 'Open · Closes 8:30 PM (Daily 10:00 AM – 8:30 PM)',
  services: [
    'Domestic Holidays',
    'International Tours',
    'Historical & Heritage Tours',
    'Couples & Honeymoon Trips',
    'Car & Cab Hire',
    'Corporate Travel',
    'Cruises & Flights'
  ],
  gstin: undefined,
  website: undefined,
  tagline: 'Customized Domestic & International Holiday Packages',
  logos: {
    badge: '/branding/nc-logo.jpg',
    full: '/branding/nc-logo.jpg',
    main: '/branding/nc-logo.jpg',
    icon: '/branding/logo-icon.jpg', // Dedicated for favicon
  },
  googleRating: {
    score: '5.0',
    reviewsCount: 40,
    quote: 'Excellent service, smooth coordination, and great value for money.',
  },
  isPhoneConfigured: true,
  isAddressConfigured: true,
  isGstinConfigured: false,
};
