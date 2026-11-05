'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  PlusCircle,
  Search,
  Filter,
  Phone,
  Mail,
  Calendar,
  Clock,
  Compass,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  MessageSquare,
  Users,
  ChevronRight,
  Send,
  Sparkles,
} from 'lucide-react';
import { leadsApi, customersApi, inventoryApi } from '@/lib/api';
import { ConfirmModal } from '@/components/ConfirmModal';

export default function AgentLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);

  // Intake Modal
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);
  const [submittingIntake, setSubmittingIntake] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [intakeForm, setIntakeForm] = useState({
    fullName: '',
    mobile: '',
    email: '',
    city: '',
    source: 'WALK_IN',
    destinationId: '',
    tentativeTravelDate: '',
    durationNights: 4,
    numberOfAdults: 2,
    numberOfChildren: 0,
    budgetEstimate: '',
    specialRequirements: '',
    nextFollowUpDate: '',
    followUpNotes: '',
  });

  // Timeline / Detail Drawer
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingDrawer, setLoadingDrawer] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: 'NOTE', title: '', content: '' });
  const [submittingActivity, setSubmittingActivity] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({ nextFollowUpDate: '', followUpNotes: '' });
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Modern Toast & Lost Lead State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [lostReasonSelected, setLostReasonSelected] = useState('Booked with competitor');
  const [lostReasonCustom, setLostReasonCustom] = useState('');

  useEffect(() => {
    inventoryApi.getDestinations().then((res) => setDestinations(res.data || [])).catch(() => {});

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const openId = params.get('openLead');
      if (openId) {
        handleOpenLeadDrawer(openId);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeads();
    }, 250);
    return () => clearTimeout(timer);
  }, [page, statusFilter, destinationFilter, search]);

  async function loadLeads() {
    try {
      setLoading(true);
      setError(null);
      const res = await leadsApi.list({
        page,
        limit: 20,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setLeads(res.data || []);
      setTotalLeads(res.meta?.total || (res.data ? res.data.length : 0));
    } catch (err: any) {
      setError(err?.message || 'Failed to load assigned leads');
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLeads();
  };

  const handleOpenLeadDrawer = async (leadId: string) => {
    setDrawerOpen(true);
    setLoadingDrawer(true);
    try {
      const res = await leadsApi.getById(leadId);
      setSelectedLead(res.data);
      setFollowUpForm({
        nextFollowUpDate: res.data.nextFollowUpDate ? res.data.nextFollowUpDate.split('T')[0] : '',
        followUpNotes: res.data.followUpNotes || '',
      });
    } catch (err: any) {
      showToast(err?.message || 'Failed to load lead details', 'error');
      setDrawerOpen(false);
    } finally {
      setLoadingDrawer(false);
    }
  };

  const handleCreateWalkInLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntakeError(null);

    if (!intakeForm.fullName.trim() || !intakeForm.mobile.trim() || !intakeForm.destinationId) {
      setIntakeError('Please provide the traveler name, mobile number, and destination.');
      return;
    }

    setSubmittingIntake(true);
    try {
      // 1. Create or ensure customer record
      let customerId: string | undefined;
      try {
        const custRes = await customersApi.create({
          fullName: intakeForm.fullName.trim(),
          mobile: intakeForm.mobile.trim(),
          email: intakeForm.email.trim() || undefined,
          city: intakeForm.city.trim() || undefined,
          source: intakeForm.source,
        });
        customerId = custRes.data.id;
      } catch (custErr: any) {
        // If customer exists, find by mobile
        if (custErr.statusCode === 409 || custErr.message?.includes('already exists')) {
          const searchRes = await customersApi.list({ search: intakeForm.mobile.trim() });
          if (searchRes.data && searchRes.data.length > 0) {
            customerId = searchRes.data[0].id;
          }
        } else {
          throw custErr;
        }
      }

      if (!customerId) {
        throw new Error('Failed to resolve customer record for lead ingestion.');
      }

      // 2. Ingest lead
      const leadPayload = {
        customerId,
        destinationId: intakeForm.destinationId,
        source: intakeForm.source,
        tentativeTravelDate: intakeForm.tentativeTravelDate || undefined,
        durationNights: Number(intakeForm.durationNights) || 4,
        numberOfAdults: Number(intakeForm.numberOfAdults) || 2,
        numberOfChildren: Number(intakeForm.numberOfChildren) || 0,
        budgetEstimate: intakeForm.budgetEstimate ? Number(intakeForm.budgetEstimate) : undefined,
        specialRequirements: intakeForm.specialRequirements.trim() || undefined,
        nextFollowUpDate: intakeForm.nextFollowUpDate || undefined,
        followUpNotes: intakeForm.followUpNotes.trim() || undefined,
      };

      const created = await leadsApi.create(leadPayload);

      setIntakeModalOpen(false);
      setIntakeForm({
        fullName: '',
        mobile: '',
        email: '',
        city: '',
        source: 'WALK_IN',
        destinationId: '',
        tentativeTravelDate: '',
        durationNights: 4,
        numberOfAdults: 2,
        numberOfChildren: 0,
        budgetEstimate: '',
        specialRequirements: '',
        nextFollowUpDate: '',
        followUpNotes: '',
      });
      loadLeads();

      // Open detail drawer for newly ingested lead
      handleOpenLeadDrawer(created.data.id);
    } catch (err: any) {
      setIntakeError(err?.message || 'Failed to record lead. Please check details.');
    } finally {
      setSubmittingIntake(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !activityForm.title.trim()) return;

    setSubmittingActivity(true);
    try {
      const res = await leadsApi.addActivity(selectedLead.id, {
        type: activityForm.type,
        title: activityForm.title.trim(),
        content: activityForm.content.trim() || undefined,
      });
      setSelectedLead(res.data);
      setActivityForm({ type: 'NOTE', title: '', content: '' });
      loadLeads();
    } catch (err: any) {
      showToast(err?.message || 'Failed to record activity', 'error');
    } finally {
      setSubmittingActivity(false);
    }
  };

  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    setSubmittingFollowUp(true);
    try {
      const res = await leadsApi.updateFollowUp(selectedLead.id, {
        nextFollowUpDate: followUpForm.nextFollowUpDate || undefined,
        followUpNotes: followUpForm.followUpNotes.trim() || undefined,
      });
      setSelectedLead(res.data);
      loadLeads();
      showToast('Follow-up schedule updated successfully', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update follow-up schedule', 'error');
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  const executeStatusUpdate = async (newStatus: string, lostReason?: string) => {
    if (!selectedLead) return;
    setUpdatingStatus(true);
    try {
      const res = await leadsApi.update(selectedLead.id, {
        status: newStatus,
        lostReason,
      });
      setSelectedLead(res.data);
      loadLeads();
      showToast(`Lead status updated to ${newStatus}`, 'success');
      setLostModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedLead || newStatus === selectedLead.status) return;

    if (newStatus === 'LOST') {
      setLostReasonSelected('Booked with competitor');
      setLostReasonCustom('');
      setLostModalOpen(true);
      return;
    }

    await executeStatusUpdate(newStatus);
  };

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 10,
            background: toast.type === 'error' ? '#fff1f2' : '#f0fdf4',
            border: `1px solid ${toast.type === 'error' ? '#fecdd3' : '#bbf7d0'}`,
            color: toast.type === 'error' ? '#9f1239' : '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '0.88rem',
            fontWeight: 500,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={18} style={{ color: '#e11d48', flexShrink: 0 }} />
          ) : (
            <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
              CRM Workspace
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {totalLeads} Assigned Traveler Inquiries
            </span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            My Leads & Pipeline Management
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Service walk-in travelers, log phone inquiries, track client interactions, and dispatch quotes
          </p>
        </div>

        <button
          onClick={() => setIntakeModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: '0.9rem' }}
        >
          <PlusCircle size={18} />
          <span>+ Add Walk-In / Phone Lead</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by traveler name, mobile, or lead number..."
              style={{
                width: '100%',
                padding: '9px 36px 9px 36px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </form>

        {/* Stage Filter Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {[
            { value: '', label: 'All' },
            { value: 'ASSIGNED', label: 'Assigned' },
            { value: 'CONTACTED', label: 'Contacted' },
            { value: 'QUOTED', label: 'Quoted' },
            { value: 'NEGOTIATING', label: 'Negotiating' },
            { value: 'CONVERTED', label: 'Converted' },
            { value: 'LOST', label: 'Lost' },
          ].map((st) => (
            <button
              key={st.value}
              onClick={() => {
                setStatusFilter(st.value);
                setPage(1);
              }}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: statusFilter === st.value ? 700 : 500,
                border: '1px solid',
                borderColor: statusFilter === st.value ? 'var(--primary)' : 'var(--border-subtle)',
                background: statusFilter === st.value ? 'var(--primary-light)' : 'var(--bg-surface)',
                color: statusFilter === st.value ? 'var(--primary-dark)' : 'var(--text-body)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
              }}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading assigned leads...
          </div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <UserCheck size={40} style={{ color: 'var(--text-subtle)', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>No leads matching your criteria</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Try adjusting your search terms or intake a new walk-in customer.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Lead ID & Source</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Traveler Details</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Destination & Pax</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Next Follow-Up</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const custName = lead.customerName || (typeof lead.customerId === 'object' ? lead.customerId?.fullName : 'Traveler');
                  const custMobile = lead.customerMobile || (typeof lead.customerId === 'object' ? lead.customerId?.mobile : '');
                  const custId = typeof lead.customerId === 'object' ? lead.customerId?._id || lead.customerId?.id : lead.customerId;
                  const isDueToday = lead.nextFollowUpDate && new Date(lead.nextFollowUpDate).toDateString() === new Date().toDateString();
                  const isOverdue = lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < new Date() && !isDueToday;

                  return (
                    <tr
                      key={lead.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'var(--transition-fast)' }}
                    >
                      {/* Lead Number & Source */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                          {lead.leadNumber}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: 3,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: lead.source === 'WALK_IN' ? 'var(--accent-amber-light)' : lead.source === 'PHONE' ? 'var(--accent-blue-light)' : 'var(--bg-surface-subtle)',
                            color: lead.source === 'WALK_IN' ? 'var(--accent-amber-dark)' : lead.source === 'PHONE' ? 'var(--accent-blue-dark)' : 'var(--text-muted)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {lead.source}
                        </span>
                      </td>

                      {/* Customer Details */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                          {custName}
                        </div>
                        {custMobile ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <Phone size={13} style={{ color: 'var(--primary)' }} />
                            <a href={`tel:${custMobile}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {custMobile}
                            </a>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No phone</span>
                        )}
                      </td>

                      {/* Destination & Pax */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                          📍 {lead.destinationName || 'Destination TBD'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {lead.numberOfAdults || 2} Adults
                          {lead.numberOfChildren ? `, ${lead.numberOfChildren} Children` : ''}
                          {lead.durationNights ? ` • ${lead.durationNights}N/${lead.durationNights + 1}D` : ''}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          className={`badge ${
                            lead.status === 'CONVERTED'
                              ? 'badge-success'
                              : lead.status === 'QUOTED' || lead.status === 'NEGOTIATING'
                              ? 'badge-primary'
                              : lead.status === 'CONTACTED'
                              ? 'badge-info'
                              : lead.status === 'LOST'
                              ? 'badge-danger'
                              : 'badge-warning'
                          }`}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {lead.status}
                        </span>
                      </td>

                      {/* Next Follow-up */}
                      <td style={{ padding: '14px 16px' }}>
                        {lead.nextFollowUpDate ? (
                          <div>
                            <div
                              style={{
                                fontSize: '0.82rem',
                                fontWeight: isDueToday || isOverdue ? 700 : 500,
                                color: isOverdue ? 'var(--accent-rose-dark)' : isDueToday ? 'var(--accent-amber-dark)' : 'var(--text-body)',
                              }}
                            >
                              📅 {lead.nextFollowUpDate.split('T')[0]}
                            </div>
                            {isOverdue && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--accent-rose-dark)', fontWeight: 700 }}>
                                Overdue
                              </span>
                            )}
                            {isDueToday && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber-dark)', fontWeight: 700 }}>
                                Due Today
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>None scheduled</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleOpenLeadDrawer(lead.id)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          >
                            Timeline & Details
                          </button>
                          <Link
                            href={`/quotations/new?leadId=${lead.id}&customerId=${custId || ''}&destId=${lead.destinationId || ''}`}
                            prefetch={false}
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none' }}
                          >
                            + Quote
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================== WALK-IN LEAD INTAKE MODAL ===================== */}
      {intakeModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              maxWidth: 580,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px 24px',
              boxShadow: 'var(--shadow-modal)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                  Walk-In Desk Ingestion
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                  Intake New Traveler Inquiry
                </h2>
              </div>
              <button
                onClick={() => setIntakeModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {intakeError && (
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', border: '1px solid var(--accent-rose-border)', color: 'var(--accent-rose-dark)', fontSize: '0.85rem', marginBottom: 16 }}>
                {intakeError}
              </div>
            )}

            <form onSubmit={handleCreateWalkInLead} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Traveler Basic Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                    Traveler Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={intakeForm.fullName}
                    onChange={(e) => setIntakeForm({ ...intakeForm, fullName: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={intakeForm.mobile}
                    onChange={(e) => setIntakeForm({ ...intakeForm, mobile: e.target.value })}
                    placeholder="e.g. 9811122334"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={intakeForm.email}
                    onChange={(e) => setIntakeForm({ ...intakeForm, email: e.target.value })}
                    placeholder="rajesh@example.com"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                    Inquiry Origin
                  </label>
                  <select
                    value={intakeForm.source}
                    onChange={(e) => setIntakeForm({ ...intakeForm, source: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem', background: '#ffffff' }}
                  >
                    <option value="WALK_IN">Physical Walk-In</option>
                    <option value="PHONE">Phone Inquiry</option>
                    <option value="AGENT">Agent Direct Outreach</option>
                  </select>
                </div>
              </div>

              {/* Trip Preferences */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                    Destination *
                  </label>
                  <select
                    required
                    value={intakeForm.destinationId}
                    onChange={(e) => setIntakeForm({ ...intakeForm, destinationId: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem', background: '#ffffff' }}
                  >
                    <option value="">Select Destination</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                    Tentative Travel Date
                  </label>
                  <input
                    type="date"
                    value={intakeForm.tentativeTravelDate}
                    onChange={(e) => setIntakeForm({ ...intakeForm, tentativeTravelDate: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                    Duration (Nights)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={intakeForm.durationNights}
                    onChange={(e) => setIntakeForm({ ...intakeForm, durationNights: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                    Adults
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={intakeForm.numberOfAdults}
                    onChange={(e) => setIntakeForm({ ...intakeForm, numberOfAdults: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                    Children
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={intakeForm.numberOfChildren}
                    onChange={(e) => setIntakeForm({ ...intakeForm, numberOfChildren: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                  Special Requirements / Client Notes
                </label>
                <textarea
                  rows={2}
                  value={intakeForm.specialRequirements}
                  onChange={(e) => setIntakeForm({ ...intakeForm, specialRequirements: e.target.value })}
                  placeholder="e.g. Honeymoon couple, prefers 4-star Dal Lake view, vegetarian meals..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIntakeModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '9px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIntake}
                  className="btn btn-primary"
                  style={{ padding: '9px 20px', fontWeight: 700 }}
                >
                  {submittingIntake ? 'Ingesting Lead...' : 'Ingest Lead & Open Desk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== LEAD DETAIL & TIMELINE DRAWER ===================== */}
      {drawerOpen && selectedLead && (() => {
        const selCustName = selectedLead.customerName || (typeof selectedLead.customerId === 'object' ? selectedLead.customerId?.fullName : 'Traveler Inquiry');
        const selCustMobile = selectedLead.customerMobile || (typeof selectedLead.customerId === 'object' ? selectedLead.customerId?.mobile : '');
        const selCustEmail = selectedLead.customerEmail || (typeof selectedLead.customerId === 'object' ? selectedLead.customerId?.email : '');
        const selCustId = typeof selectedLead.customerId === 'object' ? selectedLead.customerId?._id || selectedLead.customerId?.id : selectedLead.customerId;
        const cleanDigits = (selCustMobile || '').replace(/\D/g, '');
        const waDigits = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              zIndex: 100,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <div
              style={{
                width: 560,
                maxWidth: '100%',
                background: '#ffffff',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-modal)',
                overflowY: 'auto',
                padding: '24px 28px',
              }}
            >
              {/* Drawer Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-primary">{selectedLead.leadNumber}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Origin: {selectedLead.source}</span>
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                    {selCustName}
                  </h2>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={22} />
                </button>
              </div>

              {/* Direct Quick-Action Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                {selCustMobile && (
                  <>
                    <a
                      href={`tel:${selCustMobile}`}
                      className="btn btn-secondary"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', fontSize: '0.82rem', textDecoration: 'none' }}
                    >
                      <Phone size={14} style={{ color: 'var(--primary)' }} />
                      <span>Call Client</span>
                    </a>
                    <a
                      href={`https://wa.me/${waDigits}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '8px 12px',
                        fontSize: '0.82rem',
                        textDecoration: 'none',
                        color: '#047857',
                        background: '#ecfdf5',
                        borderColor: '#a7f3d0',
                        fontWeight: 700,
                      }}
                    >
                      <MessageSquare size={14} />
                      <span>WhatsApp</span>
                    </a>
                  </>
                )}
                {selCustEmail && (
                  <a
                    href={`mailto:${selCustEmail}`}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', fontSize: '0.82rem', textDecoration: 'none' }}
                  >
                    <Mail size={14} />
                    <span>Email</span>
                  </a>
                )}
              </div>

              {/* Quick Status Bar */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Pipeline Stage Progression:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['ASSIGNED', 'CONTACTED', 'QUOTED', 'NEGOTIATING', 'CONVERTED', 'LOST'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      disabled={updatingStatus}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: selectedLead.status === st ? 800 : 500,
                        border: '1px solid',
                        borderColor: selectedLead.status === st ? 'var(--primary)' : 'var(--border-subtle)',
                        background: selectedLead.status === st ? 'var(--primary)' : 'var(--bg-surface-subtle)',
                        color: selectedLead.status === st ? '#ffffff' : 'var(--text-body)',
                        cursor: 'pointer',
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Traveler & Trip Overview Card */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Mobile:</span>{' '}
                    <strong>{selCustMobile || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Email:</span>{' '}
                    <strong>{selCustEmail || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Destination:</span>{' '}
                    <strong>{selectedLead.destinationName || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Travelers:</span>{' '}
                    <strong>{selectedLead.numberOfAdults || 2} Adults{selectedLead.numberOfChildren ? `, ${selectedLead.numberOfChildren} Children` : ''}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Duration:</span>{' '}
                    <strong>{selectedLead.durationNights ? `${selectedLead.durationNights} Nights / ${selectedLead.durationNights + 1} Days` : 'Flexible'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Travel Dates:</span>{' '}
                    <strong>{selectedLead.tentativeTravelDate ? selectedLead.tentativeTravelDate.split('T')[0] : 'Flexible / Open'}</strong>
                  </div>
                  {selectedLead.budgetEstimate ? (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Budget Estimate:</span>{' '}
                      <strong>₹{Number(selectedLead.budgetEstimate).toLocaleString('en-IN')}</strong>
                    </div>
                  ) : null}
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Assigned By:</span>{' '}
                    <strong style={{ color: 'var(--primary)' }}>
                      {selectedLead.assignedByName ? selectedLead.assignedByName : 'Admin Desk'}
                    </strong>
                  </div>
                </div>

                {selectedLead.specialRequirements && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: 'var(--text-body)' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Client Requirements & Travel Notes:</span>
                    <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                      {selectedLead.specialRequirements}
                    </p>
                  </div>
                )}

                {/* Fast Quote CTA */}
                <div style={{ marginTop: 14 }}>
                  <Link
                    href={`/quotations/new?leadId=${selectedLead.id}&customerId=${selCustId || ''}&destId=${selectedLead.destinationId || ''}`}
                    prefetch={false}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: '0.88rem', fontWeight: 700, textDecoration: 'none' }}
                  >
                    <PlusCircle size={16} />
                    <span>Build Quotation for {selCustName}</span>
                  </Link>
                </div>
              </div>

              {/* Follow-up Schedule Form */}
            <form onSubmit={handleSaveFollowUp} style={{ padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Clock size={16} style={{ color: 'var(--accent-amber)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>Next Follow-Up Schedule</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                <input
                  type="date"
                  value={followUpForm.nextFollowUpDate}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, nextFollowUpDate: e.target.value })}
                  style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}
                />
                <input
                  type="text"
                  placeholder="Notes (e.g. Call at 4 PM)"
                  value={followUpForm.followUpNotes}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, followUpNotes: e.target.value })}
                  style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}
                />
              </div>
              <button
                type="submit"
                disabled={submittingFollowUp}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '6px', fontSize: '0.78rem' }}
              >
                {submittingFollowUp ? 'Updating...' : 'Update Follow-Up'}
              </button>
            </form>

            {/* Add Activity Section */}
            <form onSubmit={handleAddActivity} style={{ padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <MessageSquare size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>Add Activity / Communication Note</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select
                  value={activityForm.type}
                  onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                  style={{ padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', background: '#ffffff' }}
                >
                  <option value="NOTE">General Note</option>
                  <option value="CALL">Phone Call</option>
                  <option value="MEETING">Walk-In Meeting</option>
                </select>
                <input
                  type="text"
                  required
                  placeholder="Activity Title (e.g. Client requested budget revision)"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}
                />
              </div>
              <textarea
                rows={2}
                placeholder="Optional detailed notes..."
                value={activityForm.content}
                onChange={(e) => setActivityForm({ ...activityForm, content: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', marginBottom: 8 }}
              />
              <button
                type="submit"
                disabled={submittingActivity}
                className="btn btn-primary"
                style={{ width: '100%', padding: '7px', fontSize: '0.82rem' }}
              >
                {submittingActivity ? 'Saving...' : 'Post Timeline Event'}
              </button>
            </form>

            {/* Activity History Timeline */}
            <div>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 }}>
                Interaction Timeline ({selectedLead.timeline?.length || 0})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(selectedLead.timeline || []).slice().reverse().map((event: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ color: 'var(--primary)', marginTop: 2 }}>
                      {event.type === 'CALL' ? <Phone size={16} /> : event.type === 'STATUS_CHANGE' ? <Sparkles size={16} /> : <MessageSquare size={16} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{event.title}</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(event.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {event.content && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-body)', marginTop: 2 }}>
                          {event.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    })()}

      {/* Modern Lost Lead Modal */}
      <ConfirmModal
        isOpen={lostModalOpen}
        title="Mark Lead as Lost"
        variant="warning"
        confirmLabel="Confirm Lost Status"
        cancelLabel="Cancel"
        isLoading={updatingStatus}
        onCancel={() => {
          if (!updatingStatus) setLostModalOpen(false);
        }}
        onConfirm={() => {
          const reason =
            lostReasonSelected === 'Other'
              ? lostReasonCustom.trim() || 'Other reason'
              : lostReasonSelected;
          executeStatusUpdate('LOST', reason);
        }}
        message="Please select or enter the primary reason why this lead could not be converted:"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'Booked with competitor',
              'Budget mismatch / Too expensive',
              'Trip postponed / Cancelled by traveler',
              'Unresponsive / Did not answer calls',
              'Other',
            ].map((reason) => (
              <label
                key={reason}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${lostReasonSelected === reason ? '#0f766e' : '#e2e8f0'}`,
                  background: lostReasonSelected === reason ? '#f0fdfa' : '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: lostReasonSelected === reason ? 600 : 400,
                  color: lostReasonSelected === reason ? '#0f766e' : '#334155',
                }}
              >
                <input
                  type="radio"
                  name="lostReason"
                  checked={lostReasonSelected === reason}
                  onChange={() => setLostReasonSelected(reason)}
                  style={{ accentColor: '#0f766e' }}
                />
                <span>{reason}</span>
              </label>
            ))}
          </div>

          {lostReasonSelected === 'Other' && (
            <input
              type="text"
              placeholder="Specify custom reason..."
              value={lostReasonCustom}
              onChange={(e) => setLostReasonCustom(e.target.value)}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem', padding: '8px 12px' }}
              autoFocus
            />
          )}
        </div>
      </ConfirmModal>
    </div>
  );
}
