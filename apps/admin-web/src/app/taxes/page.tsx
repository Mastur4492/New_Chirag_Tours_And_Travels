'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  CheckCircle,
  AlertCircle,
  Percent,
  Globe,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  ShieldAlert,
  Info,
  Check,
  X,
  FileText,
  Calculator,
} from 'lucide-react';
import { CreateTaxConfigInput, TaxConfigDto, TaxConfigType, UpdateTaxConfigInput } from '@chirag/types';
import { apiRequest } from '@/lib/api';
import { Pagination } from '@/components/Pagination';

const TAX_TYPES: TaxConfigType[] = ['GST', 'VAT', 'CUSTOM', 'ZERO_RATED', 'EXEMPT'];

export default function TaxesPage() {
  const [taxes, setTaxes] = useState<TaxConfigDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [taxType, setTaxType] = useState<TaxConfigType>('GST');
  const [ratePercent, setRatePercent] = useState<number>(5);
  const [jurisdiction, setJurisdiction] = useState('IN');
  const [isApplicable, setIsApplicable] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [description, setDescription] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTaxType, setEditTaxType] = useState<TaxConfigType>('GST');
  const [editRatePercent, setEditRatePercent] = useState<number>(5);
  const [editJurisdiction, setEditJurisdiction] = useState('IN');
  const [editIsApplicable, setEditIsApplicable] = useState(true);
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [editIsConfirmed, setEditIsConfirmed] = useState(false);
  const [editDescription, setEditDescription] = useState('');

  // Confirmation Modal State
  const [confirmToggleModal, setConfirmToggleModal] = useState<{
    tax: TaxConfigDto;
    action: 'TOGGLE_APPLICABLE' | 'SET_DEFAULT';
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchTaxes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<TaxConfigDto[]>('taxes');
      setTaxes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load tax rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  // Filtered Taxes
  const filteredTaxes = useMemo(() => {
    return taxes.filter((tax) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = tax.name.toLowerCase().includes(q);
        const matchesJurisdiction = tax.jurisdiction.toLowerCase().includes(q);
        const matchesDesc = tax.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesJurisdiction && !matchesDesc) return false;
      }
      if (typeFilter && tax.taxType !== typeFilter) {
        return false;
      }
      if (statusFilter) {
        if (statusFilter === 'active' && !tax.isApplicable) return false;
        if (statusFilter === 'disabled' && tax.isApplicable) return false;
        if (statusFilter === 'default' && !tax.isDefault) return false;
      }
      return true;
    });
  }, [taxes, searchQuery, typeFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, statusFilter]);

  const paginatedTaxes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTaxes.slice(start, start + pageSize);
  }, [filteredTaxes, currentPage, pageSize]);

  // Default Tax Rule for sample calculation display
  const defaultRule = useMemo(() => {
    return taxes.find((t) => t.isDefault && t.isApplicable) || taxes[0];
  }, [taxes]);

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    if (ratePercent < 0 || ratePercent > 100) {
      setModalError('Rate percent must be between 0 and 100%');
      setSubmitting(false);
      return;
    }

    try {
      await apiRequest('taxes', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          taxType,
          ratePercent: Number(ratePercent),
          jurisdiction: jurisdiction.trim().toUpperCase(),
          isApplicable,
          isDefault,
          isConfirmed,
          description: description.trim() || undefined,
        } as CreateTaxConfigInput),
      });

      setToastMessage(`Tax rule "${name}" created successfully`);
      setIsCreateModalOpen(false);
      setName('');
      setDescription('');
      fetchTaxes();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create tax rule');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (tax: TaxConfigDto) => {
    setEditingTaxId(tax.id);
    setEditName(tax.name);
    setEditTaxType(tax.taxType);
    setEditRatePercent(tax.ratePercent);
    setEditJurisdiction(tax.jurisdiction);
    setEditIsApplicable(tax.isApplicable);
    setEditIsDefault(tax.isDefault);
    setEditIsConfirmed(Boolean(tax.isConfirmed));
    setEditDescription(tax.description || '');
    setModalError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaxId) return;

    setSubmitting(true);
    setModalError(null);

    if (editRatePercent < 0 || editRatePercent > 100) {
      setModalError('Rate percent must be between 0 and 100%');
      setSubmitting(false);
      return;
    }

    try {
      await apiRequest(`taxes/${editingTaxId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName.trim(),
          taxType: editTaxType,
          ratePercent: Number(editRatePercent),
          jurisdiction: editJurisdiction.trim().toUpperCase(),
          isApplicable: editIsApplicable,
          isDefault: editIsDefault,
          isConfirmed: editIsConfirmed,
          description: editDescription.trim() || undefined,
        } as UpdateTaxConfigInput),
      });

      setToastMessage(`Tax rule "${editName}" updated successfully`);
      setIsEditModalOpen(false);
      setEditingTaxId(null);
      fetchTaxes();
    } catch (err: any) {
      setModalError(err.message || 'Failed to update tax rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteToggle = async () => {
    if (!confirmToggleModal) return;
    const { tax, action } = confirmToggleModal;
    setSubmitting(true);

    try {
      if (action === 'TOGGLE_APPLICABLE') {
        await apiRequest(`taxes/${tax.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ isApplicable: !tax.isApplicable }),
        });
        setToastMessage(`Rule "${tax.name}" is now ${!tax.isApplicable ? 'Active' : 'Disabled'}`);
      } else if (action === 'SET_DEFAULT') {
        await apiRequest(`taxes/${tax.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ isDefault: true, isApplicable: true }),
        });
        setToastMessage(`Rule "${tax.name}" is now the Default Quotation Rule`);
      }
      setConfirmToggleModal(null);
      fetchTaxes();
    } catch (err: any) {
      alert(`Error updating tax rule: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="brand-badge">GST & STATUTORY TAXES</div>
          <h1 className="page-title">GST & Tax Configuration</h1>
          <p className="page-subtitle">
            Configure statutory GST rates applied to customer tour quotations via the centralized pricing engine.
          </p>
        </div>
        <button
          onClick={() => {
            setName('');
            setRatePercent(5);
            setJurisdiction('IN');
            setIsApplicable(true);
            setIsDefault(false);
            setDescription('');
            setModalError(null);
            setIsCreateModalOpen(true);
          }}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          <span>Add Tax Rule</span>
        </button>
      </div>

      {toastMessage && (
        <div className="toast toast-success" onAnimationEnd={() => setTimeout(() => setToastMessage(null), 3000)}>
          {toastMessage}
        </div>
      )}

      {/* Advisory & Legal Confirmation Banner */}
      <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '14px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#0f766e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calculator size={16} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              Server-Authoritative Pricing Engine Integration
            </div>
            <div style={{ fontSize: '12.5px', color: '#475569' }}>
              All quotation tax breakdowns and totals are calculated server-authoritatively by <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px', fontSize: '11.5px' }}>@chirag/pricing</code>. The frontend never computes ad-hoc tax figures.
            </div>
          </div>
        </div>

        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <Info size={16} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '12.5px', color: '#92400e', lineHeight: 1.5 }}>
            <strong>Pending Owner / CA Sign-Off for Faisal Bikanerwala:</strong> Under Indian GST regulations, tour packages commonly qualify for the 5% composite rate (without Input Tax Credit) or 18% standard rate if providing standalone services. Modifying rates here updates new quotations immediately, while all historical quotation snapshots and verified bookings remain immutably preserved.
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1.5px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Active Default Quotation Slab</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f766e', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Percent size={20} />
            {defaultRule ? `${defaultRule.ratePercent}% ${defaultRule.taxType}` : 'Not Configured'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {defaultRule?.name || 'Please configure a default rule'}
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1.5px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Configured Rules</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            {loading ? <div className="skeleton" style={{ width: '40px', height: '28px', borderRadius: '4px' }} /> : taxes.length}
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
            {taxes.filter((t) => t.isApplicable).length} Active & Applicable
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1.5px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Primary Tax Jurisdiction</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563eb', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={20} />
            India (IN) — GST Law
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Supports domestic & international slabs
          </div>
        </div>
      </div>

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
                placeholder="Search rule name, jurisdiction, or citation notes..."
                className="form-input"
                style={{ paddingLeft: '36px', height: '38px', fontSize: '13.5px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="form-select"
              style={{ flex: '0 1 170px', height: '38px', fontSize: '13.5px' }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Tax Types</option>
              {TAX_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              className="form-select"
              style={{ flex: '0 1 170px', height: '38px', fontSize: '13.5px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="disabled">Disabled Only</option>
              <option value="default">Default Rule Only</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('');
                setStatusFilter('');
                fetchTaxes();
              }}
              className="btn btn-secondary btn-sm"
              style={{ height: '38px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Reset all filters"
            >
              <RefreshCw size={14} />
              <span>Reset</span>
            </button>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Showing <strong>{filteredTaxes.length}</strong> of <strong>{taxes.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Rules Table / Cards */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Tax Type</th>
                  <th>Rate Percent</th>
                  <th>Jurisdiction</th>
                  <th>Default Selection</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((idx) => (
                  <tr key={idx} className="skeleton-table-row">
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div className="skeleton" style={{ width: '130px', height: '16px', borderRadius: '4px' }} />
                        <div className="skeleton" style={{ width: '180px', height: '12px', borderRadius: '4px' }} />
                      </div>
                    </td>
                    <td><div className="skeleton skeleton-pill" style={{ width: '70px', height: '22px' }} /></td>
                    <td><div className="skeleton" style={{ width: '50px', height: '22px', borderRadius: '6px' }} /></td>
                    <td><div className="skeleton" style={{ width: '90px', height: '14px', borderRadius: '4px' }} /></td>
                    <td><div className="skeleton" style={{ width: '120px', height: '18px', borderRadius: '4px' }} /></td>
                    <td><div className="skeleton skeleton-pill" style={{ width: '65px', height: '22px' }} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="skeleton" style={{ width: '80px', height: '28px', borderRadius: '6px' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div className="state-box">
            <AlertCircle size={36} color="#f43f5e" />
            <div className="state-title" style={{ color: '#fb7185' }}>Error Loading Tax Config</div>
            <div className="state-desc">{error}</div>
            <button onClick={fetchTaxes} className="btn btn-secondary btn-sm" style={{ marginTop: '10px' }}>
              Retry
            </button>
          </div>
        ) : filteredTaxes.length === 0 ? (
          <div className="state-box">
            <Receipt size={40} color="#64748b" />
            <div className="state-title">
              {searchQuery || typeFilter || statusFilter ? 'No Matching Tax Rules' : 'No Tax Rules Configured Yet'}
            </div>
            <div className="state-desc">
              {searchQuery || typeFilter || statusFilter
                ? 'Try adjusting your search query or filter selection.'
                : 'Configure Indian GST, luxury accommodation slabs, or international VAT rules.'}
            </div>
            {!searchQuery && !typeFilter && !statusFilter && (
              <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary btn-sm" style={{ marginTop: '10px' }}>
                Add Default GST Rule
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
                    <th>Rule Name</th>
                    <th>Tax Type</th>
                    <th>Rate Percent</th>
                    <th>Jurisdiction</th>
                    <th>Statutory Status</th>
                    <th>Default Status</th>
                    <th>Applicability</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTaxes.map((tax) => (
                    <tr key={tax.id}>
                      <td>
                        <strong style={{ color: '#0f172a', fontSize: '14px', fontWeight: 700 }}>{tax.name}</strong>
                        {tax.description && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{tax.description}</div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-regular">{tax.taxType}</span>
                      </td>
                      <td>
                        <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 800 }}>
                          {tax.ratePercent}%
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#334155', fontWeight: 600, fontSize: '13px' }}>{tax.jurisdiction}</span>
                      </td>
                      <td>
                        {tax.isConfirmed ? (
                          <span className="badge badge-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={12} />
                            <span>CA Confirmed</span>
                          </span>
                        ) : (
                          <span className="badge" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} />
                            <span>Pending CA Sign-off</span>
                          </span>
                        )}
                      </td>
                      <td>
                        {tax.isDefault ? (
                          <span className="badge badge-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={12} />
                            <span>Default Rule</span>
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              setConfirmToggleModal({
                                tax,
                                action: 'SET_DEFAULT',
                              })
                            }
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                            title="Set as active default quotation tax rule"
                          >
                            Set As Default
                          </button>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${tax.isApplicable ? 'badge-active' : 'badge-inactive'}`}>
                          {tax.isApplicable ? 'Applicable' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => openEditModal(tax)}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '4px 8px' }}
                            title="Edit Tax Rule"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() =>
                              setConfirmToggleModal({
                                tax,
                                action: 'TOGGLE_APPLICABLE',
                              })
                            }
                            className={`btn btn-sm ${tax.isApplicable ? 'btn-danger' : 'btn-primary'}`}
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                          >
                            {tax.isApplicable ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards View (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {paginatedTaxes.map((tax) => (
                <div key={tax.id} style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{tax.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        Jurisdiction: <strong>{tax.jurisdiction}</strong> • Type: <strong>{tax.taxType}</strong>
                      </div>
                    </div>
                    <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 800 }}>
                      {tax.ratePercent}%
                    </span>
                  </div>

                  {tax.description && (
                    <p style={{ fontSize: '12.5px', color: '#475569', margin: '4px 0 10px 0', lineHeight: 1.4 }}>
                      {tax.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginBottom: '10px' }}>
                    <span className={`badge ${tax.isApplicable ? 'badge-active' : 'badge-inactive'}`}>
                      {tax.isApplicable ? 'Applicable' : 'Disabled'}
                    </span>
                    {tax.isDefault ? (
                      <span className="badge badge-active">Default Rule</span>
                    ) : (
                      <button
                        onClick={() =>
                          setConfirmToggleModal({
                            tax,
                            action: 'SET_DEFAULT',
                          })
                        }
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', padding: '2px 8px' }}
                      >
                        Make Default
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => openEditModal(tax)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() =>
                        setConfirmToggleModal({
                          tax,
                          action: 'TOGGLE_APPLICABLE',
                        })
                      }
                      className={`btn btn-sm ${tax.isApplicable ? 'btn-danger' : 'btn-primary'}`}
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      {tax.isApplicable ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {filteredTaxes.length > 0 && (
              <div style={{ padding: '12px 20px', borderTop: '1.5px solid var(--border-subtle)' }}>
                <Pagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={filteredTaxes.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  itemName="tax rules"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL 1: Create Tax Rule Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={20} color="#0d9488" />
                  <span>Create Dynamic Tax Rule</span>
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  Configure GST slabs, jurisdictions, and default markup percentages.
                </p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="modal-close">×</button>
            </div>

            <form onSubmit={handleCreateTax}>
              <div className="modal-body" style={{ padding: '24px' }}>
                {modalError && (
                  <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Tax Rule Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Standard Tour Package GST, Luxury Hotel Slab GST"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tax Type *</label>
                    <select
                      className="form-select"
                      value={taxType}
                      onChange={(e) => setTaxType(e.target.value as TaxConfigType)}
                    >
                      {TAX_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate Percent (%) *</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                      className="form-input"
                      value={ratePercent}
                      onChange={(e) => setRatePercent(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Jurisdiction Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IN (India), AE (UAE), US"
                    className="form-input"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                  />
                </div>

                <div className="form-row" style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '8px 0 16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isApplicable}
                      onChange={(e) => setIsApplicable(e.target.checked)}
                    />
                    <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>Rule Is Active & Applicable</span>
                  </label>
                  <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                    />
                    <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>Set as Default Quotation Rule</span>
                  </label>
                  <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isConfirmed}
                      onChange={(e) => setIsConfirmed(e.target.checked)}
                    />
                    <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>Statutory Status: Confirmed by CA / Owner</span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Legal Notes</label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    placeholder="Statutory citation or internal notes on when this tax slab triggers..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Tax Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Tax Rule Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit2 size={18} color="#0d9488" />
                  <span>Edit Tax Rule</span>
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  Update statutory tax rates, default applicability, or citation notes.
                </p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="modal-close">×</button>
            </div>

            <form onSubmit={handleUpdateTax}>
              <div className="modal-body" style={{ padding: '24px' }}>
                {modalError && (
                  <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Tax Rule Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tax Type *</label>
                    <select
                      className="form-select"
                      value={editTaxType}
                      onChange={(e) => setEditTaxType(e.target.value as TaxConfigType)}
                    >
                      {TAX_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate Percent (%) *</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                      className="form-input"
                      value={editRatePercent}
                      onChange={(e) => setEditRatePercent(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Jurisdiction Code *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editJurisdiction}
                    onChange={(e) => setEditJurisdiction(e.target.value)}
                  />
                </div>

                <div className="form-row" style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '8px 0 16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editIsApplicable}
                      onChange={(e) => setEditIsApplicable(e.target.checked)}
                    />
                    <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>Rule Is Active & Applicable</span>
                  </label>
                  <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editIsDefault}
                      onChange={(e) => setEditIsDefault(e.target.checked)}
                    />
                    <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>Set as Default Quotation Rule</span>
                  </label>
                  <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editIsConfirmed}
                      onChange={(e) => setEditIsConfirmed(e.target.checked)}
                    />
                    <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>Statutory Status: Confirmed by CA / Owner</span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Legal Notes</label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    placeholder="Statutory citation notes..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Status / Default Toggle Confirmation Modal */}
      {confirmToggleModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color="#0d9488" />
                <span>
                  {confirmToggleModal.action === 'SET_DEFAULT'
                    ? 'Set Default Tax Rule'
                    : 'Confirm Tax Rule Status Change'}
                </span>
              </h3>
              <button onClick={() => setConfirmToggleModal(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                {confirmToggleModal.action === 'SET_DEFAULT' ? (
                  <>
                    Are you sure you want to set <strong>&ldquo;{confirmToggleModal.tax.name}&rdquo; ({confirmToggleModal.tax.ratePercent}%)</strong> as the default tax rule for all new customer quotations?
                  </>
                ) : (
                  <>
                    Are you sure you want to{' '}
                    <strong>{confirmToggleModal.tax.isApplicable ? 'disable' : 'enable'}</strong> the tax rule{' '}
                    <strong>&ldquo;{confirmToggleModal.tax.name}&rdquo;</strong>?
                  </>
                )}
              </p>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', color: '#64748b' }}>
                {confirmToggleModal.action === 'SET_DEFAULT' ? (
                  <span>
                    New draft quotations will automatically apply this tax percentage. All existing quotations, accepted proposals, and confirmed booking ledgers will remain completely preserved with their locked historical tax figures.
                  </span>
                ) : (
                  <span>
                    Disabled rules will not be selectable when creating new tour proposals. Historical bookings remain unaffected.
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
                onClick={handleExecuteToggle}
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting
                  ? 'Updating...'
                  : confirmToggleModal.action === 'SET_DEFAULT'
                  ? 'Confirm Default'
                  : confirmToggleModal.tax.isApplicable
                  ? 'Confirm Disable'
                  : 'Confirm Enable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
