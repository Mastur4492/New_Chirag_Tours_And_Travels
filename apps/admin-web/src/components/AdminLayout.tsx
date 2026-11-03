'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MapPin,
  Building2,
  Calendar,
  Car,
  Compass,
  Receipt,
  LayoutDashboard,
  ShieldCheck,
  LucideIcon,
  LogIn,
  LogOut,
  AlertCircle,
  Users,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Mail,
  Phone,
  Star,
  Plus,
  Menu,
  X,
  Briefcase,
  UserCheck,
  BookCheck,
  ShieldAlert,
  Globe,
} from 'lucide-react';
import { clearAdminToken, getAdminToken, setAdminToken, getUserRole, getUserInfo, setUserSession } from '@/lib/api';
import { COMPANY_BRANDING } from '@/lib/branding';
import { PwaManager } from './PwaManager';
import { AdminAiCopilot } from './AdminAiCopilot';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

const workspaceNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads & CRM', href: '/leads', icon: Users },
  { name: 'Tour Quotations', href: '/quotations', icon: FileSpreadsheet },
  { name: 'Bookings & Ledger', href: '/bookings', icon: BookCheck },
  { name: 'Customers', href: '/customers', icon: UserCheck },
  { name: 'B2B Travel Agents', href: '/agents', icon: Briefcase, badge: 'B2B' },
];

const inventoryNavItems: NavItem[] = [
  { name: 'Operations Desk', href: '/operations', icon: ShieldCheck },
  { name: 'Tour Packages', href: '/packages', icon: Compass },
  { name: 'Hotels & Rooms', href: '/hotels', icon: Building2 },
  { name: 'Transport & Fleet', href: '/transport', icon: Car },
  { name: 'Destinations', href: '/destinations', icon: MapPin },
];

const settingsNavItems: NavItem[] = [
  { name: 'Customer Portal Settings', href: '/customer-settings', icon: Globe, badge: 'Live Web' },
  { name: 'Seasons & Pricing', href: '/seasons', icon: Calendar },
  { name: 'Tax & GST Settings', href: '/taxes', icon: Receipt },
  { name: 'Audit Trail & Logs', href: '/audit-logs', icon: ShieldAlert },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    // Check local session once on initial mount
    const token = getAdminToken();
    const role = getUserRole();
    const user = getUserInfo();

    if (token) {
      setIsAuthenticated(true);
      setUserRole(role || 'ADMIN');
      setCurrentUser(user);
    } else {
      setIsAuthenticated(false);
      setUserRole(null);
      setCurrentUser(null);
    }
  }, []);

  // Close mobile sidebar on route navigation only if open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  }, [pathname]);

  // Public portal or dedicated Luxury Login portal bypasses Admin layout shell
  if (pathname === '/login' || pathname.startsWith('/quote/')) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        {children}
        <AdminAiCopilot />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/proxy/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Login failed');
      }
      setUserSession(data.data.accessToken, data.data.user);
      setIsAuthenticated(true);
      setUserRole(data.data.user?.role || 'ADMIN');
      setCurrentUser(data.data.user);
      setIsLoginModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    clearAdminToken();
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUser(null);
    window.location.href = '/login';
  };

  return (
    <div className="app-container">
      {/* Mobile Sidebar Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ffffff', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              <img
                src={COMPANY_BRANDING.logos.main}
                alt={COMPANY_BRANDING.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 className="brand-title" style={{ fontSize: '16px', fontWeight: 800, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {COMPANY_BRANDING.shortName}
              </h1>
              <div className="brand-owner" style={{ fontSize: '12.5px', marginTop: '2px', color: 'var(--text-muted)' }}>
                {COMPANY_BRANDING.owner} • Ahmedabad
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="mobile-close-btn"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>



        <ul className="nav-list">
          <div className="nav-section-title">Workspace & CRM</div>
          {workspaceNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={true}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  title={item.name}
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  <span className="flex-1 min-w-0" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </span>
                  {item.badge && (
                    <span
                      className="badge badge-primary text-xs"
                      style={{ fontSize: '10px', padding: '1.5px 6px', fontWeight: 700, borderRadius: '5px', flexShrink: 0, letterSpacing: '0.02em' }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}

          <div className="nav-section-title" style={{ marginTop: '16px' }}>Operations & Fleet</div>
          {inventoryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={true}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  title={item.name}
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  <span className="flex-1 min-w-0" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                </Link>
              </li>
            );
          })}

          {userRole !== 'AGENT' && (
            <>
              <div className="nav-section-title" style={{ marginTop: '16px' }}>Settings & Compliance</div>
              {settingsNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch={true}
                      className={`nav-link ${isActive ? 'active' : ''}`}
                      title={item.name}
                    >
                      <Icon size={18} style={{ flexShrink: 0 }} />
                      <span className="flex-1 min-w-0" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </>
          )}
        </ul>

        {/* User Card */}
        <div style={{ padding: '16px', borderTop: '1.5px solid var(--border-subtle)', background: '#fafbfc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: userRole === 'AGENT'
                  ? 'linear-gradient(135deg, #1d4ed8, #2563eb)'
                  : 'linear-gradient(135deg, #0f766e, #0d9488)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
                boxShadow: 'var(--shadow-xs)',
                flexShrink: 0,
              }}
            >
              {userRole === 'AGENT'
                ? (currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'AG')
                : 'FB'}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userRole === 'AGENT'
                  ? (currentUser?.name || 'Travel Agent')
                  : COMPANY_BRANDING.owner}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: userRole === 'AGENT' ? '#2563eb' : 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {userRole === 'AGENT' ? <Briefcase size={13} /> : <ShieldCheck size={13} />}
                <span>
                  {userRole === 'AGENT'
                    ? (currentUser?.agentProfile?.agencyName || 'Partner Agent')
                    : 'Authorized Owner'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {userRole === 'AGENT' ? 'Portal Access:' : 'Customer Rating:'}
            </span>
            <span style={{ color: userRole === 'AGENT' ? '#1d4ed8' : '#d97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              {userRole === 'AGENT' ? (
                <>
                  <UserCheck size={13} />
                  <span>Verified B2B</span>
                </>
              ) : (
                <>
                  <Star size={13} fill="#f59e0b" color="#f59e0b" />
                  <span>5.0 (40 Reviews)</span>
                </>
              )}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {/* Hamburger button visible on < 1024px */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="mobile-menu-btn"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span style={{ color: 'var(--primary)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {COMPANY_BRANDING.shortName}
              </span>
              <span style={{ color: 'var(--border-strong)' }}>/</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }} className="hidden sm:inline">
                Operations Portal
              </span>
            </span>
          </div>

          <div className="topbar-actions">
            <PwaManager />

            <Link
              href="/leads"
              className="btn-new-enquiry"
              title="Add a new customer enquiry immediately"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">+ New Enquiry</span>
              <span className="sm:hidden">Enquiry</span>
            </Link>

            <a
              href={`tel:${COMPANY_BRANDING.phoneRaw}`}
              className="topbar-contact-item hidden lg:flex"
              title="Official Agency Phone"
            >
              <Phone size={15} style={{ color: 'var(--primary)' }} />
              <span>{COMPANY_BRANDING.phone}</span>
            </a>

            <div className="topbar-contact-item hidden xl:flex">
              <Mail size={15} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 500 }}>{COMPANY_BRANDING.email}</span>
            </div>

            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  className="admin-status-badge hidden sm:flex"
                  style={{
                    background: userRole === 'AGENT' ? '#eff6ff' : '#ecfdf5',
                    borderColor: userRole === 'AGENT' ? '#bfdbfe' : '#a7f3d0',
                    color: userRole === 'AGENT' ? '#1d4ed8' : '#047857',
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: userRole === 'AGENT' ? '#2563eb' : 'var(--accent-emerald)',
                    }}
                  ></span>
                  {userRole === 'AGENT' ? 'Travel Agent' : 'Operations Admin'}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm"
                  title="Log out of session"
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="btn btn-primary btn-sm"
                style={{ fontSize: '13px', padding: '6px 14px', textDecoration: 'none' }}
              >
                <LogIn size={15} />
                <span>Portal Login</span>
              </Link>
            )}
          </div>
        </header>

        <main className="page-body">{children}</main>
        <AdminAiCopilot />
      </div>

      {/* Admin Login Modal */}
      {isLoginModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Admin Authentication</h2>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="btn-icon"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleLogin} className="modal-body">
              {loginError && (
                <div className="form-error-banner">
                  <AlertCircle size={16} />
                  <span>{loginError}</span>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Admin Mobile Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="modal-footer" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={loggingIn}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loggingIn}>
                  {loggingIn ? 'Authenticating...' : 'Sign In as Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
