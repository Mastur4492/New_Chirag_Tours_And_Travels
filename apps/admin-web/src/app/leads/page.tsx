'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  Clock,
  MessageSquare,
  Kanban,
  Table as TableIcon,
  BarChart3,
  X,
  ChevronRight,
  Send,
  CalendarClock,
  Sparkles,
  MapPin,
  Calendar,
  AlertTriangle,
  UserCheck,
  FileSpreadsheet,
  ArrowRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  AgentMetricsDto,
  DestinationDto,
  LeadDto,
  LeadSource,
  LeadStatus,
  UserDto,
} from '@chirag/types';
import { apiRequest } from '@/lib/api';
import { Pagination } from '@/components/Pagination';
import {
  LEAD_STATUS_CONFIG,
  LEAD_SOURCE_CONFIG,
  formatDate,
  formatDateTime,
  formatFollowUpDate,
  sanitizeDisplayName,
  isToday,
  isOverdue,
} from '@/lib/labels';

const ALL_STATUSES: LeadStatus[] = [
  'NEW',
  'ASSIGNED',
  'CONTACTED',
  'QUOTED',
  'NEGOTIATING',
  'CONVERTED',
  'LOST',
];

const ALL_SOURCES: LeadSource[] = [
  'ADMIN_DIRECT',
  'CUSTOMER_WEB',
  'CUSTOMER_APP',
  'AGENT',
  'PHONE',
  'WALK_IN',
  'OTHER',
];

type PriorityFilter = 'ALL' | 'OVERDUE' | 'TODAY' | 'NEW' | 'ACTION_NEEDED';

export default function LeadsPage() {
  // Default to LIST VIEW as required for usability and zero horizontal scroll
  const [viewMode, setViewMode] = useState<'LIST' | 'KANBAN' | 'METRICS'>('LIST');
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);
  const [agents, setAgents] = useState<UserDto[]>([]);
  const [metrics, setMetrics] = useState<AgentMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected Lead for Details Drawer
  const [selectedLead, setSelectedLead] = useState<LeadDto | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Activity Note Form
  const [activityType, setActivityType] = useState<'NOTE' | 'CALL' | 'MEETING'>('NOTE');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityContent, setActivityContent] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);

  // Follow-up Schedule Form
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [updatingFollowUp, setUpdatingFollowUp] = useState(false);

  // Status Change Dialog
  const [statusDialogLead, setStatusDialogLead] = useState<LeadDto | null>(null);
  const [targetStatus, setTargetStatus] = useState<LeadStatus | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [statusDialogError, setStatusDialogError] = useState<string | null>(null);

  // Reassign Modal
  const [reassignLead, setReassignLead] = useState<LeadDto | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  // Add New Enquiry Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [tentativeTravelDate, setTentativeTravelDate] = useState('');
  const [durationNights, setDurationNights] = useState<number>(3);
  const [numberOfAdults, setNumberOfAdults] = useState<number>(2);
  const [numberOfChildren, setNumberOfChildren] = useState<number>(0);
  const [source, setSource] = useState<LeadSource>('ADMIN_DIRECT');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsRes, destsRes, usersRes, metricsRes] = await Promise.all([
        apiRequest<LeadDto[]>('leads'),
        apiRequest<DestinationDto[]>('destinations'),
        apiRequest<any>('users/agents').catch(() => []),
        apiRequest<AgentMetricsDto>('leads/metrics').catch(() => null),
      ]);

      const loadedLeads = Array.isArray(leadsRes) ? leadsRes : [];
      setLeads(loadedLeads);
      setDestinations(Array.isArray(destsRes) ? destsRes : []);
      setAgents(Array.isArray(usersRes) ? usersRes : usersRes?.users || []);
      setMetrics(metricsRes);

      if (selectedLead) {
        const refreshed = loadedLeads.find((l) => l.id === selectedLead.id);
        if (refreshed) setSelectedLead(refreshed);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load enquiries from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute Action Queue Counts
  const queueCounts = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let newEnquiries = 0;
    let actionNeeded = 0;

    leads.forEach((l) => {
      if (l.status === 'NEW') newEnquiries++;
      if (['QUOTED', 'NEGOTIATING'].includes(l.status)) actionNeeded++;
      if (l.nextFollowUpDate) {
        if (isOverdue(l.nextFollowUpDate)) overdue++;
        else if (isToday(l.nextFollowUpDate)) today++;
      }
    });

    return { overdue, today, newEnquiries, actionNeeded };
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // 1. Status Filter
      if (selectedStatus !== 'ALL' && l.status !== selectedStatus) {
        return false;
      }

      // 2. Priority Filter
      if (priorityFilter === 'OVERDUE') {
        if (!l.nextFollowUpDate || !isOverdue(l.nextFollowUpDate)) return false;
      } else if (priorityFilter === 'TODAY') {
        if (!l.nextFollowUpDate || !isToday(l.nextFollowUpDate)) return false;
      } else if (priorityFilter === 'NEW') {
        if (l.status !== 'NEW') return false;
      } else if (priorityFilter === 'ACTION_NEEDED') {
        if (!['QUOTED', 'NEGOTIATING'].includes(l.status)) return false;
      }

      // 3. Search Query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesLeadNum = l.leadNumber.toLowerCase().includes(q);
        const matchesName = (l.customerName || '').toLowerCase().includes(q);
        const matchesMobile = (l.customerMobile || '').includes(q);
        const matchesDest = (l.destinationName || '').toLowerCase().includes(q);
        const matchesAgent = (l.assignedAgentName || '').toLowerCase().includes(q);
        if (!matchesLeadNum && !matchesName && !matchesMobile && !matchesDest && !matchesAgent) {
          return false;
        }
      }

      return true;
    });
  }, [leads, selectedStatus, priorityFilter, search]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, priorityFilter, search]);

  // Paginated slice for clean table rendering
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    setFieldErrors({});

    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Customer full name is required';
    const cleanMobile = mobile.trim().replace(/\D/g, '');
    if (!mobile.trim()) {
      errs.mobile = 'Mobile number is required';
    } else if (cleanMobile.length < 10) {
      errs.mobile = 'Valid 10-digit mobile number is required';
    }
    if (!destinationId) errs.destinationId = 'Please select a destination';
    if (Number(durationNights) < 1) errs.durationNights = 'Duration must be at least 1 night';
    if (Number(numberOfAdults) < 1) errs.numberOfAdults = 'At least 1 adult is required';

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setModalError('Please correct the highlighted fields below.');
      setSubmitting(false);
      return;
    }

    try {
      // 1. Deduplicate/create customer
      const customer = await apiRequest<{ id: string }>('customers', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          mobile: mobile.trim(),
          email: email.trim() || undefined,
          source,
        }),
      });

      // 2. Create Lead
      await apiRequest('leads', {
        method: 'POST',
        body: JSON.stringify({
          customerId: customer.id,
          destinationId,
          tentativeTravelDate: tentativeTravelDate || undefined,
          durationNights: Number(durationNights),
          numberOfAdults: Number(numberOfAdults),
          numberOfChildren: Number(numberOfChildren),
          source,
          assignedAgentId: assignedAgentId || undefined,
          specialRequirements: specialRequirements.trim() || undefined,
        }),
      });

      showToast('New enquiry added successfully!', 'success');
      setIsCreateModalOpen(false);
      resetCreateForm();
      fetchData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to add enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignLead || !selectedAgentId) return;

    setReassigning(true);
    setReassignError(null);

    try {
      await apiRequest(`leads/${reassignLead.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignedAgentId: selectedAgentId }),
      });

      showToast('Consultant reassigned successfully', 'success');
      setReassignLead(null);
      fetchData();
    } catch (err: any) {
      setReassignError(err.message || 'Failed to reassign consultant');
    } finally {
      setReassigning(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !activityTitle.trim() || !activityContent.trim()) return;

    setAddingActivity(true);
    try {
      const updated = await apiRequest<LeadDto>(`leads/${selectedLead.id}/activities`, {
        method: 'POST',
        body: JSON.stringify({
          type: activityType,
          title: activityTitle.trim(),
          content: activityContent.trim(),
        }),
      });

      setSelectedLead(updated);
      setActivityTitle('');
      setActivityContent('');
      showToast('Interaction note saved to timeline', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save note', 'error');
    } finally {
      setAddingActivity(false);
    }
  };

  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !followUpDate) return;

    setUpdatingFollowUp(true);
    try {
      const updated = await apiRequest<LeadDto>(`leads/${selectedLead.id}/follow-up`, {
        method: 'PATCH',
        body: JSON.stringify({
          nextFollowUpDate: followUpDate,
          followUpNotes: followUpNotes.trim() || undefined,
        }),
      });

      setSelectedLead(updated);
      showToast('Follow-up scheduled successfully', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to schedule follow-up', 'error');
    } finally {
      setUpdatingFollowUp(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusDialogLead || !targetStatus) return;

    if (targetStatus === 'LOST' && !lostReason.trim()) {
      setStatusDialogError('Please specify the reason why this enquiry was not converted.');
      return;
    }

    setUpdatingStatus(true);
    setStatusDialogError(null);
    try {
      await apiRequest(`leads/${statusDialogLead.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: targetStatus,
          lostReason: targetStatus === 'LOST' ? lostReason.trim() : undefined,
        }),
      });

      showToast(`Enquiry stage updated to "${LEAD_STATUS_CONFIG[targetStatus]?.label}"`, 'success');
      setStatusDialogLead(null);
      setTargetStatus(null);
      setLostReason('');
      fetchData();
    } catch (err: any) {
      setStatusDialogError(err.message || 'Failed to update stage');
      showToast(err.message || 'Failed to update stage', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const resetCreateForm = () => {
    setFullName('');
    setMobile('');
    setEmail('');
    setDestinationId('');
    setTentativeTravelDate('');
    setDurationNights(3);
    setNumberOfAdults(2);
    setNumberOfChildren(0);
    setSource('ADMIN_DIRECT');
    setAssignedAgentId('');
    setSpecialRequirements('');
    setFieldErrors({});
    setModalError(null);
  };

  const openLeadDrawer = (lead: LeadDto) => {
    setSelectedLead(lead);
    setFollowUpDate(lead.nextFollowUpDate || '');
    setFollowUpNotes(lead.followUpNotes || '');
    setIsDetailsOpen(true);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const openLeadId = urlParams.get('openLead');
    if (openLeadId && leads.length > 0) {
      const match = leads.find((l) => l.id === openLeadId || l.leadNumber === openLeadId);
      if (match) {
        openLeadDrawer(match);
      }
    }
  }, [leads]);

  useEffect(() => {
    if (!isDetailsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDetailsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailsOpen]);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toast && (
        <div className={`flex items-center gap-2.5 p-4 rounded-xl border shadow-sm animate-fadeIn ${
          toast.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : toast.type === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          )}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Top Header & Actions */}
      {/* Page Title & Action Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            Customer Enquiries & Sales CRM
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage holiday enquiries, schedule client follow-ups, and track booking conversions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'LIST'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              List View
            </button>
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'KANBAN'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Pipeline Board
            </button>
            <button
              onClick={() => setViewMode('METRICS')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'METRICS'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Performance
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-sm transition-all text-sm flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Enquiry</span>
          </button>
        </div>
      </div>

      {/* Immediate Priority Action Queues */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Overdue Follow-ups */}
        <button
          onClick={() => {
            setPriorityFilter(priorityFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE');
            setSelectedStatus('ALL');
          }}
          className={`stat-card text-left p-3.5 sm:p-4 rounded-xl border transition-all min-w-0 overflow-hidden ${
            priorityFilter === 'OVERDUE'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-rose-200 hover:bg-rose-50/40 shadow-xs'
          }`}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#be123c', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f43f5e', flexShrink: 0 }} />
              <span>Overdue</span>
            </span>
            <AlertTriangle size={15} color="#f43f5e" style={{ flexShrink: 0 }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#be123c', margin: '8px 0 2px 0', lineHeight: 1 }}>
            {loading ? <div className="skeleton" style={{ width: '32px', height: '22px', borderRadius: '4px' }} /> : queueCounts.overdue}
          </div>
          <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Missed reminders
          </span>
        </button>

        {/* Due Today */}
        <button
          onClick={() => {
            setPriorityFilter(priorityFilter === 'TODAY' ? 'ALL' : 'TODAY');
            setSelectedStatus('ALL');
          }}
          className={`stat-card text-left p-3.5 sm:p-4 rounded-xl border transition-all min-w-0 overflow-hidden ${
            priorityFilter === 'TODAY'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/40 shadow-xs'
          }`}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
              <span>Due Today</span>
            </span>
            <CalendarClock size={15} color="#d97706" style={{ flexShrink: 0 }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#b45309', margin: '8px 0 2px 0', lineHeight: 1 }}>
            {loading ? <div className="skeleton" style={{ width: '32px', height: '22px', borderRadius: '4px' }} /> : queueCounts.today}
          </div>
          <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Scheduled contacts
          </span>
        </button>

        {/* New Enquiries */}
        <button
          onClick={() => {
            setPriorityFilter(priorityFilter === 'NEW' ? 'ALL' : 'NEW');
            setSelectedStatus('ALL');
          }}
          className={`stat-card text-left p-3.5 sm:p-4 rounded-xl border transition-all min-w-0 overflow-hidden ${
            priorityFilter === 'NEW'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/40 shadow-xs'
          }`}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
              <span>New Enquiries</span>
            </span>
            <Users size={15} color="#2563eb" style={{ flexShrink: 0 }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#1d4ed8', margin: '8px 0 2px 0', lineHeight: 1 }}>
            {loading ? <div className="skeleton" style={{ width: '32px', height: '22px', borderRadius: '4px' }} /> : queueCounts.newEnquiries}
          </div>
          <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Fresh incoming leads
          </span>
        </button>

        {/* Active Quotes / Negotiations */}
        <button
          onClick={() => {
            setPriorityFilter(priorityFilter === 'ACTION_NEEDED' ? 'ALL' : 'ACTION_NEEDED');
            setSelectedStatus('ALL');
          }}
          className={`stat-card text-left p-3.5 sm:p-4 rounded-xl border transition-all min-w-0 overflow-hidden ${
            priorityFilter === 'ACTION_NEEDED'
              ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-teal-200 hover:bg-teal-50/40 shadow-xs'
          }`}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#14b8a6', flexShrink: 0 }} />
              <span>In Discussion</span>
            </span>
            <FileSpreadsheet size={15} color="#0d9488" style={{ flexShrink: 0 }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f766e', margin: '8px 0 2px 0', lineHeight: 1 }}>
            {loading ? <div className="skeleton" style={{ width: '32px', height: '22px', borderRadius: '4px' }} /> : queueCounts.actionNeeded}
          </div>
          <span style={{ fontSize: '11px', color: '#0f766e', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Active negotiations
          </span>
        </button>
      </div>

      {/* Search & Quick Filters Bar */}
      {viewMode !== 'METRICS' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            boxShadow: '0 2px 6px -1px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* Search Input with Luxury Focus */}
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px', maxWidth: '100%' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer name, phone, enquiry #, destination..."
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  paddingRight: '14px',
                  paddingTop: '8.5px',
                  paddingBottom: '8.5px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Stage Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
              <Filter size={13} style={{ color: '#0f766e' }} />
              <span>Pipeline Stage:</span>
            </div>
          </div>

          {/* Stage Filter Pills Bar — Responsive Wrapping to prevent clipping at 1280px/1366px */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '4px',
              width: '100%',
            }}
          >
            <button
              onClick={() => {
                setSelectedStatus('ALL');
                setPriorityFilter('ALL');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                border: selectedStatus === 'ALL' && priorityFilter === 'ALL'
                  ? '1px solid #0f766e'
                  : '1px solid #e2e8f0',
                background: selectedStatus === 'ALL' && priorityFilter === 'ALL'
                  ? 'linear-gradient(135deg, #0f766e, #0d9488)'
                  : '#ffffff',
                color: selectedStatus === 'ALL' && priorityFilter === 'ALL'
                  ? '#ffffff'
                  : '#475569',
                boxShadow: selectedStatus === 'ALL' && priorityFilter === 'ALL'
                  ? '0 2px 6px rgba(15, 118, 110, 0.25)'
                  : '0 1px 2px rgba(15, 23, 42, 0.03)',
              }}
            >
              <span>All Enquiries</span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  fontWeight: 800,
                  background: selectedStatus === 'ALL' && priorityFilter === 'ALL' ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: selectedStatus === 'ALL' && priorityFilter === 'ALL' ? '#ffffff' : '#475569',
                }}
              >
                {leads.length}
              </span>
            </button>

            {ALL_STATUSES.map((st) => {
              const cfg = LEAD_STATUS_CONFIG[st];
              const count = leads.filter((l) => l.status === st).length;
              const isSelected = selectedStatus === st;

              return (
                <button
                  key={st}
                  onClick={() => {
                    setSelectedStatus(st);
                    setPriorityFilter('ALL');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    border: isSelected
                      ? '1px solid #0f766e'
                      : '1px solid #e2e8f0',
                    background: isSelected
                      ? 'linear-gradient(135deg, #0f766e, #0d9488)'
                      : '#ffffff',
                    color: isSelected
                      ? '#ffffff'
                      : '#475569',
                    boxShadow: isSelected
                      ? '0 2px 6px rgba(15, 118, 110, 0.25)'
                      : '0 1px 2px rgba(15, 23, 42, 0.03)',
                  }}
                >
                  <span>{cfg.label}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 7px',
                      borderRadius: '9999px',
                      fontWeight: 800,
                      background: isSelected ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#64748b',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 1: CLEAN LIST VIEW (Practical Default) */}
      {viewMode === 'LIST' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Enquiry #</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[180px]">Customer Details</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">Destination & Dates</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[120px]">Travelers</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Current Stage</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Assigned Consultant</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[150px]">Next Follow-Up</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[140px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <tr key={idx} className="skeleton-table-row">
                      <td className="py-3.5 px-4">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div className="skeleton" style={{ width: '85px', height: '14px', borderRadius: '4px' }} />
                          <div className="skeleton skeleton-pill" style={{ width: '80px', height: '18px' }} />
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div className="skeleton" style={{ width: '130px', height: '15px', borderRadius: '4px' }} />
                          <div className="skeleton" style={{ width: '100px', height: '12px', borderRadius: '4px' }} />
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div className="skeleton" style={{ width: '110px', height: '14px', borderRadius: '4px' }} />
                          <div className="skeleton" style={{ width: '130px', height: '12px', borderRadius: '4px' }} />
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="skeleton" style={{ width: '65px', height: '14px', borderRadius: '4px' }} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="skeleton skeleton-pill" style={{ width: '90px', height: '24px' }} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="skeleton" style={{ width: '105px', height: '14px', borderRadius: '4px' }} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="skeleton" style={{ width: '95px', height: '22px', borderRadius: '6px' }} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap min-w-[140px]">
                        <div className="skeleton" style={{ width: '85px', height: '28px', borderRadius: '8px' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 text-sm">{error}</div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">No customer enquiries found</p>
              <p className="text-xs text-slate-400">
                {search || selectedStatus !== 'ALL' || priorityFilter !== 'ALL'
                  ? 'Try clearing your filters or search term to view all records.'
                  : 'Get started by clicking "Add New Enquiry" above.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Enquiry #</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[180px]">Customer Details</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">Destination & Dates</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[120px]">Travelers</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Current Stage</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Assigned Consultant</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[150px]">Next Follow-Up</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[140px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLeads.map((lead) => {
                    const statusCfg = LEAD_STATUS_CONFIG[lead.status] || {
                      label: lead.status,
                      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                      dotClass: 'bg-slate-400',
                    };
                    const sourceCfg = LEAD_SOURCE_CONFIG[lead.source] || {
                      label: lead.source,
                      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                    };

                    const overdue = lead.nextFollowUpDate && isOverdue(lead.nextFollowUpDate);
                    const today = lead.nextFollowUpDate && isToday(lead.nextFollowUpDate);

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => openLeadDrawer(lead)}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                      >
                        {/* Enquiry # and Source */}
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-800 text-xs whitespace-nowrap">
                          <div className="whitespace-nowrap font-bold text-teal-900">{lead.leadNumber}</div>
                          <span className={`inline-block mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${sourceCfg.badgeClass}`}>
                            {sourceCfg.label}
                          </span>
                        </td>

                        {/* Customer Info */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 leading-snug">
                            {lead.customerName || 'Customer'}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            {lead.customerMobile ? (
                              <a
                                href={`tel:${lead.customerMobile}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 hover:text-teal-600 transition-colors font-medium text-slate-700"
                              >
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {lead.customerMobile}
                              </a>
                            ) : (
                              <span className="flex items-center gap-1 text-slate-400 italic text-[11px]">
                                <Phone className="w-3.5 h-3.5 text-slate-300" /> None on file
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Destination & Stay */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                            {sanitizeDisplayName(lead.destinationName) || 'Custom Destination'}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {lead.tentativeTravelDate
                              ? formatDate(lead.tentativeTravelDate)
                              : `${lead.durationNights} Nights Trip`}
                          </div>
                        </td>

                        {/* Travelers */}
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">
                            {lead.numberOfAdults} Adults
                          </span>
                          {lead.numberOfChildren > 0 && (
                            <span className="text-slate-500 block">
                              + {lead.numberOfChildren} Child
                            </span>
                          )}
                        </td>

                        {/* Stage */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                            {statusCfg.label}
                          </span>
                        </td>

                        {/* Assigned Consultant */}
                        <td className="py-3.5 px-4 text-xs">
                          {lead.assignedAgentName ? (
                            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                              {lead.assignedAgentName}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Follow-up */}
                        <td className="py-3.5 px-4 text-xs">
                          {lead.nextFollowUpDate ? (
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${
                                overdue
                                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                                  : today
                                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <Clock className={`w-3.5 h-3.5 ${overdue ? 'text-rose-600' : today ? 'text-amber-600' : 'text-slate-400'}`} />
                              <span>{formatFollowUpDate(lead.nextFollowUpDate)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">None scheduled</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap min-w-[140px]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLeadDrawer(lead);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors shrink-0"
                          >
                            <span>View Enquiry</span>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Luxury Pagination Controls */}
          {filteredLeads.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredLeads.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemName="enquiries"
            />
          )}
        </div>
      )}

      {/* VIEW 2: KANBAN PIPELINE BOARD */}
      {viewMode === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 overflow-x-auto pb-6">
          {ALL_STATUSES.map((st) => {
            const cfg = LEAD_STATUS_CONFIG[st];
            const columnLeads = filteredLeads.filter((l) => l.status === st);

            return (
              <div
                key={st}
                className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex flex-col min-w-[240px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {cfg.label}
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 bg-white border border-slate-200 rounded-full text-slate-700">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[650px] pr-1">
                  {loading ? (
                    <>
                      {[1, 2].map((k) => (
                        <div key={k} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="skeleton" style={{ width: '60px', height: '12px', borderRadius: '4px' }} />
                            <div className="skeleton skeleton-pill" style={{ width: '55px', height: '16px' }} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
                            <div className="skeleton" style={{ width: '85px', height: '11px', borderRadius: '4px' }} />
                          </div>
                          <div className="skeleton" style={{ width: '100%', height: '24px', borderRadius: '6px' }} />
                        </div>
                      ))}
                    </>
                  ) : columnLeads.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 italic">
                      No enquiries
                    </div>
                  ) : (
                    columnLeads.map((lead) => {
                      const sourceCfg = LEAD_SOURCE_CONFIG[lead.source] || {
                        label: lead.source,
                        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                      };
                      const overdue = lead.nextFollowUpDate && isOverdue(lead.nextFollowUpDate);
                      const today = lead.nextFollowUpDate && isToday(lead.nextFollowUpDate);

                      return (
                        <div
                          key={lead.id}
                          onClick={() => openLeadDrawer(lead)}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-300 transition-all cursor-pointer space-y-2.5"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-mono font-bold text-teal-800 whitespace-nowrap">
                              {lead.leadNumber}
                            </span>
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${sourceCfg.badgeClass}`}>
                              {sourceCfg.label}
                            </span>
                          </div>

                          <div>
                            <div className="font-bold text-sm text-slate-900 leading-snug">
                              {lead.customerName || 'Customer'}
                            </div>
                            <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {lead.customerMobile || <span className="text-slate-400 italic">None on file</span>}
                            </div>
                          </div>

                          <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-1 font-semibold text-slate-800">
                              <MapPin className="w-3 h-3 text-teal-600 flex-shrink-0" />
                              <span className="truncate max-w-[130px]">{sanitizeDisplayName(lead.destinationName) || 'Custom'}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {lead.numberOfAdults}A {lead.numberOfChildren > 0 ? `+ ${lead.numberOfChildren}C` : ''}
                            </span>
                          </div>

                          {/* Follow-up reminder indicator */}
                          {lead.nextFollowUpDate && (
                            <div
                              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border font-medium ${
                                overdue
                                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                                  : today
                                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <Clock className={`w-3.5 h-3.5 ${overdue ? 'text-rose-600' : today ? 'text-amber-600' : 'text-slate-400'} flex-shrink-0`} />
                              <span className="truncate">{formatFollowUpDate(lead.nextFollowUpDate)}</span>
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className={`truncate max-w-[120px] font-medium ${lead.assignedAgentName ? 'text-slate-600' : 'text-amber-700'}`}>
                              {lead.assignedAgentName || '⚠️ Unassigned'}
                            </span>
                            <span className="text-teal-700 font-bold flex items-center gap-0.5">
                              View <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: AGENT PERFORMANCE METRICS */}
      {viewMode === 'METRICS' && metrics && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            Conversion & Agency Performance
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total Leads In Pipeline
              </span>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">
                {metrics.assignedLeadsCount}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                {metrics.statusBreakdown.NEW} New Incoming Enquiries
              </span>
            </div>

            <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-xl">
              <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block">
                Overall Lead Conversion Rate
              </span>
              <div className="text-3xl font-extrabold text-teal-800 mt-2">
                {metrics.leadConversionRate}%
              </div>
              <span className="text-xs text-teal-700 font-medium mt-1 block">
                {metrics.statusBreakdown.CONVERTED} Won Tour Bookings
              </span>
            </div>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Proposal Acceptance Rate
              </span>
              <div className="text-3xl font-extrabold text-emerald-800 mt-2">
                {metrics.quoteConversionRate}%
              </div>
              <span className="text-xs text-emerald-700 font-medium mt-1 block">
                {metrics.quotationsAcceptedCount} of {metrics.quotationsCreatedCount} Proposals Accepted
              </span>
            </div>
          </div>
        </div>
      )}

      {/* LEAD DETAILS INTERACTION DRAWER */}
      {isDetailsOpen && selectedLead && (
        <div className="drawer-backdrop" onClick={() => setIsDetailsOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50/80 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {selectedLead.leadNumber}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      LEAD_STATUS_CONFIG[selectedLead.status]?.badgeClass
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${LEAD_STATUS_CONFIG[selectedLead.status]?.dotClass}`} />
                    {LEAD_STATUS_CONFIG[selectedLead.status]?.label}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mt-2">
                  {selectedLead.customerName || 'Customer'}
                </h2>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    {selectedLead.customerMobile || 'None on file'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsDetailsOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Contact & Action Shortcuts */}
            <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-3 gap-2">
              {selectedLead.customerMobile ? (
                <a
                  href={`tel:${selectedLead.customerMobile}`}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold border border-teal-200 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-teal-600" />
                  Call Client
                </a>
              ) : (
                <div
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 text-slate-400 rounded-xl text-xs font-medium border border-slate-200 cursor-not-allowed opacity-60"
                  title="No phone number on file"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-300" />
                  Call Client
                </div>
              )}
              {selectedLead.customerMobile ? (
                <a
                  href={`https://wa.me/91${(selectedLead.customerMobile || '').replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  WhatsApp
                </a>
              ) : (
                <div
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 text-slate-400 rounded-xl text-xs font-medium border border-slate-200 cursor-not-allowed opacity-60"
                  title="No phone number on file"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-slate-300" />
                  WhatsApp
                </div>
              )}
              <Link
                href={`/quotations?leadId=${selectedLead.id}`}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold border border-blue-200 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                Create Quote
              </Link>
            </div>

            {/* Drawer Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Trip Requirement Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" /> Travel Requirement
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Destination</span>
                    <span className="font-bold text-slate-900 text-sm">{sanitizeDisplayName(selectedLead.destinationName) || 'Custom'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Travel Date</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedLead.tentativeTravelDate ? formatDate(selectedLead.tentativeTravelDate) : 'Flexible'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tour Duration</span>
                    <span className="font-bold text-slate-900">{selectedLead.durationNights} Nights</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Travelers Count</span>
                    <span className="font-bold text-slate-900">
                      {selectedLead.numberOfAdults} Adults, {selectedLead.numberOfChildren} Children
                    </span>
                  </div>
                </div>

                {selectedLead.specialRequirements && (
                  <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700 block mb-0.5">Notes / Special Requests:</span>
                    <p className="italic bg-white p-2.5 rounded-lg border border-slate-200">{selectedLead.specialRequirements}</p>
                  </div>
                )}
              </div>

              {/* Assignment & Stage Manager */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" /> Assigned Consultant
                  </h4>
                  <button
                    id="btn-change-consultant"
                    onClick={() => {
                      setReassignLead(selectedLead);
                      setSelectedAgentId(selectedLead.assignedAgentId || '');
                    }}
                    className="text-xs text-teal-700 hover:underline font-semibold"
                  >
                    Change Consultant
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedLead.assignedAgentName || '⚠️ Unassigned'}
                  </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setStatusDialogLead(selectedLead);
                    setTargetStatus('CONTACTED');
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg font-medium text-xs transition border border-slate-200 cursor-pointer shadow-2xs"
                >
                  Mark Contacted
                </button>
                <button
                  onClick={() => {
                    setStatusDialogLead(selectedLead);
                    setTargetStatus('CONVERTED');
                  }}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 rounded-lg font-bold text-xs transition border border-emerald-200 cursor-pointer shadow-2xs"
                >
                  Won / Confirmed
                </button>
                <button
                  onClick={() => {
                    setStatusDialogLead(selectedLead);
                    setTargetStatus('LOST');
                  }}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-800 rounded-lg font-medium text-xs transition border border-rose-200 cursor-pointer shadow-2xs"
                >
                  Not Converted
                </button>
              </div>
                </div>
              </div>

              {/* Schedule Next Follow-Up */}
              <form onSubmit={handleSaveFollowUp} className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Follow-Up Scheduler
                </h4>
                <div className="space-y-2">
                  <input
                    type="datetime-local"
                    value={followUpDate ? followUpDate.slice(0, 16) : ''}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  />
                  <input
                    type="text"
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="Reminder note (e.g., Call customer to discuss hotel options)..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  />
                  <button
                    type="submit"
                    disabled={updatingFollowUp || !followUpDate}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors disabled:opacity-50"
                  >
                    {updatingFollowUp ? 'Saving Schedule...' : 'Save Follow-Up Schedule'}
                  </button>
                </div>
              </form>

              {/* Activity / Interaction Timeline */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-teal-600" /> Interaction Timeline
                </h4>

                {/* Add Note Form */}
                <form onSubmit={handleAddActivity} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={activityType}
                      onChange={(e: any) => setActivityType(e.target.value)}
                      className="text-xs p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700"
                    >
                      <option value="NOTE">General Note</option>
                      <option value="CALL">Phone Call</option>
                      <option value="MEETING">In-Person Meeting</option>
                    </select>
                    <input
                      type="text"
                      value={activityTitle}
                      onChange={(e) => setActivityTitle(e.target.value)}
                      placeholder="Title (e.g. Budget discussed)"
                      className="flex-1 text-xs p-2 bg-white border border-slate-200 rounded-lg"
                      required
                    />
                  </div>
                  <textarea
                    value={activityContent}
                    onChange={(e) => setActivityContent(e.target.value)}
                    placeholder="Enter interaction details..."
                    rows={2}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    required
                  />
                  <button
                    type="submit"
                    disabled={addingActivity}
                    className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-xs transition-colors"
                  >
                    {addingActivity ? 'Adding Note...' : 'Add Note to Timeline'}
                  </button>
                </form>

                {/* Timeline Events List */}
                <div className="space-y-2.5">
                  {selectedLead.timeline && selectedLead.timeline.length > 0 ? (
                    selectedLead.timeline.map((evt, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between items-center text-slate-400 text-[11px]">
                          <span className="font-semibold text-teal-700">{evt.title}</span>
                          <span>{formatDateTime(evt.createdAt)}</span>
                        </div>
                        <p className="text-slate-700">{evt.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-slate-400 py-4 italic">
                      No notes logged yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REASSIGN CONSULTANT MODAL */}
      {reassignLead && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-600" /> Assign / Reassign Consultant
              </h3>
              <button
                type="button"
                onClick={() => setReassignLead(null)}
                className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleReassign} className="modal-body space-y-4">
              {reassignError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {reassignError}
                </div>
              )}
              <p className="text-xs text-slate-600">
                Assign enquiry <strong>{reassignLead.leadNumber}</strong> for customer <strong>{reassignLead.customerName}</strong> to a team member:
              </p>
              <div>
                <label className="form-label font-bold text-slate-700">Select Consultant</label>
                <div className="space-y-1.5 mt-2 max-h-48 overflow-y-auto">
                  {agents.map((ag) => (
                    <button
                      key={ag.id}
                      type="button"
                      id={`btn-select-agent-${ag.id}`}
                      onClick={() => setSelectedAgentId(ag.id)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                        selectedAgentId === ag.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{ag.fullName}</span>
                      <span className="text-slate-400 font-normal">{ag.mobile} ({ag.role})</span>
                    </button>
                  ))}
                </div>
                <input type="hidden" value={selectedAgentId} required />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassignLead(null)}
                  className="btn btn-secondary px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-assignment"
                  type="submit"
                  disabled={reassigning || !selectedAgentId}
                  className="btn btn-primary px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition disabled:opacity-50"
                >
                  {reassigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAGE CHANGE / LOST CONFIRMATION DIALOG */}
      {statusDialogLead && targetStatus && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-teal-600" />
                Change Stage to &ldquo;{LEAD_STATUS_CONFIG[targetStatus]?.label}&rdquo;
              </h3>
              <button
                type="button"
                onClick={() => { setStatusDialogLead(null); setStatusDialogError(null); }}
                className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-body space-y-4">
              <p className="text-xs text-slate-600">
                You are updating enquiry <strong>{statusDialogLead.leadNumber}</strong> ({statusDialogLead.customerName}) to <strong>{LEAD_STATUS_CONFIG[targetStatus]?.label}</strong>.
              </p>

              {statusDialogError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{statusDialogError}</span>
                </div>
              )}

              {targetStatus === 'LOST' && (
                <div>
                  <label className="form-label">Reason Not Converted (Required)</label>
                  <textarea
                    value={lostReason}
                    onChange={(e) => {
                      setLostReason(e.target.value);
                      if (statusDialogError) setStatusDialogError(null);
                    }}
                    placeholder="e.g. Budget mismatch, customer postponed trip, booked with another agency..."
                    rows={3}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setStatusDialogLead(null); setStatusDialogError(null); }}
                  className="btn btn-secondary px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStatusChange}
                  disabled={updatingStatus}
                  className="btn btn-primary px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition disabled:opacity-50"
                >
                  {updatingStatus ? 'Updating...' : 'Confirm Stage Change'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW ENQUIRY MODAL — LUXURY STRUCTURED DESIGN */}
      {isCreateModalOpen && (
        <div className="modal-backdrop">
          <div
            className="modal-container"
            style={{
              maxWidth: '740px',
              width: '95%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35)',
              border: '1.5px solid #cbd5e1',
              overflow: 'hidden',
              background: '#ffffff',
            }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0f766e, #0d9488)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)',
                    flexShrink: 0,
                  }}
                >
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: '17px', margin: 0 }}>
                    Add New Customer Enquiry
                  </h3>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Record client holiday inquiry, assign consultant & schedule follow-up
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="modal-close"
                title="Close modal"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateLead}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
              {modalError && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    color: '#e11d48',
                    borderRadius: '10px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                  }}
                >
                  <AlertCircle size={15} />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Step 1: Customer Contact Info */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <Users size={14} />
                  <span>1. Customer Identity & Source</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Customer Full Name *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                      }}
                      placeholder="e.g. Ramesh Patel"
                      required
                      className={fieldErrors.fullName ? '!border-rose-400 !bg-rose-50/20' : ''}
                    />
                    {fieldErrors.fullName && (
                      <p className="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" /> {fieldErrors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Mobile / WhatsApp Number *</label>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => {
                        setMobile(e.target.value);
                        if (fieldErrors.mobile) setFieldErrors((prev) => ({ ...prev, mobile: '' }));
                      }}
                      placeholder="e.g. 99786 55529 (10-digit mobile)"
                      required
                      className={fieldErrors.mobile ? '!border-rose-400 !bg-rose-50/20' : ''}
                    />
                    {fieldErrors.mobile && (
                      <p className="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" /> {fieldErrors.mobile}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. ramesh.patel@gmail.com"
                    />
                  </div>

                  <div>
                    <label className="form-label">How did customer reach us? (Source)</label>
                    <select
                      value={source}
                      onChange={(e: any) => setSource(e.target.value)}
                    >
                      {ALL_SOURCES.map((src) => (
                        <option key={src} value={src}>
                          {LEAD_SOURCE_CONFIG[src]?.label || src}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 2: Tour & Travel Requirements */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <MapPin size={14} />
                  <span>2. Holiday Destination & Group Size</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Where do they want to travel? *</label>
                    <select
                      value={destinationId}
                      onChange={(e) => {
                        setDestinationId(e.target.value);
                        if (fieldErrors.destinationId) setFieldErrors((prev) => ({ ...prev, destinationId: '' }));
                      }}
                      required
                      className={fieldErrors.destinationId ? '!border-rose-400 !bg-rose-50/20' : ''}
                    >
                      <option value="">-- Choose Holiday Destination --</option>
                      {destinations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {sanitizeDisplayName(d.name)} ({d.state || d.country})
                        </option>
                      ))}
                    </select>
                    {fieldErrors.destinationId && (
                      <p className="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" /> {fieldErrors.destinationId}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Expected Travel Date (Tentative)</label>
                    <input
                      type="date"
                      value={tentativeTravelDate}
                      onChange={(e) => setTentativeTravelDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="form-label">Duration (Nights)</label>
                    <input
                      type="number"
                      min={1}
                      value={durationNights}
                      onChange={(e) => {
                        setDurationNights(Number(e.target.value));
                        if (fieldErrors.durationNights) setFieldErrors((prev) => ({ ...prev, durationNights: '' }));
                      }}
                      className={fieldErrors.durationNights ? '!border-rose-400 !bg-rose-50/20' : ''}
                    />
                    {fieldErrors.durationNights && (
                      <p className="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" /> {fieldErrors.durationNights}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Adults (12+ Yrs)</label>
                    <input
                      type="number"
                      min={1}
                      value={numberOfAdults}
                      onChange={(e) => {
                        setNumberOfAdults(Number(e.target.value));
                        if (fieldErrors.numberOfAdults) setFieldErrors((prev) => ({ ...prev, numberOfAdults: '' }));
                      }}
                      className={fieldErrors.numberOfAdults ? '!border-rose-400 !bg-rose-50/20' : ''}
                    />
                    {fieldErrors.numberOfAdults && (
                      <p className="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" /> {fieldErrors.numberOfAdults}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Kids (Below 12)</label>
                    <input
                      type="number"
                      min={0}
                      value={numberOfChildren}
                      onChange={(e) => setNumberOfChildren(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Assignment & Custom Travel Notes */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <UserCheck size={14} />
                  <span>3. Assignment & Special Preferences</span>
                </div>

                <div>
                  <label className="form-label">Assign to Travel Consultant</label>
                  <select
                    value={assignedAgentId}
                    onChange={(e) => setAssignedAgentId(e.target.value)}
                  >
                    <option value="">-- Keep Unassigned (Direct Admin Queue) --</option>
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.fullName} ({ag.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Customer's Travel Notes & Preferences</label>
                  <textarea
                    value={specialRequirements}
                    onChange={(e) => setSpecialRequirements(e.target.value)}
                    placeholder="e.g. Pure Veg Jain meals, 4-star hotel with bathtub, private AC Innova cab, honeymoon flower decoration..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer Docked */}
              <div
                style={{
                  padding: '16px 28px',
                  background: '#f8fafc',
                  borderTop: '1.5px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '13.5px', padding: '9px 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{
                    fontSize: '13.5px',
                    padding: '9px 22px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(15, 118, 110, 0.28)',
                  }}
                >
                  <Plus size={16} />
                  <span>{submitting ? 'Recording Enquiry...' : 'Save & Add Enquiry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
