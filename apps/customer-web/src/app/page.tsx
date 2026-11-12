'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Calendar,
  Users,
  Building2,
  Car,
  Sparkles,
  Phone,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Send,
  RefreshCw,
  Plus,
  Minus,
  Info,
  Printer,
  Search,
  Star,
  Check,
  Building,
  Clock,
  Compass,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Mail,
  Copy,
} from 'lucide-react';
import { customerApi } from '@/lib/api';
import { DestinationDto, TourPackageDto } from '@chirag/types';
import { COMPANY_BRANDING } from '@/lib/branding';
import {
  formatDisplayTitle,
  formatINR,
  getCuratedHotelsForDestination,
  getDestinationStyle,
} from '@/lib/utils';
import UnifiedBookingCard from '@/components/UnifiedBookingCard';
import { HomeHero } from '@/components/HomeHero';
import { PrintQuotationProposal } from '@/components/PrintQuotationProposal';
import { CircuitGrid } from '@/components/CircuitGrid';
import { TripCustomizer } from '@/components/TripCustomizer';

// =========================================================================
// DATA MODELS & PRESETS FOR CUSTOMER SELF-QUOTATION
// =========================================================================

export type CategoryFilter = 'all' | 'snow' | 'backwaters' | 'heritage' | 'beach' | 'lakes';

export interface CustomerStateCircuit {
  id: string;
  mongoId?: string;
  name: string;
  shortName: string;
  badge: string;
  category: CategoryFilter;
  image: string;
  tagline: string;
  defaultNights: number;
  defaultDays?: number;
  hotel: string;
  vehicle: string;
  startingFrom: number;
  bestSeason: string;
  hotelCount: number;
  matchedPackage?: TourPackageDto;
  hotels?: any[];
}

const BANK_DETAILS = {
  bankName: 'HDFC Bank',
  branch: 'Danilimda Branch, Ahmedabad',
  accountName: 'NEW CHIRAG TOURS AND TRAVELS',
  accountNumber: '50200084920194',
  ifsc: 'HDFC0001842',
  upiId: '8866006640@upi',
};

const ALL_STATES: CustomerStateCircuit[] = [
  {
    id: 'kashmir',
    name: 'Kashmir Valley Circuit (Srinagar, Gulmarg, Pahalgam)',
    shortName: 'Kashmir',
    badge: '🏔️ Kashmir Paradise',
    category: 'snow',
    image: '/images/destinations/kashmir.jpg',
    tagline: 'Srinagar Shikara • Gulmarg Gondola • Pahalgam Lidder Valley',
    defaultNights: 5,
    hotel: 'DELUXE',
    vehicle: 'SUV',
    startingFrom: 24500,
    bestSeason: 'Apr–Oct & Dec–Feb (Snow)',
    hotelCount: 4,
  },
  {
    id: 'kerala',
    name: 'Kerala Serene Backwaters (Munnar, Thekkady, Alleppey)',
    shortName: 'Kerala',
    badge: '🌴 Kerala Backwaters',
    category: 'backwaters',
    image: '/images/destinations/kerala.jpg',
    tagline: 'Munnar Tea Hills • Alleppey Houseboat • Thekkady Forest',
    defaultNights: 6,
    hotel: 'DELUXE',
    vehicle: 'SUV',
    startingFrom: 21500,
    bestSeason: 'Sep–Mar (Peak Season)',
    hotelCount: 4,
  },
  {
    id: 'himachal',
    name: 'Himachal Hills & Snow (Shimla, Manali, Solang Valley)',
    shortName: 'Himachal',
    badge: '❄️ Himachal Snow Tour',
    category: 'snow',
    image: '/images/destinations/himachal.jpg',
    tagline: 'Shimla Mall Road • Manali Solang • Rohtang Snow • Atal Tunnel',
    defaultNights: 5,
    hotel: 'DELUXE',
    vehicle: 'SUV',
    startingFrom: 18500,
    bestSeason: 'Year-Round / Summer & Snow',
    hotelCount: 3,
  },
  {
    id: 'rajasthan',
    name: 'Royal Rajasthan Heritage (Jaipur, Jodhpur, Udaipur)',
    shortName: 'Rajasthan',
    badge: '👑 Royal Rajasthan',
    category: 'heritage',
    image: '/images/destinations/rajasthan.jpg',
    tagline: 'Jaipur Amer Fort • Udaipur Lake Palace • Jodhpur Fort',
    defaultNights: 6,
    hotel: 'LUXURY',
    vehicle: 'SUV',
    startingFrom: 19500,
    bestSeason: 'Oct–Mar (Heritage Season)',
    hotelCount: 3,
  },
  {
    id: 'goa',
    name: 'Goa Coastal Leisure (Calangute, Baga, South Goa)',
    shortName: 'Goa',
    badge: '🏖️ Goa Beach Holiday',
    category: 'beach',
    image: '/images/destinations/goa.jpg',
    tagline: 'North Beach Parties • South Goa Luxury Resorts • Cruise',
    defaultNights: 4,
    hotel: 'COMFORT',
    vehicle: 'SEDAN',
    startingFrom: 16500,
    bestSeason: 'Nov–Feb (Tropical Sunshine)',
    hotelCount: 3,
  },
  {
    id: 'uttarakhand',
    name: 'Uttarakhand Lakes & Hills (Nainital, Mussoorie, Rishikesh)',
    shortName: 'Uttarakhand',
    badge: '⛰️ Uttarakhand Escape',
    category: 'lakes',
    image: '/images/destinations/uttarakhand.jpg',
    tagline: 'Nainital Naini Lake • Mussoorie Kempty • Rishikesh Ganga Aarti',
    defaultNights: 5,
    hotel: 'COMFORT',
    vehicle: 'SEDAN',
    startingFrom: 17500,
    bestSeason: 'Mar–Jun & Sep–Nov',
    hotelCount: 2,
  },
  {
    id: 'andaman',
    name: 'Andaman Tropical Islands (Port Blair, Havelock, Neil)',
    shortName: 'Andaman',
    badge: '🏝️ Andaman Coral Islands',
    category: 'beach',
    image: '/images/destinations/andaman.jpg',
    tagline: 'Radhanagar White Sands • Scuba Diving • Cellular Jail',
    defaultNights: 5,
    hotel: 'DELUXE',
    vehicle: 'SUV',
    startingFrom: 28500,
    bestSeason: 'Oct–May (Crystal Waters)',
    hotelCount: 2,
  },
  {
    id: 'ladakh',
    name: 'Ladakh High Altitude Circuit (Leh, Nubra Valley, Pangong)',
    shortName: 'Ladakh',
    badge: '🏔️ Ladakh High Passes',
    category: 'snow',
    image: '/images/destinations/kashmir.jpg',
    tagline: 'Khardung La Pass • Nubra Sand Dunes • Pangong Blue Lake',
    defaultNights: 6,
    hotel: 'DELUXE',
    vehicle: 'SUV',
    startingFrom: 28500,
    bestSeason: 'May–Sep (High Season)',
    hotelCount: 3,
  },
];

const HOTEL_TIER_RATES: Record<
  string,
  { label: string; subLabel: string; ratePerNight: number; desc: string; popular?: boolean }
> = {
  COMFORT: {
    label: '3★ Verified Comfort',
    subLabel: 'Hygiene & Value',
    ratePerNight: 3500,
    desc: 'Verified 3-Star hotels with attached bath, 24/7 hot water & MAP Plan (Daily Breakfast + Dinner)',
  },
  DELUXE: {
    label: '4★ Premium Deluxe',
    subLabel: 'Scenic Views & Buffet',
    ratePerNight: 5500,
    desc: 'Handpicked 4-Star resorts with mountain/valley/lake views, spacious rooms & grand buffet meals',
    popular: true,
  },
  LUXURY: {
    label: '5★ Luxury & Heritage',
    subLabel: 'Palace Stays & VIP Care',
    ratePerNight: 9500,
    desc: '5-Star luxury properties, historic heritage palaces, heated rooms & executive multi-cuisine dining',
  },
};

const VEHICLE_TIER_RATES: Record<
  string,
  { label: string; perDayCost: number; capacity: string; luggage: string; bestFor: string }
> = {
  SEDAN: {
    label: 'AC Sedan (Dzire / Etios)',
    perDayCost: 2800,
    capacity: 'Up to 3-4 Pax',
    luggage: '2-3 Medium Bags',
    bestFor: 'Couples & small families',
  },
  SUV: {
    label: 'AC SUV (Innova / Ertiga)',
    perDayCost: 4200,
    capacity: 'Up to 6-7 Pax',
    luggage: '4-5 Large Bags',
    bestFor: 'Spacious comfort on hill curves & mountain roads',
  },
  CRYSTA: {
    label: 'Innova Crysta Premium',
    perDayCost: 5500,
    capacity: 'Up to 6 Pax',
    luggage: '4-5 Bags',
    bestFor: 'Executive luxury with plush captain seats',
  },
  TEMPO: {
    label: 'Tempo Traveller (12-17 Seater)',
    perDayCost: 7500,
    capacity: '12 to 17 Pax',
    luggage: 'Joint Family Luggage',
    bestFor: 'Large joint families & group tours with high-roof comfort',
  },
};

// Date helper utilities
function formatDateForInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

// =========================================================================
// STREAMLINED 1-PAGE PORTAL
// =========================================================================

export default function HomePage() {
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [packages, setPackages] = useState<TourPackageDto[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [transportTariffs, setTransportTariffs] = useState<any[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [dynamicBankDetails, setDynamicBankDetails] = useState(BANK_DETAILS);
  const [advancePercentage, setAdvancePercentage] = useState<number>(35);

  // Step 1: Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Step 2: Customization State
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedStateName, setSelectedStateName] = useState<string>('');
  const [durationNights, setDurationNights] = useState<number>(5);
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [roomsCount, setRoomsCount] = useState<number>(1);
  const [extraBeds, setExtraBeds] = useState<number>(0);
  const [hotelTier, setHotelTier] = useState<string>('DELUXE');
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [hotelStarFilter, setHotelStarFilter] = useState<'all' | 5 | 4 | 3>('all');
  const [vehicleTier, setVehicleTier] = useState<string>('SUV');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  // Check-in & Check-out Date State (Default start 14 days from today)
  const [checkInDate, setCheckInDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return formatDateForInput(d);
  });
  const [mealPlan, setMealPlan] = useState<'EP' | 'CP' | 'MAP' | 'AP'>('MAP');

  // Reactively calculate checkOutDate from checkInDate + durationNights
  const checkOutDate = useMemo(() => {
    if (!checkInDate) return '';
    const [y, m, d] = checkInDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + durationNights);
    return formatDateForInput(date);
  }, [checkInDate, durationNights]);

  const minDateStr = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateForInput(tomorrow);
  }, []);

  const minCheckOutStr = useMemo(() => {
    if (!checkInDate) return minDateStr;
    const [y, m, d] = checkInDate.split('-').map(Number);
    const minOut = new Date(y, m - 1, d);
    minOut.setDate(minOut.getDate() + 2);
    return formatDateForInput(minOut);
  }, [checkInDate, minDateStr]);

  const handleCheckInChange = (newInStr: string) => {
    setCheckInDate(newInStr);
  };

  const handleCheckOutChange = (newOutStr: string) => {
    if (!checkInDate || !newOutStr) return;
    const [inY, inM, inD] = checkInDate.split('-').map(Number);
    const [outY, outM, outD] = newOutStr.split('-').map(Number);
    const inTime = new Date(inY, inM - 1, inD).getTime();
    const outTime = new Date(outY, outM - 1, outD).getTime();
    const diffDays = Math.round((outTime - inTime) / (1000 * 60 * 60 * 24));
    if (diffDays >= 2 && diffDays <= 15) {
      setDurationNights(diffDays);
    } else if (diffDays < 2) {
      setDurationNights(2);
    } else if (diffDays > 15) {
      setDurationNights(15);
    }
  };

  const getDayDateLabel = (dayNumber: number) => {
    if (!checkInDate) return '';
    const [y, m, d] = checkInDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + (dayNumber - 1));
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const getDayFullDateLabel = (dayNumber: number) => {
    if (!checkInDate) return '';
    const [y, m, d] = checkInDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + (dayNumber - 1));
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Itinerary View State
  const [showItinerary, setShowItinerary] = useState<boolean>(true);
  const [selectedDayTab, setSelectedDayTab] = useState<number>(1);

  // Booking Form State
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedLeadRef, setSubmittedLeadRef] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyText = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Fetch Destinations, Hotels, Packages, Vehicles & Tariffs Concurrently from Live MongoDB
  useEffect(() => {
    async function loadCatalog() {
      try {
        setIsLoadingCatalog(true);
        const [destList, hotelList, pkgList, vehicleList, tariffList] = await Promise.all([
          customerApi.getDestinations().catch(() => []),
          customerApi.getHotels().catch(() => []),
          customerApi.getPackages().catch(() => []),
          customerApi.getVehicles().catch(() => []),
          customerApi.getTransportTariffs().catch(() => []),
        ]);

        if (destList && destList.length > 0) {
          setDestinations(destList);
        }
        if (hotelList && hotelList.length > 0) {
          setHotels(hotelList);
        }
        if (pkgList && pkgList.length > 0) {
          setPackages(pkgList);
        }
        if (vehicleList && vehicleList.length > 0) {
          setVehicles(vehicleList);
        }
        if (tariffList && tariffList.length > 0) {
          setTransportTariffs(tariffList);
        }

        // Fetch official dynamic agency settings
        fetch('/api/proxy/settings/agency')
          .then((res) => res.json())
          .then((json) => {
            if (json.success && json.data) {
              if (json.data.advancePercentage) {
                setAdvancePercentage(Number(json.data.advancePercentage));
              }
              setDynamicBankDetails({
                bankName: json.data.bankName || 'HDFC Bank Ltd',
                branch: json.data.branchName || 'Danilimda Branch, Ahmedabad',
                accountName: json.data.accountHolderName || 'NEW CHIRAG TOURS AND TRAVELS',
                accountNumber: json.data.accountNumber || '50200084920194',
                ifsc: json.data.ifscCode || 'HDFC0001842',
                upiId: json.data.upiId || '8866006640@upi',
              });
            }
          })
          .catch(() => {});
      } catch (err) {
        console.error('Failed to load dynamic catalog from database:', err);
      } finally {
        setIsLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  // Dynamically map live database destinations into rich customer cards
  const dynamicStates = useMemo(() => {
    if (!destinations || destinations.length === 0) {
      return ALL_STATES;
    }

    const activeDestList = destinations.filter((d) => d.isActive !== false);
    return (activeDestList.length > 0 ? activeDestList : ALL_STATES).map((d: any, index) => {
      const destId = d.id;
      const style = getDestinationStyle(d.name, index);

      // Match hotels belonging to this destination in MongoDB
      const matchedHotels = hotels.filter((h) => {
        const hDestId = h.destinationId?._id || h.destinationId;
        return (
          hDestId === destId ||
          (h.city && d.name.toLowerCase().includes(h.city.toLowerCase()))
        );
      });

      // Match package belonging to this destination in MongoDB
      const matchedPkg = packages.find((p) => {
        const pDestId = typeof p.destinationId === 'object' ? (p.destinationId as any)?._id : p.destinationId;
        return (
          pDestId === destId ||
          (p.slug && p.slug.includes(d.slug)) ||
          (p.title && p.title.toLowerCase().includes(d.name.toLowerCase().split(' ')[0] || ''))
        );
      });

      const cleanName = formatDisplayTitle(d.name);
      const shortName =
        cleanName.split('(')[0]?.trim().replace(/^(Royal|The|E2E Demo)\s+/i, '') || cleanName;

      return {
        id: destId,
        mongoId: destId,
        name: cleanName,
        shortName: shortName,
        badge: d.highlights?.[0] ? `✨ ${d.highlights[0]}` : style.badge,
        category: (style.category || 'all') as CategoryFilter,
        image: (d as any).heroImage || d.coverImages?.[0] || style.image,
        tagline:
          d.description ||
          (d.highlights && d.highlights.slice(0, 3).join(' • ')) ||
          style.hotelSummary,
        defaultNights: matchedPkg?.durationNights || 5,
        defaultDays: matchedPkg?.durationDays || (matchedPkg?.durationNights ? matchedPkg.durationNights + 1 : 6),
        hotel: 'DELUXE',
        vehicle: (matchedPkg?.defaultVehicleCategory || 'SUV') as string,
        startingFrom: matchedPkg?.startingPrice || style.startingPrice,
        bestSeason: style.bestSeason,
        hotelCount: matchedHotels.length || style.hotelCount,
        matchedPackage: matchedPkg,
        hotels: matchedHotels,
      };
    });
  }, [destinations, hotels, packages]);

  const filteredStates = useMemo(() => {
    return dynamicStates.filter((st) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        st.name.toLowerCase().includes(q) ||
        st.shortName.toLowerCase().includes(q) ||
        st.tagline.toLowerCase().includes(q);

      const matchesCat = categoryFilter === 'all' || st.category === categoryFilter;
      return matchesQuery && matchesCat;
    });
  }, [dynamicStates, searchQuery, categoryFilter]);

  const activeStateObj = useMemo(() => {
    if (!selectedStateId || dynamicStates.length === 0) return null;
    const target = String(selectedStateId).toLowerCase().trim();
    const found = dynamicStates.find(
      (s) =>
        s.id === selectedStateId ||
        (s as any).mongoId === selectedStateId ||
        (s.shortName && s.shortName.toLowerCase() === target) ||
        (s.name && s.name.toLowerCase().includes(target)) ||
        (s.shortName && target.includes(s.shortName.toLowerCase()))
    );
    return found || null;
  }, [dynamicStates, selectedStateId]);

  // Live verified partner hotels in MongoDB for selected destination
  const liveCuratedHotels = useMemo(() => {
    if (!activeStateObj) return [];
    const destId = activeStateObj.id;
    const destHotels = hotels.filter((h) => {
      const hDestId = h.destinationId?._id || h.destinationId;
      return (
        hDestId === destId ||
        (h.city && activeStateObj.name.toLowerCase().includes(h.city.toLowerCase()))
      );
    });

    if (destHotels.length > 0) {
      return destHotels.map((h) => ({
        id: h.id || h._id,
        name: h.name,
        city: h.city || activeStateObj.shortName,
        starRating: h.starRating || 4,
        propertyType: h.propertyType || 'Hotel',
        image: h.images?.[0] || activeStateObj.image,
        amenities: h.amenities || ['Free Wi-Fi', 'Room Service'],
        address: h.address || '',
        roomCategories: (h.roomCategories && h.roomCategories.length > 0
          ? h.roomCategories
          : [
              {
                id: `${h.id || h._id}-std`,
                name: `${h.starRating || 4}★ Standard Deluxe Room`,
                baseOccupancy: 2,
                maxAdults: 3,
                maxChildren: 2,
                extraBedSupported: true,
                maxExtraBeds: 1,
                extraBedPricePerNight: 1200,
                allowedMealPlans: 'EP CP MAP AP',
                pricePerNight: h.starRating >= 5 ? 7500 : h.starRating === 3 ? 3500 : 4800,
              },
            ]
        ).map((rc: any) => ({
          id: rc.id || rc._id,
          name: rc.name,
          baseOccupancy: rc.baseOccupancy || 2,
          maxAdults: rc.maxAdults || 3,
          maxChildren: rc.maxChildren || 2,
          extraBedSupported: rc.extraBedSupported !== false,
          maxExtraBeds: rc.maxExtraBeds || 1,
          extraBedPricePerNight: rc.extraBedPricePerNight ?? 1200,
          allowedMealPlans: rc.allowedMealPlans || 'EP CP MAP AP',
          pricePerNight: rc.pricePerNight && rc.pricePerNight > 0
            ? rc.pricePerNight
            : (h.starRating >= 5 ? 7500 : h.starRating === 3 ? 3500 : 4800),
        })),
      }));
    }

    return getCuratedHotelsForDestination(activeStateObj.shortName).map((h) => ({
      ...h,
      roomCategories: (h.roomTypes && h.roomTypes.length > 0 ? h.roomTypes : ['Deluxe Room', 'Executive Suite']).map((rt, idx) => ({
        id: `${h.id}-rc-${idx}`,
        name: rt,
        baseOccupancy: 2,
        maxAdults: 3,
        maxChildren: 2,
        extraBedSupported: true,
        maxExtraBeds: 1,
        extraBedPricePerNight: 1200,
        allowedMealPlans: 'EP CP MAP AP',
        pricePerNight: idx === 0 ? h.startingPrice : Math.round(h.startingPrice * 1.35),
      })),
    }));
  }, [hotels, activeStateObj]);

  const filteredCuratedHotels = useMemo(() => {
    if (!liveCuratedHotels) return [];
    if (hotelStarFilter === 'all') return liveCuratedHotels;
    return liveCuratedHotels.filter((h) => h.starRating === hotelStarFilter);
  }, [liveCuratedHotels, hotelStarFilter]);

  const selectedHotel = useMemo(() => {
    if (!liveCuratedHotels || liveCuratedHotels.length === 0) return null;
    if (selectedHotelId) {
      const found = liveCuratedHotels.find((h) => h.id === selectedHotelId);
      if (found) return found;
    }
    if (filteredCuratedHotels.length > 0) {
      return filteredCuratedHotels[0];
    }
    return liveCuratedHotels[0] || null;
  }, [liveCuratedHotels, filteredCuratedHotels, selectedHotelId]);

  const selectedHotelRooms = useMemo(() => {
    if (!selectedHotel) return [];
    if (selectedHotel.roomCategories && selectedHotel.roomCategories.length > 0) {
      return selectedHotel.roomCategories;
    }
    const defaultPrice = selectedHotel.starRating >= 5 ? 7500 : selectedHotel.starRating === 3 ? 3500 : 4800;
    return [
      {
        id: `${selectedHotel.id}-std`,
        name: `${selectedHotel.starRating}★ Standard Deluxe Room`,
        baseOccupancy: 2,
        maxAdults: 3,
        maxChildren: 2,
        extraBedSupported: true,
        maxExtraBeds: 1,
        extraBedPricePerNight: 1200,
        allowedMealPlans: 'EP CP MAP AP',
        pricePerNight: defaultPrice,
      },
    ];
  }, [selectedHotel]);

  const selectedRoom = useMemo(() => {
    if (!selectedHotelRooms || selectedHotelRooms.length === 0) return null;
    if (selectedRoomId) {
      const found = selectedHotelRooms.find((r: any) => r.id === selectedRoomId);
      if (found) return found;
    }
    return selectedHotelRooms[0] || null;
  }, [selectedHotelRooms, selectedRoomId]);

  const handleSelectHotel = (hotelId: string) => {
    setSelectedHotelId(hotelId);
    setSelectedRoomId(null);
  };

  // Live vehicles configured directly by Admin in MongoDB Fleet & Tariffs
  const liveVehicles = useMemo(() => {
    const activeDestId = activeStateObj?.id;

    if (vehicles && vehicles.length > 0) {
      const activeFleet = vehicles.filter((v) => v.status !== 'INACTIVE' && v.status !== 'MAINTENANCE');
      if (activeFleet.length > 0) {
        return activeFleet.map((veh) => {
          // Look for matching tariff for this category and destination
          const matchedTariff = transportTariffs.find((t) => {
            const tDestId = typeof t.destinationId === 'object' ? t.destinationId?._id : t.destinationId;
            return (
              t.vehicleCategory === veh.category &&
              (!tDestId || !activeDestId || tDestId === activeDestId)
            );
          }) || transportTariffs.find((t) => t.vehicleCategory === veh.category);

          const defaultCategoryCost =
            veh.category === 'SEDAN' ? 2800 :
            veh.category === 'SUV' ? 4200 :
            veh.category === 'PREMIUM_SUV' ? 5500 :
            veh.category === 'TEMPO_TRAVELLER' ? 7500 :
            veh.category === 'BUS' ? 12000 : 2500;

          const perDayCost = matchedTariff?.standardSellingRate || defaultCategoryCost;

          const defaultLuggage =
            veh.category === 'SEDAN' ? '2-3 Medium Bags' :
            veh.category === 'SUV' || veh.category === 'PREMIUM_SUV' ? '4-5 Large Bags' :
            veh.category === 'TEMPO_TRAVELLER' ? 'Joint Family Luggage' : 'Luggage Carrier';

          const bestFor =
            veh.category === 'SEDAN' ? 'Couples & small families' :
            veh.category === 'SUV' ? 'Spacious comfort on hill curves & mountain roads' :
            veh.category === 'PREMIUM_SUV' ? 'Executive luxury with plush captain seats' :
            veh.category === 'TEMPO_TRAVELLER' ? 'Large joint families & group tours with high-roof comfort' :
            'Large group luxury transport';

          return {
            id: veh.id || veh._id,
            model: veh.model,
            label: veh.model,
            category: veh.category,
            capacity: `Up to ${veh.seatingCapacity} Pax`,
            seatingCapacity: veh.seatingCapacity,
            luggage: defaultLuggage,
            perDayCost,
            bestFor,
            hasAC: veh.hasAC !== false,
            registrationNumber: '',
            isFromAdmin: true,
          };
        });
      }
    }

    // Benchmark fallback if no live fleet in database
    return Object.entries(VEHICLE_TIER_RATES).map(([key, val]) => ({
      id: key,
      model: val.label,
      label: val.label,
      category: key,
      capacity: val.capacity,
      seatingCapacity: key === 'SEDAN' ? 4 : key === 'SUV' ? 7 : key === 'CRYSTA' ? 7 : 17,
      luggage: val.luggage,
      perDayCost: val.perDayCost,
      bestFor: val.bestFor,
      hasAC: true,
      registrationNumber: '',
      isFromAdmin: false,
    }));
  }, [vehicles, transportTariffs, activeStateObj]);

  const selectedVehicle = useMemo(() => {
    if (!liveVehicles || liveVehicles.length === 0) return null;
    if (selectedVehicleId) {
      const found = liveVehicles.find((v) => v.id === selectedVehicleId);
      if (found) return found;
    }
    const byTier = liveVehicles.find((v) => v.category === vehicleTier || v.id === vehicleTier);
    if (byTier) return byTier;
    return liveVehicles[0];
  }, [liveVehicles, selectedVehicleId, vehicleTier]);

  // Live tour package in MongoDB for selected destination
  const activePackage = useMemo(() => {
    if (!activeStateObj) return null;
    const destId = activeStateObj.id;
    return (
      packages.find((p) => {
        const pDestId = typeof p.destinationId === 'object' ? (p.destinationId as any)?._id : p.destinationId;
        return (
          pDestId === destId ||
          (p.slug && activeStateObj.matchedPackage && p.slug === activeStateObj.matchedPackage.slug) ||
          (p.title && p.title.toLowerCase().includes(activeStateObj.shortName.toLowerCase()))
        );
      }) || activeStateObj.matchedPackage || null
    );
  }, [packages, activeStateObj]);

  const scrollToStep2 = () => {
    if (typeof window === 'undefined') return;
    const step2El = document.getElementById('step-2-customize');
    if (step2El) {
      const rect = step2El.getBoundingClientRect();
      const targetY = rect.top + window.pageYOffset - 16;
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }
  };

  const handleSelectState = (stateObj: (typeof dynamicStates)[0]) => {
    if (!stateObj) return;
    setSelectedStateId(stateObj.id);
    setSelectedStateName(stateObj.name);
    setDurationNights(stateObj.defaultNights || 5);
    setHotelTier(stateObj.hotel || 'DELUXE');
    setVehicleTier(stateObj.vehicle || 'SUV');
    setSelectedHotelId(null);
    setSelectedRoomId(null);
    setSelectedVehicleId(null);
    setHotelStarFilter('all');
    setSelectedDayTab(1);

    // Multi-stage scroll trigger: immediate + following React renders
    requestAnimationFrame(scrollToStep2);
    setTimeout(scrollToStep2, 60);
    setTimeout(scrollToStep2, 180);
    setTimeout(scrollToStep2, 350);
  };

  const handleClearSelection = () => {
    setSelectedStateId(null);
    setSelectedStateName('');
    scrollToStep1();
  };

  const scrollToStep1 = () => {
    if (typeof window === 'undefined') return;
    const step1El = document.getElementById('step-1-choose-state');
    if (step1El) {
      const rect = step1El.getBoundingClientRect();
      const targetY = rect.top + window.pageYOffset - 16;
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }
  };

  const handleAdultsChange = (delta: number) => {
    const next = adults + delta;
    if (next >= 1 && next <= 20) {
      setAdults(next);
      // Auto-balance recommended rooms and extra beds
      if (next <= 2) {
        setRoomsCount(1);
        setExtraBeds(0);
      } else if (next === 3) {
        setRoomsCount(1);
        setExtraBeds(1);
      } else if (next === 4) {
        setRoomsCount(2);
        setExtraBeds(0);
      } else if (next === 5) {
        setRoomsCount(2);
        setExtraBeds(1);
      } else {
        setRoomsCount(Math.ceil(next / 2));
        setExtraBeds(next % 2);
      }
      if (next + children > 4 && vehicleTier === 'SEDAN') {
        setVehicleTier('SUV');
      }
    }
  };

  const handleRoomsChange = (delta: number) => {
    const next = roomsCount + delta;
    if (next >= 1 && next <= 15) {
      setRoomsCount(next);
      if (extraBeds > next * 2) {
        setExtraBeds(next * 2);
      }
    }
  };

  const handleExtraBedsChange = (delta: number) => {
    const next = extraBeds + delta;
    if (next >= 0 && next <= roomsCount * 2) {
      setExtraBeds(next);
    }
  };

  const handleChildrenChange = (delta: number) => {
    const next = children + delta;
    if (next >= 0 && next <= 10) {
      setChildren(next);
      if (adults + next > 4 && vehicleTier === 'SEDAN') {
        setVehicleTier('SUV');
      }
    }
  };

  const handleNightsChange = (delta: number) => {
    const next = durationNights + delta;
    if (next >= 2 && next <= 15) {
      setDurationNights(next);
    }
  };

  const calculation = useMemo(() => {
    const days = durationNights + 1;

    // Room rate directly chosen by customer from Admin-configured Room Categories
    const baseHotelRate = selectedRoom?.pricePerNight ?? (selectedHotel?.starRating >= 5 ? 7500 : selectedHotel?.starRating === 3 ? 3500 : 4800);
    const effectiveHotelRate =
      mealPlan === 'EP'
        ? Math.round(baseHotelRate * 0.8)
        : mealPlan === 'CP'
        ? Math.round(baseHotelRate * 0.9)
        : mealPlan === 'AP'
        ? Math.round(baseHotelRate * 1.15)
        : baseHotelRate;

    const extraBedRate = selectedRoom?.extraBedPricePerNight ?? 1200;
    const totalRoomBaseCost = durationNights * roomsCount * effectiveHotelRate;
    const totalExtraBedCost = durationNights * extraBeds * extraBedRate;
    const totalHotelCost = totalRoomBaseCost + totalExtraBedCost;

    const vehicleRatePerDay = selectedVehicle?.perDayCost ?? (VEHICLE_TIER_RATES[vehicleTier]?.perDayCost || 4000);
    const totalVehicleCost = days * vehicleRatePerDay;
    const subtotal = totalHotelCost + totalVehicleCost;

    const agencyMargin = Math.round(subtotal * 0.10);
    const taxableAmount = subtotal + agencyMargin;
    const gstAmount = Math.round(taxableAmount * 0.05);
    const finalTotal = taxableAmount + gstAmount;

    const effectiveTravelers = adults + (children > 0 ? children * 0.5 : 0);
    const perPersonPrice = Math.round(finalTotal / (effectiveTravelers || 1));
    const advanceRate = (advancePercentage || 35) / 100;
    const advancePayable = Math.round(finalTotal * advanceRate);

    return {
      roomsCount,
      extraBedsCount: extraBeds,
      extraBedRate,
      totalExtraBedCost,
      totalRoomBaseCost,
      days,
      baseHotelRate,
      effectiveHotelRate,
      totalHotelCost,
      totalVehicleCost,
      subtotal,
      agencyMargin,
      gstAmount,
      finalTotal,
      perPersonPrice,
      advancePayable,
      advancePercentage: advancePercentage || 35,
    };
  }, [durationNights, adults, children, roomsCount, extraBeds, selectedRoom, selectedHotel, selectedVehicle, vehicleTier, mealPlan, advancePercentage]);

  // Dynamically align package itinerary with user-selected duration (e.g. 7N = 8 Days)
  const effectiveItinerary = useMemo(() => {
    const targetDays = calculation.days; // calculation.days = durationNights + 1
    const baseDays = activePackage?.dayWiseItinerary || [];

    if (baseDays.length === 0) {
      // Fallback auto-generated itinerary
      return Array.from({ length: targetDays }, (_, idx) => {
        const dNum = idx + 1;
        const isFirst = dNum === 1;
        const isLast = dNum === targetDays;
        return {
          dayNumber: dNum,
          nightStayDestination: activeStateObj?.shortName || 'Destination',
          title: isFirst
            ? `Arrival in ${activeStateObj?.shortName || 'Destination'} & Hotel Check-in`
            : isLast
            ? `Farewell & Departure Transfer`
            : `Circuit Sightseeing & Guided Exploration (Day ${dNum})`,
          description: isFirst
            ? `Warm traditional welcome at airport/station and transfer to your luxury pre-booked hotel. Evening leisure walk.`
            : isLast
            ? `Enjoy complimentary breakfast at hotel, pack your bags and transfer to airport/station with unforgettable memories.`
            : `Full day private chauffeur excursion covering scenic viewpoints, heritage monuments, and local artisan markets.`,
          activities: isFirst
            ? ['Airport/Station Pickup', 'Hotel Check-in', 'Evening Welcome Leisure']
            : isLast
            ? ['Morning Breakfast', 'Hotel Checkout', 'Airport/Station Drop']
            : ['Private Chauffeur Tour', 'Sightseeing & Photography', 'Local Food & Shopping'],
          mealsIncluded: ['Breakfast', 'Dinner'],
        };
      });
    }

    if (baseDays.length === targetDays) {
      return baseDays;
    }

    if (targetDays < baseDays.length) {
      // Trim intermediate days, keep departure day as final day
      const trimmed = baseDays.slice(0, targetDays - 1);
      const lastDay = baseDays[baseDays.length - 1];
      return [
        ...trimmed,
        {
          ...lastDay,
          dayNumber: targetDays,
          title: lastDay.title || `Departure from ${activeStateObj?.shortName || 'Destination'}`,
        },
      ];
    }

    // If targetDays > baseDays.length (e.g. 7N / 8D selected on 6D package)
    const arrivalAndCore = baseDays.slice(0, baseDays.length - 1);
    const departureDay = baseDays[baseDays.length - 1];
    const extraNeeded = targetDays - baseDays.length;

    const extraTemplates = [
      {
        title: 'Extended Island / Scenic Leisure & Hidden Attractions',
        desc: 'Relaxed day to discover secluded viewpoints, local botanical gardens, coastal / valley cafes, and handicraft bazaars at your own pace.',
        activities: ['Local Culture & Bazaars', 'Scenic Photography Walk', 'Cafes & Sunset View'],
      },
      {
        title: 'Special Excursion & Optional Adventure',
        desc: 'Dedicated day for optional activities such as water sports, nature treks, heritage village visits, or restorative wellness experiences.',
        activities: ['Optional Adventure Sports', 'Nature Walk & Picnic', 'Evening Folk Music / Leisure'],
      },
      {
        title: 'Free Exploration & Souvenir Shopping',
        desc: 'Enjoy free time for relaxing by the hotel pool/gardens, shopping for authentic local souvenirs, and trying authentic regional delicacies.',
        activities: ['Souvenir Shopping', 'Authentic Food Trail', 'Resort Leisure & Relaxation'],
      },
    ];

    const extraDays = [];
    const baseDest = arrivalAndCore[arrivalAndCore.length - 1]?.nightStayDestination || activeStateObj?.shortName || 'Destination';

    for (let i = 0; i < extraNeeded; i++) {
      const dayNum = arrivalAndCore.length + i + 1;
      const tpl = extraTemplates[i % extraTemplates.length];
      extraDays.push({
        dayNumber: dayNum,
        nightStayDestination: baseDest,
        title: tpl.title,
        description: tpl.desc,
        activities: tpl.activities,
        mealsIncluded: ['Breakfast', 'Dinner'],
      });
    }

    const finalDay = {
      ...departureDay,
      dayNumber: targetDays,
      title: departureDay.title || `Departure from ${activeStateObj?.shortName || 'Destination'}`,
    };

    return [...arrivalAndCore, ...extraDays, finalDay];
  }, [activePackage, calculation.days, activeStateObj]);

  // Dynamically compute circuit inclusions based on customer's live choices
  const dynamicCircuitInclusions = useMemo(() => {
    const list: string[] = [];

    // 1. Dynamic Hotel & Stay
    const hotelName = selectedHotel ? selectedHotel.name : `${activeStateObj?.shortName || 'Destination'} Handpicked Hotel`;
    const roomName = selectedRoom ? selectedRoom.name : 'Standard Deluxe Room';
    const extraBedNote = calculation.extraBedsCount > 0 ? ` + ${calculation.extraBedsCount} Extra Bed(s)` : '';
    list.push(
      `${durationNights} Nights Stay at ${hotelName} (${roomName}) for ${adults} Adults${children > 0 ? `, ${children} Children` : ''} (${calculation.roomsCount} Room${calculation.roomsCount > 1 ? 's' : ''}${extraBedNote})`
    );

    if (calculation.extraBedsCount > 0) {
      list.push(
        `Extra Bed: ${calculation.extraBedsCount} Rollaway Bed(s) / Mattress with fresh linen & pillows included (@ ₹${calculation.extraBedRate}/night)`
      );
    }

    // 2. Dynamic Meal Plan
    if (mealPlan === 'AP') {
      list.push('AP Meal Plan: Daily Buffet Breakfast, Lunch & Dinner Included');
    } else if (mealPlan === 'MAP') {
      list.push('MAP Meal Plan: Daily Buffet Breakfast & Dinner Included');
    } else if (mealPlan === 'CP') {
      list.push('CP Meal Plan: Daily Buffet Breakfast Included');
    } else {
      list.push('EP Meal Plan: European Plan (Room Only - No Meals Included)');
    }

    // 3. Dynamic Transport
    const vehName = selectedVehicle ? selectedVehicle.label : (VEHICLE_TIER_RATES[vehicleTier]?.label || 'AC Cab');
    list.push(
      `Dedicated AC Cab (${vehName}) with Private Chauffeur for all ${calculation.days} Days Sightseeing & Transfers`
    );

    // 4. Tolls, Parking, Permits
    list.push('All Toll Taxes, Parking, State Permits & Driver Night Allowances 100% Included');

    // 5. Destination Specific Special Features (from DB Package or Destination Highlights)
    if (activePackage?.inclusions && activePackage.inclusions.length > 0) {
      activePackage.inclusions.forEach((inc: string) => {
        // Filter out static mentions of nights, meals, or generic cabs so they don't duplicate/contradict user selection
        const lower = inc.toLowerCase();
        if (
          !lower.includes('night stay') &&
          !lower.includes('nights stay') &&
          !lower.includes('breakfast') &&
          !lower.includes('dinner') &&
          !lower.includes('meal plan') &&
          !lower.includes('dedicated ac cab') &&
          !lower.includes('private cab') &&
          !lower.includes('tolls')
        ) {
          list.push(inc);
        }
      });
    } else if (activeStateObj?.tagline) {
      list.push(`Guided sightseeing covering: ${activeStateObj.tagline}`);
    }

    // 6. Taxes
    list.push(`5% Statutory Tour GST Included (${formatINR(calculation.gstAmount)})`);

    return list;
  }, [
    activePackage,
    activeStateObj,
    durationNights,
    calculation.days,
    calculation.roomsCount,
    calculation.gstAmount,
    selectedHotel,
    selectedRoom,
    mealPlan,
    selectedVehicle,
    vehicleTier,
    adults,
    children,
  ]);

  // Dynamically compute circuit exclusions
  const dynamicCircuitExclusions = useMemo(() => {
    const list: string[] = [];

    // 1. Airfare / Train
    list.push(`Airfare / Train tickets to & from ${activeStateObj?.shortName || 'Destination'} (Available on request)`);

    // 2. Destination Specific Exclusions (from DB Package)
    if (activePackage?.exclusions && activePackage.exclusions.length > 0) {
      activePackage.exclusions.forEach((exc: string) => {
        const lower = exc.toLowerCase();
        if (!lower.includes('airfare to') && !lower.includes('flight ticket')) {
          list.push(exc);
        }
      });
    }

    // 3. Personal expenses
    list.push('Personal expenses such as laundry, telephone calls, room service & tips');

    // 4. Optional Adventure / Water sports
    list.push('Optional adventure activities, water sports, camera fees & monument entry not mentioned in itinerary');

    // 5. Early check-in / late checkout
    list.push('Early hotel check-in or late checkout charges (subject to hotel allotment)');

    return list;
  }, [activePackage, activeStateObj]);

  const whatsappMessage = useMemo(() => {
    if (!activeStateObj) return '';
    const cleanDest = formatDisplayTitle(selectedStateName || activeStateObj.name);
    const hotelDesc = selectedHotel ? `${selectedHotel.name} (${selectedHotel.starRating}★)` : (HOTEL_TIER_RATES[hotelTier]?.label || 'Deluxe Hotel');
    const roomDesc = selectedRoom ? `${selectedRoom.name} @ ${formatINR(selectedRoom.pricePerNight)}/night` : 'Deluxe Room';
    const vehicle = selectedVehicle ? `${selectedVehicle.label} (${formatINR(selectedVehicle.perDayCost)}/day)` : (VEHICLE_TIER_RATES[vehicleTier]?.label || 'Private Cab');
    const mealText =
      mealPlan === 'AP'
        ? 'Daily Breakfast, Lunch & Dinner Included (AP)'
        : mealPlan === 'MAP'
        ? 'Daily Breakfast + Dinner Included (MAP)'
        : mealPlan === 'CP'
        ? 'Daily Breakfast Included (CP)'
        : 'Room Only (EP)';

    return `*NEW CHIRAG TOURS AND TRAVELS*
_Official Customized Holiday Quotation_
----------------------------------------

*TRIP OVERVIEW*
• Destination: ${cleanDest}
• Duration: ${calculation.days} Days / ${durationNights} Nights (${durationNights}N / ${calculation.days}D)
• Dates: ${formatDateDisplay(checkInDate)} to ${formatDateDisplay(checkOutDate)}
• Travelers: ${adults} Adults${children > 0 ? `, ${children} Children` : ''} (${calculation.roomsCount} Room${calculation.roomsCount > 1 ? 's' : ''})

*HOTEL & ACCOMMODATION*
• Property: ${hotelDesc}
• Room Category: ${roomDesc}
• Meal Plan: ${mealText}

*DEDICATED PRIVATE TRANSPORT*
• Vehicle: ${vehicle}
• Service: Dedicated Chauffeur for ${calculation.days} Days (Sightseeing & Transfers)
• Inclusions: Fuel, Tolls, Parking, State Permits & Driver Allowance included

*TRANSPARENT QUOTATION*
• Total Package: *${formatINR(calculation.finalTotal)}* (All-Inclusive)
• Approx Per Person: *${formatINR(calculation.perPersonPrice)}* / person
• 5% GST Included: ${formatINR(calculation.gstAmount)}
• ${advancePercentage || 35}% Advance to Lock Allotment: *${formatINR(calculation.advancePayable)}*
----------------------------------------
✓ 100% Rate & Room Allotment Guarantee
✓ Zero Hidden Costs • Verified Direct Operator
----------------------------------------

Hello Faisal Bikanerwala,
I customized this holiday quotation on your website for *${cleanDest}*.
Please check the room allotment & cab availability and send the confirmed proposal!`;
  }, [activeStateObj, selectedStateName, durationNights, calculation, adults, children, selectedHotel, selectedRoom, selectedVehicle, hotelTier, vehicleTier, checkInDate, checkOutDate, mealPlan]);

  const whatsappUrl = `https://api.whatsapp.com/send?phone=${COMPANY_BRANDING.phoneRaw}&text=${encodeURIComponent(whatsappMessage)}`;

  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = customerName.trim();
    let cleanMobile = customerMobile.trim().replace(/[\s\-.()]/g, '');

    if (cleanMobile.startsWith('+91')) cleanMobile = cleanMobile.slice(3);
    else if (cleanMobile.startsWith('91') && cleanMobile.length === 12) cleanMobile = cleanMobile.slice(2);
    else if (cleanMobile.startsWith('0') && cleanMobile.length === 11) cleanMobile = cleanMobile.slice(1);

    if (!cleanName || cleanName.length < 2) {
      setSubmitError('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanMobile) && !/^\+[1-9]\d{6,14}$/.test(cleanMobile)) {
      setSubmitError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const isMongoId = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
    let effectiveDestId = '';
    if (activeStateObj) {
      if (isMongoId(activeStateObj.id)) {
        effectiveDestId = activeStateObj.id;
      } else if (isMongoId((activeStateObj as any).mongoId)) {
        effectiveDestId = (activeStateObj as any).mongoId;
      } else {
        const match = destinations.find(
          (d) =>
            d.name.toLowerCase().includes(activeStateObj.shortName.toLowerCase()) ||
            activeStateObj.name.toLowerCase().includes(d.name.toLowerCase())
        );
        if (match && isMongoId(match.id)) {
          effectiveDestId = match.id;
        }
      }
    }

    if (!effectiveDestId || !isMongoId(effectiveDestId)) {
      const anyValid = destinations.find((d) => isMongoId(d.id));
      if (anyValid) effectiveDestId = anyValid.id;
    }

    const fullNotes = `[SELF-BUILT ESTIMATE WITH CUSTOM HOTEL & ROOM]
Destination: ${formatDisplayTitle(selectedStateName)}
Package Circuit: ${activePackage ? activePackage.title : 'Custom Independent Circuit'}
Trip Dates: ${formatDateDisplay(checkInDate)} to ${formatDateDisplay(checkOutDate)} (${durationNights} Nights / ${calculation.days} Days)
Travelers: ${adults} Adults, ${children} Children (${calculation.roomsCount} Rooms${extraBeds > 0 ? ` + ${extraBeds} Extra Bed` : ''})
Hotel: ${selectedHotel ? `${selectedHotel.name} (${selectedHotel.starRating}★, ${selectedHotel.city})` : (HOTEL_TIER_RATES[hotelTier]?.label || 'Deluxe Hotel')}
Room Type: ${selectedRoom ? `${selectedRoom.name} (Admin Rate: ${formatINR(selectedRoom.pricePerNight)}/night)` : 'Deluxe Room'}${extraBeds > 0 ? ` + ${extraBeds} Extra Bed (@ ${formatINR(calculation.extraBedRate)}/night)` : ''}
Meal Plan: ${
  mealPlan === 'AP'
    ? 'AP (Daily Breakfast, Lunch & Dinner)'
    : mealPlan === 'MAP'
    ? 'MAP (Daily Breakfast + Dinner)'
    : mealPlan === 'CP'
    ? 'CP (Daily Breakfast Only)'
    : 'EP (Room Only)'
}
Vehicle: ${selectedVehicle ? `${selectedVehicle.label} (Admin Fleet Rate: ${formatINR(selectedVehicle.perDayCost)}/day)` : (VEHICLE_TIER_RATES[vehicleTier]?.label || 'Dedicated Cab')}
Estimated Total: ${formatINR(calculation.finalTotal)}`;

    try {
      const res = await customerApi.submitPublicEnquiry({
        fullName: cleanName,
        mobile: cleanMobile,
        email: customerEmail.trim() || undefined,
        destinationId: effectiveDestId || '507f1f77bcf86cd799439011',
        tentativeTravelDate: checkInDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        durationNights,
        numberOfAdults: Number(adults),
        numberOfChildren: Number(children),
        budgetEstimate: calculation.finalTotal,
        specialRequirements: fullNotes,
      });

      setSubmittedLeadRef(res.leadNumber || 'NCT-LD-RECEIVED');
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit enquiry. Please call our desk or chat on WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ background: '#FAFBFB', minHeight: '100vh', paddingBottom: 60 }}>
      {/* =========================================================================
          TOP COMPACT HERO HEADER
          ========================================================================= */}
      <HomeHero />

      {/* =========================================================================
          STEP 1: CHOOSE YOUR STATE / DESTINATION (Visual Photo Cards Grid)
          ========================================================================= */}
      <CircuitGrid
        activeStateObj={activeStateObj}
        selectedStateId={selectedStateId}
        handleClearSelection={handleClearSelection}
        handleSelectState={handleSelectState}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        dynamicStatesCount={dynamicStates.length}
        filteredStates={filteredStates}
        formatINR={formatINR}
      />

      {/* =========================================================================
          STEP 2 & 3: CUSTOMIZE TRIP DETAILS & LIVE QUOTATION BOOKING
          ========================================================================= */}
      <TripCustomizer
        activeStateObj={activeStateObj}
        dynamicStates={dynamicStates}
        handleSelectState={handleSelectState}
        scrollToStep1={scrollToStep1}
        liveCuratedHotels={liveCuratedHotels}
        activePackage={activePackage}
        calculation={calculation}
        durationNights={durationNights}
        setDurationNights={setDurationNights}
        handleNightsChange={handleNightsChange}
        showItinerary={showItinerary}
        setShowItinerary={setShowItinerary}
        effectiveItinerary={effectiveItinerary}
        selectedDayTab={selectedDayTab}
        setSelectedDayTab={setSelectedDayTab}
        checkInDate={checkInDate}
        checkOutDate={checkOutDate}
        minDateStr={minDateStr}
        minCheckOutStr={minCheckOutStr}
        handleCheckInChange={handleCheckInChange}
        handleCheckOutChange={handleCheckOutChange}
        formatDateDisplay={formatDateDisplay}
        getDayDateLabel={getDayDateLabel}
        getDayFullDateLabel={getDayFullDateLabel}
        dynamicCircuitInclusions={dynamicCircuitInclusions}
        dynamicCircuitExclusions={dynamicCircuitExclusions}
        adults={adults}
        children={children}
        roomsCount={roomsCount}
        handleRoomsChange={handleRoomsChange}
        extraBeds={extraBeds}
        handleExtraBedsChange={handleExtraBedsChange}
        extraBedRate={calculation.extraBedRate}
        handleAdultsChange={handleAdultsChange}
        handleChildrenChange={handleChildrenChange}
        hotelStarFilter={hotelStarFilter}
        setHotelStarFilter={setHotelStarFilter}
        filteredCuratedHotels={filteredCuratedHotels}
        selectedHotel={selectedHotel}
        selectedHotelRooms={selectedHotelRooms}
        selectedRoom={selectedRoom}
        handleSelectHotel={handleSelectHotel}
        setSelectedHotelId={setSelectedHotelId}
        setSelectedRoomId={setSelectedRoomId}
        mealPlan={mealPlan}
        setMealPlan={setMealPlan}
        liveVehicles={liveVehicles}
        selectedVehicle={selectedVehicle}
        setSelectedVehicleId={setSelectedVehicleId}
        setVehicleTier={setVehicleTier}
        formatINR={formatINR}
        bookingSlot={
          <UnifiedBookingCard
            calculation={calculation}
            durationNights={durationNights}
            adults={adults}
            children={children}
            circuitName={activeStateObj?.name}
            selectedHotel={selectedHotel}
            selectedRoom={selectedRoom}
            mealPlan={mealPlan}
            vehicleLabel={VEHICLE_TIER_RATES[vehicleTier]?.label || 'AC Cab'}
            whatsappUrl={whatsappUrl}
            phoneRaw={COMPANY_BRANDING.phoneRaw}
            phoneDisplay={COMPANY_BRANDING.phoneDisplay}
            bankDetails={dynamicBankDetails}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerMobile={customerMobile}
            setCustomerMobile={setCustomerMobile}
            customerEmail={customerEmail}
            setCustomerEmail={setCustomerEmail}
            isSubmitting={isSubmitting}
            submitError={submitError}
            submittedLeadRef={submittedLeadRef}
            onSubmit={handleSubmitEnquiry}
            copiedKey={copiedKey}
            onCopyText={handleCopyText}
            formatINR={formatINR}
          />
        }
      />

      {/* =========================================================================
          PRINTABLE A4 OFFICIAL PROPOSAL (VISIBLE ONLY ON PRINT)
          ========================================================================= */}
      {activeStateObj && (
        <PrintQuotationProposal
          activeStateObj={activeStateObj}
          durationNights={durationNights}
          calculation={calculation}
          adults={adults}
          children={children}
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          formatDateDisplay={formatDateDisplay}
          formatINR={formatINR}
          selectedHotel={selectedHotel}
          selectedRoom={selectedRoom}
          mealPlan={mealPlan}
          vehicleTier={vehicleTier}
          vehicleLabel={VEHICLE_TIER_RATES[vehicleTier]?.label || 'AC Cab'}
          bankDetails={dynamicBankDetails}
        />
      )}
    </div>
  );
}
