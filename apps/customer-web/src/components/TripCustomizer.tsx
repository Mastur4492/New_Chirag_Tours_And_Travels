'use client';

import React from 'react';
import {
  Compass,
  ArrowRight,
  Building,
  Car,
  ShieldCheck,
  Building2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  Calendar,
  Minus,
  Plus,
  Users,
  Info,
  MapPin,
  Check,
} from 'lucide-react';
import type { TourPackageDto } from '@chirag/types';
import type { CustomerStateCircuit } from '@/app/page';

interface TripCustomizerProps {
  bookingSlot?: React.ReactNode;
  activeStateObj: CustomerStateCircuit | null;
  dynamicStates: CustomerStateCircuit[];
  handleSelectState: (st: CustomerStateCircuit) => void;
  scrollToStep1: () => void;
  liveCuratedHotels: any[];
  activePackage: TourPackageDto | null;
  calculation: any;
  durationNights: number;
  setDurationNights: (n: number) => void;
  handleNightsChange: (delta: number) => void;
  showItinerary: boolean;
  setShowItinerary: (show: boolean) => void;
  effectiveItinerary: any[];
  selectedDayTab: number;
  setSelectedDayTab: (dayNum: number) => void;
  checkInDate: string;
  checkOutDate: string;
  minDateStr: string;
  minCheckOutStr: string;
  handleCheckInChange: (val: string) => void;
  handleCheckOutChange: (val: string) => void;
  formatDateDisplay: (d: string) => string;
  getDayDateLabel: (dayNum: number) => string;
  getDayFullDateLabel: (dayNum: number) => string;
  dynamicCircuitInclusions: string[];
  dynamicCircuitExclusions: string[];
  adults: number;
  children: number;
  roomsCount: number;
  handleRoomsChange: (delta: number) => void;
  extraBeds: number;
  handleExtraBedsChange: (delta: number) => void;
  extraBedRate: number;
  handleAdultsChange: (delta: number) => void;
  handleChildrenChange: (delta: number) => void;
  hotelStarFilter: 'all' | 3 | 4 | 5;
  setHotelStarFilter: (filter: 'all' | 3 | 4 | 5) => void;
  filteredCuratedHotels: any[];
  selectedHotel: any;
  selectedHotelRooms: any[];
  selectedRoom: any;
  handleSelectHotel: (hotelId: string) => void;
  setSelectedHotelId: (hotelId: string) => void;
  setSelectedRoomId: (roomId: string) => void;
  mealPlan: 'EP' | 'CP' | 'MAP' | 'AP';
  setMealPlan: (mp: 'EP' | 'CP' | 'MAP' | 'AP') => void;
  liveVehicles: any[];
  selectedVehicle: any;
  setSelectedVehicleId: (vehId: string) => void;
  setVehicleTier: (tier: string) => void;
  formatINR: (amount: number) => string;
}

export const TripCustomizer: React.FC<TripCustomizerProps> = ({
  bookingSlot,
  activeStateObj,
  dynamicStates,
  handleSelectState,
  scrollToStep1,
  liveCuratedHotels,
  activePackage,
  calculation,
  durationNights,
  setDurationNights,
  handleNightsChange,
  showItinerary,
  setShowItinerary,
  effectiveItinerary,
  selectedDayTab,
  setSelectedDayTab,
  checkInDate,
  checkOutDate,
  minDateStr,
  minCheckOutStr,
  handleCheckInChange,
  handleCheckOutChange,
  formatDateDisplay,
  getDayDateLabel,
  getDayFullDateLabel,
  dynamicCircuitInclusions,
  dynamicCircuitExclusions,
  adults,
  children,
  roomsCount,
  handleRoomsChange,
  extraBeds,
  handleExtraBedsChange,
  extraBedRate,
  handleAdultsChange,
  handleChildrenChange,
  hotelStarFilter,
  setHotelStarFilter,
  filteredCuratedHotels,
  selectedHotel,
  selectedHotelRooms,
  selectedRoom,
  handleSelectHotel,
  setSelectedHotelId,
  setSelectedRoomId,
  mealPlan,
  setMealPlan,
  liveVehicles,
  selectedVehicle,
  setSelectedVehicleId,
  setVehicleTier,
  formatINR,
}) => {
  return (
    <section
      id="step-2-customize"
      style={{
        padding: '40px 0 60px',
        background: '#F1F5F9',
        borderTop: '1px solid #E2E8F0',
      }}
    >
      <div className="container">
        {!activeStateObj ? (
          <div
            style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
              borderRadius: 24,
              border: '1.5px dashed #CBD5E1',
              padding: '48px 24px',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
              maxWidth: 920,
              margin: '0 auto',
            }}
            className="no-print"
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: 'rgba(5, 150, 105, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#059669',
              }}
            >
              <Compass size={34} />
            </div>

            <h3
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: '#0F172A',
                margin: '0 0 10px',
                lineHeight: 1.2,
              }}
            >
              Ready to Customize Your Dream Trip?
            </h3>

            <p
              style={{
                fontSize: '0.96rem',
                color: '#64748B',
                maxWidth: 640,
                margin: '0 auto 24px',
                lineHeight: 1.6,
              }}
            >
              Select any destination state in <strong>Step 1 above</strong> to configure your duration, hotel star comfort, and dedicated private vehicle. Your official transparent quotation will be calculated instantly!
            </p>

            {/* Fast 1-Click Destination Shortcuts */}
            <div style={{ marginBottom: 32 }}>
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 14,
                }}
              >
                Fast 1-Click Popular Circuits (Click any to start)
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  justifyContent: 'center',
                }}
              >
                {dynamicStates.slice(0, 6).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSelectState(st)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 18px',
                      borderRadius: 9999,
                      background: '#FFFFFF',
                      border: '1.5px solid #E2E8F0',
                      color: '#0F172A',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#059669';
                      e.currentTarget.style.background = '#ECFDF5';
                      e.currentTarget.style.color = '#047857';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.color = '#0F172A';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <span>{st.shortName}</span>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        color: '#059669',
                        fontWeight: 800,
                      }}
                    >
                      From {formatINR(st.startingFrom)}
                    </span>
                    <ArrowRight size={13} color="#059669" />
                  </button>
                ))}
              </div>
            </div>

            {/* 3 Core Value Pillars */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                gap: 16,
                textAlign: 'left',
                borderTop: '1px solid #E2E8F0',
                paddingTop: 26,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div
                  style={{
                    background: '#ECFDF5',
                    padding: 10,
                    borderRadius: 10,
                    color: '#059669',
                    flexShrink: 0,
                  }}
                >
                  <Building size={20} />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.90rem',
                      color: '#0F172A',
                    }}
                  >
                    Direct Hotel Rates
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: '#64748B',
                      marginTop: 3,
                      lineHeight: 1.4,
                    }}
                  >
                    Verified 3★, 4★, & 5★ palace resorts with complimentary daily breakfast & dinner (MAP).
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div
                  style={{
                    background: '#EFF6FF',
                    padding: 10,
                    borderRadius: 10,
                    color: '#2563EB',
                    flexShrink: 0,
                  }}
                >
                  <Car size={20} />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.90rem',
                      color: '#0F172A',
                    }}
                  >
                    Dedicated Private Cab
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: '#64748B',
                      marginTop: 3,
                      lineHeight: 1.4,
                    }}
                  >
                    Chauffeur-driven AC Sedan, SUV, Crysta or Tempo Traveller with all tolls & permits included.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div
                  style={{
                    background: '#FEF3C7',
                    padding: 10,
                    borderRadius: 10,
                    color: '#D97706',
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.90rem',
                      color: '#0F172A',
                    }}
                  >
                    Transparent Pricing
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: '#64748B',
                      marginTop: 3,
                      lineHeight: 1.4,
                    }}
                  >
                    Itemized cost breakdown, official PDF download, and 35% advance allotment guarantee.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Active State Banner */}
            <div
              style={{
                position: 'relative',
                borderRadius: 20,
                overflow: 'hidden',
                background: '#04140D',
                color: '#FFFFFF',
                marginBottom: 32,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                border: '2px solid #059669',
              }}
              className="no-print"
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                  alignItems: 'center',
                }}
              >
                <div style={{ padding: '28px 28px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        background: '#059669',
                        color: '#FFFFFF',
                        width: 26,
                        height: 26,
                        borderRadius: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                      }}
                    >
                      2
                    </span>
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: '#34D399',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Customizing Quotation For
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '1.8rem',
                      fontWeight: 900,
                      color: '#FFFFFF',
                      margin: '0 0 8px',
                      lineHeight: 1.2,
                    }}
                  >
                    {activeStateObj.name}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.90rem',
                      color: '#D1E2DA',
                      margin: '0 0 16px',
                      lineHeight: 1.5,
                    }}
                  >
                    {activeStateObj.tagline} • Best Season:{' '}
                    <strong>{activeStateObj.bestSeason}</strong>
                  </p>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={scrollToStep1}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(255, 255, 255, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        color: '#FFFFFF',
                        padding: '8px 14px',
                        borderRadius: 8,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <span>Change State ↺</span>
                    </button>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(5, 150, 105, 0.25)',
                        border: '1px solid rgba(52, 211, 153, 0.4)',
                        color: '#34D399',
                        padding: '8px 14px',
                        borderRadius: 8,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                      }}
                    >
                      <Building size={14} />
                      <span>
                        {liveCuratedHotels.length} Direct Verified Properties Available
                      </span>
                    </span>
                  </div>
                </div>

                <div
                  style={{ height: 180, position: 'relative' }}
                  className="desktop-only"
                >
                  <img
                    src={activeStateObj.image}
                    alt={activeStateObj.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(90deg, #04140D 0%, rgba(4, 20, 13, 0.3) 100%)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Tour Package & Day-by-Day Itinerary */}
            {activePackage && (
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  border: '1.5px solid #E2E8F0',
                  padding: '24px 26px',
                  marginBottom: 32,
                  boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
                }}
                className="no-print"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 16,
                    borderBottom: '1px solid #F1F5F9',
                    paddingBottom: 14,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          background: '#ECFDF5',
                          color: '#059669',
                          padding: '3px 10px',
                          borderRadius: 9999,
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          border: '1px solid #A7F3D0',
                        }}
                      >
                        {calculation.days} Days / {durationNights} Nights ({durationNights}N / {calculation.days}D) Circuit
                      </span>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          color: '#64748B',
                          fontWeight: 600,
                        }}
                      >
                        • Admin Verified Tour Plan
                      </span>
                    </div>

                    <h4
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        color: '#0F172A',
                        margin: 0,
                      }}
                    >
                      {activePackage.title}
                    </h4>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setShowItinerary(!showItinerary)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        padding: '7px 14px',
                        borderRadius: 8,
                        fontSize: '0.80rem',
                        fontWeight: 700,
                        color: '#0F172A',
                        cursor: 'pointer',
                      }}
                    >
                      <span>{showItinerary ? 'Hide Day Plan' : 'Show Day-by-Day Plan'}</span>
                      {showItinerary ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {activePackage.overview && (
                  <p
                    style={{
                      fontSize: '0.86rem',
                      color: '#475569',
                      lineHeight: 1.6,
                      margin: '0 0 18px',
                    }}
                  >
                    {activePackage.overview}
                  </p>
                )}

                {showItinerary && effectiveItinerary && effectiveItinerary.length > 0 && (
                  <div className="itinerary-container-grid" style={{ marginBottom: 20 }}>
                    {/* LEFT COLUMN: Day Schedule Tabs */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        background: '#F8FAFC',
                        border: '1.5px solid #E2E8F0',
                        borderRadius: 16,
                        padding: '14px 12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '2px 6px 6px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          📅 Day Schedule
                        </span>
                        <span
                          style={{
                            fontSize: '0.70rem',
                            color: '#059669',
                            fontWeight: 700,
                            background: '#ECFDF5',
                            padding: '2px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {effectiveItinerary.length} Days Total
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {effectiveItinerary.map((day: any) => {
                          const isDaySelected = selectedDayTab === day.dayNumber;
                          const dateBadge = getDayDateLabel(day.dayNumber);
                          return (
                            <button
                              key={day.dayNumber}
                              type="button"
                              onClick={() => setSelectedDayTab(day.dayNumber)}
                              style={{
                                textAlign: 'left',
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: isDaySelected ? '2px solid #059669' : '1px solid #E2E8F0',
                                background: '#FFFFFF',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                boxShadow: isDaySelected ? '0 4px 12px rgba(5, 150, 105, 0.16)' : 'none',
                                position: 'relative',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  minWidth: 0,
                                  flex: 1,
                                }}
                              >
                                <div
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    background: isDaySelected
                                      ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                                      : '#F1F5F9',
                                    color: isDaySelected ? '#FFFFFF' : '#475569',
                                    fontWeight: 900,
                                    fontSize: '0.76rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  D{day.dayNumber}
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      fontSize: '0.82rem',
                                      fontWeight: 800,
                                      color: isDaySelected ? '#047857' : '#0F172A',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {day.nightStayDestination || `Stop ${day.dayNumber}`}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '0.70rem',
                                      color: isDaySelected ? '#059669' : '#64748B',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      marginTop: 1,
                                    }}
                                  >
                                    {day.title}
                                  </div>
                                </div>
                              </div>

                              {dateBadge && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    background: isDaySelected ? '#059669' : '#F1F5F9',
                                    color: isDaySelected ? '#FFFFFF' : '#475569',
                                    padding: '3px 7px',
                                    borderRadius: 6,
                                    fontWeight: 700,
                                    flexShrink: 0,
                                  }}
                                >
                                  {dateBadge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Selected Day Details */}
                    {(() => {
                      const currentIndex = effectiveItinerary.findIndex(
                        (d: any) => d.dayNumber === selectedDayTab
                      );
                      const currentDay =
                        currentIndex >= 0 ? effectiveItinerary[currentIndex] : effectiveItinerary[0];
                      if (!currentDay) return null;

                      const totalDays = effectiveItinerary.length;
                      const hasPrev = currentIndex > 0;
                      const hasNext = currentIndex < totalDays - 1;

                      return (
                        <div
                          style={{
                            background: '#FFFFFF',
                            border: '1.5px solid #E2E8F0',
                            borderRadius: 16,
                            padding: '22px 24px',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: 280,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                flexWrap: 'wrap',
                                gap: 10,
                                marginBottom: 12,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span
                                  style={{
                                    background:
                                      'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                    color: '#FFFFFF',
                                    padding: '5px 12px',
                                    borderRadius: 8,
                                    fontSize: '0.80rem',
                                    fontWeight: 900,
                                    letterSpacing: '0.02em',
                                  }}
                                >
                                  Day {currentDay.dayNumber} of {totalDays}
                                </span>
                                <div>
                                  <div
                                    style={{
                                      fontWeight: 800,
                                      fontSize: '1.08rem',
                                      color: '#0F172A',
                                      lineHeight: 1.25,
                                    }}
                                  >
                                    {currentDay.title}
                                  </div>
                                  {checkInDate && (
                                    <div
                                      style={{
                                        fontSize: '0.76rem',
                                        color: '#059669',
                                        fontWeight: 700,
                                        marginTop: 3,
                                      }}
                                    >
                                      🗓️ {getDayFullDateLabel(currentDay.dayNumber)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {currentDay.nightStayDestination && (
                                  <span
                                    style={{
                                      background: '#EFF6FF',
                                      color: '#1D4ED8',
                                      border: '1px solid #BFDBFE',
                                      padding: '4px 10px',
                                      borderRadius: 6,
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                    }}
                                  >
                                    <Building2 size={13} />
                                    <span>Night Stay: {currentDay.nightStayDestination}</span>
                                  </span>
                                )}
                                {currentDay.mealsIncluded && currentDay.mealsIncluded.length > 0 && (
                                  <span
                                    style={{
                                      background: '#FEF3C7',
                                      color: '#92400E',
                                      border: '1px solid #FDE68A',
                                      padding: '4px 10px',
                                      borderRadius: 6,
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                    }}
                                  >
                                    🍽️ {currentDay.mealsIncluded.join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div
                              style={{
                                borderTop: '1px solid #F1F5F9',
                                paddingTop: 12,
                                marginBottom: 14,
                              }}
                            >
                              <p
                                style={{
                                  fontSize: '0.88rem',
                                  color: '#334155',
                                  lineHeight: 1.65,
                                  margin: 0,
                                }}
                              >
                                {currentDay.description}
                              </p>
                            </div>

                            {currentDay.activities && currentDay.activities.length > 0 && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  flexWrap: 'wrap',
                                  marginBottom: 16,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    color: '#64748B',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  Activities:
                                </span>
                                {currentDay.activities.map((act: string, i: number) => (
                                  <span
                                    key={i}
                                    style={{
                                      background: '#F8FAFC',
                                      border: '1px solid #CBD5E1',
                                      borderRadius: 9999,
                                      padding: '3px 10px',
                                      fontSize: '0.74rem',
                                      color: '#334155',
                                      fontWeight: 600,
                                    }}
                                  >
                                    ✓ {act}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Day Navigation Controls */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingTop: 12,
                              borderTop: '1px solid #F1F5F9',
                            }}
                          >
                            <button
                              type="button"
                              disabled={!hasPrev}
                              onClick={() => {
                                if (hasPrev)
                                  setSelectedDayTab(
                                    effectiveItinerary[currentIndex - 1].dayNumber
                                  );
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 14px',
                                borderRadius: 8,
                                border: '1px solid #E2E8F0',
                                background: hasPrev ? '#FFFFFF' : '#F8FAFC',
                                color: hasPrev ? '#0F172A' : '#94A3B8',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: hasPrev ? 'pointer' : 'not-allowed',
                              }}
                            >
                              <ChevronLeft size={14} />
                              <span>Previous Day</span>
                            </button>

                            <div
                              style={{
                                fontSize: '0.74rem',
                                color: '#64748B',
                                fontWeight: 600,
                              }}
                            >
                              Day {currentDay.dayNumber} of {totalDays}
                            </div>

                            <button
                              type="button"
                              disabled={!hasNext}
                              onClick={() => {
                                if (hasNext)
                                  setSelectedDayTab(
                                    effectiveItinerary[currentIndex + 1].dayNumber
                                  );
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 14px',
                                borderRadius: 8,
                                border: hasNext ? '1px solid #059669' : '1px solid #E2E8F0',
                                background: hasNext ? '#059669' : '#F8FAFC',
                                color: hasNext ? '#FFFFFF' : '#94A3B8',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: hasNext ? 'pointer' : 'not-allowed',
                              }}
                            >
                              <span>Next Day</span>
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Inclusions & Exclusions Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                    gap: 16,
                    borderTop: '1px solid #F1F5F9',
                    paddingTop: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: '#059669',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <CheckCircle2 size={14} color="#059669" />
                      <span>Included in This Circuit (Live Customized):</span>
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 18,
                        fontSize: '0.80rem',
                        color: '#334155',
                        lineHeight: 1.65,
                      }}
                    >
                      {dynamicCircuitInclusions.map((inc: string, i: number) => (
                        <li key={i}>{inc}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: '#991B1B',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <X size={14} color="#DC2626" />
                      <span>Excluded / Optional:</span>
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 18,
                        fontSize: '0.80rem',
                        color: '#64748B',
                        lineHeight: 1.65,
                      }}
                    >
                      {dynamicCircuitExclusions.map((exc: string, i: number) => (
                        <li key={i}>{exc}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: INTERACTIVE CUSTOMIZATION FORM (FULL WIDTH) */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 22,
                border: '1px solid #E2E8F0',
                padding: '30px 26px',
                boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
                marginBottom: 44,
              }}
              className="no-print"
            >
              {/* Duration (Nights / Days) */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <label
                    style={{
                      fontSize: '0.94rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Calendar size={18} color="#059669" />
                    <span>
                      Duration:{' '}
                      <strong style={{ color: '#059669' }}>
                        {calculation.days} Days / {durationNights} Nights ({durationNights}N / {calculation.days}D)
                      </strong>
                    </span>
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
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        minWidth: 26,
                        textAlign: 'center',
                      }}
                    >
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
                  {[3, 4, 5, 6, 7, 8, 10].map((n) => {
                    const isSelected = durationNights === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setDurationNights(n)}
                        style={{
                          flex: 1,
                          minWidth: 46,
                          padding: '8px 0',
                          borderRadius: 8,
                          border: isSelected ? '2px solid #059669' : '1px solid #E2E8F0',
                          background: isSelected ? '#ECFDF5' : '#FFFFFF',
                          color: isSelected ? '#047857' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {n}N / {n + 1}D
                      </button>
                    );
                  })}
                </div>

                {checkInDate && checkOutDate && (
                  <div
                    style={{
                      marginTop: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.76rem',
                      color: '#64748B',
                      flexWrap: 'wrap',
                      gap: 4,
                    }}
                  >
                    <span>
                      Schedule:{' '}
                      <strong style={{ color: '#059669' }}>
                        {formatDateDisplay(checkInDate)}
                      </strong>{' '}
                      →{' '}
                      <strong style={{ color: '#059669' }}>
                        {formatDateDisplay(checkOutDate)}
                      </strong>
                    </span>
                    <span
                      style={{
                        color: '#047857',
                        fontWeight: 700,
                        background: '#ECFDF5',
                        padding: '1px 6px',
                        borderRadius: 4,
                        border: '1px solid #A7F3D0',
                        fontSize: '0.70rem',
                      }}
                    >
                      Auto-synced with Dates ✓
                    </span>
                  </div>
                )}
              </div>

              {/* Travelers & Rooms */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.94rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    marginBottom: 10,
                  }}
                >
                  <Users
                    size={18}
                    color="#059669"
                    style={{ display: 'inline', marginRight: 6 }}
                  />
                  <span>Travelers & Room Allocation</span>
                </label>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: '10px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: '#64748B',
                        fontWeight: 700,
                      }}
                    >
                      Adults (12+ Yrs)
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '1.2rem',
                          fontWeight: 900,
                          color: '#0F172A',
                        }}
                      >
                        {adults}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleAdultsChange(-1)}
                          disabled={adults <= 1}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <Minus size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdultsChange(1)}
                          disabled={adults >= 20}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: '10px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: '#64748B',
                        fontWeight: 700,
                      }}
                    >
                      Children (0–11 Yrs)
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '1.2rem',
                          fontWeight: 900,
                          color: '#0F172A',
                        }}
                      >
                        {children}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleChildrenChange(-1)}
                          disabled={children <= 0}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <Minus size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChildrenChange(1)}
                          disabled={children >= 10}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: '10px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: '#64748B',
                        fontWeight: 700,
                      }}
                    >
                      Hotel Rooms
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '1.2rem',
                          fontWeight: 900,
                          color: '#0F172A',
                        }}
                      >
                        {roomsCount}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleRoomsChange(-1)}
                          disabled={roomsCount <= 1}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <Minus size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRoomsChange(1)}
                          disabled={roomsCount >= 15}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: extraBeds > 0 ? '#ECFDF5' : '#F8FAFC',
                      border: extraBeds > 0 ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: '10px 14px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: extraBeds > 0 ? '#047857' : '#64748B',
                        fontWeight: 700,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>Extra Bed(s)</span>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          background: extraBeds > 0 ? '#059669' : '#E2E8F0',
                          color: extraBeds > 0 ? '#FFFFFF' : '#475569',
                          padding: '1px 5px',
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        ₹{extraBedRate}/nt
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '1.2rem',
                          fontWeight: 900,
                          color: extraBeds > 0 ? '#047857' : '#0F172A',
                        }}
                      >
                        {extraBeds}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleExtraBedsChange(-1)}
                          disabled={extraBeds <= 0}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <Minus size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExtraBedsChange(1)}
                          disabled={extraBeds >= roomsCount * 2}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: '0.80rem',
                    color: '#065F46',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Info size={15} color="#059669" />
                  <span>
                    <strong>{roomsCount} Room(s){extraBeds > 0 ? ` + ${extraBeds} Extra Bed(s)` : ''}</strong> allotted for {adults} Adults{children > 0 ? ` & ${children} Children` : ''}. Extra mattress/bed is charged @ {formatINR(extraBedRate)}/night.
                  </span>
                </div>
              </div>

              {/* Check-in & Check-out Dates */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: 14,
                  padding: '16px 18px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  <label
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Calendar size={18} color="#059669" />
                    <span>Travel Dates (Check-in & Check-out)</span>
                  </label>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#047857',
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontWeight: 700,
                    }}
                  >
                    ⚡ Auto-syncs with {durationNights}N Duration & Itinerary
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  {/* Check-in Date */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                    }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        color: '#475569',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                      }}
                    >
                      🛫 Check-in / Tour Start Date
                    </label>
                    <input
                      type="date"
                      value={checkInDate}
                      min={minDateStr}
                      onChange={(e) => handleCheckInChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        color: '#0F172A',
                        background: '#F8FAFC',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    />
                    <div
                      style={{
                        fontSize: '0.76rem',
                        color: '#059669',
                        fontWeight: 700,
                        marginTop: 5,
                      }}
                    >
                      🗓️ {formatDateDisplay(checkInDate)}
                    </div>
                  </div>

                  {/* Check-out Date */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                    }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        color: '#475569',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                      }}
                    >
                      🛬 Check-out / Tour End Date
                    </label>
                    <input
                      type="date"
                      value={checkOutDate}
                      min={minCheckOutStr}
                      onChange={(e) => handleCheckOutChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        color: '#0F172A',
                        background: '#F8FAFC',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    />
                    <div
                      style={{
                        fontSize: '0.76rem',
                        color: '#059669',
                        fontWeight: 700,
                        marginTop: 5,
                      }}
                    >
                      🗓️ {formatDateDisplay(checkOutDate)}
                    </div>
                  </div>
                </div>

                {/* Date Summary / Helper Ribbon */}
                <div
                  style={{
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: '0.80rem',
                    color: '#065F46',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={15} color="#059669" />
                    <span>
                      Total Trip:{' '}
                      <strong>
                        {durationNights} Nights / {calculation.days} Days
                      </strong>{' '}
                      ({formatDateDisplay(checkInDate)} → {formatDateDisplay(checkOutDate)})
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#047857',
                      fontWeight: 700,
                    }}
                  >
                    Day-wise itinerary schedule updated ✓
                  </span>
                </div>
              </div>

              {/* Hotel Property & Room Category Selection */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  <label
                    style={{
                      fontSize: '0.94rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Building2 size={18} color="#059669" />
                    <span>Choose Hotel Property & Room Type</span>
                  </label>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#059669',
                      fontWeight: 700,
                      background: '#ECFDF5',
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid #A7F3D0',
                    }}
                  >
                    🟢 Admin Live Rates ({liveCuratedHotels.length} Properties)
                  </span>
                </div>

                {/* Star Filter Quick Tabs */}
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 14,
                    overflowX: 'auto',
                    paddingBottom: 2,
                  }}
                >
                  {[
                    { key: 'all' as const, label: `All Hotels (${liveCuratedHotels.length})` },
                    {
                      key: 5 as const,
                      label: `5★ Luxury (${liveCuratedHotels.filter((h) => h.starRating === 5).length})`,
                    },
                    {
                      key: 4 as const,
                      label: `4★ Deluxe (${liveCuratedHotels.filter((h) => h.starRating === 4).length})`,
                    },
                    {
                      key: 3 as const,
                      label: `3★ Comfort (${liveCuratedHotels.filter((h) => h.starRating === 3).length})`,
                    },
                  ].map((tab) => {
                    const isActive = hotelStarFilter === tab.key;
                    return (
                      <button
                        key={String(tab.key)}
                        type="button"
                        onClick={() => setHotelStarFilter(tab.key)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          border: isActive ? '1.5px solid #059669' : '1px solid #E2E8F0',
                          background: isActive ? '#059669' : '#FFFFFF',
                          color: isActive ? '#FFFFFF' : '#475569',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Hotel Cards Grid with Integrated Room Categories */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))',
                    gap: 14,
                    marginBottom: 16,
                    maxHeight: 520,
                    overflowY: 'auto',
                    paddingRight: 4,
                    alignItems: 'start',
                  }}
                >
                  {filteredCuratedHotels.length === 0 ? (
                    <div
                      style={{
                        gridColumn: '1 / -1',
                        background: '#F8FAFC',
                        border: '1.5px dashed #CBD5E1',
                        borderRadius: 14,
                        padding: '36px 20px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: 'rgba(5, 150, 105, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 12px',
                          color: '#059669',
                        }}
                      >
                        <Building2 size={24} />
                      </div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '1.02rem',
                          color: '#0F172A',
                          marginBottom: 6,
                        }}
                      >
                        No {hotelStarFilter !== 'all' ? `${hotelStarFilter}★ Comfort` : ''} Hotels Found for {activeStateObj?.shortName || 'this destination'}
                      </div>
                      <p
                        style={{
                          fontSize: '0.84rem',
                          color: '#64748B',
                          maxWidth: 440,
                          margin: '0 auto 16px',
                          lineHeight: 1.5,
                        }}
                      >
                        Direct partner allotment in this specific star category is currently not available for this circuit. You can view our handpicked verified luxury & deluxe properties instead.
                      </p>
                      <button
                        type="button"
                        onClick={() => setHotelStarFilter('all')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: '#059669',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '8px 18px',
                          borderRadius: 8,
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                        }}
                      >
                        <span>Show All Available Hotels ({liveCuratedHotels.length})</span>
                      </button>
                    </div>
                  ) : (
                    filteredCuratedHotels.map((hotel) => {
                      const isSelected = selectedHotel?.id === hotel.id;
                      const minPrice =
                        hotel.roomCategories?.[0]?.pricePerNight ||
                        (hotel.starRating >= 5 ? 7500 : 4800);
                      const hotelRooms =
                        hotel.roomCategories && hotel.roomCategories.length > 0
                          ? hotel.roomCategories
                          : selectedHotelRooms;

                      return (
                        <div
                          key={hotel.id}
                          onClick={() => handleSelectHotel(hotel.id)}
                          style={{
                            background: isSelected ? '#F0FDF4' : '#FFFFFF',
                            borderRadius: 14,
                            overflow: 'hidden',
                            border: isSelected ? '2.5px solid #059669' : '1px solid #E2E8F0',
                            boxShadow: isSelected
                              ? '0 6px 18px rgba(5, 150, 105, 0.22)'
                              : '0 2px 8px rgba(0,0,0,0.03)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                          }}
                        >
                          <div style={{ height: 110, position: 'relative' }}>
                            <img
                              src={hotel.image}
                              alt={hotel.name}
                              loading="lazy"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                top: 6,
                                left: 6,
                                background: hotel.starRating >= 5 ? '#F59E0B' : '#059669',
                                color: '#FFFFFF',
                                fontSize: '0.66rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: 4,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                              }}
                            >
                              {hotel.starRating}★ {hotel.propertyType}
                            </div>

                            {isSelected && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 6,
                                  right: 6,
                                  background: '#10B981',
                                  color: '#FFFFFF',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: 9999,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.5)',
                                }}
                              >
                                <Check size={12} />
                                <span>Selected</span>
                              </div>
                            )}
                          </div>

                          <div
                            style={{
                              padding: '10px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              flex: 1,
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: '0.86rem',
                                  color: isSelected ? '#047857' : '#0F172A',
                                  lineHeight: 1.3,
                                  marginBottom: 3,
                                }}
                              >
                                {hotel.name}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.70rem',
                                  color: '#64748B',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <MapPin size={11} color="#94A3B8" />
                                <span>{hotel.city}</span>
                              </div>
                            </div>

                            {/* Inline Room Selection when Hotel is selected */}
                            {isSelected && (
                              <div
                                style={{
                                  marginTop: 10,
                                  paddingTop: 8,
                                  borderTop: '1.5px dashed #CBD5E1',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 6,
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 2,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      color: '#047857',
                                      letterSpacing: '0.03em',
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    Select Room Type:
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '0.64rem',
                                      background: '#ECFDF5',
                                      border: '1px solid #A7F3D0',
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      fontWeight: 700,
                                      color: '#065F46',
                                    }}
                                  >
                                    Meal: {mealPlan}
                                  </span>
                                </div>

                                {hotelRooms.map((room: any) => {
                                  const isRoomSelected = selectedRoom?.id === room.id;
                                  return (
                                    <div
                                      key={room.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedHotelId(hotel.id);
                                        setSelectedRoomId(room.id);
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '6px 8px',
                                        borderRadius: 8,
                                        border: isRoomSelected
                                          ? '1.5px solid #059669'
                                          : '1px solid #E2E8F0',
                                        background: isRoomSelected ? '#ECFDF5' : '#FFFFFF',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        boxShadow: isRoomSelected
                                          ? '0 2px 6px rgba(5, 150, 105, 0.12)'
                                          : 'none',
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 7,
                                          minWidth: 0,
                                        }}
                                      >
                                        <input
                                          type="radio"
                                          name={`room_${hotel.id}`}
                                          checked={isRoomSelected}
                                          onChange={() => {
                                            setSelectedHotelId(hotel.id);
                                            setSelectedRoomId(room.id);
                                          }}
                                          style={{
                                            accentColor: '#059669',
                                            cursor: 'pointer',
                                            width: 13,
                                            height: 13,
                                            flexShrink: 0,
                                          }}
                                        />
                                        <div style={{ minWidth: 0 }}>
                                          <div
                                            style={{
                                              fontWeight: isRoomSelected ? 800 : 600,
                                              fontSize: '0.76rem',
                                              color: isRoomSelected ? '#065F46' : '#1E293B',
                                              whiteSpace: 'nowrap',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                            }}
                                          >
                                            {room.name}
                                          </div>
                                          <div
                                            style={{
                                              fontSize: '0.63rem',
                                              color: '#64748B',
                                            }}
                                          >
                                            Base {room.baseOccupancy || 2} Pax · Max {room.maxAdults} Adults
                                            {room.extraBedSupported ? ` · Extra Bed: ₹${room.extraBedPricePerNight ?? 1200}/nt` : ''}
                                          </div>
                                        </div>
                                      </div>
                                      <div
                                        style={{
                                          textAlign: 'right',
                                          flexShrink: 0,
                                          paddingLeft: 6,
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontSize: '0.84rem',
                                            fontWeight: 900,
                                            color: isRoomSelected ? '#047857' : '#0F172A',
                                          }}
                                        >
                                          {formatINR(room.pricePerNight)}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: '0.58rem',
                                            color: '#64748B',
                                            fontWeight: 600,
                                          }}
                                        >
                                          /nt
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div
                              style={{
                                marginTop: 8,
                                paddingTop: 6,
                                borderTop: '1px solid #F1F5F9',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontSize: '0.64rem',
                                    color: '#64748B',
                                    textTransform: 'uppercase',
                                    fontWeight: 700,
                                  }}
                                >
                                  {isSelected ? 'Selected Rate' : 'Starting From'}
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.88rem',
                                    fontWeight: 900,
                                    color: isSelected ? '#047857' : '#0F172A',
                                  }}
                                >
                                  {formatINR(
                                    isSelected && selectedRoom
                                      ? selectedRoom.pricePerNight
                                      : minPrice
                                  )}
                                  <span
                                    style={{
                                      fontSize: '0.65rem',
                                      color: '#64748B',
                                      fontWeight: 500,
                                    }}
                                  >
                                    /nt
                                  </span>
                                </div>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  color: isSelected ? '#059669' : '#64748B',
                                  background: isSelected ? '#ECFDF5' : '#F8FAFC',
                                  border: isSelected
                                    ? '1px solid #A7F3D0'
                                    : '1px solid #E2E8F0',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                {isSelected ? (
                                  <>
                                    <Check size={11} /> {calculation.roomsCount} Room(s)
                                  </>
                                ) : (
                                  `${hotel.roomCategories?.length || 1} Room Type(s)`
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Extra Bed Add-on Card */}
                <div
                  style={{
                    marginTop: 12,
                    background: extraBeds > 0 ? '#ECFDF5' : '#F8FAFC',
                    border: extraBeds > 0 ? '1.5px solid #059669' : '1.5px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.1rem' }}>🛏️</span>
                      <span style={{ fontWeight: 800, fontSize: '0.90rem', color: extraBeds > 0 ? '#065F46' : '#0F172A' }}>
                        Extra Bed / Mattress
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          background: extraBeds > 0 ? '#059669' : '#E2E8F0',
                          color: extraBeds > 0 ? '#FFFFFF' : '#475569',
                          padding: '2px 8px',
                          borderRadius: 9999,
                          fontWeight: 700,
                        }}
                      >
                        +{formatINR(extraBedRate)} / night
                      </span>
                      {extraBeds > 0 && (
                        <span
                          style={{
                            fontSize: '0.70rem',
                            color: '#059669',
                            fontWeight: 700,
                          }}
                        >
                          (Total: {formatINR(extraBeds * extraBedRate * durationNights)} for {durationNights} nights)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 4 }}>
                      Full rollaway bed or floor mattress with fresh bedsheets, duvet & pillows for third adult or child.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => handleExtraBedsChange(-1)}
                      disabled={extraBeds <= 0}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        cursor: extraBeds <= 0 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: extraBeds <= 0 ? '#94A3B8' : '#0F172A',
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <span
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 900,
                        color: extraBeds > 0 ? '#059669' : '#0F172A',
                        minWidth: 24,
                        textAlign: 'center',
                      }}
                    >
                      {extraBeds}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleExtraBedsChange(1)}
                      disabled={extraBeds >= roomsCount * 2}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        cursor: extraBeds >= roomsCount * 2 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: extraBeds >= roomsCount * 2 ? '#94A3B8' : '#0F172A',
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Private Dedicated Vehicle */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '0.94rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      margin: 0,
                    }}
                  >
                    <Car
                      size={18}
                      color="#059669"
                      style={{ display: 'inline', marginRight: 6 }}
                    />
                    <span>Dedicated Private Chauffeur Vehicle</span>
                  </label>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontWeight: 700,
                      color: '#065F46',
                    }}
                  >
                    ● Admin Fleet ({liveVehicles.length} Vehicles)
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {liveVehicles.map((veh) => {
                    const isSelected = selectedVehicle?.id === veh.id;
                    const isRecommended = adults + children > 4 && veh.seatingCapacity >= 6;
                    return (
                      <div
                        key={veh.id}
                        onClick={() => {
                          setSelectedVehicleId(veh.id);
                          setVehicleTier(veh.category);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: 12,
                          border: isSelected ? '2px solid #059669' : '1px solid #E2E8F0',
                          background: isSelected ? '#ECFDF5' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected
                            ? '0 4px 12px rgba(5, 150, 105, 0.12)'
                            : 'none',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            minWidth: 0,
                          }}
                        >
                          <input
                            type="radio"
                            name="selectedVehicle"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedVehicleId(veh.id);
                              setVehicleTier(veh.category);
                            }}
                            style={{
                              accentColor: '#059669',
                              cursor: 'pointer',
                              width: 16,
                              height: 16,
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                flexWrap: 'wrap',
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 800,
                                  fontSize: '0.92rem',
                                  color: isSelected ? '#065F46' : '#0F172A',
                                }}
                              >
                                {veh.label}
                              </span>
                              {isRecommended && (
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
                                  Fits Group
                                </span>
                              )}
                              {isSelected && (
                                <span
                                  style={{
                                    background: '#059669',
                                    color: '#FFFFFF',
                                    fontSize: '0.66rem',
                                    fontWeight: 800,
                                    padding: '1px 7px',
                                    borderRadius: 9999,
                                  }}
                                >
                                  Selected ✓
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: '0.76rem',
                                color: '#64748B',
                                marginTop: 3,
                              }}
                            >
                              Capacity: <strong>{veh.capacity}</strong> • Luggage:{' '}
                              <strong>{veh.luggage}</strong> •{' '}
                              {veh.hasAC ? 'AC Chauffeur' : 'Non-AC'}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            textAlign: 'right',
                            paddingLeft: 12,
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: '1.05rem',
                              fontWeight: 900,
                              color: isSelected ? '#047857' : '#0F172A',
                            }}
                          >
                            {formatINR(veh.perDayCost)}
                          </div>
                          <div
                            style={{
                              fontSize: '0.66rem',
                              color: '#64748B',
                              fontWeight: 600,
                            }}
                          >
                            per day
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 8,
                    fontSize: '0.74rem',
                    color: '#64748B',
                    background: '#F8FAFC',
                    padding: '7px 10px',
                    borderRadius: 6,
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <ShieldCheck size={14} color="#059669" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Vehicle & Chauffeur:</strong> Dedicated commercial cab guaranteed. Vehicle registration number and chauffeur details are allocated upon booking confirmation prior to departure.
                  </span>
                </div>
              </div>

              {/* Meal Plan Preference */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    marginBottom: 8,
                  }}
                >
                  Meal Plan Included:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setMealPlan('EP')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border:
                        mealPlan === 'EP' ? '2px solid #059669' : '1px solid #E2E8F0',
                      background: mealPlan === 'EP' ? '#ECFDF5' : '#FFFFFF',
                      color: mealPlan === 'EP' ? '#047857' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>{mealPlan === 'EP' ? '✓ ' : ''}EP Plan</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                      Room Only (No Meals)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMealPlan('CP')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border:
                        mealPlan === 'CP' ? '2px solid #059669' : '1px solid #E2E8F0',
                      background: mealPlan === 'CP' ? '#ECFDF5' : '#FFFFFF',
                      color: mealPlan === 'CP' ? '#047857' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>{mealPlan === 'CP' ? '✓ ' : ''}CP Plan</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                      Daily Breakfast Only
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMealPlan('MAP')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border:
                        mealPlan === 'MAP' ? '2px solid #059669' : '1px solid #E2E8F0',
                      background: mealPlan === 'MAP' ? '#ECFDF5' : '#FFFFFF',
                      color: mealPlan === 'MAP' ? '#047857' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>{mealPlan === 'MAP' ? '✓ ' : ''}MAP Plan (Recommended)</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                      Daily Breakfast & Dinner
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMealPlan('AP')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border:
                        mealPlan === 'AP' ? '2px solid #059669' : '1px solid #E2E8F0',
                      background: mealPlan === 'AP' ? '#ECFDF5' : '#FFFFFF',
                      color: mealPlan === 'AP' ? '#047857' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>{mealPlan === 'AP' ? '✓ ' : ''}AP Plan</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                      Daily All Meals (Breakfast, Lunch & Dinner)
                    </div>
                  </button>
                </div>
              </div>

              {/* Confirmation & Proceed to Step 3 */}
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 22,
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: '#0F172A',
                    }}
                  >
                    Selections Complete! Ready to review your official quote?
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    All hotel rates, cab tariffs and taxes are calculated in Step 3 below.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('step-3-quotation');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 24px',
                    borderRadius: 12,
                    background:
                      'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
                  }}
                >
                  <span>View Final Quotation ({formatINR(calculation.finalTotal)})</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* STEP 3: FINAL ALL-INCLUSIVE QUOTATION & BOOKING ACTIONS */}
            <div id="step-3-quotation" style={{ scrollMarginTop: 90 }} className="no-print">
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      background: '#059669',
                      color: '#FFFFFF',
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: '0.76rem',
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                    }}
                  >
                    STEP 3 OF 3
                  </span>
                  <h3
                    style={{
                      fontSize: '1.45rem',
                      fontWeight: 900,
                      color: '#0F172A',
                      margin: 0,
                    }}
                  >
                    Final All-Inclusive Quotation & Booking
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748B' }}>
                  Review your customized trip summary with transparent inclusions. Confirm your booking or chat directly on WhatsApp.
                </p>
              </div>

              {bookingSlot}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
