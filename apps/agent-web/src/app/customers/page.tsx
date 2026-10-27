'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  PlusCircle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  X,
  AlertCircle,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { customersApi } from '@/lib/api';

export default function AgentCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Add Customer Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    mobile: '',
    email: '',
    city: '',
    state: '',
    notes: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [page, search]);

  async function loadCustomers() {
    try {
      setLoading(true);
      setError(null);
      const res = await customersApi.list({
        page,
        limit: 20,
        search: search.trim() || undefined,
      });
      setCustomers(res.data || []);
      setTotal(res.meta?.total || (res.data ? res.data.length : 0));
    } catch (err: any) {
      setError(err?.message || 'Failed to load customer directory');
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCustomers();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!form.fullName.trim() || !form.mobile.trim()) {
      setModalError('Please provide the customer name and mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      await customersApi.create({
        fullName: form.fullName.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        notes: form.notes.trim() || undefined,
        source: 'AGENT',
      });

      setModalOpen(false);
      setForm({ fullName: '', mobile: '', email: '', city: '', state: '', notes: '' });
      loadCustomers();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
              Traveler Directory
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {total} Scoped Clients
            </span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            Customer Directory
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Clients serviced by or assigned to your travel desk
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: '0.9rem' }}
        >
          <PlusCircle size={18} />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, phone number, or city..."
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
      </div>

      {/* Customers Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading customer directory...
          </div>
        ) : customers.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <Users size={40} style={{ color: 'var(--text-subtle)', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>No customers found</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Register a new traveler or intake a walk-in lead to start building customer profiles.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Traveler Name</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Contact Information</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Location</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Source</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        {c.fullName}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Added on {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                        <Phone size={13} style={{ color: 'var(--primary)' }} />
                        <a href={`tel:${c.mobile}`} style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600 }}>
                          {c.mobile}
                        </a>
                      </div>
                      {c.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          <Mail size={12} />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                        {c.city || 'Not specified'}
                        {c.state ? `, ${c.state}` : ''}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                        {c.source || 'AGENT'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <Link
                        href={`/quotations/new?customerId=${c.id}`}
                        prefetch={false}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none' }}
                      >
                        + Create Quote
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {modalOpen && (
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
              maxWidth: 480,
              width: '100%',
              padding: '28px 24px',
              boxShadow: 'var(--shadow-modal)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Add New Customer
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {modalError && (
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', border: '1px solid var(--accent-rose-border)', color: 'var(--accent-rose-dark)', fontSize: '0.85rem', marginBottom: 16 }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="e.g. Vikram Malhotra"
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
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="e.g. 9811122334"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="vikram@example.com"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Delhi"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                    State
                  </label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="Delhi"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                  Client Notes / Preferences
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="VIP client, corporate accounts, etc."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '9px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: '9px 20px', fontWeight: 700 }}
                >
                  {submitting ? 'Registering...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
