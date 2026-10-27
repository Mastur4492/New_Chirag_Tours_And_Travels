'use client';

import React from 'react';
import {
  Sparkles,
  Search,
  Clock,
  CheckCircle2,
  Check,
  Star,
  ArrowRight,
} from 'lucide-react';
import type { CustomerStateCircuit, CategoryFilter } from '@/app/page';

interface CircuitGridProps {
  activeStateObj: CustomerStateCircuit | null;
  selectedStateId: string | null;
  handleClearSelection: () => void;
  handleSelectState: (st: CustomerStateCircuit) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  categoryFilter: CategoryFilter;
  setCategoryFilter: (cat: CategoryFilter) => void;
  dynamicStatesCount: number;
  filteredStates: CustomerStateCircuit[];
  formatINR: (amount: number) => string;
}

export const CircuitGrid: React.FC<CircuitGridProps> = ({
  activeStateObj,
  selectedStateId,
  handleClearSelection,
  handleSelectState,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  dynamicStatesCount,
  filteredStates,
  formatINR,
}) => {
  return (
    <section
      id="step-1-choose-state"
      style={{ padding: '40px 0 32px' }}
      className="no-print"
    >
      <div className="container">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  background: '#059669',
                  color: '#FFFFFF',
                  width: 28,
                  height: 28,
                  borderRadius: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                }}
              >
                1
              </span>
              <h2
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  color: '#0F172A',
                  margin: 0,
                }}
              >
                Select Your Destination State
              </h2>
            </div>
            <p
              style={{
                fontSize: '0.86rem',
                color: '#64748B',
                margin: '4px 0 0 36px',
              }}
            >
              Click any state below to view its verified hotels, day plans, and instant pricing.
            </p>
          </div>

          <div style={{ fontSize: '0.84rem', color: '#059669', fontWeight: 700 }}>
            {activeStateObj ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>
                  Active State:{' '}
                  <strong style={{ textDecoration: 'underline' }}>
                    {activeStateObj.shortName}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    color: '#64748B',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Clear ✕
                </button>
              </div>
            ) : (
              <span
                style={{
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Sparkles size={14} color="#059669" />
                <span>Choose any destination card below to begin</span>
              </span>
            )}
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '14px 18px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            marginBottom: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#F1F5F9',
              borderRadius: 10,
              padding: '8px 14px',
            }}
          >
            <Search size={16} color="#059669" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search state or hill station (e.g. Kashmir, Kerala, Goa, Manali, Jaipur, Nainital)..."
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.92rem',
                color: '#0F172A',
                width: '100%',
                fontWeight: 500,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                Clear
              </button>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              paddingBottom: 4,
            }}
          >
            {[
              {
                key: 'all' as CategoryFilter,
                label: `All States (${dynamicStatesCount})`,
                icon: '🇮🇳',
              },
              { key: 'snow' as CategoryFilter, label: 'Snow & Valleys', icon: '🏔️' },
              { key: 'backwaters' as CategoryFilter, label: 'Backwaters', icon: '🌴' },
              { key: 'heritage' as CategoryFilter, label: 'Royal Heritage', icon: '👑' },
              { key: 'beach' as CategoryFilter, label: 'Beaches & Islands', icon: '🏖️' },
              { key: 'lakes' as CategoryFilter, label: 'Hills & Lakes', icon: '🌊' },
            ].map((cat) => {
              const isActive = categoryFilter === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategoryFilter(cat.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 9999,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: isActive ? '1.5px solid #059669' : '1px solid #E2E8F0',
                    background: isActive ? '#059669' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual State Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: 20,
          }}
        >
          {filteredStates.map((st) => {
            const isSelected =
              Boolean(selectedStateId) &&
              (selectedStateId === st.id ||
                (activeStateObj &&
                  (activeStateObj.id === st.id ||
                    activeStateObj.shortName?.toLowerCase() ===
                      st.shortName?.toLowerCase())));

            const benchmarkPrice = Math.round(st.startingFrom * 1.18);

            return (
              <div
                key={st.id}
                onClick={() => handleSelectState(st)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectState(st);
                  }
                }}
                style={{
                  position: 'relative',
                  borderRadius: 20,
                  overflow: 'hidden',
                  background: '#FFFFFF',
                  border: isSelected ? '2.5px solid #059669' : '1.5px solid #E2E8F0',
                  boxShadow: isSelected
                    ? '0 12px 32px rgba(5, 150, 105, 0.22), 0 0 0 4px rgba(5, 150, 105, 0.12)'
                    : '0 4px 20px rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isSelected ? 'translateY(-4px)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  userSelect: 'none',
                }}
              >
                {/* HERO PHOTO CONTAINER */}
                <div
                  style={{
                    position: 'relative',
                    height: 195,
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={st.image}
                    alt={st.name}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.4s ease',
                    }}
                  />

                  {/* Gradient Scrim */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(180deg, rgba(15,23,42,0.45) 0%, rgba(15,23,42,0.05) 45%, rgba(15,23,42,0.70) 100%)',
                    }}
                  />

                  {/* Top Floating Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      right: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        background: 'rgba(15, 23, 42, 0.70)',
                        backdropFilter: 'blur(8px)',
                        color: '#FFFFFF',
                        padding: '4px 10px',
                        borderRadius: 9999,
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Sparkles size={11} color="#34D399" />
                      <span>{st.badge.replace(/^✨\s*/, '')}</span>
                    </span>

                    {isSelected ? (
                      <span
                        style={{
                          background: '#059669',
                          color: '#FFFFFF',
                          padding: '4px 12px',
                          borderRadius: 9999,
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 10px rgba(5, 150, 105, 0.5)',
                        }}
                      >
                        <Check size={13} />
                        <span>SELECTED</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'rgba(255, 255, 255, 0.92)',
                          backdropFilter: 'blur(8px)',
                          color: '#0F172A',
                          padding: '4px 10px',
                          borderRadius: 9999,
                          fontSize: '0.70rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        }}
                      >
                        <Star size={11} fill="#F59E0B" color="#F59E0B" />
                        <span>4.9 ({st.hotelCount}+ Resorts)</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom Duration Pill */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      left: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(15, 23, 42, 0.65)',
                      backdropFilter: 'blur(6px)',
                      padding: '4px 10px',
                      borderRadius: 8,
                      color: '#A7F3D0',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    <Clock size={12} />
                    <span>
                      {st.defaultNights}N /{' '}
                      {st.defaultDays || st.defaultNights + 1}D Tour Circuit
                    </span>
                  </div>
                </div>

                {/* CARD BODY */}
                <div
                  style={{
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flex: 1,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: '1.20rem',
                        fontWeight: 900,
                        color: '#0F172A',
                        margin: '0 0 6px',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.3,
                      }}
                    >
                      {st.shortName}
                    </h3>

                    <p
                      style={{
                        fontSize: '0.80rem',
                        color: '#475569',
                        lineHeight: 1.45,
                        margin: '0 0 10px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {st.tagline}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#F0FDF4',
                        border: '1px solid #A7F3D0',
                        color: '#065F46',
                        padding: '6px 10px',
                        borderRadius: 8,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      <CheckCircle2 size={13} color="#059669" />
                      <span>Hotel Stay + AC Private Cab + Meals Included</span>
                    </div>
                  </div>

                  {/* PRICING & CTA */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 14,
                      marginTop: 14,
                      borderTop: '1px solid #F1F5F9',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '0.70rem',
                          color: '#94A3B8',
                          fontWeight: 700,
                          textDecoration: 'line-through',
                          lineHeight: 1,
                          marginBottom: 2,
                        }}
                      >
                        {formatINR(benchmarkPrice)}
                      </div>
                      <div
                        style={{
                          fontSize: '1.22rem',
                          fontWeight: 900,
                          color: isSelected ? '#059669' : '#0F172A',
                          letterSpacing: '-0.02em',
                          lineHeight: 1,
                        }}
                      >
                        {formatINR(st.startingFrom)}
                        <span
                          style={{
                            fontSize: '0.70rem',
                            color: '#64748B',
                            fontWeight: 600,
                          }}
                        >
                          {' '}
                          /person
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectState(st);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '9px 16px',
                        borderRadius: 10,
                        fontSize: '0.80rem',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                        background: isSelected ? '#059669' : '#0F172A',
                        color: '#FFFFFF',
                        boxShadow: isSelected
                          ? '0 4px 14px rgba(5, 150, 105, 0.35)'
                          : '0 4px 14px rgba(15, 23, 42, 0.18)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>
                        {isSelected ? '✓ Selected ↓' : 'Plan Trip & Quote'}
                      </span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
