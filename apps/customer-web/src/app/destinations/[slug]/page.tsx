'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Compass,
  ArrowRight,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Building,
  Star,
  Coffee,
  Utensils,
  Wifi,
  Sparkles,
  Phone,
  MessageCircle,
  ShieldCheck,
  Bed,
  Info,
  ChevronRight,
  X,
} from 'lucide-react';
import { customerApi } from '@/lib/api';
import { DestinationDto, TourPackageDto } from '@chirag/types';
import { EnquiryModal } from '@/components/EnquiryModal';
import { COMPANY_BRANDING } from '@/lib/branding';
import {
  formatDisplayTitle,
  formatINR,
  getDestinationStyle,
  getCuratedHotelsForDestination,
  CuratedHotel,
} from '@/lib/utils';

export default function DestinationDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [destination, setDestination] = useState<DestinationDto | null>(null);
  const [packages, setPackages] = useState<TourPackageDto[]>([]);
  const [apiHotels, setApiHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hotel filters
  const [selectedStarRating, setSelectedStarRating] = useState<number | 'all'>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedHotelDetail, setSelectedHotelDetail] = useState<any | null>(null);

  // Enquiry modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState<string | undefined>();
  const [selectedPkgTitle, setSelectedPkgTitle] = useState<string | undefined>();
  const [selectedHotelName, setSelectedHotelName] = useState<string | undefined>();

  useEffect(() => {
    if (!slug) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const dest = await customerApi.getDestinationBySlug(slug);
        setDestination(dest);

        // Fetch packages and hotels in parallel
        const [pkgs, hotels] = await Promise.all([
          customerApi.getPackages({ destinationId: dest.id }).catch(() => []),
          customerApi.getHotels({ destinationId: dest.id }).catch(() => []),
        ]);
        setPackages(pkgs);
        setApiHotels(hotels);
      } catch (err: any) {
        setError(err.message || 'Destination not found.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const cleanDestName = destination ? formatDisplayTitle(destination.name) : '';
  const destStyle = destination ? getDestinationStyle(destination.name) : null;
  const curatedHotels = destination ? getCuratedHotelsForDestination(destination.name) : [];

  // Merge API hotels with curated rich metadata so every hotel has high-res photos and room details
  const allHotels = useMemo(() => {
    if (!destination) return [];

    // Map DB hotels or fallback to curated hotels
    if (apiHotels && apiHotels.length > 0) {
      return apiHotels.map((dbHotel, idx) => {
        // Find matching curated hotel if exists for richer photos & highlights
        const curated = curatedHotels.find(
          (c) => c.name.toLowerCase().includes(dbHotel.name.toLowerCase()) || dbHotel.name.toLowerCase().includes(c.name.toLowerCase())
        ) || curatedHotels[idx % curatedHotels.length];

        return {
          id: dbHotel.id,
          name: dbHotel.name,
          city: dbHotel.city || curated?.city || destination.name,
          starRating: dbHotel.starRating || curated?.starRating || 4,
          propertyType: dbHotel.propertyType ? dbHotel.propertyType.replace('_', ' ') : curated?.propertyType || 'Hotel',
          startingPrice: curated?.startingPrice || 5000,
          image: dbHotel.images && dbHotel.images[0] ? dbHotel.images[0] : (curated?.image || destStyle?.image || '/images/destinations/kashmir.jpg'),
          address: dbHotel.address || curated?.address || `${dbHotel.city || 'Central'}, ${destination.name}`,
          amenities: dbHotel.amenities && dbHotel.amenities.length > 0 ? dbHotel.amenities : (curated?.amenities || ['Free Wi-Fi', 'Dining', 'Room Service']),
          mealPlans: curated?.mealPlans || ['EP (Room Only)', 'CP (Breakfast)', 'MAP (Breakfast + Dinner)'],
          roomTypes: curated?.roomTypes || ['Deluxe Room', 'Executive Suite'],
          highlight: curated?.highlight || `Verified partner accommodation in ${cleanDestName} with direct Chirag Travels allotment.`,
        };
      });
    }

    return curatedHotels;
  }, [destination, apiHotels, curatedHotels, destStyle, cleanDestName]);

  // Extract unique cities for filtering
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    allHotels.forEach((h) => {
      if (h.city) cities.add(h.city);
    });
    return Array.from(cities);
  }, [allHotels]);

  // Filtered hotels
  const filteredHotels = useMemo(() => {
    return allHotels.filter((hotel) => {
      const matchesStar =
        selectedStarRating === 'all' || hotel.starRating === selectedStarRating;
      const matchesCity =
        selectedCity === 'all' || hotel.city === selectedCity;
      return matchesStar && matchesCity;
    });
  }, [allHotels, selectedStarRating, selectedCity]);

  const handleEnquire = (pkgId?: string, pkgTitle?: string, hotelName?: string) => {
    setSelectedPkgId(pkgId);
    setSelectedPkgTitle(pkgTitle);
    setSelectedHotelName(hotelName);
    setIsModalOpen(true);
  };

  const planTripWithHotel = (hotel: any) => {
    // Navigate to quote builder with pre-selected destination and hotel notes
    router.push(`/plan?dest=${encodeURIComponent(cleanDestName)}&hotel=${encodeURIComponent(hotel.name)}`);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            className="spinner"
            style={{
              width: 44,
              height: 44,
              border: '3px solid #CBD5E1',
              borderTopColor: '#059669',
              borderRadius: '50%',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: '#64748B', fontWeight: 600 }}>Loading state catalog, hotels & packages...</p>
        </div>
      </div>
    );
  }

  if (error || !destination || !destStyle) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 460, margin: '0 auto', background: '#FFFFFF', padding: 36, borderRadius: 16, border: '1px solid #E2E8F0' }}>
          <AlertTriangle size={40} color="#E11D48" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.4rem', color: '#0F172A', fontWeight: 800 }}>Destination Not Found</h2>
          <p style={{ color: '#64748B', marginTop: 8, fontSize: '0.9rem' }}>
            The requested state or travel circuit is currently updating. Please select from our available domestic circuits.
          </p>
          <Link href="/destinations" className="btn-hero-primary" style={{ marginTop: 24, display: 'inline-flex' }}>
            <span>Back to All States</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* =========================================================================
          DESTINATION CINEMATIC HERO BANNER
          ========================================================================= */}
      <div
        style={{
          position: 'relative',
          background: `linear-gradient(rgba(4, 20, 13, 0.75), rgba(6, 35, 23, 0.92)), url(${destStyle.image}) center/cover no-repeat`,
          color: '#FFFFFF',
          padding: '70px 0 65px',
          borderBottom: '3px solid var(--emerald-400)',
          overflow: 'hidden',
        }}
      >
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: 840 }}>
            {/* Breadcrumb / Top Tag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <Link
                href="/destinations"
                style={{ color: '#A7F3D0', fontSize: '0.84rem', fontWeight: 700, textDecoration: 'none' }}
              >
                States & Circuits
              </Link>
              <span style={{ color: '#6EE7B7' }}>›</span>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(16, 185, 129, 0.25)',
                  border: '1px solid rgba(52, 211, 153, 0.4)',
                  padding: '4px 12px',
                  borderRadius: 9999,
                  color: '#6EE7B7',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <MapPin size={12} />
                <span>{destStyle.badge}</span>
              </div>
            </div>

            <h1 style={{ fontSize: '3.2rem', fontWeight: 900, color: '#FFFFFF', marginBottom: 14, lineHeight: 1.12 }}>
              {cleanDestName}
            </h1>

            <p style={{ fontSize: '1.08rem', color: '#D1E2DA', lineHeight: 1.65, marginBottom: 24, maxWidth: 720 }}>
              {destination.description ||
                `Explore hand-picked luxury resorts, verified partner hotels, and private AC chauffeured travel circuits across ${cleanDestName}. Every stay is directly backed by our Ahmedabad travel desk.`}
            </p>

            {/* Quick Proof Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(6px)',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Building size={14} color="#34D399" />
                <span>{allHotels.length} Verified Hotels & Resorts</span>
              </span>

              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(6px)',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Calendar size={14} color="#FBBF24" />
                <span>Best Season: {destStyle.bestSeason}</span>
              </span>

              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(6px)',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ShieldCheck size={14} color="#38BDF8" />
                <span>Instant Voucher Confirmation</span>
              </span>
            </div>

            {/* Hero Action Buttons */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => handleEnquire(undefined, undefined, undefined)}
                className="btn-gold"
                style={{ fontSize: '0.96rem', padding: '13px 26px' }}
              >
                <span>Plan Custom Trip to {cleanDestName}</span>
                <ArrowRight size={16} />
              </button>

              <a
                href={`https://wa.me/918866006640?text=${encodeURIComponent(
                  `Hello Faisal Bikanerwala, I want to inquire about verified hotels and holiday packages for ${cleanDestName}. Please share details.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline-light"
                style={{
                  fontSize: '0.94rem',
                  padding: '12px 22px',
                  background: 'rgba(37, 211, 102, 0.2)',
                  borderColor: 'rgba(37, 211, 102, 0.5)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <MessageCircle size={18} color="#25D366" />
                <span>WhatsApp Travel Desk</span>
              </a>

              <Link
                href="/plan"
                className="btn-outline-light"
                style={{ fontSize: '0.94rem', padding: '12px 20px' }}
              >
                <span>Instant Quote Calculator</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          KEY SECTION 1: VERIFIED HOTELS & RESORTS IN THIS STATE (PRIMARY REQUIREMENT)
          ========================================================================= */}
      <section className="container" style={{ marginTop: 52 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            <Building size={16} />
            <span>Direct Partner Accommodations</span>
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.2 }}>
            Verified Hotels & Luxury Resorts in {cleanDestName}
          </h2>
          <p style={{ color: '#64748B', marginTop: 6, fontSize: '1rem', maxWidth: 740 }}>
            Every accommodation listed below features contracted allotments, verified room hygiene, complimentary breakfast or full meal options, and private driver pickup coordination.
          </p>
        </div>

        {/* Hotel Filter Controls */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 16,
            padding: '16px 20px',
            marginBottom: 32,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Star Category Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#475569', marginRight: 4 }}>
              Filter by Star:
            </span>
            <button
              onClick={() => setSelectedStarRating('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: selectedStarRating === 'all' ? '1px solid #059669' : '1px solid #CBD5E1',
                background: selectedStarRating === 'all' ? '#059669' : '#FFFFFF',
                color: selectedStarRating === 'all' ? '#FFFFFF' : '#334155',
              }}
            >
              All Hotels ({allHotels.length})
            </button>
            <button
              onClick={() => setSelectedStarRating(5)}
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: selectedStarRating === 5 ? '1px solid #059669' : '1px solid #CBD5E1',
                background: selectedStarRating === 5 ? '#059669' : '#FFFFFF',
                color: selectedStarRating === 5 ? '#FFFFFF' : '#334155',
              }}
            >
              5★ Luxury Palaces / Resorts
            </button>
            <button
              onClick={() => setSelectedStarRating(4)}
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: selectedStarRating === 4 ? '1px solid #059669' : '1px solid #CBD5E1',
                background: selectedStarRating === 4 ? '#059669' : '#FFFFFF',
                color: selectedStarRating === 4 ? '#FFFFFF' : '#334155',
              }}
            >
              4★ Premium Stays
            </button>
            <button
              onClick={() => setSelectedStarRating(3)}
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: selectedStarRating === 3 ? '1px solid #059669' : '1px solid #CBD5E1',
                background: selectedStarRating === 3 ? '#059669' : '#FFFFFF',
                color: selectedStarRating === 3 ? '#FFFFFF' : '#334155',
              }}
            >
              3★ Deluxe Stays
            </button>
          </div>

          {/* City / Location Sub-Filter */}
          {availableCities.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#475569' }}>City / Location:</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  padding: '7px 12px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  background: '#FFFFFF',
                  color: '#1E293B',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Cities / Regions</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Hotels Grid */}
        {filteredHotels.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '50px 20px',
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
            }}
          >
            <Building size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.2rem', color: '#334155', fontWeight: 700 }}>
              No hotels match the selected filter
            </h3>
            <p style={{ color: '#64748B', marginTop: 4, fontSize: '0.9rem' }}>
              Reset your star rating or city filter to view all verified properties in {cleanDestName}.
            </p>
            <button
              onClick={() => {
                setSelectedStarRating('all');
                setSelectedCity('all');
              }}
              className="btn-gold"
              style={{ marginTop: 16 }}
            >
              Show All Hotels ({allHotels.length})
            </button>
          </div>
        ) : (
          <div className="grid-2" style={{ gap: 28 }}>
            {filteredHotels.map((hotel, idx) => {
              const stars = Array.from({ length: hotel.starRating || 4 });

              return (
                <div
                  key={hotel.id || idx}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 20,
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  className="hotel-card"
                >
                  {/* Hotel Photo Media Banner */}
                  <div
                    style={{
                      height: 240,
                      position: 'relative',
                      background: `#0B192C url(${hotel.image}) center/cover no-repeat`,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)',
                      }}
                    />

                    {/* Top Badges */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 14,
                        left: 14,
                        right: 14,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        zIndex: 2,
                      }}
                    >
                      <span
                        style={{
                          background: 'rgba(5, 150, 105, 0.9)',
                          backdropFilter: 'blur(6px)',
                          color: '#FFFFFF',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          padding: '5px 12px',
                          borderRadius: 9999,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {hotel.propertyType}
                      </span>

                      <div
                        style={{
                          background: 'rgba(15, 23, 42, 0.85)',
                          backdropFilter: 'blur(6px)',
                          padding: '4px 10px',
                          borderRadius: 9999,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        {stars.map((_, sIdx) => (
                          <Star key={sIdx} size={13} fill="#F59E0B" color="#F59E0B" />
                        ))}
                        <span style={{ color: '#F1F5F9', fontSize: '0.74rem', fontWeight: 700, marginLeft: 4 }}>
                          {hotel.starRating}★
                        </span>
                      </div>
                    </div>

                    {/* Bottom Title on Banner */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 14,
                        left: 16,
                        right: 16,
                        zIndex: 2,
                      }}
                    >
                      <div style={{ color: '#A7F3D0', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                        {hotel.city} · {cleanDestName}
                      </div>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFFFFF', margin: 0, lineHeight: 1.25 }}>
                        {hotel.name}
                      </h3>
                    </div>
                  </div>

                  {/* Hotel Body */}
                  <div style={{ padding: '22px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      {/* Location address */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: '0.84rem', marginBottom: 12 }}>
                        <MapPin size={14} color="#059669" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {hotel.address}
                        </span>
                      </div>

                      {/* Highlight snippet */}
                      {hotel.highlight && (
                        <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.55, marginBottom: 16 }}>
                          {hotel.highlight}
                        </p>
                      )}

                      {/* Amenities Chips */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em', marginBottom: 6 }}>
                          Key Inclusions & Amenities:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {hotel.amenities.slice(0, 5).map((amenity: string, aIdx: number) => (
                            <span
                              key={aIdx}
                              style={{
                                fontSize: '0.76rem',
                                background: '#ECFDF5',
                                color: '#047857',
                                padding: '3px 9px',
                                borderRadius: 6,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              ✓ {amenity}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Meal Plans & Room Types */}
                      <div
                        style={{
                          background: '#F8FAFC',
                          borderRadius: 12,
                          padding: '12px 14px',
                          border: '1px solid #E2E8F0',
                          marginBottom: 18,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#475569', marginBottom: 6 }}>
                          <Utensils size={13} color="#D97706" />
                          <span>
                            <strong>Meal Plans Available:</strong> {hotel.mealPlans.join(' · ')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#475569' }}>
                          <Bed size={13} color="#2563EB" />
                          <span>
                            <strong>Room Categories:</strong> {hotel.roomTypes.join(' · ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: 14,
                          borderTop: '1px solid #F1F5F9',
                          marginBottom: 16,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                            Direct Chirag Rate
                          </div>
                          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A' }}>
                            {formatINR(hotel.startingPrice)}
                            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}> / room night</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedHotelDetail(hotel)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#059669',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span>View Property Info</span>
                          <Info size={14} />
                        </button>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                        <button
                          onClick={() => planTripWithHotel(hotel)}
                          className="btn-gold"
                          style={{
                            justifyContent: 'center',
                            padding: '11px 16px',
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            borderRadius: 10,
                          }}
                        >
                          <span>Plan Trip With This Hotel</span>
                          <ArrowRight size={15} />
                        </button>

                        <a
                          href={`https://wa.me/918866006640?text=${encodeURIComponent(
                            `Hello Faisal Bikanerwala, I want to book / inquire about ${hotel.name} in ${cleanDestName}. Please check room availability and rates.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-whatsapp-header"
                          style={{
                            padding: '11px 14px',
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                          title={`WhatsApp Inquiry for ${hotel.name}`}
                        >
                          <MessageCircle size={16} />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          KEY SECTION 2: AVAILABLE TOUR PACKAGES IN THIS STATE
          ========================================================================= */}
      <section className="container" style={{ marginTop: 64 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            <Compass size={16} />
            <span>Curated Ready-to-Book Packages</span>
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0F172A' }}>
            Complete Tour Packages in {cleanDestName}
          </h2>
          <p style={{ color: '#64748B', marginTop: 4, fontSize: '0.96rem' }}>
            All packages include handpicked hotel stays, daily breakfast, private dedicated chauffeured vehicle, and complete sightseeing.
          </p>
        </div>

        {packages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '50px 20px',
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
            }}
          >
            <Compass size={40} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.2rem', color: '#334155', fontWeight: 700 }}>
              Customized Itineraries Tailored on Demand
            </h3>
            <p style={{ color: '#64748B', marginTop: 6, fontSize: '0.92rem' }}>
              We design custom day-by-day itineraries for {cleanDestName} matching your exact flight timings and family preferences.
            </p>
            <button
              onClick={() => handleEnquire(undefined, undefined, undefined)}
              className="btn-gold"
              style={{ marginTop: 20 }}
            >
              Request Custom Itinerary & Quote
            </button>
          </div>
        ) : (
          <div className="grid-3" style={{ gap: 24 }}>
            {packages.map((pkg) => {
              const formattedPrice = formatINR(pkg.startingPrice);
              const cleanTitle = formatDisplayTitle(pkg.title);
              const pkgDestStyle = getDestinationStyle(pkg.destinationName || destination.name);

              return (
                <div key={pkg.id} className="pkg-card">
                  <div
                    className="pkg-card-media"
                    style={{ backgroundImage: `url(${pkgDestStyle.image})` }}
                  >
                    <div className="pkg-badge-overlay">
                      <span className="pill-dest">
                        <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {cleanDestName}
                      </span>
                      <span
                        style={{
                          background: 'rgba(0, 0, 0, 0.55)',
                          color: '#FFFFFF',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: 6,
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        {pkg.durationNights}N / {pkg.durationDays}D
                      </span>
                    </div>
                  </div>

                  <div className="pkg-card-body">
                    <h3 className="pkg-card-title">{cleanTitle}</h3>
                    {pkg.overview && <p className="pkg-card-desc">{pkg.overview}</p>}

                    <div className="pkg-specs">
                      <div className="pkg-spec-item">
                        <Clock size={15} color="#059669" />
                        <span>{pkg.durationNights}N / {pkg.durationDays}D</span>
                      </div>
                      {pkg.dayWiseItinerary && (
                        <div className="pkg-spec-item">
                          <Calendar size={15} color="#059669" />
                          <span>{pkg.dayWiseItinerary.length} Days Itinerary</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '12px 0 16px' }}>
                      <span style={{ fontSize: '0.72rem', background: '#ECFDF5', color: '#047857', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                        ✓ 4★/5★ Hotel Stay Included
                      </span>
                      <span style={{ fontSize: '0.72rem', background: '#ECFDF5', color: '#047857', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                        ✓ Private Chauffeur Vehicle
                      </span>
                    </div>

                    <div className="pkg-footer">
                      <div>
                        <div className="pkg-price-label">
                          {pkg.startingPrice ? 'Starting From' : 'Tour Pricing'}
                        </div>
                        <div className="pkg-price-val">
                          {formattedPrice}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link
                          href={`/packages/${pkg.slug}`}
                          className="btn-outline-dark"
                          style={{ padding: '8px 14px' }}
                        >
                          Details
                        </Link>
                        <button
                          onClick={() => handleEnquire(pkg.id, cleanTitle)}
                          className="btn-card-action"
                        >
                          Enquire
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          KEY SECTION 3: POPULAR SIGHTSEEING CIRCUITS & ATTRACTIONS
          ========================================================================= */}
      <section className="container" style={{ marginTop: 64 }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #062317 0%, #0B192C 100%)',
            borderRadius: 24,
            padding: '48px 40px',
            color: '#FFFFFF',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ maxWidth: 720 }}>
            <span
              style={{
                color: '#34D399',
                fontSize: '0.82rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
                display: 'block',
              }}
            >
              Must-Visit Experiences in {cleanDestName}
            </span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: 16 }}>
              Crafted Around {cleanDestName}&apos;s Finest Highlights
            </h2>
            <p style={{ color: '#D1E2DA', fontSize: '0.98rem', lineHeight: 1.6, marginBottom: 28 }}>
              Our tour desk coordinates licensed private drivers, prepaid attraction tickets, and verified mountain/boat guides so your journey is 100% stress-free.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 32 }}>
              {destStyle.circuitPlaces.map((place, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <MapPin size={16} color="#34D399" />
                  <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{place}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link
                href="/plan"
                className="btn-gold"
                style={{ fontSize: '0.94rem', padding: '13px 26px' }}
              >
                <span>Launch Quote Estimator</span>
                <ArrowRight size={16} />
              </Link>
              <a
                href={`tel:${COMPANY_BRANDING.phoneRaw}`}
                className="btn-outline-light"
                style={{ fontSize: '0.94rem', padding: '12px 22px' }}
              >
                <Phone size={15} color="#34D399" />
                <span>Call Travel Desk ({COMPANY_BRANDING.phoneDisplay})</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          HOTEL DETAILS MODAL (FOR VIEWING AMENITIES, POLICIES & ROOMS)
          ========================================================================= */}
      {selectedHotelDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setSelectedHotelDetail(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 620,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Image Media */}
            <div
              style={{
                height: 220,
                position: 'relative',
                background: `#0B192C url(${selectedHotelDetail.image}) center/cover no-repeat`,
              }}
            >
              <button
                onClick={() => setSelectedHotelDetail(null)}
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>

              <div
                style={{
                  position: 'absolute',
                  bottom: 14,
                  left: 18,
                  right: 18,
                  color: '#FFFFFF',
                }}
              >
                <span
                  style={{
                    background: '#059669',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 9999,
                    textTransform: 'uppercase',
                  }}
                >
                  {selectedHotelDetail.propertyType}
                </span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: 6, color: '#FFFFFF' }}>
                  {selectedHotelDetail.name}
                </h3>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: '0.85rem', marginBottom: 14 }}>
                <MapPin size={15} color="#059669" />
                <span>{selectedHotelDetail.address}</span>
              </div>

              <p style={{ color: '#334155', fontSize: '0.94rem', lineHeight: 1.6, marginBottom: 20 }}>
                {selectedHotelDetail.highlight}
              </p>

              {/* Full Amenities */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#0F172A', marginBottom: 8 }}>
                  Property Amenities & Highlights
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                  {selectedHotelDetail.amenities.map((a: string, idx: number) => (
                    <div key={idx} style={{ fontSize: '0.82rem', color: '#047857', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} color="#059669" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meal & Room Specifications */}
              <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 24, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.82rem', color: '#334155', marginBottom: 6 }}>
                  <strong>Supported Meal Plans:</strong> {selectedHotelDetail.mealPlans.join(' · ')}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                  <strong>Available Room Categories:</strong> {selectedHotelDetail.roomTypes.join(' · ')}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  onClick={() => {
                    setSelectedHotelDetail(null);
                    planTripWithHotel(selectedHotelDetail);
                  }}
                  className="btn-gold"
                  style={{ justifyContent: 'center', padding: '12px 18px', fontSize: '0.92rem' }}
                >
                  <span>Build Quote with Hotel</span>
                </button>

                <a
                  href={`https://wa.me/918866006640?text=${encodeURIComponent(
                    `Hello Faisal Bikanerwala, I want to book ${selectedHotelDetail.name} in ${cleanDestName}. Please confirm dates and availability.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp-header"
                  style={{ justifyContent: 'center', padding: '12px 18px', fontSize: '0.92rem' }}
                >
                  <MessageCircle size={16} />
                  <span>WhatsApp Inquire</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enquiry Modal */}
      <EnquiryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialDestinationId={destination.id}
        initialPackageId={selectedPkgId}
        destinationName={destination.name}
        packageName={selectedPkgTitle || (selectedHotelName ? `Stay at ${selectedHotelName}` : undefined)}
      />
    </div>
  );
}
