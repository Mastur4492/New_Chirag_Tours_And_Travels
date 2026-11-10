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
  altPhone: string;
  altPhoneDisplay: string;
  altPhoneRaw: string;
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
    badge: string;
    full: string;
    icon: string;
    main: string;
  };
  googleRating: {
    score: string;
    reviewsCount: number;
    quote: string;
  };
  whatsappUrl: string;
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
  phone: '+91 88660 06640',
  phoneDisplay: '+91 88660 06640',
  phoneRaw: '8866006640',
  altPhone: '+91 70430 46833',
  altPhoneDisplay: '+91 70430 46833',
  altPhoneRaw: '7043046833',
  address: 'Shop No 3, Al-Rehman Plaza, nr. Nagori Complex, opp. Alishan Complex, Shakti Society, Danilimda',
  city: 'Ahmedabad',
  state: 'Gujarat',
  pincode: '382405',
  fullAddress: 'Shop No 3, Al-Rehman Plaza, nr. Nagori Complex, opp. Alishan Complex, Shakti Society, Danilimda, Ahmedabad, Gujarat 382405',
  hours: 'Open · Closes 8:30 PM (Daily 10:00 AM – 8:30 PM)',
  services: [
    'Customized Domestic Holidays',
    'International Holiday Packages',
    'Historical & Heritage Tours',
    'Couples & Honeymoon Specials',
    'Premium Car & Cab Hire',
    'Corporate & Group Travel',
    'Cruises & Flights Coordination'
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
    quote: 'Excellent personalized service, verified itinerary execution, and trusted hospitality.',
  },
  whatsappUrl: 'https://wa.me/918866006640?text=Hello%20New%20Chirag%20Tours%20%26%20Travels%2C%20I%20am%20interested%20in%20planning%20a%20holiday.',
  isPhoneConfigured: true,
  isAddressConfigured: true,
  isGstinConfigured: false,
};
