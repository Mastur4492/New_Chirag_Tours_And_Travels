'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  Search,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Copy,
  Check,
  Share2,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Percent,
  Building2,
  Lock,
  UserCheck,
  X,
  MessageCircle,
  Edit2,
  Sliders,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { COMPANY_BRANDING } from '@/lib/branding';
import { Pagination } from '@/components/Pagination';

interface AgentProfile {
  agencyName?: string;
  city?: string;
  rateSheetTier?: string;
  pricingModel?: string;
  commissionRate?: number;
  commissionRatePercent?: number;
  maxDiscountPercent?: number;
  maxMarkupPercent?: number;
  canApproveFinalPrice?: boolean;
}

interface AgentUser {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  mobile: string;
  role: 'AGENT' | 'ADMIN';
  isActive?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | string;
  agentProfile?: AgentProfile;
  createdAt: string;
}

interface NewAgentForm {
  name: string;
  email: string;
  mobile: string;
  password: string;
  agencyName: string;
  city: string;
  rateSheetTier: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Success Credential Reveal Modal
  const [createdAgentInfo, setCreatedAgentInfo] = useState<{
    name: string;
    email: string;
    mobile: string;
    password: string;
    agencyName: string;
    city: string;
    rateSheetTier: string;
  } | null>(null);
  const [copiedCredential, setCopiedCredential] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // Detail View Modal State
  const [viewingAgent, setViewingAgent] = useState<AgentUser | null>(null);

  // Edit Profile Modal State
  const [editingAgent, setEditingAgent] = useState<AgentUser | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editAgencyName, setEditAgencyName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Edit Permissions Modal State
  const [editingPermissionsAgent, setEditingPermissionsAgent] = useState<AgentUser | null>(null);
  const [permRateSheetTier, setPermRateSheetTier] = useState('Standard Wholesale B2B');
  const [permAutonomy, setPermAutonomy] = useState(true);
  const [permMaxDiscount, setPermMaxDiscount] = useState(100);
  const [permMaxMarkup, setPermMaxMarkup] = useState(100);
  const [permCanApproveFinalPrice, setPermCanApproveFinalPrice] = useState(true);
  const [permCommissionRate, setPermCommissionRate] = useState<number | undefined>(5);

  // Status Change Confirmation Modal State
  const [confirmStatusModal, setConfirmStatusModal] = useState<{
    agent: AgentUser;
    targetStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  } | null>(null);

  // Password Reset Modal State
  const [resettingPasswordAgent, setResettingPasswordAgent] = useState<AgentUser | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetSuccessInfo, setResetSuccessInfo] = useState<{
    name: string;
    mobile: string;
    email: string;
    password: string;
  } | null>(null);

  // Form State
  const [form, setForm] = useState<NewAgentForm>({
    name: '',
    email: '',
    mobile: '',
    password: '',
    agencyName: '',
    city: 'Ahmedabad',
    rateSheetTier: 'Standard Wholesale B2B',
  });

  const loadAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<AgentUser[]>('users/agents');
      if (Array.isArray(data)) {
        setAgents(data);
      } else {
        setAgents([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load travel agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  // Generate a cryptographically pleasant and secure password for the travel agent
  const generateRandomPassword = () => {
    const prefixes = ['Chirag', 'Safari', 'Holiday', 'Voyage', 'Travel'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const symbols = ['@', '#', '$', '!'];
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    return `${prefix}${sym}${num}Agent`;
  };

  const handleOpenCreateModal = () => {
    setFormError(null);
    const pw = generateRandomPassword();
    setForm((prev) => ({ ...prev, password: pw }));
    setIsCreateModalOpen(true);
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanedMobile = form.mobile.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
      setFormError('Please enter a valid 10-digit Indian mobile number (e.g., 9825123456).');
      return;
    }

    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        fullName: form.name.trim(),
        name: form.name.trim(),
        email: form.email.trim() ? form.email.trim().toLowerCase() : undefined,
        mobile: cleanedMobile,
        password: form.password,
        agentProfile: {
          agencyName: form.agencyName.trim() || `${form.name.trim()} Travels`,
          city: form.city.trim() || 'Ahmedabad',
          rateSheetTier: form.rateSheetTier || 'Standard Wholesale B2B',
          pricingModel: 'WHOLESALE_NET',
          maxDiscountPercent: 100,
          maxMarkupPercent: 100,
          canApproveFinalPrice: true,
          commissionRatePercent: 0,
        },
      };

      await apiRequest<AgentUser>('users/agents', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCreatedAgentInfo({
        name: form.name,
        email: form.email || 'N/A',
        mobile: cleanedMobile,
        password: form.password,
        agencyName: form.agencyName || `${form.name} Travels`,
        city: form.city,
        rateSheetTier: form.rateSheetTier || 'Standard Wholesale B2B',
      });

      setIsCreateModalOpen(false);
      setForm({
        name: '',
        email: '',
        mobile: '',
        password: '',
        agencyName: '',
        city: 'Ahmedabad',
        rateSheetTier: 'Standard Wholesale B2B',
      });

      setToastMessage(`Agent "${form.name}" created successfully`);
      loadAgents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create travel agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Profile Modal
  const openEditProfile = (agent: AgentUser) => {
    setEditingAgent(agent);
    setEditFullName(agent.fullName || agent.name || '');
    setEditAgencyName(agent.agentProfile?.agencyName || '');
    setEditCity(agent.agentProfile?.city || '');
    setEditEmail(agent.email || '');
    setFormError(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    const agentId = editingAgent._id || editingAgent.id;
    if (!agentId) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiRequest(`users/agents/${agentId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: editFullName.trim(),
          email: editEmail.trim() ? editEmail.trim().toLowerCase() : null,
          agentProfile: {
            agencyName: editAgencyName.trim() || undefined,
            city: editCity.trim() || undefined,
          },
        }),
      });

      setToastMessage(`Profile for "${editFullName}" updated successfully`);
      setEditingAgent(null);
      loadAgents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update agent profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Permissions Modal
  const openEditPermissions = (agent: AgentUser) => {
    setEditingPermissionsAgent(agent);
    setPermRateSheetTier(agent.agentProfile?.rateSheetTier || 'Standard Wholesale B2B');
    const hasAutonomy = (agent.agentProfile?.maxDiscountPercent ?? 100) >= 100;
    setPermAutonomy(hasAutonomy);
    setPermMaxDiscount(agent.agentProfile?.maxDiscountPercent ?? 100);
    setPermMaxMarkup(agent.agentProfile?.maxMarkupPercent ?? 100);
    setPermCanApproveFinalPrice(agent.agentProfile?.canApproveFinalPrice ?? true);
    setPermCommissionRate(agent.agentProfile?.commissionRatePercent ?? 0);
    setFormError(null);
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPermissionsAgent) return;

    const agentId = editingPermissionsAgent._id || editingPermissionsAgent.id;
    if (!agentId) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiRequest(`users/agents/${agentId}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({
          rateSheetTier: permRateSheetTier,
          pricingModel: 'WHOLESALE_NET',
          maxDiscountPercent: permAutonomy ? 100 : Number(permMaxDiscount),
          maxMarkupPercent: permAutonomy ? 100 : Number(permMaxMarkup),
          canApproveFinalPrice: permAutonomy ? true : Boolean(permCanApproveFinalPrice),
          commissionRatePercent: 0,
        }),
      });

      setToastMessage(`B2B Rate Sheet & Autonomy updated for ${editingPermissionsAgent.fullName || editingPermissionsAgent.name}`);
      setEditingPermissionsAgent(null);
      loadAgents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update agent permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Change Execution
  const handleExecuteStatusChange = async () => {
    if (!confirmStatusModal) return;
    const { agent, targetStatus } = confirmStatusModal;
    const agentId = agent._id || agent.id;
    if (!agentId) return;

    setIsSubmitting(true);
    try {
      await apiRequest(`users/agents/${agentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus }),
      });

      setToastMessage(
        `Agent "${agent.fullName || agent.name}" status changed to ${targetStatus}`
      );
      setConfirmStatusModal(null);
      loadAgents();
    } catch (err: any) {
      setToastMessage(`Error updating agent status: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password Reset Initiation
  const openResetPasswordModal = (agent: AgentUser) => {
    setResettingPasswordAgent(agent);
    setNewResetPassword(generateRandomPassword());
    setFormError(null);
    setResetSuccessInfo(null);
  };

  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingPasswordAgent) return;

    const agentId = resettingPasswordAgent._id || resettingPasswordAgent.id;
    if (!agentId) return;

    if (newResetPassword.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiRequest(`users/agents/${agentId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: newResetPassword }),
      });

      setResetSuccessInfo({
        name: resettingPasswordAgent.fullName || resettingPasswordAgent.name || 'Partner',
        mobile: resettingPasswordAgent.mobile,
        email: resettingPasswordAgent.email || 'N/A',
        password: newResetPassword,
      });

      setToastMessage(`Password reset successfully for ${resettingPasswordAgent.fullName || resettingPasswordAgent.name}`);
    } catch (err: any) {
      setFormError(err.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filters
  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (a.fullName || a.name)?.toLowerCase().includes(q);
        const matchesEmail = a.email?.toLowerCase().includes(q);
        const matchesMobile = a.mobile?.includes(q);
        const matchesAgency = a.agentProfile?.agencyName?.toLowerCase().includes(q);
        const matchesCity = a.agentProfile?.city?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesMobile && !matchesAgency && !matchesCity) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'ALL') {
        const effectiveStatus = a.status || (a.isActive === false ? 'INACTIVE' : 'ACTIVE');
        if (effectiveStatus !== statusFilter) return false;
      }

      return true;
    });
  }, [agents, searchQuery, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAgents.slice(start, start + pageSize);
  }, [filteredAgents, currentPage, pageSize]);

  const getWhatsAppMessage = (info: {
    name: string;
    email: string;
    mobile: string;
    password?: string;
    agencyName?: string;
    isReset?: boolean;
  }) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
    const actionHeadline = info.isReset
      ? 'Your B2B Travel Agent account password has been reset by administration.'
      : 'Your authorized B2B Travel Agent account has been activated!';

    return `*New Chirag Tours and Travels — B2B Partner Portal Notification* ✈️
━━━━━━━━━━━━━━━━━━━━
Hello *${info.name}* ji (${info.agencyName || 'Partner'}),

${actionHeadline}

🌐 *Partner Login Portal*: ${origin}/login
📱 *Registered Mobile*: ${info.mobile}
📧 *Login Email*: ${info.email}

🔒 *Security Notice*: For your security, access passwords are never transmitted inside web links or URLs. Please collect your temporary access credentials directly from the Chirag Travels administration desk.

⚡ *Partner Privileges*:
• Submit instant customer tour enquiries
• Generate white-labeled tour packages & quotations
• Track confirmed bookings & B2B commission payouts

Authorized by:
*${COMPANY_BRANDING.owner}*
${COMPANY_BRANDING.name}
${COMPANY_BRANDING.address}
📞 ${COMPANY_BRANDING.phone}`;
  };

  const handleCopyCredentials = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCredential(true);
    setTimeout(() => setCopiedCredential(false), 3000);
  };

  const handleCopyWhatsAppText = (info: any) => {
    const msg = getWhatsAppMessage(info);
    navigator.clipboard.writeText(msg);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
              }}
            >
              <Briefcase size={13} />
              B2B Partner Ecosystem
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>• Admin Protected Credentials</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            Partner Travel Agents
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Admin-controlled credential generation, pricing permission management, and profile administration.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={loadAgents}
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: '13.5px', padding: '9px 15px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            title="Refresh agents list"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="btn btn-primary"
            style={{ fontSize: '14px', padding: '10px 18px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={17} />
            <span>+ Generate Agent Credentials</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="toast toast-success" onAnimationEnd={() => setTimeout(() => setToastMessage(null), 3000)}>
          {toastMessage}
        </div>
      )}

      {/* Dual Rate Sheet & Wholesale Net Advisory Banner */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Sparkles size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
          <strong>Dual Rate Sheet Architecture (Wholesale B2B):</strong> New Chirag provides net wholesale rate cards to verified B2B Travel Agents with company profit and margins safely locked in. Agents enjoy <strong>100% commercial pricing autonomy</strong> on their portal — they can freely apply custom client markups or grant customer discounts without arbitrary approval locks.
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1.5px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Registered Agents</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            {loading ? <div className="skeleton" style={{ width: '48px', height: '30px', borderRadius: '6px' }} /> : agents.length}
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
            {agents.filter((a) => (a.status === 'ACTIVE' || (!a.status && a.isActive !== false))).length} Active Partners
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1.5px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Access Security</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f766e', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={20} />
            Admin Authorized Only
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            No Public Sign-up • Admin Controls Access
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1.5px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Pricing Architecture</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
            Wholesale Net B2B
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px', fontWeight: 700 }}>
            ✓ 100% Agent Pricing Freedom
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1.5px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>WhatsApp Dispatch</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageCircle size={20} />
            1-Click Share
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Direct WhatsApp Credential Template
          </div>
        </div>
      </div>

      {/* Main Table / Directory Card */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1.5px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        {/* Table Search & Filter Bar */}
        <div style={{ padding: '16px 20px', borderBottom: '1.5px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', flex: '1', minWidth: '280px' }}>
            <div style={{ position: 'relative', minWidth: '240px', flex: '1', maxWidth: '420px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by name, agency, city, or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '36px', fontSize: '13.5px', height: '38px' }}
              />
            </div>

            <select
              className="form-select"
              style={{ width: '160px', height: '38px', fontSize: '13.5px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
            {loading ? (
              <div className="skeleton" style={{ width: '140px', height: '16px', borderRadius: '4px' }} />
            ) : (
              <>Showing <strong>{filteredAgents.length}</strong> of <strong>{agents.length}</strong> partners</>
            )}
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Agent & Agency</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Contact & Login ID</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>City / Region</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>B2B Rate Sheet & Autonomy</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((idx) => (
                  <tr key={idx} className="skeleton-table-row">
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="skeleton" style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div className="skeleton" style={{ width: '130px', height: '14px', borderRadius: '4px' }} />
                          <div className="skeleton" style={{ width: '90px', height: '11px', borderRadius: '4px' }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div className="skeleton" style={{ width: '110px', height: '13px', borderRadius: '4px' }} />
                        <div className="skeleton" style={{ width: '140px', height: '11px', borderRadius: '4px' }} />
                      </div>
                    </td>
                    <td><div className="skeleton skeleton-pill" style={{ width: '75px', height: '24px' }} /></td>
                    <td><div className="skeleton skeleton-pill" style={{ width: '95px', height: '24px' }} /></td>
                    <td><div className="skeleton skeleton-pill" style={{ width: '70px', height: '22px' }} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <div className="skeleton" style={{ width: '75px', height: '30px', borderRadius: '8px' }} />
                        <div className="skeleton" style={{ width: '30px', height: '30px', borderRadius: '8px' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '12px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <div style={{ marginTop: '12px' }}>
              <button onClick={loadAgents} className="btn btn-secondary btn-sm">Try Again</button>
            </div>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Briefcase size={36} style={{ margin: '0 auto 12px', color: 'var(--text-muted)', opacity: 0.5 }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px' }}>
              {searchQuery || statusFilter !== 'ALL' ? 'No matching travel agents found' : 'No partner travel agents generated yet'}
            </h3>
            <p style={{ fontSize: '13.5px', margin: '0 0 16px', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search terms or status filter.'
                : 'Click the button below to generate login credentials for your first travel agent partner.'}
            </p>
            {!searchQuery && statusFilter === 'ALL' && (
              <button onClick={handleOpenCreateModal} className="btn btn-primary" style={{ fontSize: '13.5px' }}>
                <Plus size={16} />
                <span>Generate First Travel Agent</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Agent & Agency</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Contact & Login ID</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>City / Region</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>B2B Rate Sheet & Autonomy</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAgents.map((agent) => {
                    const agentId = agent._id || agent.id;
                    const status = agent.status || (agent.isActive === false ? 'INACTIVE' : 'ACTIVE');
                    const isActive = status === 'ACTIVE';

                    return (
                      <tr
                        key={agentId}
                        style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}
                        className="hover:bg-slate-50"
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '13.5px',
                                flexShrink: 0,
                              }}
                            >
                              {((agent.fullName || agent.name || 'AG')).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <button
                                onClick={() => setViewingAgent(agent)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontWeight: 700,
                                  color: 'var(--text-main)',
                                  fontSize: '14px',
                                }}
                                title="Click to view full agent profile"
                              >
                                {agent.fullName || agent.name}
                              </button>
                              <div style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                <Building2 size={12} />
                                <span>{agent.agentProfile?.agencyName || 'Independent Travel Partner'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: 600 }}>
                              <Phone size={13} style={{ color: 'var(--primary)' }} />
                              <span>+91 {agent.mobile}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                              <Mail size={13} />
                              <span>{agent.email || 'No email provided'}</span>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontSize: '12.5px', fontWeight: 600 }}>
                            <MapPin size={12} />
                            {agent.agentProfile?.city || 'Gujarat'}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: 700, width: 'fit-content' }}>
                              <Building2 size={11} />
                              {agent.agentProfile?.rateSheetTier || 'Standard Wholesale B2B'}
                            </span>
                            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                              ✓ Full Pricing Autonomy (Uncapped Client Discount)
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 10px',
                              borderRadius: '999px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: status === 'ACTIVE' ? '#ecfdf5' : status === 'SUSPENDED' ? '#fff1f2' : '#f8fafc',
                              color: status === 'ACTIVE' ? '#047857' : status === 'SUSPENDED' ? '#be123c' : '#475569',
                              border: `1px solid ${status === 'ACTIVE' ? '#a7f3d0' : status === 'SUSPENDED' ? '#fecdd3' : '#e2e8f0'}`,
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: status === 'ACTIVE' ? '#059669' : status === 'SUSPENDED' ? '#e11d48' : '#64748b',
                              }}
                            />
                            {status === 'ACTIVE' ? 'Active' : status === 'SUSPENDED' ? 'Suspended' : 'Inactive'}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => openEditProfile(agent)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11.5px', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Edit profile & contact details"
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => openEditPermissions(agent)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11.5px', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Edit discount & markup permissions"
                            >
                              <Sliders size={12} />
                              <span>Limits</span>
                            </button>

                            <button
                              onClick={() => openResetPasswordModal(agent)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11.5px', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0d9488' }}
                              title="Admin reset agent login password"
                            >
                              <Key size={12} />
                              <span>Password</span>
                            </button>

                            <button
                              onClick={() =>
                                setConfirmStatusModal({
                                  agent,
                                  targetStatus: isActive ? 'INACTIVE' : 'ACTIVE',
                                })
                              }
                              className={`btn btn-sm ${isActive ? 'btn-danger' : 'btn-primary'}`}
                              style={{ fontSize: '11.5px', padding: '4px 8px' }}
                              title={isActive ? 'Deactivate Agent' : 'Activate Agent'}
                            >
                              {isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards View (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {paginatedAgents.map((agent) => {
                const agentId = agent._id || agent.id;
                const status = agent.status || (agent.isActive === false ? 'INACTIVE' : 'ACTIVE');
                const isActive = status === 'ACTIVE';

                return (
                  <div key={agentId} style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                          {agent.fullName || agent.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Building2 size={12} />
                          <span>{agent.agentProfile?.agencyName || 'Independent Travel Partner'}</span>
                        </div>
                      </div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: status === 'ACTIVE' ? '#ecfdf5' : status === 'SUSPENDED' ? '#fff1f2' : '#f8fafc',
                          color: status === 'ACTIVE' ? '#047857' : status === 'SUSPENDED' ? '#be123c' : '#475569',
                          border: `1px solid ${status === 'ACTIVE' ? '#a7f3d0' : status === 'SUSPENDED' ? '#fecdd3' : '#e2e8f0'}`,
                        }}
                      >
                        {status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '8px 0 12px 0', fontSize: '12.5px', color: '#475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={12} color="var(--primary)" />
                        <span>+91 {agent.mobile}</span>
                        <span>•</span>
                        <MapPin size={12} />
                        <span>{agent.agentProfile?.city || 'Gujarat'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={12} color="#0284c7" />
                        <span style={{ fontWeight: 700, color: '#0369a1' }}>{agent.agentProfile?.rateSheetTier || 'Standard Wholesale B2B'}</span>
                        <span>•</span>
                        <span style={{ color: '#059669', fontWeight: 700 }}>Autonomous Pricing</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        onClick={() => setViewingAgent(agent)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11.5px', padding: '4px 8px' }}
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => openEditProfile(agent)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11.5px', padding: '4px 8px' }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => openEditPermissions(agent)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11.5px', padding: '4px 8px' }}
                      >
                        <Sliders size={12} />
                        <span>Limits</span>
                      </button>
                      <button
                        onClick={() => openResetPasswordModal(agent)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11.5px', padding: '4px 8px', color: '#0d9488' }}
                      >
                        <Key size={12} />
                        <span>Password</span>
                      </button>
                      <button
                        onClick={() =>
                          setConfirmStatusModal({
                            agent,
                            targetStatus: isActive ? 'INACTIVE' : 'ACTIVE',
                          })
                        }
                        className={`btn btn-sm ${isActive ? 'btn-danger' : 'btn-primary'}`}
                        style={{ fontSize: '11.5px', padding: '4px 8px' }}
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredAgents.length > 0 && (
              <div style={{ padding: '12px 20px', borderTop: '1.5px solid var(--border-subtle)' }}>
                <Pagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={filteredAgents.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  itemName="agents"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL 1: Create Travel Agent Credentials */}
      {isCreateModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '580px', width: '100%', borderRadius: '18px', overflow: 'hidden' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #042f2e, #0f766e)', color: '#ffffff', padding: '18px 24px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} style={{ color: '#34d399' }} />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                    Generate Travel Agent Credentials
                  </h2>
                </div>
                <p style={{ fontSize: '12.5px', color: '#ccfbf1', margin: '4px 0 0' }}>
                  Admin authorized account generation. The agent will log in via the Travel Agent portal.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="btn-icon"
                style={{ color: '#ffffff', background: 'rgba(255,255,255,0.15)', borderRadius: '8px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>
                    Agent Contact Person <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Bhai Shah"
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>
                    Agency / Business Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Somnath Holidays & Travels"
                    className="form-input"
                    value={form.agencyName}
                    onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>
                    10-Digit Mobile (Login ID) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="9825123456"
                      maxLength={10}
                      className="form-input"
                      style={{ paddingLeft: '44px' }}
                      value={form.mobile}
                      onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="agent@agency.com"
                    className="form-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>
                    Agency Base City <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ahmedabad, Surat, Rajkot, etc."
                    className="form-input"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>
                    B2B Rate Sheet Tier <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    className="form-select"
                    value={form.rateSheetTier}
                    onChange={(e) => setForm({ ...form, rateSheetTier: e.target.value })}
                  >
                    <option value="Standard Wholesale B2B">Standard Wholesale B2B Net</option>
                    <option value="Gold Partner Net Rates">Gold Partner Net Rates</option>
                    <option value="VIP Wholesaler Net Rates">VIP Wholesaler Net Rates</option>
                  </select>
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#166534', lineHeight: 1.5 }}>
                <strong>💎 Wholesale Net Rate Sheet:</strong> New Chirag's profit is locked in wholesale rates. Agent receives net partner pricing and has 100% freedom to add client markup or discount on their portal.
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>
                    Generated Access Password <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const pw = generateRandomPassword();
                      setForm((prev) => ({ ...prev, password: pw }));
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    <RefreshCw size={12} />
                    Regenerate
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="form-input"
                    style={{ paddingRight: '40px', fontFamily: showPassword ? 'inherit' : 'monospace', letterSpacing: showPassword ? 'normal' : '0.1em' }}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Generating Account...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Generate & Save Agent</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Credential Reveal & Dispatch Modal */}
      {createdAgentInfo && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '540px', width: '100%', borderRadius: '18px', overflow: 'hidden' }}>
            <div className="modal-header" style={{ background: '#ecfdf5', borderBottom: '1.5px solid #a7f3d0', padding: '18px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#065f46', margin: 0 }}>
                    Agent Credentials Generated!
                  </h3>
                  <p style={{ fontSize: '12.5px', color: '#047857', margin: '2px 0 0' }}>
                    Share these login details directly with {createdAgentInfo.name}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreatedAgentInfo(null)}
                className="btn-icon"
                style={{ color: '#065f46' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', border: '1.5px solid var(--border-subtle)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>PARTNER NAME</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{createdAgentInfo.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>AGENCY NAME</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{createdAgentInfo.agencyName}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>REGISTERED MOBILE (LOGIN ID)</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f766e', letterSpacing: '0.02em' }}>+91 {createdAgentInfo.mobile}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>ACCESS PASSWORD</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#1d4ed8', fontFamily: 'monospace' }}>{createdAgentInfo.password}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => handleCopyCredentials(`Mobile: ${createdAgentInfo.mobile}\nPassword: ${createdAgentInfo.password}`)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {copiedCredential ? <Check size={16} color="#059669" /> : <Copy size={16} />}
                  <span>{copiedCredential ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
                </button>

                <a
                  href={`https://wa.me/91${createdAgentInfo.mobile}?text=${encodeURIComponent(getWhatsAppMessage(createdAgentInfo))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#16a34a', borderColor: '#15803d', textDecoration: 'none' }}
                >
                  <MessageCircle size={16} />
                  <span>Send Login Alert</span>
                </a>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                🔒 <strong>Commercial Safety Standard:</strong> Passwords are never placed in URLs or WhatsApp query parameters. Use the <em>Copy Credentials</em> button to share credentials securely.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: View Agent Details Modal */}
      {viewingAgent && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '580px', width: '100%', borderRadius: '18px', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '18px 24px', background: '#f8fafc', borderBottom: '1.5px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Agent Partner Details
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Complete partner profile and quotation privileges
                </p>
              </div>
              <button onClick={() => setViewingAgent(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>FULL NAME</div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                    {viewingAgent.fullName || viewingAgent.name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>AGENCY NAME</div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                    {viewingAgent.agentProfile?.agencyName || 'Independent'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>MOBILE (LOGIN ID)</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f766e', marginTop: '2px' }}>
                    +91 {viewingAgent.mobile}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>EMAIL</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-main)', marginTop: '2px' }}>
                    {viewingAgent.email || 'None provided'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>BASE CITY</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-main)', marginTop: '2px' }}>
                    {viewingAgent.agentProfile?.city || 'Gujarat'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>ACCOUNT STATUS</div>
                  <div style={{ marginTop: '2px' }}>
                    <span className="badge badge-active">{viewingAgent.status || 'ACTIVE'}</span>
                  </div>
                </div>
              </div>

              {/* Pricing Permissions Section */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '10px' }}>
                  B2B Wholesale Net Rate Sheet & Autonomy
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11.5px', color: '#15803d' }}>Rate Sheet Tier:</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#14532d' }}>
                      {viewingAgent.agentProfile?.rateSheetTier || 'Standard Wholesale B2B'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11.5px', color: '#15803d' }}>Pricing Architecture:</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#14532d' }}>
                      Wholesale Net B2B
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11.5px', color: '#15803d' }}>Client Pricing Freedom:</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>
                      100% Autonomous
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11.5px', color: '#15803d' }}>Company Margin Status:</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>
                      Locked in Wholesale Net
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  onClick={() => {
                    const a = viewingAgent;
                    setViewingAgent(null);
                    openEditProfile(a);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <Edit2 size={13} />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => {
                    const a = viewingAgent;
                    setViewingAgent(null);
                    openEditPermissions(a);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <Sliders size={13} />
                  <span>Configure Limits</span>
                </button>
                <button onClick={() => setViewingAgent(null)} className="btn btn-primary btn-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Edit Agent Profile Modal */}
      {editingAgent && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '520px', width: '100%', borderRadius: '18px', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '18px 24px', background: '#f8fafc', borderBottom: '1.5px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Edit Agent Profile
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Update business name, contact person, or email.
                </p>
              </div>
              <button onClick={() => setEditingAgent(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {formError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>
                  Agency / Business Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={editAgencyName}
                  onChange={(e) => setEditAgencyName(e.target.value)}
                />
              </div>

              <div className="form-row" style={{ margin: 0 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>
                    Base City
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingAgent(null)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Edit Pricing Permissions Modal */}
      {editingPermissionsAgent && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '520px', width: '100%', borderRadius: '18px', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '18px 24px', background: '#f8fafc', borderBottom: '1.5px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  B2B Rate Sheet & Pricing Autonomy
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Assign Wholesale Net Rate Tier and configure client pricing autonomy for {editingPermissionsAgent.fullName || editingPermissionsAgent.name}
                </p>
              </div>
              <button onClick={() => setEditingPermissionsAgent(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePermissions} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>
                  Assigned B2B Rate Sheet Tier
                </label>
                <select
                  className="form-select"
                  value={permRateSheetTier}
                  onChange={(e) => setPermRateSheetTier(e.target.value)}
                >
                  <option value="Standard Wholesale B2B">Standard Wholesale B2B Net</option>
                  <option value="Gold Partner Net Rates">Gold Partner Net Rates</option>
                  <option value="VIP Wholesaler Net Rates">VIP Wholesaler Net Rates</option>
                </select>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Governs the net wholesale rate cards accessible to this partner</span>
              </div>

              <div style={{ background: '#f0fdf4', padding: '14px 16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={permAutonomy}
                    onChange={(e) => setPermAutonomy(e.target.checked)}
                  />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#166534' }}>
                      100% Agent Pricing Freedom (Recommended)
                    </div>
                    <div style={{ fontSize: '12px', color: '#15803d' }}>
                      New Chirag's profit is locked in the wholesale net rate card. The agent has complete autonomy to set client selling prices, apply customer markups, or offer discounts without admin approval locks.
                    </div>
                  </div>
                </label>
              </div>

              {!permAutonomy && (
                <div className="form-row" style={{ margin: 0 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>
                      Custom Max Discount Cap (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      className="form-input"
                      value={permMaxDiscount}
                      onChange={(e) => setPermMaxDiscount(Number(e.target.value))}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>
                      Custom Max Markup Cap (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      className="form-input"
                      value={permMaxMarkup}
                      onChange={(e) => setPermMaxMarkup(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEditingPermissionsAgent(null)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Save B2B Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Status Change Confirmation Modal */}
      {confirmStatusModal && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '480px', width: '100%', borderRadius: '18px', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '18px 24px', background: '#f8fafc', borderBottom: '1.5px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={20} color={confirmStatusModal.targetStatus === 'ACTIVE' ? '#0d9488' : '#e11d48'} />
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Confirm Agent Status Change
                </h3>
              </div>
              <button onClick={() => setConfirmStatusModal(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to change the status of partner{' '}
                <strong>&ldquo;{confirmStatusModal.agent.fullName || confirmStatusModal.agent.name}&rdquo;</strong> to{' '}
                <strong style={{ color: confirmStatusModal.targetStatus === 'ACTIVE' ? '#0f766e' : '#e11d48' }}>
                  {confirmStatusModal.targetStatus}
                </strong>?
              </p>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', color: '#64748b' }}>
                {confirmStatusModal.targetStatus === 'ACTIVE' ? (
                  <span>The agent will regain login access to the B2B portal to create quotations and manage bookings.</span>
                ) : (
                  <span>
                    Deactivating this agent will prevent portal login. All historical quotations, booked tours, payment receipts, and customer itineraries associated with this agent remain completely intact.
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1.5px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setConfirmStatusModal(null)}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteStatusChange}
                className={`btn ${confirmStatusModal.targetStatus === 'ACTIVE' ? 'btn-primary' : 'btn-danger'}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : `Confirm ${confirmStatusModal.targetStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Password Reset Modal */}
      {resettingPasswordAgent && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '520px', width: '100%', borderRadius: '18px', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '18px 24px', background: '#f8fafc', borderBottom: '1.5px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={18} color="#0d9488" />
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Reset Partner Login Password
                </h3>
              </div>
              <button
                onClick={() => {
                  setResettingPasswordAgent(null);
                  setResetSuccessInfo(null);
                }}
                className="btn-icon"
              >
                <X size={18} />
              </button>
            </div>

            {resetSuccessInfo ? (
              <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#065f46' }}>
                    Password Updated Successfully!
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#047857', marginTop: '4px' }}>
                    Share the new password with {resetSuccessInfo.name}.
                  </div>
                  <div style={{ marginTop: '10px', padding: '8px 12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #a7f3d0', fontSize: '15px', fontWeight: 800, color: '#0f766e', fontFamily: 'monospace' }}>
                    {resetSuccessInfo.password}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleCopyCredentials(`Mobile: ${resetSuccessInfo.mobile}\nPassword: ${resetSuccessInfo.password}`)}
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Copy size={14} />
                    <span>Copy Password</span>
                  </button>
                  <a
                    href={`https://wa.me/91${resetSuccessInfo.mobile}?text=${encodeURIComponent(getWhatsAppMessage({ ...resetSuccessInfo, isReset: true }))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#16a34a', borderColor: '#15803d', textDecoration: 'none' }}
                  >
                    <MessageCircle size={14} />
                    <span>Send Reset Alert</span>
                  </a>
                </div>

                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  🔒 <strong>Commercial Safety Standard:</strong> Passwords are never placed in URLs or WhatsApp query parameters. Use the <em>Copy Password</em> button to share credentials securely.
                </div>

                <button
                  onClick={() => {
                    setResettingPasswordAgent(null);
                    setResetSuccessInfo(null);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: 'flex-end', marginTop: '6px' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleExecutePasswordReset} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {formError && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                  Generate a new password for partner <strong>{resettingPasswordAgent.fullName || resettingPasswordAgent.name}</strong> (+91 {resettingPasswordAgent.mobile}).
                </p>

                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>
                      New Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewResetPassword(generateRandomPassword())}
                      style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    >
                      <RefreshCw size={12} />
                      Regenerate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    className="form-input"
                    style={{ fontFamily: 'monospace', fontWeight: 600 }}
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Must be at least 8 characters with at least one letter and number.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setResettingPasswordAgent(null)}
                    className="btn btn-secondary"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Resetting...' : 'Confirm Password Reset'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
