'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Compass,
  Plus,
  Search,
  Calendar,
  MapPin,
  Trash2,
  AlertCircle,
  Eye,
  Check,
  CheckCircle2,
  X,
  Edit2,
  RefreshCw,
  Utensils,
  Car,
  Clock,
  ShieldAlert,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  DestinationDto,
  ItineraryDayDto,
  MealPlan,
  TourPackageDto,
  VehicleCategory,
} from '@chirag/types';
import { apiRequest } from '@/lib/api';
import { Pagination } from '@/components/Pagination';
import { sanitizeDisplayName } from '@/lib/labels';
import { SearchableSelect } from '@/components/SearchableSelect';

const MEAL_PLANS: MealPlan[] = ['RO', 'CP', 'MAP', 'AP'];
const VEHICLE_CATEGORIES: VehicleCategory[] = [
  'HATCHBACK',
  'SEDAN',
  'SUV',
  'PREMIUM_SUV',
  'TEMPO_TRAVELLER',
  'BUS',
];

export default function PackagesPage() {
  const [packages, setPackages] = useState<TourPackageDto[]>([]);
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Create Package Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [durationNights, setDurationNights] = useState(4);
  const [durationDays, setDurationDays] = useState(5);
  const [startingPrice, setStartingPrice] = useState<number>(18999);
  const [b2bStartingPrice, setB2bStartingPrice] = useState<number>(16500);
  const [overview, setOverview] = useState('');
  const [defaultMealPlan, setDefaultMealPlan] = useState<MealPlan>('MAP');
  const [defaultVehicle, setDefaultVehicle] = useState<VehicleCategory>('SEDAN');
  const [itineraryDays, setItineraryDays] = useState<ItineraryDayDto[]>([
    {
      dayNumber: 1,
      title: 'Arrival & Welcome',
      description: 'Arrive at destination airport / railway station. Private transfer to hotel.',
      nightStayDestination: 'Main City',
      mealsIncluded: ['Dinner'],
      activities: ['Local market exploration'],
    },
    {
      dayNumber: 2,
      title: 'Full Day Sightseeing',
      description: 'Breakfast at hotel followed by comprehensive guided circuit tour.',
      nightStayDestination: 'Main City',
      mealsIncluded: ['Breakfast', 'Dinner'],
      activities: ['Monument visits', 'Scenic viewpoint'],
    },
  ]);

  // Edit Package Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDestinationId, setEditDestinationId] = useState('');
  const [editDurationNights, setEditDurationNights] = useState(4);
  const [editDurationDays, setEditDurationDays] = useState(5);
  const [editStartingPrice, setEditStartingPrice] = useState<number>(0);
  const [editB2bStartingPrice, setEditB2bStartingPrice] = useState<number>(0);
  const [editOverview, setEditOverview] = useState('');
  const [editDefaultMealPlan, setEditDefaultMealPlan] = useState<MealPlan>('MAP');
  const [editDefaultVehicle, setEditDefaultVehicle] = useState<VehicleCategory>('SEDAN');
  const [editInclusions, setEditInclusions] = useState<string[]>([]);
  const [editExclusions, setEditExclusions] = useState<string[]>([]);
  const [editItineraryDays, setEditItineraryDays] = useState<ItineraryDayDto[]>([]);

  // View Detailed Itinerary Modal State
  const [viewingPackage, setViewingPackage] = useState<TourPackageDto | null>(null);

  // Status Change Confirmation Modal State
  const [confirmToggleModal, setConfirmToggleModal] = useState<{
    pkg: TourPackageDto;
    targetPublished: boolean;
  } | null>(null);

  // Submitting States
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pkgData, destData] = await Promise.all([
        apiRequest<TourPackageDto[]>(`packages?limit=100&_t=${Date.now()}`),
        apiRequest<DestinationDto[]>(`destinations?limit=100&_t=${Date.now()}`),
      ]);

      const dList = Array.isArray(destData) ? destData : [];
      setPackages(Array.isArray(pkgData) ? pkgData : []);
      setDestinations(dList);

      if (dList.length > 0 && !destinationId) {
        setDestinationId(dList[0]!.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tour packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const cleanTitle = sanitizeDisplayName(pkg.title);
        const matchesTitle = pkg.title.toLowerCase().includes(q) || cleanTitle.toLowerCase().includes(q);
        const matchesSlug = pkg.slug.toLowerCase().includes(q);
        const matchesOverview = pkg.overview?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSlug && !matchesOverview) return false;
      }
      if (destFilter && pkg.destinationId !== destFilter) {
        return false;
      }
      if (statusFilter) {
        if (statusFilter === 'published' && !pkg.isPublished) return false;
        if (statusFilter === 'draft' && pkg.isPublished) return false;
      }
      return true;
    });
  }, [packages, search, destFilter, statusFilter]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, destFilter, statusFilter]);

  const paginatedPackages = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPackages.slice(start, start + pageSize);
  }, [filteredPackages, currentPage, pageSize]);

  // Helper functions for create day items
  const addItineraryDay = () => {
    const nextDayNum = itineraryDays.length + 1;
    setItineraryDays([
      ...itineraryDays,
      {
        dayNumber: nextDayNum,
        title: `Day ${nextDayNum} Excursion`,
        description: 'Guided excursion and relaxation.',
        nightStayDestination: 'City',
        mealsIncluded: ['Breakfast'],
        activities: [],
      },
    ]);
  };

  const removeItineraryDay = (index: number) => {
    if (itineraryDays.length <= 1) return;
    const updated = itineraryDays.filter((_, i) => i !== index);
    setItineraryDays(updated.map((d, i) => ({ ...d, dayNumber: i + 1 })));
  };

  const updateItineraryDay = (index: number, field: keyof ItineraryDayDto, val: any) => {
    const updated = [...itineraryDays];
    updated[index] = { ...updated[index]!, [field]: val };
    setItineraryDays(updated);
  };

  // Helper functions for edit day items
  const addEditItineraryDay = () => {
    const nextDayNum = editItineraryDays.length + 1;
    setEditItineraryDays([
      ...editItineraryDays,
      {
        dayNumber: nextDayNum,
        title: `Day ${nextDayNum} Excursion`,
        description: 'Guided excursion and relaxation.',
        nightStayDestination: 'City',
        mealsIncluded: ['Breakfast'],
        activities: [],
      },
    ]);
  };

  const removeEditItineraryDay = (index: number) => {
    if (editItineraryDays.length <= 1) return;
    const updated = editItineraryDays.filter((_, i) => i !== index);
    setEditItineraryDays(updated.map((d, i) => ({ ...d, dayNumber: i + 1 })));
  };

  const updateEditItineraryDay = (index: number, field: keyof ItineraryDayDto, val: any) => {
    const updated = [...editItineraryDays];
    updated[index] = { ...updated[index]!, [field]: val };
    setEditItineraryDays(updated);
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    const inclusions: string[] = [];
    const exclusions: string[] = [];

    try {
      await apiRequest('packages', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          destinationId,
          durationNights: Number(durationNights),
          durationDays: Number(durationDays),
          startingPrice: Number(startingPrice),
          b2bStartingPrice: Number(b2bStartingPrice),
          overview: overview.trim() || undefined,
          defaultMealPlan,
          defaultVehicleCategory: defaultVehicle,
          dayWiseItinerary: itineraryDays,
          inclusions,
          exclusions,
          isPublished: true,
        }),
      });

      setToastMessage(`Tour Package "${title}" created successfully`);
      setIsCreateModalOpen(false);
      setTitle('');
      setOverview('');
      fetchData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create tour package');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (pkg: TourPackageDto) => {
    setEditingPkgId(pkg.id);
    setEditTitle(sanitizeDisplayName(pkg.title));
    setEditDestinationId(pkg.destinationId);
    setEditDurationNights(pkg.durationNights);
    setEditDurationDays(pkg.durationDays);
    setEditStartingPrice(pkg.startingPrice || 0);
    setEditB2bStartingPrice(pkg.b2bStartingPrice || Math.round((pkg.startingPrice || 0) * 0.88));
    setEditOverview(pkg.overview || '');
    setEditDefaultMealPlan(pkg.defaultMealPlan || 'MAP');
    setEditDefaultVehicle(pkg.defaultVehicleCategory || 'SEDAN');
    setEditInclusions(pkg.inclusions || []);
    setEditExclusions(pkg.exclusions || []);
    setEditItineraryDays(
      pkg.dayWiseItinerary && pkg.dayWiseItinerary.length > 0
        ? JSON.parse(JSON.stringify(pkg.dayWiseItinerary))
        : [
            {
              dayNumber: 1,
              title: 'Arrival & Welcome',
              description: 'Arrival and hotel check-in.',
              nightStayDestination: 'Main City',
              mealsIncluded: ['Dinner'],
              activities: [],
            },
          ]
    );
    setModalError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPkgId) return;

    setSubmitting(true);
    setModalError(null);

    const inclusions = editInclusions;
    const exclusions = editExclusions;

    try {
      await apiRequest(`packages/${editingPkgId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle.trim(),
          destinationId: editDestinationId,
          durationNights: Number(editDurationNights),
          durationDays: Number(editDurationDays),
          startingPrice: Number(editStartingPrice),
          b2bStartingPrice: Number(editB2bStartingPrice),
          overview: editOverview.trim() || undefined,
          defaultMealPlan: editDefaultMealPlan,
          defaultVehicleCategory: editDefaultVehicle,
          dayWiseItinerary: editItineraryDays,
          inclusions,
          exclusions,
        }),
      });

      setToastMessage(`Package "${editTitle}" updated successfully`);
      setIsEditModalOpen(false);
      setEditingPkgId(null);
      fetchData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to update tour package');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteTogglePublish = async () => {
    if (!confirmToggleModal) return;
    const { pkg, targetPublished } = confirmToggleModal;
    setSubmitting(true);

    // Optimistically update local state immediately
    setPackages((prev) =>
      prev.map((p) => (p.id === pkg.id ? { ...p, isPublished: targetPublished } : p))
    );

    try {
      await apiRequest(`packages/${pkg.id}/publish`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: targetPublished }),
      });
      setToastMessage(
        `Package "${sanitizeDisplayName(pkg.title)}" is now ${targetPublished ? 'Published' : 'Unpublished (Draft)'}`
      );
      setConfirmToggleModal(null);
      fetchData();
    } catch (err: any) {
      // Revert on failure
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, isPublished: !targetPublished } : p))
      );
      setToastMessage(`Error toggling publish status: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="brand-badge">HOLIDAY PACKAGES</div>
          <h1 className="page-title">Tour Packages Catalog</h1>
          <p className="page-subtitle">
            Curated holiday itineraries, day-wise sightseeing plans, inclusions, and starting package prices.
          </p>
        </div>
        <button
          id="btn-create-package"
          onClick={() => {
            setModalError(null);
            setIsCreateModalOpen(true);
          }}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          <span>Create Package</span>
        </button>
      </div>

      {toastMessage && (
        <div className="toast toast-success" onAnimationEnd={() => setTimeout(() => setToastMessage(null), 3000)}>
          {toastMessage}
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search packages by title, overview, or slug..."
                className="form-input"
                style={{ paddingLeft: '36px', height: '38px', fontSize: '13.5px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ flex: '0 1 230px' }}>
              <SearchableSelect
                options={[
                  { value: '', label: 'All Destinations' },
                  ...destinations.map((d) => ({
                    value: d.id,
                    label: sanitizeDisplayName(d.name),
                    subLabel: d.region,
                  })),
                ]}
                value={destFilter}
                onChange={(val) => setDestFilter(val)}
                placeholder="All Destinations"
                searchPlaceholder="Search destination (type letter to jump)..."
                clearable
              />
            </div>

            <select
              className="form-select"
              style={{ flex: '0 1 150px', height: '38px', fontSize: '13.5px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="published">Published Only</option>
              <option value="draft">Draft Only</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                setSearch('');
                setDestFilter('');
                setStatusFilter('');
                fetchData();
              }}
              className="btn btn-secondary btn-sm"
              style={{ height: '38px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Reset all filters"
            >
              <RefreshCw size={14} />
              <span>Reset</span>
            </button>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Showing <strong>{filteredPackages.length}</strong> of <strong>{packages.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Package List Container */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Package Title</th>
                  <th>Destination</th>
                  <th>Duration</th>
                  <th>Meal & Vehicle Defaults</th>
                  <th>Starting Price</th>
                  <th>Itinerary Days</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((idx) => (
                  <tr key={idx} className="skeleton-table-row">
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div className="skeleton" style={{ width: '160px', height: '16px', borderRadius: '4px' }} />
                        <div className="skeleton" style={{ width: '110px', height: '12px', borderRadius: '4px' }} />
                      </div>
                    </td>
                    <td><div className="skeleton" style={{ width: '100px', height: '15px', borderRadius: '4px' }} /></td>
                    <td><div className="skeleton skeleton-pill" style={{ width: '75px', height: '22px' }} /></td>
                    <td><div className="skeleton" style={{ width: '130px', height: '14px', borderRadius: '4px' }} /></td>
                    <td><div className="skeleton" style={{ width: '85px', height: '18px', borderRadius: '5px' }} /></td>
                    <td><div className="skeleton skeleton-pill" style={{ width: '65px', height: '22px' }} /></td>
                    <td><div className="skeleton skeleton-pill" style={{ width: '55px', height: '22px' }} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <div className="skeleton" style={{ width: '60px', height: '28px', borderRadius: '6px' }} />
                        <div className="skeleton" style={{ width: '65px', height: '28px', borderRadius: '6px' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div className="state-box">
            <AlertCircle size={36} color="#f43f5e" />
            <div className="state-title" style={{ color: '#fb7185' }}>Error Loading Packages</div>
            <div className="state-desc">{error}</div>
            <button onClick={fetchData} className="btn btn-secondary btn-sm" style={{ marginTop: '10px' }}>
              Retry
            </button>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="state-box">
            <Compass size={40} color="#64748b" />
            <div className="state-title">
              {search || destFilter || statusFilter ? 'No Matching Packages Found' : 'No Tour Packages Built Yet'}
            </div>
            <div className="state-desc">
              {search || destFilter || statusFilter
                ? 'Try adjusting your search criteria or resetting filters.'
                : 'Create prebuilt holiday packages with day-wise itineraries for sales agents.'}
            </div>
            {!search && !destFilter && !statusFilter && (
              <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary btn-sm" style={{ marginTop: '10px' }}>
                Create First Package
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block table-container" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Package Title</th>
                    <th>Destination</th>
                    <th>Duration</th>
                    <th>Meal & Vehicle Defaults</th>
                    <th>Dual Rate Sheet</th>
                    <th>Itinerary Days</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPackages.map((pkg) => {
                    const dest = destinations.find((d) => d.id === pkg.destinationId);
                    const destName = sanitizeDisplayName(dest?.name || pkg.destinationName || 'Destination');

                    return (
                      <tr key={pkg.id}>
                        <td>
                          <strong style={{ color: '#0f172a', fontSize: '14px', fontWeight: 700 }}>
                            {sanitizeDisplayName(pkg.title)}
                          </strong>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            /{pkg.slug.replace(/-\d{10,}$/, '')}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#f0fdfa',
                              color: '#0f766e',
                              border: '1px solid #ccfbf1',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                          >
                            <MapPin size={12} />
                            <span>{destName}</span>
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                            {pkg.durationNights}N / {pkg.durationDays}D
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <span className="badge badge-regular">{pkg.defaultMealPlan === 'RO' ? 'EP' : (pkg.defaultMealPlan || 'MAP')}</span>
                            <span className="badge badge-peak">{pkg.defaultVehicleCategory || 'SEDAN'}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '1px 5px', borderRadius: '4px' }}>
                                B2C MRP
                              </span>
                              <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                                ₹{pkg.startingPrice ? pkg.startingPrice.toLocaleString('en-IN') : 'N/A'}
                              </strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '1px 5px', borderRadius: '4px' }}>
                                B2B NET
                              </span>
                              <strong style={{ fontSize: '12px', color: '#0369a1' }}>
                                ₹{(pkg.b2bStartingPrice || Math.round((pkg.startingPrice || 0) * 0.88)).toLocaleString('en-IN')}
                              </strong>
                            </div>
                            <div style={{ fontSize: '10px', color: '#15803d', fontWeight: 600 }}>
                              Margin: ₹{Math.max(0, (pkg.startingPrice || 0) - (pkg.b2bStartingPrice || Math.round((pkg.startingPrice || 0) * 0.88))).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => setViewingPackage(pkg)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: 'var(--primary)',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              padding: 0,
                            }}
                            title="View Itinerary Days"
                          >
                            <Eye size={13} />
                            <span>{pkg.dayWiseItinerary?.length || 0} Days Plan</span>
                          </button>
                        </td>
                        <td>
                          <span className={`badge ${pkg.isPublished ? 'badge-active' : 'badge-inactive'}`}>
                            {pkg.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => openEditModal(pkg)}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px' }}
                              title="Edit Tour Package"
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() =>
                                setConfirmToggleModal({
                                  pkg,
                                  targetPublished: !pkg.isPublished,
                                })
                              }
                              className={`btn btn-sm ${pkg.isPublished ? 'btn-secondary' : 'btn-primary'}`}
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                            >
                              {pkg.isPublished ? 'Unpublish' : 'Publish'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Card View (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {paginatedPackages.map((pkg) => {
                const dest = destinations.find((d) => d.id === pkg.destinationId);
                const destName = sanitizeDisplayName(dest?.name || pkg.destinationName || 'Destination');

                return (
                  <div key={pkg.id} style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                          {sanitizeDisplayName(pkg.title)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} color="#0f766e" />
                          <span>{destName}</span>
                          <span>•</span>
                          <span>{pkg.durationNights}N / {pkg.durationDays}D</span>
                        </div>
                      </div>
                      <span className={`badge ${pkg.isPublished ? 'badge-active' : 'badge-inactive'}`}>
                        {pkg.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0 12px 0' }}>
                      <span className="badge badge-regular">{pkg.defaultMealPlan === 'RO' ? 'EP' : (pkg.defaultMealPlan || 'MAP')}</span>
                      <span className="badge badge-peak">{pkg.defaultVehicleCategory || 'SEDAN'}</span>
                      <span style={{ fontSize: '11.5px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                        B2C MRP: ₹{pkg.startingPrice ? pkg.startingPrice.toLocaleString('en-IN') : 'N/A'}
                      </span>
                      <span style={{ fontSize: '11.5px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                        B2B Net: ₹{(pkg.b2bStartingPrice || Math.round((pkg.startingPrice || 0) * 0.88)).toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b', padding: '2px 6px' }}>
                        {pkg.dayWiseItinerary?.length || 0} Days Itinerary
                      </span>
                    </div>

                    {pkg.overview && (
                      <p style={{ fontSize: '12.5px', color: '#475569', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                        {pkg.overview}
                      </p>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        onClick={() => setViewingPackage(pkg)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                      >
                        <Eye size={12} />
                        <span>View Plan</span>
                      </button>
                      <button
                        onClick={() => openEditModal(pkg)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() =>
                          setConfirmToggleModal({
                            pkg,
                            targetPublished: !pkg.isPublished,
                          })
                        }
                        className={`btn btn-sm ${pkg.isPublished ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ fontSize: '12px' }}
                      >
                        {pkg.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {filteredPackages.length > 0 && (
              <div style={{ padding: '12px 20px', borderTop: '1.5px solid var(--border-subtle)' }}>
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredPackages.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  itemName="packages"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL 1: Create Tour Package Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={20} color="#0d9488" />
                  <span>Create Prebuilt Tour Package</span>
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  Curate day-wise itineraries, inclusions, and default vehicle & meal pricing for sales reps.
                </p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="modal-close">×</button>
            </div>

            <form onSubmit={handleCreatePackage}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '24px' }}>
                {modalError && (
                  <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Section 1: Core Package Details */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    1. Package Essentials & Routing
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Package Title *</label>
                      <input
                        id="pkg-input-title"
                        type="text"
                        required
                        placeholder="e.g. Kashmir Paradise Explorer 5D/4N"
                        className="form-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Primary Destination *</label>
                      <SearchableSelect
                        id="pkg-select-destination"
                        options={destinations.map((d) => ({
                          value: d.id,
                          label: sanitizeDisplayName(d.name),
                          subLabel: `${d.region} • ${d.state}`,
                        }))}
                        value={destinationId}
                        onChange={(val) => setDestinationId(val)}
                        placeholder="Select destination..."
                        searchPlaceholder="Type destination name or state..."
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Duration Nights *</label>
                      <input
                        id="pkg-input-nights"
                        type="number"
                        min="1"
                        required
                        className="form-input"
                        value={durationNights}
                        onChange={(e) => setDurationNights(Number(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Duration Days *</label>
                      <input
                        id="pkg-input-days"
                        type="number"
                        min="1"
                        required
                        className="form-input"
                        value={durationDays}
                        onChange={(e) => setDurationDays(Number(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Customer MRP Starting Price (₹)</label>
                      <input
                        id="pkg-input-price"
                        type="number"
                        min="0"
                        className="form-input"
                        value={startingPrice}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setStartingPrice(val);
                          if (!b2bStartingPrice || b2bStartingPrice === 16500) {
                            setB2bStartingPrice(Math.round(val * 0.88));
                          }
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#0369a1' }}>B2B Agent Wholesale Net (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        value={b2bStartingPrice}
                        onChange={(e) => setB2bStartingPrice(Number(e.target.value))}
                        placeholder="Fixed net for B2B agents"
                      />
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                        Agent Margin: ₹{Math.max(0, startingPrice - b2bStartingPrice).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Vehicle & Meal Defaults */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    2. Hospitality & Experience Overview
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Default Meal Plan</label>
                      <select
                        className="form-select"
                        value={defaultMealPlan}
                        onChange={(e) => setDefaultMealPlan(e.target.value as MealPlan)}
                      >
                        {MEAL_PLANS.map((m) => (
                          <option key={m} value={m}>{m === 'RO' ? 'EP' : m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Default Vehicle Category</label>
                      <select
                        className="form-select"
                        value={defaultVehicle}
                        onChange={(e) => setDefaultVehicle(e.target.value as VehicleCategory)}
                      >
                        {VEHICLE_CATEGORIES.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label className="form-label">Package Overview</label>
                    <textarea
                      rows={2}
                      className="form-textarea"
                      placeholder="Short description highlighting key attractions and unique experiences..."
                      value={overview}
                      onChange={(e) => setOverview(e.target.value)}
                    />
                  </div>
                </div>

                {/* Section 3: Day-Wise Itinerary Plan */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        3. Day-Wise Itinerary Plan ({itineraryDays.length} Days)
                      </div>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
                        Organize daily schedule, sightseeing spots, and night stays
                      </p>
                    </div>
                    <button type="button" onClick={addItineraryDay} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Plus size={14} />
                      <span>Add Day</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                    {itineraryDays.map((day, idx) => (
                      <div key={idx} style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', background: '#f1f5f9', padding: '3px 10px', borderRadius: '6px' }}>
                            Day {day.dayNumber}
                          </span>
                          {itineraryDays.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItineraryDay(idx)}
                              style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Trash2 size={13} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                        <div className="form-row" style={{ marginBottom: '10px' }}>
                          <input
                            type="text"
                            required
                            placeholder="Day Title (e.g. Arrival in Srinagar)"
                            className="form-input"
                            value={day.title}
                            onChange={(e) => updateItineraryDay(idx, 'title', e.target.value)}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Night Stay Location (e.g. Dal Lake Houseboat)"
                            className="form-input"
                            value={day.nightStayDestination}
                            onChange={(e) => updateItineraryDay(idx, 'nightStayDestination', e.target.value)}
                          />
                        </div>
                        <textarea
                          rows={2}
                          required
                          placeholder="Day description and schedule details..."
                          className="form-textarea"
                          value={day.description}
                          onChange={(e) => updateItineraryDay(idx, 'description', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dynamic Inclusions & Exclusions Managed Centrally */}
                <div style={{ background: '#f0fdf4', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color="#059669" />
                      <span>Dynamic Inclusions & Exclusions Engine</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>
                      Inclusions & Exclusions for all packages are managed directly via <strong>Customer Portal Settings</strong> sidebar.
                    </div>
                  </div>
                  <Link
                    href="/customer-settings"
                    target="_blank"
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Manage on Customer Settings →
                  </Link>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button id="pkg-btn-submit" type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Tour Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Tour Package Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit2 size={18} color="#0d9488" />
                  <span>Edit Tour Package</span>
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  Update itinerary routing, night stay stops, meal/vehicle defaults, and package inclusions.
                </p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="modal-close">×</button>
            </div>

            <form onSubmit={handleUpdatePackage}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '24px' }}>
                {modalError && (
                  <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Section 1: Core Package Details */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    1. Package Essentials & Routing
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Package Title *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Primary Destination *</label>
                      <SearchableSelect
                        options={destinations.map((d) => ({
                          value: d.id,
                          label: `${sanitizeDisplayName(d.name)} (${d.region})`,
                          subLabel: d.region,
                        }))}
                        value={editDestinationId}
                        onChange={(val) => setEditDestinationId(val)}
                        placeholder="Choose Destination..."
                        searchPlaceholder="Search destination (type letter to jump)..."
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Duration Nights *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        className="form-input"
                        value={editDurationNights}
                        onChange={(e) => setEditDurationNights(Number(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Duration Days *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        className="form-input"
                        value={editDurationDays}
                        onChange={(e) => setEditDurationDays(Number(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Customer MRP Starting Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        value={editStartingPrice}
                        onChange={(e) => setEditStartingPrice(Number(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#0369a1' }}>B2B Agent Wholesale Net (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        value={editB2bStartingPrice}
                        onChange={(e) => setEditB2bStartingPrice(Number(e.target.value))}
                        placeholder="Fixed net for B2B agents"
                      />
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                        Agent Margin: ₹{Math.max(0, editStartingPrice - editB2bStartingPrice).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Vehicle & Meal Defaults */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    2. Hospitality & Experience Overview
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Default Meal Plan</label>
                      <select
                        className="form-select"
                        value={editDefaultMealPlan}
                        onChange={(e) => setEditDefaultMealPlan(e.target.value as MealPlan)}
                      >
                        {MEAL_PLANS.map((m) => (
                          <option key={m} value={m}>{m === 'RO' ? 'EP' : m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Default Vehicle Category</label>
                      <select
                        className="form-select"
                        value={editDefaultVehicle}
                        onChange={(e) => setEditDefaultVehicle(e.target.value as VehicleCategory)}
                      >
                        {VEHICLE_CATEGORIES.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label className="form-label">Package Overview</label>
                    <textarea
                      rows={2}
                      className="form-textarea"
                      placeholder="Short description highlighting key attractions and unique experiences..."
                      value={editOverview}
                      onChange={(e) => setEditOverview(e.target.value)}
                    />
                  </div>
                </div>

                {/* Section 3: Day-Wise Itinerary Plan */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        3. Day-Wise Itinerary Plan ({editItineraryDays.length} Days)
                      </div>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
                        Modify day sequence, destinations, and sightseeing itineraries
                      </p>
                    </div>
                    <button type="button" onClick={addEditItineraryDay} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Plus size={14} />
                      <span>Add Day</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                    {editItineraryDays.map((day, idx) => (
                      <div key={idx} style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', background: '#f1f5f9', padding: '3px 10px', borderRadius: '6px' }}>
                            Day {day.dayNumber}
                          </span>
                          {editItineraryDays.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEditItineraryDay(idx)}
                              style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Trash2 size={13} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                        <div className="form-row" style={{ marginBottom: '10px' }}>
                          <input
                            type="text"
                            required
                            placeholder="Day Title"
                            className="form-input"
                            value={day.title}
                            onChange={(e) => updateEditItineraryDay(idx, 'title', e.target.value)}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Night Stay Location"
                            className="form-input"
                            value={day.nightStayDestination}
                            onChange={(e) => updateEditItineraryDay(idx, 'nightStayDestination', e.target.value)}
                          />
                        </div>
                        <textarea
                          rows={2}
                          required
                          placeholder="Day description..."
                          className="form-textarea"
                          value={day.description}
                          onChange={(e) => updateEditItineraryDay(idx, 'description', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dynamic Inclusions & Exclusions Managed Centrally */}
                <div style={{ background: '#f0fdf4', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color="#059669" />
                      <span>Dynamic Inclusions & Exclusions Engine</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>
                      Inclusions & Exclusions for this package are managed directly via <strong>Customer Portal Settings</strong> sidebar.
                    </div>
                  </div>
                  <Link
                    href="/customer-settings"
                    target="_blank"
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Manage on Customer Settings →
                  </Link>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: View Detailed Day-Wise Itinerary Modal */}
      {viewingPackage && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge badge-primary">{viewingPackage.durationNights}N / {viewingPackage.durationDays}D</span>
                  <span className={`badge ${viewingPackage.isPublished ? 'badge-active' : 'badge-inactive'}`}>
                    {viewingPackage.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <h3 className="modal-title">{sanitizeDisplayName(viewingPackage.title)}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Destination:{' '}
                  <strong>
                    {sanitizeDisplayName(
                      destinations.find((d) => d.id === viewingPackage.destinationId)?.name ||
                        viewingPackage.destinationName ||
                        'Destination'
                    )}
                  </strong>{' '}
                  • B2C MRP:{' '}
                  <strong style={{ color: '#047857' }}>
                    ₹{viewingPackage.startingPrice ? viewingPackage.startingPrice.toLocaleString('en-IN') : 'N/A'}
                  </strong>{' '}
                  • B2B Wholesale Net:{' '}
                  <strong style={{ color: '#0369a1' }}>
                    ₹{(viewingPackage.b2bStartingPrice || Math.round((viewingPackage.startingPrice || 0) * 0.88)).toLocaleString('en-IN')}
                  </strong>
                </p>
              </div>
              <button onClick={() => setViewingPackage(null)} className="modal-close">×</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '24px' }}>
              {viewingPackage.overview && (
                <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Overview
                  </div>
                  <p style={{ fontSize: '13.5px', color: '#334155', margin: 0, lineHeight: 1.5 }}>
                    {viewingPackage.overview}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1, background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase' }}>Default Meal Plan</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#134e4a', marginTop: '2px' }}>
                    {viewingPackage.defaultMealPlan === 'RO' ? 'EP (Room Only)' : (viewingPackage.defaultMealPlan || 'MAP (Breakfast & Dinner)')}
                  </div>
                </div>
                <div style={{ flex: 1, background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase' }}>Default Vehicle Category</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#134e4a', marginTop: '2px' }}>
                    {viewingPackage.defaultVehicleCategory || 'SEDAN'}
                  </div>
                </div>
              </div>

              {/* Day-by-day itinerary */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} color="#0d9488" />
                  <span>Day-Wise Sightseeing & Routing Schedule ({viewingPackage.dayWiseItinerary?.length || 0} Days)</span>
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(viewingPackage.dayWiseItinerary || []).map((day) => (
                    <div
                      key={day.dayNumber}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: '#0f766e', color: '#ffffff', fontSize: '12px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                            Day {day.dayNumber}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{day.title}</span>
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#475569', fontSize: '12px', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                          <MapPin size={11} />
                          <span>Night Stay: {day.nightStayDestination}</span>
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                        {day.description}
                      </p>
                      {day.mealsIncluded && day.mealsIncluded.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Meals:</span>
                          {day.mealsIncluded.map((m, mi) => (
                            <span key={mi} style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Inclusions & Exclusions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', marginBottom: '8px' }}>
                    Inclusions
                  </div>
                  {viewingPackage.inclusions && viewingPackage.inclusions.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#14532d', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {viewingPackage.inclusions.map((inc, i) => (
                        <li key={i}>{inc}</li>
                      ))}
                    </ul>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>None specified</span>
                  )}
                </div>

                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b', marginBottom: '8px' }}>
                    Exclusions
                  </div>
                  {viewingPackage.exclusions && viewingPackage.exclusions.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#7f1d1d', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {viewingPackage.exclusions.map((exc, i) => (
                        <li key={i}>{exc}</li>
                      ))}
                    </ul>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>None specified</span>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', background: '#f8fafc' }}>
              <button
                onClick={() => {
                  const pkg = viewingPackage;
                  setViewingPackage(null);
                  openEditModal(pkg);
                }}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Edit2 size={14} />
                <span>Edit Package</span>
              </button>
              <button onClick={() => setViewingPackage(null)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Branded Status Toggle Confirmation Modal */}
      {confirmToggleModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color={confirmToggleModal.targetPublished ? '#0d9488' : '#e11d48'} />
                <span>Confirm Status Change</span>
              </h3>
              <button onClick={() => setConfirmToggleModal(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to{' '}
                <strong style={{ color: confirmToggleModal.targetPublished ? '#0f766e' : '#e11d48' }}>
                  {confirmToggleModal.targetPublished ? 'publish' : 'unpublish'}
                </strong>{' '}
                the tour package <strong>&ldquo;{sanitizeDisplayName(confirmToggleModal.pkg.title)}&rdquo;</strong>?
              </p>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', color: '#64748b' }}>
                {confirmToggleModal.targetPublished ? (
                  <span>This package will immediately become visible in the catalog for sales reps creating new tour proposals.</span>
                ) : (
                  <span>
                    Unpublishing will hide this package from new sales quotations. All historical quotation snapshots, bookings, hotel vouchers, and driver duty slips will remain completely safe and untouched.
                  </span>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setConfirmToggleModal(null)}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteTogglePublish}
                className={`btn ${confirmToggleModal.targetPublished ? 'btn-primary' : 'btn-danger'}`}
                disabled={submitting}
              >
                {submitting
                  ? 'Updating...'
                  : confirmToggleModal.targetPublished
                  ? 'Confirm Publish'
                  : 'Confirm Unpublish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
