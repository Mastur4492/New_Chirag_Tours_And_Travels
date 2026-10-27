'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Edit2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserCheck,
  ChevronRight,
  BookCheck,
  FileSpreadsheet,
  X,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { CustomerDto, UserRole } from '@chirag/types';
import { apiRequest } from '@/lib/api';
import { Pagination } from '@/components/Pagination';
import { formatDate, formatDateTime, sanitizeDisplayName } from '@/lib/labels';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // Customer Profile Drawer
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);

  // Modal State - Create & Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDto | null>(null);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState<'ADMIN_DIRECT' | 'AGENT' | 'CUSTOMER_WEB' | 'CUSTOMER_APP'>('ADMIN_DIRECT');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchCustomers = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', currentPage.toString());
      queryParams.set('limit', pageSize.toString());
      if (debouncedSearch) {
        queryParams.set('search', debouncedSearch);
      }

      const res = await apiRequest<{ data: CustomerDto[]; meta: { total: number } }>(
        `/customers?${queryParams.toString()}`
      );

      // Handle both raw array or wrapped { data, meta } response
      const list = Array.isArray(res) ? res : (res as any).data || [];
      const total = (res as any).meta?.total ?? list.length;

      setCustomers(list);
      setTotalRecords(total);
    } catch (err: any) {
      setError(err?.message || 'Failed to load customer directory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, pageSize, debouncedSearch]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFullName('');
    setMobile('');
    setEmail('');
    setCity('');
    setState('');
    setNotes('');
    setSource('ADMIN_DIRECT');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: CustomerDto) => {
    setEditingCustomer(c);
    setFullName(c.fullName);
    setMobile(c.mobile);
    setEmail(c.email || '');
    setCity(c.city || '');
    setState(c.state || '');
    setNotes(c.notes || '');
    setSource((c.source as any) || 'ADMIN_DIRECT');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const cleanMobile = mobile.trim().replace(/[^0-9]/g, '');
    if (cleanMobile.length !== 10) {
      setModalError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCustomer) {
        await apiRequest(`/customers/${editingCustomer.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            fullName: fullName.trim(),
            mobile: cleanMobile,
            email: email.trim() || undefined,
            city: city.trim() || undefined,
            state: state.trim() || undefined,
            notes: notes.trim() || undefined,
            source,
          }),
        });
        showToast(`Customer ${fullName.trim()} updated successfully!`);
      } else {
        await apiRequest('/customers', {
          method: 'POST',
          body: JSON.stringify({
            fullName: fullName.trim(),
            mobile: cleanMobile,
            email: email.trim() || undefined,
            city: city.trim() || undefined,
            state: state.trim() || undefined,
            notes: notes.trim() || undefined,
            source,
          }),
        });
        showToast(`Customer ${fullName.trim()} added to directory!`);
      }

      setIsModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save customer profile.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered in-memory by source and instant search query
  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (sourceFilter !== 'ALL') {
      list = list.filter((c) => c.source === sourceFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.fullName?.toLowerCase().includes(q) ||
          c.mobile?.includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, sourceFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Client & Traveler Directory
          </h1>
          <p className="text-xs text-slate-500">
            Unified record of direct travelers, repeat tourists, and partner agent-represented clients
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchCustomers(true)}
            disabled={refreshing || loading}
            style={{
              padding: '8px 18px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '10px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
            className="hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreateModal}
            style={{
              padding: '8px 18px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '10px',
              backgroundColor: '#0f766e',
              border: '1px solid #0f766e',
              color: '#ffffff',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(15, 118, 110, 0.2)',
            }}
            className="hover:bg-teal-800 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Client</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '12px 18px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap',
        }}
      >
        {/* Search Input Container */}
        <div
          style={{
            position: 'relative',
            flex: '1 1 280px',
            minWidth: '220px',
            maxWidth: '520px',
          }}
        >
          <Search
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              color: '#94a3b8',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name, mobile or email..."
            style={{
              width: '100%',
              paddingLeft: 38,
              paddingRight: searchQuery ? 34 : 12,
              paddingTop: 9,
              paddingBottom: 9,
              fontSize: '13px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
              fontWeight: 500,
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                padding: '2px 4px',
                borderRadius: '4px',
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Client Sources Dropdown (Compact fixed width as requested) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Source:</span>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{
              width: '175px',
              padding: '8px 12px',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              color: '#0f172a',
              outline: 'none',
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
          >
            <option value="ALL">All Client Sources</option>
            <option value="ADMIN_DIRECT">Direct Agency Clients</option>
            <option value="AGENT">B2B Agent Clients</option>
            <option value="CUSTOMER_WEB">Web Portal Enquiries</option>
            <option value="CUSTOMER_APP">Mobile App Enquiries</option>
          </select>

          {/* Records Badge */}
          <span
            style={{
              fontSize: '12px',
              color: '#0f766e',
              background: '#f0fdfa',
              border: '1px solid #ccfbf1',
              padding: '5px 10px',
              borderRadius: 8,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {filteredCustomers.length} {filteredCustomers.length === 1 ? 'Client' : 'Clients'}
          </span>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-slate-200 mx-auto" />
            <div className="h-4 bg-slate-200 rounded w-1/4 mx-auto" />
            <div className="h-3 bg-slate-100 rounded w-1/3 mx-auto" />
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3 text-rose-700 bg-rose-50/50">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
            <h4 className="text-sm font-bold">Unable to load customer directory</h4>
            <p className="text-xs text-rose-600">{error}</p>
            <button
              onClick={() => fetchCustomers()}
              className="px-4 py-2 bg-rose-700 text-white rounded-xl text-xs font-semibold hover:bg-rose-800 shadow-sm"
            >
              Retry
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No customers found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Customers created from enquiries or direct additions will appear in this centralized client registry.
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-teal-700 text-white rounded-xl text-xs font-semibold hover:bg-teal-800 shadow-sm transition mt-2"
            >
              + Create First Customer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Mobile & WhatsApp</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">City / Region</th>
                  <th className="py-3 px-4">Client Source</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 font-bold flex items-center justify-center text-xs border border-teal-200/60 flex-shrink-0">
                          {c.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{c.fullName}</div>
                          {c.notes && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">
                              {c.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                        <a
                          href={`tel:${c.mobile}`}
                          className="hover:underline text-teal-800"
                        >
                          {c.mobile}
                        </a>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {c.email ? (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <a
                            href={`mailto:${c.email}`}
                            className="hover:underline text-slate-700"
                          >
                            {c.email}
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.city || 'Ahmedabad'}{c.state ? `, ${c.state}` : ''}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          c.source === 'AGENT'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {c.source || 'ADMIN_DIRECT'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(c.createdAt)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedCustomer(c)}
                          className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition"
                          title="View Profile & Quick Actions"
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200">
          <Pagination
            currentPage={currentPage}
            totalItems={totalRecords}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Customer Profile Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 font-bold flex items-center justify-center text-sm border border-teal-200">
                  {selectedCustomer.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedCustomer.fullName}</h3>
                  <p className="text-xs text-slate-500">Client ID: {selectedCustomer.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Registered Phone:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedCustomer.mobile}</span>
                </div>
                {selectedCustomer.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Email Address:</span>
                    <span className="font-medium text-slate-800">{selectedCustomer.email}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-medium text-slate-800">
                    {selectedCustomer.city || 'Ahmedabad'}, {selectedCustomer.state || 'Gujarat'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Source:</span>
                  <span className="font-bold text-teal-800">{selectedCustomer.source}</span>
                </div>
              </div>

              {selectedCustomer.notes && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <span className="font-semibold text-amber-900 block mb-1">Preferences & Notes:</span>
                  <p className="text-amber-800 leading-relaxed italic">{selectedCustomer.notes}</p>
                </div>
              )}

              {/* Quick Navigation to Related Leads & Bookings */}
              <div className="space-y-2 pt-2">
                <span className="font-bold text-slate-800 block">Client History & Enquiries:</span>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/leads`}
                    className="p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 transition flex items-center justify-between text-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-teal-700" />
                      <span className="font-semibold">CRM Enquiries</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  <Link
                    href={`/bookings`}
                    className="p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 transition flex items-center justify-between text-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <BookCheck className="w-4 h-4 text-teal-700" />
                      <span className="font-semibold">Tour Bookings</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const target = selectedCustomer;
                  setSelectedCustomer(null);
                  openEditModal(target);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingCustomer ? 'Edit Customer Profile' : 'New Customer Profile'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Shah"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  10-Digit Mobile Number *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-xs bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg text-slate-600 font-bold">
                    +91
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="9825012345"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh.shah@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ahmedabad"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Gujarat"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
                >
                  <option value="ADMIN_DIRECT">Direct Agency Customer</option>
                  <option value="AGENT">B2B Partner Agent Client</option>
                  <option value="CUSTOMER_WEB">Web Portal Client</option>
                  <option value="CUSTOMER_APP">Mobile App Client</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Preferences / Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Jain food preferences, senior citizens in family, high-floor rooms preferred..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingCustomer ? 'Update Profile' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
