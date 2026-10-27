'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Compass,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  Building,
  CheckCircle2,
  Calendar,
  Star,
  SlidersHorizontal,
} from 'lucide-react';
import { customerApi } from '@/lib/api';
import { DestinationDto } from '@chirag/types';
import { EnquiryModal } from '@/components/EnquiryModal';
import { formatDisplayTitle, formatINR, getDestinationStyle } from '@/lib/utils';
import { COMPANY_BRANDING } from '@/lib/branding';

type CategoryFilter = 'all' | 'snow' | 'backwaters' | 'heritage' | 'beach' | 'lakes';

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'priceAsc' | 'priceDesc'>('popular');

  // Enquiry Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDestId, setSelectedDestId] = useState<string | undefined>();
  const [selectedDestName, setSelectedDestName] = useState<string | undefined>();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const list = await customerApi.getDestinations();
        setDestinations(list);
      } catch (err: any) {
        setError(err.message || 'Unable to retrieve destinations.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleEnquire = (id: string, name: string) => {
    setSelectedDestId(id);
    setSelectedDestName(formatDisplayTitle(name));
    setIsModalOpen(true);
  };

  // Filter and sort destinations
  const filteredDestinations = useMemo(() => {
    return destinations
      .filter((dest) => {
        // Exclude test/demo names if needed or format cleanly
        const cleanName = formatDisplayTitle(dest.name).toLowerCase();
        const style = getDestinationStyle(dest.name);
        const query = searchQuery.toLowerCase().trim();

        // Search match
        const matchesQuery =
          !query ||
          cleanName.includes(query) ||
          (dest.state && dest.state.toLowerCase().includes(query)) ||
          style.highlightTag.toLowerCase().includes(query) ||
          style.circuitPlaces.some((p) => p.toLowerCase().includes(query));

        // Category filter
        const matchesCategory =
          selectedCategory === 'all' || style.category === selectedCategory;

        return matchesQuery && matchesCategory;
      })
      .sort((a, b) => {
        const styleA = getDestinationStyle(a.name);
        const styleB = getDestinationStyle(b.name);
        if (sortBy === 'priceAsc') return styleA.startingPrice - styleB.startingPrice;
        if (sortBy === 'priceDesc') return styleB.startingPrice - styleA.startingPrice;
        return 0; // Popular / Default
      });
  }, [destinations, searchQuery, selectedCategory, sortBy]);

  const categories: { key: CategoryFilter; label: string; icon: string }[] = [
    { key: 'all', label: 'All States & Circuits', icon: '🇮🇳' },
    { key: 'snow', label: 'Snow & Mountains', icon: '🏔️' },
    { key: 'backwaters', label: 'Backwaters & Lakes', icon: '🌴' },
    { key: 'heritage', label: 'Royal Heritage', icon: '👑' },
    { key: 'beach', label: 'Beaches & Islands', icon: '🏖️' },
    { key: 'lakes', label: 'Hills & Lakes', icon: '🌊' },
  ];

  return (
    <div style={{ paddingBottom: 80, minHeight: '85vh' }}>
      {/* Cinematic Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--pine-950) 0%, var(--pine-900) 50%, var(--pine-850) 100%)',
          color: '#FFFFFF',
          padding: '60px 0 52px',
          borderBottom: '3px solid var(--emerald-400)',
          position: 'relative',
        }}
      >
        <div className="container" style={{ textAlign: 'center', maxWidth: 840 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(52, 211, 153, 0.15)',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              padding: '6px 14px',
              borderRadius: 9999,
              color: '#34D399',
              fontSize: '0.84rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 16,
            }}
          >
            <Sparkles size={14} />
            <span>State-Wise Travel & Verified Partner Hotels</span>
          </div>

          <h1 style={{ fontSize: '2.8rem', fontWeight: 900, color: '#FFFFFF', marginBottom: 14, lineHeight: 1.15 }}>
            Explore Indian States & Curated Hotels
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#D1E2DA', lineHeight: 1.6, maxWidth: 680, margin: '0 auto 28px' }}>
            Select any state below to view verified 3★, 4★ & 5★ luxury hotels, heritage palaces, backwater houseboats, and bespoke tour packages with private AC transport.
          </p>

          {/* Quick Search & Filter Controls in Banner */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: '12px 16px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              maxWidth: 760,
              margin: '0 auto',
            }}
          >
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 280px' }}>
              <Search size={18} color="#059669" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search state, city or circuit (e.g. Kashmir, Munnar, Goa)..."
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.94rem',
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

            <div style={{ width: 1, height: 28, background: '#E2E8F0', display: 'none' }} className="hidden-mobile" />

            {/* Sort Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SlidersHorizontal size={15} color="#64748B" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: '0.86rem',
                  color: '#334155',
                  background: '#F8FAFC',
                  outline: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="popular">Most Popular</option>
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="container" style={{ marginTop: 36 }}>
        {/* Category Pills Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 12,
            marginBottom: 28,
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 18px',
                  borderRadius: 9999,
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  border: isActive ? '1px solid #059669' : '1px solid #E2E8F0',
                  background: isActive ? '#059669' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#475569',
                  boxShadow: isActive ? '0 4px 12px rgba(5, 150, 105, 0.25)' : 'none',
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Results Counter and Highlights Strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ color: '#475569', fontSize: '0.92rem', fontWeight: 600 }}>
            Showing{' '}
            <strong style={{ color: '#0F172A', fontWeight: 800 }}>
              {filteredDestinations.length}
            </strong>{' '}
            States & Travel Circuits
            {searchQuery && <span> matching &quot;{searchQuery}&quot;</span>}
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: '0.84rem', color: '#64748B' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle2 size={14} color="#059669" />
              <span>Direct Hotel Allotments</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle2 size={14} color="#059669" />
              <span>Private AC Fleet Included</span>
            </span>
          </div>
        </div>

        {/* Content States */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div
              className="spinner"
              style={{
                width: 40,
                height: 40,
                border: '3px solid #CBD5E1',
                borderTopColor: '#059669',
                borderRadius: '50%',
                margin: '0 auto 16px',
              }}
            />
            <div style={{ color: '#64748B', fontWeight: 600 }}>Loading state catalogs & hotels...</div>
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: 'center',
              padding: 40,
              background: '#FFF1F2',
              borderRadius: 16,
              border: '1px solid #FECDD3',
              color: '#9F1239',
            }}
          >
            <p>{error}</p>
          </div>
        ) : filteredDestinations.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
            }}
          >
            <Compass size={44} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.25rem', color: '#334155', fontWeight: 800 }}>
              No Destinations Match Your Filter
            </h3>
            <p style={{ color: '#64748B', marginTop: 6, fontSize: '0.92rem' }}>
              Try searching for &quot;Kashmir&quot;, &quot;Kerala&quot;, &quot;Goa&quot;, &quot;Rajasthan&quot; or reset your filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="btn-gold"
              style={{ marginTop: 20 }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Cards Grid with Real Photography & Direct Hotel Link */
          <div className="grid-3" style={{ gap: 28 }}>
            {filteredDestinations.map((dest, idx) => {
              const style = getDestinationStyle(dest.name, idx);
              const cleanName = formatDisplayTitle(dest.name);

              return (
                <div
                  key={dest.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#FFFFFF',
                    borderRadius: 20,
                    overflow: 'hidden',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                    transition: 'all 0.3s ease',
                  }}
                  className="state-explore-card"
                >
                  {/* Clickable Image Media Area */}
                  <Link
                    href={`/destinations/${dest.slug}`}
                    className="dest-card"
                    style={{ height: 260, borderRadius: 0 }}
                  >
                    {/* Real Photography Background with Hover Zoom */}
                    <div
                      className="dest-card-bg"
                      style={{ backgroundImage: `url(${style.image})` }}
                    />

                    {/* Gradient Overlay for Text Legibility */}
                    <div className="dest-card-overlay" />

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
                        zIndex: 3,
                      }}
                    >
                      <div className="dest-card-top-tag">
                        <MapPin size={11} color={style.accent} />
                        <span>{style.highlightTag}</span>
                      </div>

                      <div
                        style={{
                          background: 'rgba(15, 23, 42, 0.75)',
                          backdropFilter: 'blur(6px)',
                          padding: '4px 10px',
                          borderRadius: 9999,
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: '#FFFFFF',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Building size={12} color="#34D399" />
                        <span>{style.hotelCount}+ Hotels</span>
                      </div>
                    </div>

                    {/* Bottom Title on Image */}
                    <div className="dest-card-content" style={{ padding: 18 }}>
                      <span className="dest-card-badge">
                        {dest.state ? `${dest.state}, ` : ''}{dest.country}
                      </span>
                      <div className="dest-card-name" style={{ fontSize: '1.45rem' }}>
                        {cleanName}
                      </div>
                    </div>
                  </Link>

                  {/* Card Body Details */}
                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      {/* Circuit Highlights / Places */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em', marginBottom: 6 }}>
                          Key Circuit Attractions:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {style.circuitPlaces.map((place, pIdx) => (
                            <span
                              key={pIdx}
                              style={{
                                fontSize: '0.76rem',
                                background: '#F1F5F9',
                                color: '#334155',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontWeight: 600,
                              }}
                            >
                              • {place}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Hotel Category Summary */}
                      <div
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: 10,
                          padding: '10px 12px',
                          marginBottom: 16,
                          fontSize: '0.8rem',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                        }}
                      >
                        <Building size={15} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>
                          <strong style={{ color: '#0F172A' }}>Available Stays:</strong> {style.hotelSummary}
                        </span>
                      </div>
                    </div>

                    {/* Price & Primary CTA */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-end',
                          paddingTop: 12,
                          borderTop: '1px solid #F1F5F9',
                          marginBottom: 14,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                            Package From
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A' }}>
                            {formatINR(style.startingPrice)}
                            <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 500 }}> / person</span>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, background: '#ECFDF5', padding: '4px 8px', borderRadius: 6 }}>
                          {style.bestSeason}
                        </div>
                      </div>

                      {/* Dual Action Buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                        <Link
                          href={`/destinations/${dest.slug}`}
                          className="btn-gold"
                          style={{
                            justifyContent: 'center',
                            padding: '11px 16px',
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            borderRadius: 10,
                          }}
                        >
                          <span>Explore State & Hotels</span>
                          <ArrowRight size={15} />
                        </Link>

                        <button
                          onClick={() => handleEnquire(dest.id, cleanName)}
                          className="btn-outline-dark"
                          style={{
                            padding: '11px 14px',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            borderRadius: 10,
                            whiteSpace: 'nowrap',
                          }}
                          title={`Quick Quote for ${cleanName}`}
                        >
                          Get Quote
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EnquiryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialDestinationId={selectedDestId}
        destinationName={selectedDestName}
      />
    </div>
  );
}
