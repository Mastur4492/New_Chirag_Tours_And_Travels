'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';
import { setUserSession } from '@/lib/api';
import { COMPANY_BRANDING } from '@/lib/branding';

export default function LoginPage() {
  const [mobile, setMobile] = useState('9876543210');
  const [password, setPassword] = useState('ChiragAdmin@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanMobile = mobile.trim().replace(/[^0-9]/g, '');
    if (cleanMobile.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!password) {
      setError('Please enter your administrator account password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/proxy/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: cleanMobile,
          password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Invalid mobile number or password.');
      }

      const { accessToken, user } = data.data;

      // Verify administrative staff role
      const isStaffRole = [
        'OWNER',
        'ADMIN',
        'BRANCH_HEAD',
        'SALES_EXECUTIVE',
        'OPERATIONS_EXECUTIVE',
        'ACCOUNTS',
      ].includes(user.role);

      if (!isStaffRole) {
        setError(
          `Access restricted. Mobile ${user.mobile} is registered as a Partner Agent (${user.role}). Please log in via the dedicated B2B Agent Desk at http://localhost:3002/login.`
        );
        setLoading(false);
        return;
      }

      setUserSession(accessToken, user);
      setSuccessMessage(
        `Welcome, ${user.fullName || user.name || 'Administrator'}! Access verified as ${user.role}.`
      );

      setTimeout(() => {
        window.location.href = '/';
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '36px 16px',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: '#FFFFFF',
              border: '1px solid #e2e8f0',
              padding: '4px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={COMPANY_BRANDING.logos.badge}
              alt={COMPANY_BRANDING.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            {COMPANY_BRANDING.name}
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, fontWeight: 500 }}>
            Operations & Administration Console • Ahmedabad
          </p>
        </div>

        {/* Clean Admin Sign-In Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Card Title */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingBottom: '14px',
              borderBottom: '1.5px solid #f1f5f9',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#0f766e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Operations Admin Sign In
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Authorized credentials for Faisal Bikanerwala & Staff
              </p>
            </div>
          </div>

          {/* Feedback Banners */}
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#ecfdf5',
                border: '1.5px solid #a7f3d0',
                color: '#047857',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Mobile / ID */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Admin Mobile Number (Login ID)
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '13px',
                    color: '#64748b',
                    fontWeight: 700,
                    borderRight: '1.5px solid #e2e8f0',
                    paddingRight: '8px',
                  }}
                >
                  +91
                </span>
                <input
                  id="admin-login-mobile"
                  type="tel"
                  required
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 10-digit mobile number"
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 54px',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', margin: 0 }}>
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 14px',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me & 256-bit Security */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', paddingTop: '2px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#475569', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: '15px', height: '15px', accentColor: '#0f766e', cursor: 'pointer' }}
                />
                <span>Keep me signed in</span>
              </label>

              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} color="#059669" />
                <span>256-bit Encrypted</span>
              </span>
            </div>

            {/* Submit Button */}
            <button
              id="admin-login-submit"
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px 18px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.35)',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? (
                <span>Verifying Administrator Credentials...</span>
              ) : (
                <>
                  <span>Sign In as Operations Admin</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* 24-Hour Active Session Notice */}
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>⏱️ Extended 24-Hour Session Active (No Premature Logout)</span>
          </div>

          {/* B2B Partner Travel Agent Portal Redirect Banner */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              marginTop: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <Briefcase size={16} color="#059669" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.3 }}>
                <strong style={{ color: '#0f172a' }}>Are you a Partner Agent?</strong>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Access your dedicated quote & bookings workspace</div>
              </div>
            </div>
            <a
              href="http://localhost:3002/login"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#065f46',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background-color 0.15s ease',
              }}
            >
              <span>Agent Desk</span>
              <ArrowRight size={13} />
            </a>
          </div>
        </div>

        {/* Footer Info */}
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div>
            New Chirag Tours & Travels • Managed by {COMPANY_BRANDING.owner}
          </div>
          <div style={{ color: '#64748b', fontSize: '11px' }}>
            {COMPANY_BRANDING.address}, {COMPANY_BRANDING.city}
          </div>
        </div>
      </div>
    </div>
  );
}
