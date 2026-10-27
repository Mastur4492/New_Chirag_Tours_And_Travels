'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Compass, MapPin, Clock, Calendar, ArrowRight, Filter, Sparkles } from 'lucide-react';
import { customerApi } from '@/lib/api';
import { DestinationDto, TourPackageDto } from '@chirag/types';
import { EnquiryModal } from '@/components/EnquiryModal';

import { formatDisplayTitle, formatINR, getDestinationStyle } from '@/lib/utils';

export default function PackagesCatalogPage() {
  const [packages, setPackages] = useState<TourPackageDto[]>([]);
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDestId, setSelectedDestId] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDestId, setModalDestId] = useState<string | undefined>();
  const [modalPkgId, setModalPkgId] = useState<string | undefined>();
  const [modalDestName, setModalDestName] = useState<string | undefined>();
  const [modalPkgName, setModalPkgName] = useState<string | undefined>();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pList, dList] = await Promise.all([
          customerApi.getPackages().catch(() => []),
          customerApi.getDestinations().catch(() => []),
        ]);
        setPackages(pList);
        setDestinations(dList);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredPackages = packages.filter((pkg) => {
    const matchesSearch =
      !search.trim() ||
      pkg.title.toLowerCase().includes(search.toLowerCase()) ||
      (pkg.overview && pkg.overview.toLowerCase().includes(search.toLowerCase())) ||
      (pkg.destinationName && pkg.destinationName.toLowerCase().includes(search.toLowerCase()));

    const matchesDest = !selectedDestId || pkg.destinationId === selectedDestId;

    return matchesSearch && matchesDest;
  });

  const formatCurrency = (amt?: number) => {
    if (!amt) return null;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const handleEnquire = (pkg: TourPackageDto) => {
    setModalDestId(pkg.destinationId);
    setModalPkgId(pkg.id);
    setModalDestName(pkg.destinationName);
    setModalPkgName(pkg.title);
    setIsModalOpen(true);
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Catalog Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--pine-950) 0%, var(--pine-900) 50%, var(--pine-850) 100%)', color: '#FFFFFF', padding: '64px 0', borderBottom: '3px solid var(--emerald-400)' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: 700 }}>
          <h1 style={{ fontSize: '2.6rem', fontWeight: 900, color: '#FFFFFF', marginBottom: 14 }}>
            Published Holiday Packages
          </h1>
          <p style={{ fontSize: '1rem', color: '#D1E2DA', lineHeight: 1.6 }}>
            Browse verified travel packages with handpicked hotel stays, daily breakfast, and private transfers.
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: 40 }}>
        {/* Search & Filter Bar */}
        <div
          style={{
            background: '#FFFFFF',
            padding: '20px 24px',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 42 }}
              placeholder="Search by package name or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ minWidth: 220 }}>
            <select
              className="form-select"
              value={selectedDestId}
              onChange={(e) => setSelectedDestId(e.target.value)}
            >
              <option value="">All Destinations</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.country})
                </option>
              ))}
            </select>
          </div>

          {(search || selectedDestId) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedDestId('');
              }}
              style={{
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                padding: '10px 16px',
                borderRadius: 8,
                fontSize: '0.86rem',
                color: '#475569',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Catalog Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="spinner" style={{ width: 36, height: 36, border: '3px solid #CBD5E1', borderTopColor: '#0B192C', borderRadius: '50%', margin: '0 auto 16px' }} />
            <div style={{ color: '#64748B', fontWeight: 600 }}>Loading packages...</div>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0' }}>
            <Compass size={44} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.25rem', color: '#334155' }}>No Packages Match Your Filter</h3>
            <p style={{ color: '#64748B', marginTop: 6, fontSize: '0.9rem' }}>
              Try adjusting your search criteria or contact our desk for a custom holiday quote.
            </p>
          </div>
        ) : (
          <div className="grid-3">
            {filteredPackages.map((pkg) => {
              const formattedPrice = formatINR(pkg.startingPrice);
              const cleanTitle = formatDisplayTitle(pkg.title);
              const destLabel = pkg.destinationName ? formatDisplayTitle(pkg.destinationName) : 'Holiday Circuit';
              const destStyle = getDestinationStyle(pkg.destinationName || pkg.title);

              return (
                <div key={pkg.id} className="pkg-card">
                  <div
                    className="pkg-card-media"
                    style={{ backgroundImage: `url(${destStyle.image})` }}
                  >
                    <div className="pkg-badge-overlay">
                      <span className="pill-dest">
                        <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {destLabel}
                      </span>
                      <span
                        style={{
                          background: 'rgba(0, 0, 0, 0.5)',
                          color: '#FFFFFF',
                          fontSize: '0.72rem',
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
                          <span>{pkg.dayWiseItinerary.length} Days Plan</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '12px 0 16px' }}>
                      <span style={{ fontSize: '0.72rem', background: '#ECFDF5', color: '#047857', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                        ✓ 4★/5★ Hotel Allotment
                      </span>
                      <span style={{ fontSize: '0.72rem', background: '#ECFDF5', color: '#047857', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                        ✓ Private Chauffeur Vehicle
                      </span>
                      <span style={{ fontSize: '0.72rem', background: '#ECFDF5', color: '#047857', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                        ✓ Daily Breakfast & Dinner
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
                          onClick={() => handleEnquire(pkg)}
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
      </div>

      <EnquiryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialDestinationId={modalDestId}
        initialPackageId={modalPkgId}
        destinationName={modalDestName}
        packageName={modalPkgName}
      />
    </div>
  );
}
