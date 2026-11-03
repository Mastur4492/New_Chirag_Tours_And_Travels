'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  UserCheck,
  FileText,
  CalendarCheck,
  Users,
  BarChart3,
  PlusCircle,
  LogOut,
  Menu,
  X,
  Compass,
  Sparkles,
  PhoneCall,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { authApi, getAgentToken, getAgentUser, clearAgentSession } from '@/lib/api';
import { COMPANY_BRANDING } from '@/lib/branding';
import { PwaManager } from './PwaManager';
import { AgentAiCopilot } from './AgentAiCopilot';

interface AgentLayoutProps {
  children: React.ReactNode;
}

export function AgentLayout({ children }: AgentLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isPublicPage = pathname === '/login' || pathname.startsWith('/quote/');

  useEffect(() => {
    if (isPublicPage) {
      setLoading(false);
      return;
    }

    const token = getAgentToken();
    const cached = getAgentUser();

    if (!token) {
      setLoading(false);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return;
    }

    // Immediately render cached profile with zero latency
    if (cached) {
      setCurrentUser(cached);
    } else {
      // Fallback placeholder while profile loads
      setCurrentUser({ fullName: 'Partner Agent', role: 'AGENT' });
    }
    setLoading(false);

    // Refresh user profile silently in background
    authApi
      .getMe()
      .then((user) => {
        if (user.role !== 'AGENT' && user.role !== 'ADMIN') {
          clearAgentSession();
          window.location.href = '/login?unauthorized=true';
          return;
        }
        setCurrentUser(user);
      })
      .catch((err) => {
        if (err?.statusCode === 401) {
          clearAgentSession();
          window.location.href = '/login?expired=true';
        }
      });
  }, [pathname, isPublicPage]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      clearAgentSession();
    } finally {
      router.push('/login');
    }
  };

  if (isPublicPage) {
    return (
      <main>
        {children}
        <AgentAiCopilot />
      </main>
    );
  }

  if (loading && !currentUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px auto', width: 36, height: 36, border: '3px solid var(--border-subtle)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontFamily: 'var(--font-sans)' }}>
            Connecting to Chirag Travel Desk...
          </p>
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: '/', label: 'Desk Dashboard', icon: LayoutDashboard },
    { href: '/leads', label: 'My Leads & CRM', icon: UserCheck },
    { href: '/quotations', label: 'Quotations', icon: FileText },
    { href: '/bookings', label: 'My Bookings', icon: CalendarCheck },
    { href: '/customers', label: 'Customer Directory', icon: Users },
    { href: '/performance', label: 'Performance & Sales', icon: BarChart3 },
  ];

  const agentProfile = currentUser?.agentProfile || {};

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* ===================== SIDEBAR (DESKTOP) ===================== */}
      <aside
        style={{
          width: 'var(--sidebar-width, 260px)',
          background: '#0d1829',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
        }}
        className="hide-mobile"
      >
        {/* Brand Banner */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: '#ffffff',
                padding: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                flexShrink: 0,
              }}
            >
              <img
                src={COMPANY_BRANDING.logos.main}
                alt={COMPANY_BRANDING.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <h1 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                NEW CHIRAG
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#14b8a6', fontWeight: 700 }}>
                  Agent Portal
                </span>
                <span style={{ fontSize: '0.65rem', background: 'rgba(20, 184, 166, 0.15)', color: '#5eead4', padding: '1px 6px', borderRadius: '4px' }}>
                  Desk
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action: New Quote */}
          <Link
            href="/quotations/new"
            prefetch={false}
            style={{
              marginTop: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(15, 118, 110, 0.3)',
              transition: 'var(--transition-fast)',
            }}
          >
            <PlusCircle size={16} />
            <span>+ Fast Quote Builder</span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', padding: '8px 12px 12px 12px' }}>
            Travel Desk
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.88rem',
                    fontWeight: isActive ? 700 : 500,
                    textDecoration: 'none',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    background: isActive ? 'rgba(20, 184, 166, 0.16)' : 'transparent',
                    borderLeft: isActive ? '3px solid #14b8a6' : '3px solid transparent',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  <Icon size={18} style={{ color: isActive ? '#14b8a6' : '#64748b' }} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Policy Limits Info Box */}
          <div
            style={{
              marginTop: 24,
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <ShieldCheck size={14} style={{ color: '#14b8a6' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Your Discount Cap
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>Max Allowed:</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2dd4bf' }}>
                {agentProfile.maxDiscountPercent ?? 5}%
              </span>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>
              Higher discounts require Admin approval before quote issuance.
            </p>
          </div>
        </nav>

        {/* User Profile Card & Sign Out */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#09111e' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {currentUser?.fullName || 'Travel Agent'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {agentProfile.agencyName ? agentProfile.agencyName : currentUser?.mobile}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ===================== MOBILE HEADER & DRAWER ===================== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            height: 64,
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="show-mobile"
              style={{
                background: 'none',
                border: 'none',
                padding: 6,
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'none',
              }}
            >
              <Menu size={24} />
            </button>

            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>
                New Chirag Tours & Travels
              </span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Partner Agent Workspace
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <PwaManager />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--accent-emerald-light)', borderRadius: 'var(--radius-full)', border: '1px solid var(--accent-emerald-border)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-emerald)', display: 'inline-block' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald-dark)' }}>
                Desk Live
              </span>
            </div>

            <Link
              href="/quotations/new"
              prefetch={false}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: '0.82rem', textDecoration: 'none' }}
            >
              <PlusCircle size={15} />
              <span>+ Quick Quote</span>
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
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
            }}
          >
            <div
              style={{
                width: 280,
                background: '#0d1829',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                color: '#ffffff',
                padding: '20px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff' }}>Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
                >
                  <X size={22} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.9rem',
                        fontWeight: isActive ? 700 : 500,
                        textDecoration: 'none',
                        color: isActive ? '#ffffff' : '#94a3b8',
                        background: isActive ? 'rgba(20, 184, 166, 0.2)' : 'transparent',
                      }}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <main className="agent-main-content">
          {children}
        </main>
        <AgentAiCopilot />
      </div>

      <style jsx global>{`
        .agent-main-content {
          flex: 1;
          padding: 24px;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (min-width: 1025px) and (max-width: 1366px) {
          :root {
            --sidebar-width: 236px;
          }
        }
        @media (max-width: 1024px) {
          .hide-mobile {
            display: none !important;
          }
          .show-mobile {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
