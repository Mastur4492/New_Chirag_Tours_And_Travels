'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  MapPin,
  Calendar,
  Clock,
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
  HelpCircle,
  RefreshCw,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Info,
  Award,
  Luggage,
  Printer,
} from 'lucide-react';
import { customerApi } from '@/lib/api';
import { DestinationDto } from '@chirag/types';
import { COMPANY_BRANDING } from '@/lib/branding';
import { formatDisplayTitle, formatINR, getDestinationStyle } from '@/lib/utils';

// Pre-configured baseline rates per night per room for domestic circuits
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

// Preset popular circuits for 1-click customer inspiration
const POPULAR_PRESETS = [
  {
    id: 'kashmir',
    name: 'Kashmir Valley Circuit (Srinagar, Gulmarg, Pahalgam)',
    badge: '🏔️ Kashmir Paradise',
    nights: 5,
    hotel: 'DELUXE',
    vehicle: 'SUV',
    image: '/images/destinations/kashmir.jpg',
    tagline: 'Srinagar • Gulmarg • Pahalgam • Dal Lake',
    startingFrom: 24500,
  },
  {
    id: 'kerala',
    name: 'Kerala Serene Backwaters (Munnar, Thekkady, Alleppey)',
    badge: '🌴 Kerala Backwaters',
    nights: 6,
    hotel: 'DELUXE',
    vehicle: 'SUV',
    image: '/images/destinations/kerala.jpg',
    tagline: 'Munnar • Thekkady • Alleppey Houseboat',
    startingFrom: 21500,
  },
  {
    id: 'himachal',
    name: 'Himachal Hills & Snow (Manali, Shimla, Solang Valley)',
    badge: '❄️ Himachal Snow Tour',
    nights: 5,
    hotel: 'DELUXE',
    vehicle: 'SUV',
    image: '/images/destinations/himachal.jpg',
    tagline: 'Shimla • Kullu • Manali • Solang Valley',
    startingFrom: 18500,
  },
  {
    id: 'rajasthan',
    name: 'Royal Rajasthan Heritage (Jaipur, Jodhpur, Udaipur)',
    badge: '🏰 Royal Rajasthan',
    nights: 6,
    hotel: 'LUXURY',
    vehicle: 'SUV',
    image: '/images/destinations/rajasthan.jpg',
    tagline: 'Jaipur • Jodhpur • Udaipur Palaces & Forts',
    startingFrom: 19500,
  },
  {
    id: 'goa',
    name: 'Goa Coastal Leisure (Calangute, Baga, South Goa)',
    badge: '🏖️ Goa Beach Holiday',
    nights: 4,
    hotel: 'COMFORT',
    vehicle: 'SEDAN',
    image: '/images/destinations/goa.jpg',
    tagline: 'Calangute • Baga • South Goa Serenity',
    startingFrom: 16500,
  },
  {
    id: 'andaman',
    name: 'Andaman Tropical Islands (Port Blair, Havelock)',
    badge: '🏝️ Andaman Beach & Coral',
    nights: 5,
    hotel: 'DELUXE',
    vehicle: 'SUV',
    image: '/images/destinations/andaman.jpg',
    tagline: 'Port Blair • Havelock • Radhanagar Sands',
    startingFrom: 28500,
  },
  {
    id: 'uttarakhand',
    name: 'Uttarakhand Lakes & Hills (Nainital, Mussoorie, Rishikesh)',
    badge: '⛰️ Uttarakhand Escape',
    nights: 5,
    hotel: 'COMFORT',
    vehicle: 'SEDAN',
    image: '/images/destinations/uttarakhand.jpg',
    tagline: 'Nainital • Mussoorie • Rishikesh Ganga',
    startingFrom: 17500,
  },
];

export function InstantQuoteBuilder() {
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);
  const [loadingDests, setLoadingDests] = useState(true);

  // User Selections
  const [selectedDestId, setSelectedDestId] = useState('');
  const [selectedDestName, setSelectedDestName] = useState('Kashmir Valley Circuit');
  const [durationNights, setDurationNights] = useState<number>(5);
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [hotelTier, setHotelTier] = useState<string>('DELUXE');
  const [vehicleTier, setVehicleTier] = useState<string>('SUV');
  const [travelMonth, setTravelMonth] = useState<string>('May 2026 (Summer Holidays)');

  // UI state toggles
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Customer Contact for Booking Submission
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedLeadRef, setSubmittedLeadRef] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const list = await customerApi.getDestinations();
        if (list && list.length > 0) {
          setDestinations(list);
          const kashmirMatch = list.find((d) => d.name.toLowerCase().includes('kashmir'));
          if (kashmirMatch) {
            setSelectedDestId(kashmirMatch.id);
            setSelectedDestName(kashmirMatch.name);
          } else {
            setSelectedDestId(list[0]!.id);
            setSelectedDestName(list[0]!.name);
          }
        }
      } catch (err) {
        console.error('Failed to load destinations in InstantQuoteBuilder:', err);
      } finally {
        setLoadingDests(false);
      }
    }
    load();
  }, []);

  // 1-Click Preset Handler
  const handleSelectPreset = (preset: typeof POPULAR_PRESETS[0]) => {
    setSelectedDestName(preset.name);
    setDurationNights(preset.nights);
    setHotelTier(preset.hotel);
    setVehicleTier(preset.vehicle);

    const match = destinations.find(
      (d) =>
        d.id === preset.id ||
        d.name.toLowerCase().includes(preset.id.toLowerCase()) ||
        d.slug.toLowerCase().includes(preset.id.toLowerCase())
    );
    if (match) {
      setSelectedDestId(match.id);
      setSelectedDestName(match.name);
    }
  };

  const handleDestDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedDestId(id);
    const found = destinations.find((d) => d.id === id);
    if (found) {
      setSelectedDestName(found.name);
    }
  };

  // Auto-suggest vehicle if passenger count exceeds sedan capacity
  useEffect(() => {
    const totalTravelers = adults + children;
    if (totalTravelers > 4 && vehicleTier === 'SEDAN') {
      setVehicleTier('SUV');
    }
  }, [adults, children, vehicleTier]);

  // Stepper handlers
  const handleAdultsChange = (delta: number) => {
    const next = adults + delta;
    if (next >= 1 && next <= 20) {
      setAdults(next);
    }
  };

  const handleChildrenChange = (delta: number) => {
    const next = children + delta;
    if (next >= 0 && next <= 10) {
      setChildren(next);
    }
  };

  const handleNightsChange = (delta: number) => {
    const next = durationNights + delta;
    if (next >= 2 && next <= 15) {
      setDurationNights(next);
    }
  };

  // Dynamic Price Calculation
  const calculation = useMemo(() => {
    const days = durationNights + 1;
    // 2 Adults per room; 1 adult gets 1 room; 3 adults get 2 rooms
    const roomsCount = Math.max(1, Math.ceil(adults / 2));

    const hotelRatePerNight = HOTEL_TIER_RATES[hotelTier]?.ratePerNight || 4000;
    const vehicleRatePerDay = VEHICLE_TIER_RATES[vehicleTier]?.perDayCost || 3500;

    const totalHotelCost = durationNights * roomsCount * hotelRatePerNight;
    const totalVehicleCost = days * vehicleRatePerDay;
    const subtotal = totalHotelCost + totalVehicleCost;

    // 10% Agency Service & Operations Margin
    const agencyMargin = Math.round(subtotal * 0.10);
    const taxableAmount = subtotal + agencyMargin;

    // 5% GST on Tour Operator Services
    const gstAmount = Math.round(taxableAmount * 0.05);
    const finalTotal = taxableAmount + gstAmount;

    // Weight children at 0.5 for per-person cost approximation
    const effectiveTravelers = adults + (children > 0 ? children * 0.5 : 0);
    const perPersonPrice = Math.round(finalTotal / (effectiveTravelers || 1));

    return {
      roomsCount,
      days,
      totalHotelCost,
      totalVehicleCost,
      subtotal,
      agencyMargin,
      gstAmount,
      finalTotal,
      perPersonPrice,
    };
  }, [durationNights, adults, children, hotelTier, vehicleTier]);

  // WhatsApp Pre-filled Message
  const whatsappMessage = useMemo(() => {
    const cleanDest = formatDisplayTitle(selectedDestName);
    const hotel = HOTEL_TIER_RATES[hotelTier]?.label;
    const vehicle = VEHICLE_TIER_RATES[vehicleTier]?.label;

    return `*NEW CHIRAG TOURS & TRAVELS*
_Custom Tour Quotation & Estimate_
----------------------------------------

*TRIP OVERVIEW*
• Destination: ${cleanDest}
• Duration: ${calculation.days} Days / ${durationNights} Nights (${durationNights}N / ${calculation.days}D)
• Tentative Travel: ${travelMonth}
• Travelers: ${adults} Adults${children > 0 ? `, ${children} Children` : ''} (${calculation.roomsCount} Room${calculation.roomsCount > 1 ? 's' : ''})

*HOTEL & VEHICLE PREFERENCE*
• Hotel Category: ${hotel} (MAP: Daily Breakfast + Dinner)
• Dedicated Cab: Private ${vehicle} (Sightseeing + Transfers)

*QUOTATION ESTIMATE*
• Total Package: *${formatINR(calculation.finalTotal)}* (All-Inclusive)
• Approx Per Person: *${formatINR(calculation.perPersonPrice)}* / person
----------------------------------------
✓ 100% Rate & Allotment Guarantee
✓ Verified Direct Operator

Hello Faisal Bikanerwala,
I designed this custom package on your website for *${cleanDest}*.
Please check availability and share a confirmed booking proposal!`;
  }, [selectedDestName, durationNights, calculation, adults, children, hotelTier, vehicleTier, travelMonth]);

  const whatsappUrl = `https://api.whatsapp.com/send?phone=919978655529&text=${encodeURIComponent(whatsappMessage)}`;

  // Submit Direct Enquiry to Admin CRM
  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = customerName.trim();
    let cleanMobile = customerMobile.trim().replace(/[\s\-.()]/g, '');

    // Normalize standard Indian prefixes
    if (cleanMobile.startsWith('+91')) cleanMobile = cleanMobile.slice(3);
    else if (cleanMobile.startsWith('91') && cleanMobile.length === 12) cleanMobile = cleanMobile.slice(2);
    else if (cleanMobile.startsWith('0') && cleanMobile.length === 11) cleanMobile = cleanMobile.slice(1);

    if (!cleanName || cleanName.length < 2) {
      setSubmitError('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanMobile) && !/^\+[1-9]\d{6,14}$/.test(cleanMobile)) {
      setSubmitError('Please enter a valid 10-digit mobile number (e.g. 98250 12345).');
      return;
    }

    // Ensure effectiveDestId is a valid 24-character hexadecimal MongoDB ObjectId
    const isMongoId = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);

    let effectiveDestId: string | undefined = undefined;
    if (isMongoId(selectedDestId)) {
      effectiveDestId = selectedDestId;
    } else {
      const match = destinations.find(
        (d) =>
          (d.name.toLowerCase().includes(selectedDestName.toLowerCase().split(' ')[0]) ||
            selectedDestName.toLowerCase().includes(d.name.toLowerCase().split(' ')[0])) &&
          isMongoId(d.id)
      );
      if (match) {
        effectiveDestId = match.id;
      } else {
        const anyValid = destinations.find((d) => isMongoId(d.id));
        if (anyValid) effectiveDestId = anyValid.id;
      }
    }

    if (!effectiveDestId) {
      setSubmitError('Please select a valid holiday destination.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const fullNotes = `[SELF-BUILT ESTIMATE]
Destination: ${formatDisplayTitle(selectedDestName)}
Duration: ${durationNights} Nights / ${calculation.days} Days
Travelers: ${adults} Adults, ${children} Children (${calculation.roomsCount} Rooms)
Hotel Plan: ${HOTEL_TIER_RATES[hotelTier]?.label} (MAP Plan)
Vehicle: ${VEHICLE_TIER_RATES[vehicleTier]?.label}
Estimated Package Price: ${formatINR(calculation.finalTotal)}
Tentative Month: ${travelMonth}`;

    try {
      const res = await customerApi.submitPublicEnquiry({
        fullName: cleanName,
        mobile: cleanMobile,
        email: customerEmail.trim() || undefined,
        destinationId: effectiveDestId,
        tentativeTravelDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
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
    <section
      id="custom-quote-builder"
      style={{
        padding: '70px 0 90px',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 45%, #ECFDF5 100%)',
        borderTop: '1px solid #E2E8F0',
        borderBottom: '1px solid #E2E8F0',
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: 820, margin: '0 auto 36px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(5, 150, 105, 0.28)',
              padding: '7px 18px',
              borderRadius: 9999,
              color: '#047857',
              fontSize: '0.84rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 14,
            }}
          >
            <Sparkles size={15} color="#059669" />
            <span>Instant Self-Serve Quotation Engine • No Hidden Charges</span>
          </div>

          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0B192C', lineHeight: 1.2, margin: '0 0 14px' }}>
            Design Your Holiday & <span style={{ color: '#059669' }}>Get Instant Pricing</span>
          </h2>
          <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: 1.6, margin: 0 }}>
            Choose your dream destination, customize duration & travelers, pick your hotel comfort tier, and select your private vehicle. See exact transparent pricing in seconds and send your enquiry in 1 tap!
          </p>
        </div>

        {/* 1-Click Popular Presets (Inspiration Strip) */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: '0.84rem',
              fontWeight: 800,
              color: '#064E3B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Award size={16} color="#059669" />
            <span>1-Click Popular Circuits (Click any for Instant Setup):</span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingBottom: 8,
              scrollbarWidth: 'thin',
            }}
          >
            {POPULAR_PRESETS.map((preset) => {
              const isSelected = selectedDestName.toLowerCase().includes(preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 16px',
                    borderRadius: 9999,
                    border: isSelected ? '2px solid #059669' : '1px solid #CBD5E1',
                    background: isSelected ? '#ECFDF5' : '#FFFFFF',
                    color: isSelected ? '#065F46' : '#334155',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isSelected ? '0 4px 12px rgba(5, 150, 105, 0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>{preset.badge}</span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: isSelected ? '#059669' : '#F1F5F9',
                      color: isSelected ? '#FFFFFF' : '#64748B',
                      fontWeight: 700,
                    }}
                  >
                    {preset.nights}N/{preset.nights + 1}D
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Builder Main Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: 32,
            alignItems: 'start',
          }}
        >
          {/* Left Column: Interactive Form Controls */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 24,
              border: '1px solid #E2E8F0',
              padding: '34px 30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: 26,
            }}
          >
            {/* Step 1: Destination Selection */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                  <MapPin size={20} color="#059669" />
                  <span>Step 1: Choose Your Destination</span>
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 700 }}>
                  Selected: {formatDisplayTitle(selectedDestName)}
                </span>
              </div>

              {/* Visual Photo Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                {POPULAR_PRESETS.map((dest) => {
                  const isSelected = selectedDestName.toLowerCase().includes(dest.id);
                  return (
                    <div
                      key={dest.id}
                      onClick={() => handleSelectPreset(dest)}
                      style={{
                        position: 'relative',
                        height: 110,
                        borderRadius: 14,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: isSelected ? '3px solid #059669' : '1px solid #E2E8F0',
                        boxShadow: isSelected ? '0 6px 18px rgba(5, 150, 105, 0.25)' : '0 2px 6px rgba(0,0,0,0.06)',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                        transform: isSelected ? 'scale(1.02)' : 'none',
                      }}
                    >
                      <img
                        src={dest.image}
                        alt={dest.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: isSelected
                            ? 'linear-gradient(180deg, rgba(5, 150, 105, 0.3) 0%, rgba(4, 30, 20, 0.92) 100%)'
                            : 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.82) 100%)',
                          padding: '8px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          color: '#FFFFFF',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          {isSelected && (
                            <span
                              style={{
                                background: '#10B981',
                                borderRadius: 9999,
                                padding: 2,
                                display: 'inline-flex',
                              }}
                            >
                              <CheckCircle2 size={16} color="#FFFFFF" />
                            </span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.84rem', lineHeight: 1.2, color: '#FFFFFF' }}>
                            {dest.name.split(' ')[0]}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#A7F3D0', fontWeight: 600 }}>
                            From {formatINR(dest.startingFrom)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Destination Dropdown for full catalog */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', marginBottom: 6 }}>
                  Or select from full catalog database:
                </label>
                <select
                  className="form-select"
                  value={selectedDestId}
                  onChange={handleDestDropdownChange}
                  style={{ width: '100%', fontSize: '0.92rem', fontWeight: 600, padding: '10px 14px' }}
                >
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {formatDisplayTitle(d.name)} ({d.country})
                    </option>
                  ))}
                  {destinations.length === 0 && (
                    <>
                      <option value="kashmir">Kashmir Valley Circuit (Srinagar, Gulmarg, Pahalgam)</option>
                      <option value="kerala">Kerala Serene Backwaters (Munnar, Alleppey, Thekkady)</option>
                      <option value="rajasthan">Royal Rajasthan (Jaipur, Jodhpur, Udaipur)</option>
                      <option value="himachal">Himachal Hills (Manali, Shimla, Solang Valley)</option>
                      <option value="goa">Goa Beach Holiday</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Step 2: Duration & Travelers */}
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px' }}>
                <Calendar size={20} color="#059669" />
                <span>Step 2: Duration & Travelers</span>
              </h3>

              {/* Trip Duration Stepper & Pills */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>
                    Trip Duration: <strong style={{ color: '#059669' }}>{durationNights} Nights / {calculation.days} Days</strong>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => handleNightsChange(-1)}
                      disabled={durationNights <= 2}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', minWidth: 26, textAlign: 'center' }}>
                      {durationNights}N
                    </span>
                    <button
                      type="button"
                      onClick={() => handleNightsChange(1)}
                      disabled={durationNights >= 14}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[3, 4, 5, 6, 7, 8, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setDurationNights(n)}
                      style={{
                        flex: 1,
                        minWidth: 48,
                        padding: '9px 0',
                        borderRadius: 10,
                        border: durationNights === n ? '2px solid #059669' : '1px solid #CBD5E1',
                        background: durationNights === n ? '#ECFDF5' : '#FFFFFF',
                        color: durationNights === n ? '#047857' : '#475569',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {n}N/{n + 1}D
                    </button>
                  ))}
                </div>
              </div>

              {/* Travelers Stepper (Adults + Kids) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                {/* Adults Stepper */}
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 14,
                    padding: '12px 14px',
                  }}
                >
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Adults (12+ Yrs)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      {calculation.roomsCount} Room{calculation.roomsCount > 1 ? 's' : ''} needed
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleAdultsChange(-1)}
                        disabled={adults <= 1}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                        }}
                      >
                        <Minus size={15} />
                      </button>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, minWidth: 24, textAlign: 'center' }}>
                        {adults}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdultsChange(1)}
                        disabled={adults >= 15}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                        }}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Children Stepper */}
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 14,
                    padding: '12px 14px',
                  }}
                >
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Children (0–11 Yrs)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      {children === 0 ? 'No extra beds' : `${children} Kid${children > 1 ? 's' : ''}`}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleChildrenChange(-1)}
                        disabled={children <= 0}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                        }}
                      >
                        <Minus size={15} />
                      </button>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, minWidth: 24, textAlign: 'center' }}>
                        {children}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleChildrenChange(1)}
                        disabled={children >= 8}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                        }}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Room & Child bedding info badge */}
              <div
                style={{
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  color: '#065F46',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <Info size={16} color="#059669" />
                <span>
                  <strong>{calculation.roomsCount} Room(s)</strong> allotted (Standard double occupancy). Children below 5 yrs are complimentary in parent&apos;s bed.
                </span>
              </div>

              {/* Tentative Travel Month */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Tentative Travel Month:
                </label>
                <select
                  className="form-select"
                  value={travelMonth}
                  onChange={(e) => setTravelMonth(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem' }}
                >
                  <option value="April 2026 (Spring Bloom)">April 2026 (Spring Bloom & Pleasant Weather)</option>
                  <option value="May 2026 (Summer Holidays)">May 2026 (Summer Vacation Peak)</option>
                  <option value="June 2026 (Summer Holidays)">June 2026 (Vacation Rush)</option>
                  <option value="July-August 2026 (Monsoons)">July–August 2026 (Monsoon Lush Nature)</option>
                  <option value="September-October 2026">September–October 2026 (Post-Monsoon Serenity)</option>
                  <option value="November-December 2026">November–December 2026 (Winter Snow Season)</option>
                  <option value="Early 2027">Early 2027 (Advance Planning)</option>
                </select>
              </div>
            </div>

            {/* Step 3: Hotel Tier Selection */}
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
                <Building2 size={20} color="#059669" />
                <span>Step 3: Hotel Comfort Tier</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(HOTEL_TIER_RATES).map(([key, val]) => (
                  <label
                    key={key}
                    onClick={() => setHotelTier(key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderRadius: 14,
                      border: hotelTier === key ? '2px solid #059669' : '1px solid #E2E8F0',
                      background: hotelTier === key ? '#ECFDF5' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: hotelTier === key ? '0 4px 14px rgba(5, 150, 105, 0.12)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <input
                        type="radio"
                        name="hotelTier"
                        checked={hotelTier === key}
                        onChange={() => setHotelTier(key)}
                        style={{ accentColor: '#059669', marginTop: 4 }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A' }}>{val.label}</span>
                          {val.popular && (
                            <span
                              style={{
                                background: '#F59E0B',
                                color: '#FFFFFF',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 9999,
                                textTransform: 'uppercase',
                              }}
                            >
                              Most Popular
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 3, lineHeight: 1.4 }}>
                          {val.desc}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Step 4: Dedicated Vehicle Selection */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                  <Car size={20} color="#059669" />
                  <span>Step 4: Dedicated Private Chauffeur Cab</span>
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(VEHICLE_TIER_RATES).map(([key, val]) => {
                  const isAutoSuggested = adults + children > 4 && (key === 'SUV' || key === 'CRYSTA');
                  return (
                    <label
                      key={key}
                      onClick={() => setVehicleTier(key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderRadius: 14,
                        border: vehicleTier === key ? '2px solid #059669' : '1px solid #E2E8F0',
                        background: vehicleTier === key ? '#ECFDF5' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: vehicleTier === key ? '0 4px 14px rgba(5, 150, 105, 0.12)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <input
                          type="radio"
                          name="vehicleTier"
                          checked={vehicleTier === key}
                          onChange={() => setVehicleTier(key)}
                          style={{ accentColor: '#059669', marginTop: 4 }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A' }}>{val.label}</span>
                            {isAutoSuggested && (
                              <span
                                style={{
                                  background: '#10B981',
                                  color: '#FFFFFF',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: 9999,
                                }}
                              >
                                Recommended for your group
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 3 }}>
                            Capacity: <strong>{val.capacity}</strong> • Luggage: <strong>{val.luggage}</strong>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#059669', marginTop: 2, fontWeight: 600 }}>
                            {val.bestFor}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Live Instant Quotation Card & Booking Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'sticky', top: 90 }}>
            {/* Live Pricing Breakdown Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, var(--pine-950) 0%, var(--pine-900) 60%, var(--pine-850) 100%)',
                borderRadius: 24,
                border: '2px solid var(--emerald-400)',
                padding: '34px 28px',
                color: '#FFFFFF',
                boxShadow: '0 16px 40px rgba(6, 35, 23, 0.28)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#6EE7B7', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em' }}>
                    Instant All-Inclusive Estimate
                  </div>
                  <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1, marginTop: 4 }}>
                    {formatINR(calculation.finalTotal)}
                  </div>
                  <div style={{ fontSize: '0.92rem', color: '#A7F3D0', marginTop: 6 }}>
                    Approx <strong style={{ color: '#FBBF24', fontSize: '1.05rem' }}>{formatINR(calculation.perPersonPrice)}</strong> / person (All inclusive)
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(52, 211, 153, 0.15)',
                    border: '1px solid rgba(52, 211, 153, 0.4)',
                    padding: '8px 14px',
                    borderRadius: 12,
                    fontSize: '0.82rem',
                    color: '#6EE7B7',
                    fontWeight: 800,
                    textAlign: 'right',
                  }}
                >
                  {durationNights}N / {calculation.days}D
                  <div style={{ fontSize: '0.72rem', color: '#E2E8F0', fontWeight: 600 }}>
                    {adults} Adults{children > 0 ? `, ${children} Kids` : ''}
                  </div>
                </div>
              </div>

              {/* What is Included List */}
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.12)', paddingTop: 18, marginBottom: 20 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#D1E2DA', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  What is 100% Included in This Price:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: '0.84rem', color: '#E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <CheckCircle2 size={16} color="#34D399" />
                    <span><strong>{calculation.roomsCount} Room(s)</strong> at {HOTEL_TIER_RATES[hotelTier]?.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <CheckCircle2 size={16} color="#34D399" />
                    <span><strong>MAP Meal Plan:</strong> Daily Breakfast & Dinner included</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <CheckCircle2 size={16} color="#34D399" />
                    <span><strong>Dedicated Private AC Cab:</strong> {VEHICLE_TIER_RATES[vehicleTier]?.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <CheckCircle2 size={16} color="#34D399" />
                    <span>All Toll Tax, Parking, State Border Permits & Driver Allowance</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <CheckCircle2 size={16} color="#34D399" />
                    <span>5% GST on Tour Services included ({formatINR(calculation.gstAmount)})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <CheckCircle2 size={16} color="#34D399" />
                    <span>24/7 On-Tour Helpline Supervised by Faisal Bikanerwala</span>
                  </div>
                </div>
              </div>

              {/* Expandable Cost Breakdown Accordion */}
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 14, marginBottom: 22 }}>
                <button
                  type="button"
                  onClick={() => setShowCostBreakdown(!showCostBreakdown)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#6EE7B7',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: 0,
                  }}
                >
                  <span>{showCostBreakdown ? 'Hide Detailed Cost Breakdown' : 'View Detailed Cost Breakdown'}</span>
                  {showCostBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showCostBreakdown && (
                  <div
                    style={{
                      marginTop: 12,
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      color: '#CBD5E1',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Hotel Stay ({durationNights}N × {calculation.roomsCount} Rm):</span>
                      <strong style={{ color: '#FFFFFF' }}>{formatINR(calculation.totalHotelCost)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Dedicated Chauffeur Cab ({calculation.days} Days):</span>
                      <strong style={{ color: '#FFFFFF' }}>{formatINR(calculation.totalVehicleCost)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Daily Breakfast & Dinner:</span>
                      <strong style={{ color: '#34D399' }}>Included in Hotel</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tolls, Parking, Driver Batta:</span>
                      <strong style={{ color: '#34D399' }}>Included</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tour Operations Margin (10%):</span>
                      <strong style={{ color: '#FFFFFF' }}>{formatINR(calculation.agencyMargin)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>5% Tour Operator GST:</span>
                      <strong style={{ color: '#FFFFFF' }}>{formatINR(calculation.gstAmount)}</strong>
                    </div>
                    <div
                      style={{
                        borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                        paddingTop: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 800,
                        color: '#FFFFFF',
                      }}
                    >
                      <span>Final Net Total:</span>
                      <span style={{ color: '#FBBF24', fontSize: '0.94rem' }}>{formatINR(calculation.finalTotal)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Actions: WhatsApp + Direct Call */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-header-whatsapp"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '14px 22px',
                    fontSize: '0.98rem',
                    borderRadius: 14,
                    background: '#25D366',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    boxShadow: '0 4px 18px rgba(37, 211, 102, 0.35)',
                  }}
                >
                  <MessageCircle size={20} />
                  <span>Send Estimate to Faisal on WhatsApp</span>
                </a>

                <a
                  href={`tel:${COMPANY_BRANDING.phoneRaw}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 20px',
                    borderRadius: 14,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                  }}
                >
                  <Phone size={17} color="#34D399" />
                  <span>Call Faisal Bikanerwala ({COMPANY_BRANDING.phoneDisplay})</span>
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 20px',
                    borderRadius: 14,
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.28)',
                    color: '#FFFFFF',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Printer size={17} color="#FBBF24" />
                  <span>Print / Save Estimate PDF</span>
                </button>
              </div>
            </div>

            {/* Direct Booking / CRM Submission Form */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 22,
                border: '1px solid #E2E8F0',
                padding: '26px 26px',
                boxShadow: '0 6px 20px rgba(0,0,0,0.03)',
              }}
            >
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                Want a Confirmed Itinerary Proposal?
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Enter your name & WhatsApp number below. We will check live hotel allotment, driver availability, and send an official proposal directly to your WhatsApp and email!
              </p>

              {submittedLeadRef ? (
                <div
                  style={{
                    padding: '20px 22px',
                    borderRadius: 16,
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    color: '#065F46',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '1.02rem' }}>
                    <CheckCircle2 size={22} color="#059669" />
                    <span>Enquiry Dispatched! Ref: {submittedLeadRef}</span>
                  </div>
                  <p style={{ margin: '10px 0 0', fontSize: '0.86rem', lineHeight: 1.5, color: '#047857' }}>
                    An automated notification email has been sent to <strong>{COMPANY_BRANDING.email}</strong>. Faisal Bikanerwala will contact you at <strong>{customerMobile}</strong> shortly!
                  </p>
                  <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-header-whatsapp"
                      style={{ fontSize: '0.84rem', padding: '10px 16px', borderRadius: 10 }}
                    >
                      <MessageCircle size={15} />
                      <span>Chat on WhatsApp</span>
                    </a>
                    <a
                      href={`tel:${COMPANY_BRANDING.phoneRaw}`}
                      className="btn-header-call"
                      style={{ fontSize: '0.84rem', padding: '10px 16px', borderRadius: 10 }}
                    >
                      <Phone size={15} color="#059669" />
                      <span>Call Now</span>
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitEnquiry} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {submitError && (
                    <div style={{ fontSize: '0.84rem', color: '#E11D48', background: '#FFF1F2', padding: '10px 14px', borderRadius: 10 }}>
                      {submitError}
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chirag Patel"
                      className="form-input"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      style={{ fontSize: '0.9rem', padding: '11px 14px', width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 98250 12345"
                        className="form-input"
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value)}
                        style={{ fontSize: '0.9rem', padding: '11px 14px', width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. name@example.com"
                        className="form-input"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        style={{ fontSize: '0.9rem', padding: '11px 14px', width: '100%' }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-card-action"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '14px 20px',
                      fontSize: '0.96rem',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: '#FFFFFF',
                      borderRadius: 12,
                      marginTop: 4,
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Sending Enquiry & Creating Lead...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Send Enquiry to Admin (Email Alert + CRM)</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Direct Contact & Helpdesk Information Box */}
            <div
              style={{
                background: '#F8FAFC',
                borderRadius: 18,
                border: '1px solid #E2E8F0',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Direct Contact & Verified Tour Desk:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', color: '#0F172A' }}>
                <Phone size={16} color="#059669" />
                <span>Call: <strong><a href={`tel:${COMPANY_BRANDING.phoneRaw}`} style={{ color: '#059669', textDecoration: 'none' }}>{COMPANY_BRANDING.phoneDisplay}</a></strong> ({COMPANY_BRANDING.owner})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', color: '#0F172A' }}>
                <MessageCircle size={16} color="#25D366" />
                <span>WhatsApp: <strong><a href={COMPANY_BRANDING.whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#059669', textDecoration: 'none' }}>+91 99786 55529</a></strong> (Instant Reply)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#0F172A' }}>
                <MapPin size={16} color="#475569" />
                <span>Shop No 3, Al-Rehman Plaza, Danilimda, Ahmedabad</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Peace of Mind & FAQ Accordion */}
        <div style={{ marginTop: 60, maxWidth: 860, margin: '60px auto 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
              Frequently Asked Questions & Peace-of-Mind
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.94rem', margin: 0 }}>
              Everything you need to know about booking with New Chirag Tours & Travels
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              {
                q: 'Can I customize the day-wise sightseeing and hotels after sending an enquiry?',
                a: 'Absolutely! Every itinerary generated here is 100% customizable. Faisal Bikanerwala will discuss your specific preferences, add or remove destinations, recommend child-friendly stops, or upgrade your room views.',
              },
              {
                q: 'How do I confirm the booking and receive hotel vouchers?',
                a: 'To lock your reservation, only a 30% advance deposit is required. Upon receipt, we issue official hotel confirmation vouchers and cab allotment details. The balance is payable before or during your tour.',
              },
              {
                q: 'Are toll taxes, parking, driver charges, and GST included in this quote?',
                a: 'Yes, 100%! We strictly follow transparent pricing with zero surprise charges. All driver allowances, interstate border permits, parking, tolls, and 5% GST are included in this estimate.',
              },
              {
                q: 'Are flight or train tickets included?',
                a: 'This quote covers all on-ground travel (verified hotels, MAP meals, private cab, and local sightseeing). Flight and train tickets can be booked separately through our ticketing desk upon request.',
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 14,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    fontWeight: 700,
                    fontSize: '0.96rem',
                    color: '#0F172A',
                    cursor: 'pointer',
                  }}
                >
                  <span>{faq.q}</span>
                  {activeFaq === idx ? <ChevronUp size={18} color="#059669" /> : <ChevronDown size={18} color="#94A3B8" />}
                </button>
                {activeFaq === idx && (
                  <div style={{ padding: '0 20px 18px', color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Floating Quick Quote Bar (Mobile & Desktop) */}
        <div
          className="no-print"
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '92%',
            maxWidth: 820,
            zIndex: 90,
            background: 'rgba(6, 35, 23, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '2px solid rgba(52, 211, 153, 0.5)',
            borderRadius: 20,
            padding: '12px 20px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            color: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.78rem', color: '#6EE7B7', fontWeight: 800, textTransform: 'uppercase' }}>
              📍 {formatDisplayTitle(selectedDestName)} ({durationNights}N/{calculation.days}D)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFFFFF' }}>
              {formatINR(calculation.finalTotal)}{' '}
              <span style={{ fontSize: '0.78rem', color: '#A7F3D0', fontWeight: 600 }}>
                ({formatINR(calculation.perPersonPrice)}/pax)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#25D366',
                color: '#FFFFFF',
                padding: '9px 16px',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: '0.86rem',
                textDecoration: 'none',
                boxShadow: '0 2px 10px rgba(37, 211, 102, 0.3)',
              }}
            >
              <MessageCircle size={16} />
              <span>WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('custom-quote-builder');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#FFFFFF',
                padding: '9px 16px',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: '0.86rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span>Enquire Now</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
