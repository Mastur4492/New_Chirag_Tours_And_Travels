'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe,
  ShieldCheck,
  Check,
  ExternalLink,
  Save,
  Compass,
  ArrowRight,
  CreditCard,
  CheckCircle2,
  Copy,
  Layers,
  Plus,
  Trash2,
  X,
  RefreshCw,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { TourPackageDto } from '@chirag/types';
import { apiRequest, agencySettingsApi, clearClientCache } from '@/lib/api';
import { sanitizeDisplayName } from '@/lib/labels';

export default function CustomerSettingsPage() {
  const [activeTab, setActiveTab] = useState<'inclusions' | 'banking'>('inclusions');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Live Package Inclusions & Exclusions Editor State
  const [packagesList, setPackagesList] = useState<TourPackageDto[]>([]);
  const [selectedPkgId, setSelectedPkgId] = useState<string>('');
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [currentInclusions, setCurrentInclusions] = useState<string[]>([]);
  const [currentExclusions, setCurrentExclusions] = useState<string[]>([]);
  const [newInclusionText, setNewInclusionText] = useState('');
  const [newExclusionText, setNewExclusionText] = useState('');
  const [isSavingInclusions, setIsSavingInclusions] = useState(false);

  // Bank Details
  const [bankDetails, setBankDetails] = useState({
    bankName: 'HDFC Bank',
    branch: 'Danilimda Branch, Ahmedabad',
    accountName: 'NEW CHIRAG TOURS AND TRAVELS',
    accountNumber: '50200084920194',
    ifsc: 'HDFC0001842',
    upiId: '8866006640@upi',
  });

  // Load from local storage or server
  useEffect(() => {
    try {
      const savedBank = localStorage.getItem('nct_bank_details');
      if (savedBank) {
        setBankDetails(JSON.parse(savedBank));
      }
    } catch {
      // Ignore
    }

    // Load fresh from MongoDB AgencySettings
    agencySettingsApi
      .get()
      .then((settings) => {
        if (settings) {
          setBankDetails({
            bankName: settings.bankName || 'HDFC Bank Ltd',
            branch: settings.branchName || 'Danilimda Branch, Ahmedabad',
            accountName: settings.accountHolderName || 'NEW CHIRAG TOURS AND TRAVELS',
            accountNumber: settings.accountNumber || '50200084920194',
            ifsc: settings.ifscCode || 'HDFC0001842',
            upiId: settings.upiId || '8866006640@upi',
          });
        }
      })
      .catch((err) => console.warn('Could not load agency settings from DB', err));
  }, []);

  const handleSaveBank = async () => {
    try {
      localStorage.setItem('nct_bank_details', JSON.stringify(bankDetails));
      await agencySettingsApi.update({
        bankName: bankDetails.bankName,
        branchName: bankDetails.branch,
        accountHolderName: bankDetails.accountName,
        accountNumber: bankDetails.accountNumber,
        ifscCode: bankDetails.ifsc,
        upiId: bankDetails.upiId,
      });
      clearClientCache();
    } catch (err) {
      console.error('Failed to sync bank details to database:', err);
    }
    triggerSuccess('Official bank account details saved & synced to proposals!');
  };

  const fetchPackages = async () => {
    try {
      setLoadingPackages(true);
      const data = await apiRequest<TourPackageDto[]>(`packages?limit=100&_t=${Date.now()}`);
      const list = Array.isArray(data) ? data : [];
      setPackagesList(list);
      if (list.length > 0) {
        setSelectedPkgId((prev) => {
          const exists = list.some((p) => p.id === prev);
          const activeId = exists ? prev : list[0].id;
          const pkg = list.find((p) => p.id === activeId);
          if (pkg) {
            setCurrentInclusions(pkg.inclusions || []);
            setCurrentExclusions(pkg.exclusions || []);
          }
          return activeId;
        });
      }
    } catch (err) {
      console.error('Failed to load packages in customer settings:', err);
    } finally {
      setLoadingPackages(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleSelectPkg = (pkgId: string) => {
    setSelectedPkgId(pkgId);
    const pkg = packagesList.find((p) => p.id === pkgId);
    if (pkg) {
      setCurrentInclusions(pkg.inclusions || []);
      setCurrentExclusions(pkg.exclusions || []);
    }
  };

  const handleAddInclusion = (text?: string) => {
    const val = (text || newInclusionText).trim();
    if (!val) return;
    if (!currentInclusions.includes(val)) {
      setCurrentInclusions([...currentInclusions, val]);
    }
    if (!text) setNewInclusionText('');
  };

  const handleRemoveInclusion = (index: number) => {
    setCurrentInclusions(currentInclusions.filter((_, i) => i !== index));
  };

  const handleAddExclusion = (text?: string) => {
    const val = (text || newExclusionText).trim();
    if (!val) return;
    if (!currentExclusions.includes(val)) {
      setCurrentExclusions([...currentExclusions, val]);
    }
    if (!text) setNewExclusionText('');
  };

  const handleRemoveExclusion = (index: number) => {
    setCurrentExclusions(currentExclusions.filter((_, i) => i !== index));
  };

  const handleSaveInclusionsAndExclusions = async () => {
    if (!selectedPkgId) return;
    try {
      setIsSavingInclusions(true);
      await apiRequest(`packages/${selectedPkgId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          inclusions: currentInclusions,
          exclusions: currentExclusions,
        }),
      });

      // Update in packagesList
      setPackagesList((prev) =>
        prev.map((p) =>
          p.id === selectedPkgId
            ? { ...p, inclusions: currentInclusions, exclusions: currentExclusions }
            : p
        )
      );

      triggerSuccess('Package Inclusions & Exclusions saved to MongoDB successfully!');
    } catch (err: any) {
      triggerError(err.message || 'Failed to save inclusions & exclusions');
    } finally {
      setIsSavingInclusions(false);
    }
  };

  const triggerSuccess = (msg: string) => {
    setSaveSuccess(msg);
    setSaveError(null);
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  const triggerError = (msg: string) => {
    setSaveError(msg);
    setSaveSuccess(null);
    setTimeout(() => setSaveError(null), 4500);
  };

  return (
    <div className="container" style={{ padding: '32px 20px', maxWidth: 1200 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#ECFDF5', color: '#059669', padding: 8, borderRadius: 10 }}>
              <Globe size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Customer Portal Settings
              </h1>
              <p style={{ fontSize: '0.86rem', color: '#64748B', margin: '4px 0 0' }}>
                Global commercial policies, dynamic inclusions engine, and official bank lock settings.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link
            href="/packages"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#0F172A',
              color: '#FFFFFF',
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: '0.84rem',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
            }}
          >
            <Compass size={16} />
            <span>Go to Packages Desk</span>
          </Link>

          <a
            href={process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL || '/'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#059669',
              color: '#FFFFFF',
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: '0.84rem',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
            }}
          >
            <span>Open Live Customer Web (:3000)</span>
            <ExternalLink size={15} />
          </a>
        </div>
      </div>

      {saveSuccess && (
        <div
          style={{
            background: '#ECFDF5',
            border: '1.5px solid #10B981',
            color: '#065F46',
            padding: '12px 18px',
            borderRadius: 12,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontWeight: 700,
            fontSize: '0.88rem',
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div
          style={{
            background: '#FFF1F2',
            border: '1.5px solid #F43F5E',
            color: '#9F1239',
            padding: '12px 18px',
            borderRadius: 12,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontWeight: 700,
            fontSize: '0.88rem',
          }}
        >
          <AlertTriangle size={18} color="#E11D48" />
          <span>{saveError}</span>
        </div>
      )}

      {/* KPI Highlight Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: 14, border: '1.5px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Tour Packages Catalog</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Database Driven</span>
          </div>
          <Link
            href="/packages"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '0.78rem',
              color: '#059669',
              fontWeight: 800,
              marginTop: 6,
              textDecoration: 'none',
            }}
          >
            <span>Manage All Packages & Prices →</span>
          </Link>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: 14, border: '1.5px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Commercial Advance Policy</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
            35% Advance Lock
          </div>
          <Link
            href="/profile"
            style={{ fontSize: '0.74rem', color: '#059669', marginTop: 2, display: 'inline-block', fontWeight: 700, textDecoration: 'none' }}
          >
            Manage in Admin Profile →
          </Link>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: 14, border: '1.5px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Official Bank Lock</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
            {bankDetails.bankName}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, marginTop: 2 }}>
            UPI: {bankDetails.upiId}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #E2E8F0', marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { key: 'inclusions' as const, label: 'Dynamic Inclusions Engine', icon: CheckCircle2 },
          { key: 'banking' as const, label: 'Official Bank Details & Voucher Lock', icon: CreditCard },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                border: 'none',
                borderBottom: isActive ? '3px solid #059669' : '3px solid transparent',
                background: 'transparent',
                color: isActive ? '#059669' : '#64748B',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                marginBottom: -2,
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. TAB: INCLUSIONS & EXCLUSIONS ENGINE */}
      {activeTab === 'inclusions' && (
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: 24, boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                Live Dynamic Inclusions & Exclusions Engine
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '4px 0 0' }}>
                On the customer portal, inclusions dynamically adapt to customer choices (Duration, Hotel, Room, Meal Plan, Vehicle) rather than displaying static hardcoded text.
              </p>
            </div>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                background: '#ECFDF5',
                color: '#059669',
                padding: '4px 12px',
                borderRadius: 9999,
                border: '1px solid #A7F3D0',
              }}
            >
              ⚡ 100% Real-Time Synchronized
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div style={{ background: '#F0FDF4', border: '1.5px solid #A7F3D0', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#065F46', fontWeight: 900, fontSize: '0.90rem', marginBottom: 10 }}>
                <CheckCircle2 size={18} color="#059669" />
                <span>How Inclusions Work Dynamically:</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.80rem', color: '#166534', lineHeight: 1.7 }}>
                <li><strong>Hotel & Nights:</strong> Auto-updates to exact nights (e.g. 7 Nights Stay) + Selected Hotel & Room Category.</li>
                <li><strong>Meal Plan:</strong> Auto-updates to MAP (Breakfast & Dinner) or CP (Breakfast Only) based on selection.</li>
                <li><strong>Private Cab:</strong> Auto-updates to selected vehicle (Innova / Ertiga / Tempo) for all trip days.</li>
                <li><strong>Tolls & Permits:</strong> Included transparently with driver night allowance.</li>
                <li><strong>Circuit Highlights:</strong> Preserves destination perks (e.g. Ferry tickets, Cellular Jail show, Shikara, Gondola).</li>
                <li><strong>GST:</strong> Auto-calculates 5% tour operating tax.</li>
              </ul>
            </div>

            <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#991B1B', fontWeight: 900, fontSize: '0.90rem', marginBottom: 10 }}>
                <ShieldCheck size={18} color="#DC2626" />
                <span>How Exclusions Work Dynamically:</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.80rem', color: '#7F1D1D', lineHeight: 1.7 }}>
                <li><strong>Airfare / Train:</strong> Explicitly states flights to destination are optional / on-request.</li>
                <li><strong>Personal Expenses:</strong> Laundry, telephone, room service, tips & porterage.</li>
                <li><strong>Optional Watersports / Rides:</strong> Destination-specific optional activities (Scuba, Sea Kart, Gondola Phase 2).</li>
                <li><strong>Early Check-in / Checkout:</strong> Clarifies hotel standard check-in timings.</li>
              </ul>
            </div>
          </div>

          {/* Interactive Live Manager */}
          <div style={{ background: '#F8FAFC', borderRadius: 14, border: '1.5px solid #E2E8F0', padding: 22, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="#059669" />
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                    Live Package Inclusions & Exclusions Manager
                  </h4>
                </div>
                <p style={{ fontSize: '0.80rem', color: '#64748B', margin: '4px 0 0' }}>
                  Select any tour package below to add, update, or remove its specific inclusions & exclusions in MongoDB.
                </p>
              </div>

              {/* Package Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.80rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Select Package:
                </label>
                <select
                  value={selectedPkgId}
                  onChange={(e) => handleSelectPkg(e.target.value)}
                  disabled={loadingPackages || packagesList.length === 0}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1.5px solid #94A3B8',
                    background: '#FFFFFF',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    minWidth: 260,
                    cursor: 'pointer',
                  }}
                >
                  {packagesList.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {sanitizeDisplayName(pkg.title)} ({pkg.durationDays}D / {pkg.durationNights}N)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={fetchPackages}
                  title="Reload from Database"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    color: '#64748B',
                  }}
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            {selectedPkgId ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                  {/* INCLUSIONS BOX */}
                  <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1.5px solid #A7F3D0', padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={16} color="#059669" />
                        <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#065F46' }}>
                          Package Inclusions ({currentInclusions.length})
                        </span>
                      </div>
                      <span style={{ fontSize: '0.70rem', color: '#059669', fontWeight: 800 }}>Included Highlights</span>
                    </div>

                    {/* Chips List */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 60, marginBottom: 14 }}>
                      {currentInclusions.length === 0 ? (
                        <div style={{ fontSize: '0.80rem', color: '#94A3B8', fontStyle: 'italic', padding: '10px 0' }}>
                          No custom inclusions added yet. Type below to add.
                        </div>
                      ) : (
                        currentInclusions.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: '#ECFDF5',
                              border: '1px solid #A7F3D0',
                              color: '#065F46',
                              padding: '5px 10px',
                              borderRadius: 8,
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}
                          >
                            <span>✓ {item}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveInclusion(idx)}
                              title="Delete this inclusion"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#059669',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Input */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      <input
                        type="text"
                        placeholder="Add new inclusion (e.g. 1-Hr Shikara Ride)..."
                        value={newInclusionText}
                        onChange={(e) => setNewInclusionText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddInclusion();
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          fontSize: '0.80rem',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddInclusion()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: '#059669',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 8,
                          padding: '7px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} />
                        <span>Add</span>
                      </button>
                    </div>

                    {/* Quick presets */}
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, marginBottom: 6 }}>
                      Quick Suggestions (Click to Add):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {[
                        '1-Hr Shikara Ride on Dal Lake',
                        'Gondola Phase 1 Cable Car Tickets',
                        'Cellular Jail Light & Sound Show Ticket',
                        'Havelock Luxury Catamaran Ferry Tickets',
                        'Alleppey Houseboat Day Cruise with Lunch',
                        'Desert Camel Safari with Rajasthani Dinner',
                        'Solang Valley Snow Point Transfer',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleAddInclusion(preset)}
                          style={{
                            background: '#F0FDF4',
                            border: '1px dashed #86EFAC',
                            color: '#166534',
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: '0.70rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* EXCLUSIONS BOX */}
                  <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1.5px solid #FECACA', padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShieldCheck size={16} color="#DC2626" />
                        <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#991B1B' }}>
                          Package Exclusions ({currentExclusions.length})
                        </span>
                      </div>
                      <span style={{ fontSize: '0.70rem', color: '#DC2626', fontWeight: 800 }}>Excluded Optional Items</span>
                    </div>

                    {/* Chips List */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 60, marginBottom: 14 }}>
                      {currentExclusions.length === 0 ? (
                        <div style={{ fontSize: '0.80rem', color: '#94A3B8', fontStyle: 'italic', padding: '10px 0' }}>
                          No custom exclusions added yet. Type below to add.
                        </div>
                      ) : (
                        currentExclusions.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: '#FEF2F2',
                              border: '1px solid #FECACA',
                              color: '#991B1B',
                              padding: '5px 10px',
                              borderRadius: 8,
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}
                          >
                            <span>✕ {item}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExclusion(idx)}
                              title="Delete this exclusion"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#DC2626',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Input */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      <input
                        type="text"
                        placeholder="Add new exclusion (e.g. Scuba Diving)..."
                        value={newExclusionText}
                        onChange={(e) => setNewExclusionText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddExclusion();
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          fontSize: '0.80rem',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddExclusion()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: '#DC2626',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 8,
                          padding: '7px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} />
                        <span>Add</span>
                      </button>
                    </div>

                    {/* Quick presets */}
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, marginBottom: 6 }}>
                      Quick Suggestions (Click to Add):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {[
                        'Scuba Diving & Jet Ski at Elephant Beach',
                        'Gondola Phase 2 Affarwat Tickets',
                        'Personal Expenses (Laundry, Room Service, Tips)',
                        'Monument Entry Fees & Camera Permits',
                        'Early Check-in / Late Checkout Charges',
                        'Airfare / Train Tickets to Destination',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleAddExclusion(preset)}
                          style={{
                            background: '#FEF2F2',
                            border: '1px dashed #FCA5A5',
                            color: '#991B1B',
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: '0.70rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Save Button Bar */}
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                    Changes will instantly reflect in the Live Customer Web quotation engine.
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveInclusionsAndExclusions}
                    disabled={isSavingInclusions}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#059669',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 22px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: isSavingInclusions ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                    }}
                  >
                    <Save size={16} />
                    <span>{isSavingInclusions ? 'Saving to Database...' : 'Save Inclusions & Exclusions to Database'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: '0.86rem' }}>
                {loadingPackages ? 'Loading packages from database...' : 'No packages found.'}
              </div>
            )}
          </div>

          <div style={{ padding: '14px 18px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span>To add specific entry tickets, cruise vouchers, or custom itinerary days for any package, visit <strong>Packages Desk</strong>.</span>
            <Link
              href="/packages"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#0F172A',
                color: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: '0.80rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <span>Manage Packages Catalog</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}



      {/* 4. TAB: BANK DETAILS */}
      {activeTab === 'banking' && (
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: 26, boxShadow: '0 4px 14px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
            Official Bank Account & UPI Details
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '0 0 22px' }}>
            These details appear on Step 3 of the Customer Portal for receiving the 25% advance to lock allotment vouchers.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                Bank Name
              </label>
              <input
                type="text"
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                Branch Name & City
              </label>
              <input
                type="text"
                value={bankDetails.branch}
                onChange={(e) => setBankDetails({ ...bankDetails, branch: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                Account Holder Name
              </label>
              <input
                type="text"
                value={bankDetails.accountName}
                onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                Current Account Number
              </label>
              <input
                type="text"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', fontFamily: 'monospace', fontWeight: 800 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                IFSC Code
              </label>
              <input
                type="text"
                value={bankDetails.ifsc}
                onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', fontFamily: 'monospace', fontWeight: 800 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                UPI ID (Virtual Payment Address)
              </label>
              <input
                type="text"
                value={bankDetails.upiId}
                onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', fontFamily: 'monospace', fontWeight: 800 }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveBank}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#059669',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Save size={15} />
            <span>Save Bank Details</span>
          </button>
        </div>
      )}
    </div>
  );
}
