'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Edit2,
  RefreshCw,
  AlertCircle,
  Globe2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { DestinationDto, DestinationRegion } from '@chirag/types';
import { apiRequest } from '@/lib/api';
import { Pagination } from '@/components/Pagination';
import { sanitizeDisplayName } from '@/lib/labels';
import { ImageUploadWidget } from '@/components/ImageUploadWidget';

const REGIONS: DestinationRegion[] = [
  'NORTH',
  'SOUTH',
  'EAST',
  'WEST',
  'CENTRAL',
  'NORTH_EAST',
  'ISLANDS',
  'INTERNATIONAL',
];

interface ConfirmState {
  dest: DestinationDto;
  targetActive: boolean;
}

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<DestinationDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Confirmation Modal
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null);
  const [toggling, setToggling] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [region, setRegion] = useState<DestinationRegion>('NORTH');
  const [description, setDescription] = useState('');
  const [highlightsInput, setHighlightsInput] = useState('');
  const [coverImages, setCoverImages] = useState<string[]>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchDestinations = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = `destinations?page=1&limit=150&_t=${Date.now()}`;
      if (search.trim()) query += `&search=${encodeURIComponent(search.trim())}`;
      if (selectedRegion) query += `&region=${selectedRegion}`;
      if (statusFilter !== '') query += `&isActive=${statusFilter === 'true'}`;

      const data = await apiRequest<DestinationDto[]>(query);
      setDestinations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load destinations from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, [selectedRegion, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchDestinations();
  };

  const paginatedDestinations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return destinations.slice(start, start + pageSize);
  }, [destinations, currentPage, pageSize]);

  const openCreateModal = () => {
    setEditingDest(null);
    setName('');
    setSlug('');
    setState('');
    setCountry('India');
    setRegion('NORTH');
    setDescription('');
    setHighlightsInput('');
    setCoverImages([]);
    setModalError(null);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (dest: DestinationDto) => {
    setEditingDest(dest);
    setName(sanitizeDisplayName(dest.name));
    setSlug(dest.slug.replace(/-\d{10,}$/, ''));
    setState(dest.state || '');
    setCountry(dest.country || 'India');
    setRegion(dest.region);
    setDescription(dest.description || '');
    setHighlightsInput((dest.highlights || []).join(', '));
    setCoverImages(dest.coverImages || []);
    setModalError(null);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      errors.name = 'Destination name must be at least 2 characters.';
    }

    // Check duplicate name against loaded destinations (excluding currently editing record)
    const normalizedInput = trimmed.toLowerCase();
    const duplicate = destinations.find(
      (d) =>
        d.id !== editingDest?.id &&
        sanitizeDisplayName(d.name).toLowerCase() === normalizedInput
    );
    if (duplicate) {
      errors.name = `A destination named "${sanitizeDisplayName(duplicate.name)}" already exists in the system.`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setModalError(null);

    const highlights = highlightsInput
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);

    try {
      if (editingDest) {
        await apiRequest(`destinations/${editingDest.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: name.trim(),
            slug: slug.trim() || undefined,
            state: state.trim() || undefined,
            country: country.trim() || 'India',
            region,
            description: description.trim() || undefined,
            highlights,
            coverImages,
          }),
        });
        showToast(`Destination "${sanitizeDisplayName(name)}" updated successfully`);
      } else {
        await apiRequest('destinations', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            slug: slug.trim() || undefined,
            state: state.trim() || undefined,
            country: country.trim() || 'India',
            region,
            description: description.trim() || undefined,
            highlights,
            coverImages,
            isActive: true,
          }),
        });
        showToast(`Destination "${sanitizeDisplayName(name)}" created successfully`);
      }

      setIsModalOpen(false);
      fetchDestinations();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save destination');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!confirmDialog) return;
    setToggling(true);
    const targetDestId = confirmDialog.dest.id;
    const nextStatus = confirmDialog.targetActive;

    // Optimistically update local state immediately so user sees instant response
    setDestinations((prev) =>
      prev.map((d) => (d.id === targetDestId ? { ...d, isActive: nextStatus } : d))
    );

    try {
      await apiRequest(`destinations/${targetDestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextStatus }),
      });
      showToast(
        `Destination "${sanitizeDisplayName(confirmDialog.dest.name)}" marked as ${
          nextStatus ? 'Active' : 'Inactive'
        }`
      );
      setConfirmDialog(null);
      fetchDestinations();
    } catch (err: any) {
      // Revert if API call fails
      setDestinations((prev) =>
        prev.map((d) => (d.id === targetDestId ? { ...d, isActive: !nextStatus } : d))
      );
      showToast(`Error updating status: ${err.message || 'Action failed'}`);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div className="brand-badge">HOLIDAY DESTINATIONS</div>
          <h1 className="page-title">Destinations & Places</h1>
          <p className="page-subtitle">
            Manage domestic holiday places, international tour circuits, and sightseeing highlights for quotes.
          </p>
        </div>
        <button id="btn-add-destination" onClick={openCreateModal} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
          <Plus size={16} />
          <span>Add New Destination</span>
        </button>
      </div>

      {toastMessage && (
        <div className="toast toast-success" style={{ zIndex: 1200 }}>
          {toastMessage}
        </div>
      )}

      {/* Filters Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <form onSubmit={handleSearchSubmit} className="filter-bar" style={{ margin: 0, flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-subtle)' }}
            />
            <input
              type="text"
              placeholder="Search name, state or country..."
              className="search-input"
              style={{ width: '100%', paddingLeft: '36px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="select-filter"
            style={{ flex: '0 1 170px' }}
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
          >
            <option value="">All Regions</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r.replace('_', ' ')}
              </option>
            ))}
          </select>

          <select
            className="select-filter"
            style={{ flex: '0 1 150px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>
              Apply
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedRegion('');
                setStatusFilter('');
                fetchDestinations();
              }}
              className="btn btn-secondary btn-sm"
              style={{ whiteSpace: 'nowrap' }}
            >
              <RefreshCw size={13} />
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Content Table / States */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '920px' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '220px' }}>Destination Name</th>
                  <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>Slug</th>
                  <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>Region</th>
                  <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>State / Country</th>
                  <th style={{ minWidth: '200px' }}>Highlights</th>
                  <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ textAlign: 'right', minWidth: '160px', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((idx) => (
                  <tr key={idx} className="skeleton-table-row">
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div className="skeleton" style={{ width: '150px', height: '16px', borderRadius: '4px' }} />
                        <div className="skeleton" style={{ width: '220px', height: '12px', borderRadius: '4px' }} />
                      </div>
                    </td>
                    <td><div className="skeleton" style={{ width: '90px', height: '24px', borderRadius: '6px' }} /></td>
                    <td><div className="skeleton skeleton-pill" style={{ width: '85px', height: '22px' }} /></td>
                    <td><div className="skeleton" style={{ width: '110px', height: '14px', borderRadius: '4px' }} /></td>
                    <td><div className="skeleton" style={{ width: '140px', height: '20px', borderRadius: '6px' }} /></td>
                    <td><div className="skeleton skeleton-pill" style={{ width: '55px', height: '22px' }} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="skeleton" style={{ width: '110px', height: '28px', borderRadius: '6px', marginLeft: 'auto' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div className="state-box">
            <AlertCircle size={36} color="#f43f5e" />
            <div className="state-title" style={{ color: '#fb7185' }}>Error Loading Destinations</div>
            <div className="state-desc">{error}</div>
            <button onClick={fetchDestinations} className="btn btn-secondary btn-sm" style={{ marginTop: '10px' }}>
              Retry
            </button>
          </div>
        ) : destinations.length === 0 ? (
          <div className="state-box">
            <MapPin size={40} color="#64748b" />
            <div className="state-title">No Destinations Found</div>
            <div className="state-desc">
              {search || selectedRegion
                ? 'No records match your filter criteria. Try adjusting your search query.'
                : 'No destination records exist in the database yet. Click "Add Destination" to create the first one.'}
            </div>
            <button id="btn-add-destination-empty" onClick={openCreateModal} className="btn btn-primary btn-sm" style={{ marginTop: '10px' }}>
              Add Destination
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block table-container" style={{ width: '100%', overflowX: 'auto', border: 'none' }}>
              <table className="data-table" style={{ width: '100%', minWidth: '780px' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: '240px' }}>Destination & Route</th>
                    <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>Region</th>
                    <th style={{ minWidth: '180px' }}>Sightseeing Highlights</th>
                    <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ textAlign: 'right', minWidth: '160px', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDestinations.map((dest) => {
                    const cleanName = sanitizeDisplayName(dest.name);
                    const cleanSlug = dest.slug.replace(/-\d{10,}$/, '');

                    return (
                      <tr key={dest.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '14.5px' }}>{cleanName}</span>
                            <code style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}>
                              /{cleanSlug}
                            </code>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                            <span style={{ fontWeight: 600, color: '#334155' }}>
                              {dest.state ? `${dest.state}, ` : ''}{dest.country}
                            </span>
                            {dest.description && (
                              <span style={{ marginLeft: '6px' }}>• {dest.description.slice(0, 70)}...</span>
                            )}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span className="badge badge-regular" style={{ fontWeight: 700, fontSize: '11.5px' }}>
                            {dest.region.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', maxWidth: '280px' }}>
                            {(dest.highlights || []).slice(0, 2).map((h, i) => (
                              <span key={i} style={{ fontSize: '11px', background: '#f0fdfa', color: '#0f766e', border: '1px solid #ccfbf1', padding: '2px 7px', borderRadius: '6px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {h}
                              </span>
                            ))}
                            {(dest.highlights || []).length > 2 && (
                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, padding: '2px 4px' }}>
                                +{dest.highlights.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => setConfirmDialog({ dest, targetActive: !dest.isActive })}
                            className={`badge ${dest.isActive ? 'badge-active' : 'badge-inactive'}`}
                            style={{
                              cursor: 'pointer',
                              border: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              borderRadius: '9999px',
                              fontWeight: 800,
                              fontSize: '12px',
                              boxShadow: dest.isActive ? '0 1px 4px rgba(16, 185, 129, 0.2)' : '0 1px 4px rgba(239, 68, 68, 0.2)',
                            }}
                            title={`Click to ${dest.isActive ? 'Deactivate' : 'Activate'}`}
                          >
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: dest.isActive ? '#10b981' : '#ef4444' }} />
                            <span>{dest.isActive ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              onClick={() => openEditModal(dest)}
                              className="btn btn-secondary btn-sm"
                              title="Edit Destination"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => setConfirmDialog({ dest, targetActive: !dest.isActive })}
                              className={`btn btn-sm ${dest.isActive ? 'btn-danger' : 'btn-primary'}`}
                              title={dest.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {dest.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {paginatedDestinations.map((dest) => {
                const cleanName = sanitizeDisplayName(dest.name);
                const cleanSlug = dest.slug.replace(/-\d{10,}$/, '');

                return (
                  <div key={dest.id} style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{cleanName}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {dest.state ? `${dest.state}, ` : ''}{dest.country} • <span style={{ fontWeight: 600, color: '#0f766e' }}>{dest.region.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <span className={`badge ${dest.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {dest.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {dest.description && (
                      <p style={{ fontSize: '12.5px', color: '#475569', margin: '6px 0 10px 0', lineHeight: 1.4 }}>
                        {dest.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {(dest.highlights || []).map((h, i) => (
                        <span key={i} style={{ fontSize: '11px', background: '#f0fdfa', color: '#0f766e', border: '1px solid #ccfbf1', padding: '2px 7px', borderRadius: '5px', fontWeight: 600 }}>
                          {h}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                      <code style={{ fontSize: '11.5px', color: '#64748b' }}>/{cleanSlug}</code>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => openEditModal(dest)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setConfirmDialog({ dest, targetActive: !dest.isActive })}
                          className={`btn btn-sm ${dest.isActive ? 'btn-danger' : 'btn-primary'}`}
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          {dest.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {destinations.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={destinations.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemName="destinations"
              />
            )}
          </>
        )}
      </div>

      {/* Confirmation Dialog (Status Toggle) */}
      {confirmDialog && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div
            className="modal-container"
            style={{
              maxWidth: '460px',
              padding: '24px',
              borderRadius: '16px',
              background: '#ffffff',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: confirmDialog.targetActive ? '#f0fdf4' : '#fff1f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: confirmDialog.targetActive ? '#16a34a' : '#e11d48',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {confirmDialog.targetActive ? 'Activate Destination?' : 'Deactivate Destination?'}
              </h3>
            </div>

            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 18px 0' }}>
              {confirmDialog.targetActive ? (
                <>
                  Are you sure you want to activate{' '}
                  <strong>{sanitizeDisplayName(confirmDialog.dest.name)}</strong>? It will immediately become available in sales quote and holiday package builders.
                </>
              ) : (
                <>
                  Are you sure you want to deactivate{' '}
                  <strong>{sanitizeDisplayName(confirmDialog.dest.name)}</strong>? New sales quotes and holiday packages cannot be created for this destination. All existing bookings and issued quotes will preserve their historical destination references.
                </>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn btn-secondary"
                disabled={toggling}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                className={`btn ${confirmDialog.targetActive ? 'btn-primary' : 'btn-danger'}`}
                disabled={toggling}
              >
                {toggling ? 'Updating...' : confirmDialog.targetActive ? 'Confirm Activation' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Destination Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-container" style={{ maxWidth: '640px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '18px', overflow: 'hidden', background: '#ffffff' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <MapPin size={20} color="#0d9488" />
                  <span>{editingDest ? `Edit Destination: ${sanitizeDisplayName(editingDest.name)}` : 'Create New Destination'}</span>
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Configure location details, sightseeing highlights, and regional classification.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="modal-close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDestination} style={{ overflowY: 'auto', flex: 1 }}>
              <div className="modal-body" style={{ padding: '24px' }}>
                {modalError && (
                  <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Destination Name *
                    </label>
                    <input
                      id="dest-input-name"
                      type="text"
                      required
                      placeholder="e.g. Kashmir Valley, Goa, Dubai"
                      className="form-input"
                      style={{
                        width: '100%',
                        borderColor: fieldErrors.name ? '#e11d48' : undefined,
                      }}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                      }}
                    />
                    {fieldErrors.name && (
                      <span style={{ fontSize: '11.5px', color: '#e11d48', marginTop: '4px', display: 'block' }}>
                        {fieldErrors.name}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Custom Slug (Optional)
                    </label>
                    <input
                      id="dest-input-slug"
                      type="text"
                      placeholder="Auto-generated if left blank"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Region *
                    </label>
                    <select
                      id="dest-select-region"
                      className="form-select"
                      style={{ width: '100%' }}
                      value={region}
                      onChange={(e) => setRegion(e.target.value as DestinationRegion)}
                    >
                      {REGIONS.map((r) => (
                        <option key={r} value={r}>
                          {r.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      State / Province
                    </label>
                    <input
                      id="dest-input-state"
                      type="text"
                      placeholder="e.g. Jammu & Kashmir"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Country
                  </label>
                  <input
                    id="dest-input-country"
                    type="text"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Key Highlights (Comma separated)
                  </label>
                  <input
                    id="dest-input-highlights"
                    type="text"
                    placeholder="e.g. Dal Lake, Gulmarg Gondola, Pahalgam Valley"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={highlightsInput}
                    onChange={(e) => setHighlightsInput(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Overview / Description
                  </label>
                  <textarea
                    id="dest-input-description"
                    rows={3}
                    placeholder="Brief description for sales agents and customer itineraries..."
                    className="form-textarea"
                    style={{ width: '100%' }}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <ImageUploadWidget
                    label="Destination Cover Photos & Scenery"
                    images={coverImages}
                    onChange={setCoverImages}
                    category="destination"
                    helperText="Upload local photos from your device, paste URLs, or pick from curated photography."
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button id="dest-btn-submit" type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingDest ? 'Update Destination' : 'Create Destination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
