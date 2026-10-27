'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Phone,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { getAgentToken, setAgentSession, clearAgentSession } from '@/lib/api';
import { COMPANY_BRANDING } from '@/lib/branding';

function AgentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mobile, setMobile] = useState('9876543211');
  const [password, setPassword] = useState('DemoAgent@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performLogin = async (loginMobile: string, loginPass: string) => {
    setLoading(true);
    setError(null);
    try {
      const cleanMobile = loginMobile.trim().replace(/[^0-9]/g, '');
      if (cleanMobile.length !== 10) {
        throw new Error('Please enter a valid 10-digit Indian mobile number.');
      }
      if (!loginPass) {
        throw new Error('Please enter your agent workspace password.');
      }

      const res = await fetch('/api/proxy/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: cleanMobile,
          password: loginPass,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Authentication failed. Please check credentials.');
      }

      const { accessToken, user } = data.data;
      if (user.role !== 'AGENT' && user.role !== 'ADMIN') {
        setError('This portal is reserved for registered Partner Agents. Your account does not have agent access.');
        setLoading(false);
        return;
      }

      setAgentSession(accessToken, user);
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your mobile number and password.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      clearAgentSession();
      setError('Your session has expired. Please sign in again.');
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/login');
      }
      return;
    } else if (searchParams.get('unauthorized') === 'true') {
      clearAgentSession();
      setError('Access restricted to verified Partner Agents and Administrators.');
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/login');
      }
      return;
    }

    const isAuto =
      searchParams.get('auto') === 'true' ||
      (typeof window !== 'undefined' && window.location.search.includes('auto=true'));

    if (isAuto) {
      performLogin('9876543211', 'DemoAgent@2026!');
      return;
    }

    const existingToken = getAgentToken();
    if (existingToken) {
      router.push('/');
    }
  }, [searchParams, router]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    await performLogin(mobile, password);
  };

  const handleQuickFillAndLogin = async () => {
    setMobile('9876543211');
    setPassword('DemoAgent@2026!');
    await performLogin('9876543211', 'DemoAgent@2026!');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: '32px 16px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#ffffff',
              padding: 4,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e2e8f0',
              margin: '0 auto 12px auto',
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
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
            {COMPANY_BRANDING.name}
          </h1>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0, fontWeight: 500 }}>
            B2B Partner Agent Desk • Ahmedabad
          </p>
        </div>

        {/* Clean Login Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            padding: '32px 28px',
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
              Sign In to Agent Desk
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              Enter your registered mobile and password to continue.
            </p>
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 10,
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#9f1239',
                fontSize: '0.84rem',
                lineHeight: 1.45,
                marginBottom: 20,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Mobile Number Field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: 6,
                }}
              >
                Registered Mobile Number
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  overflow: 'hidden',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    padding: '11px 12px',
                    background: '#f1f5f9',
                    borderRight: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Phone size={14} color="#0f766e" />
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="98765 43211"
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    padding: '11px 14px',
                    fontSize: '0.92rem',
                    color: '#0f172a',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: 6,
                }}
              >
                Account Password
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '0 0 0 12px', color: '#64748b' }}>
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    padding: '11px 12px',
                    fontSize: '0.92rem',
                    color: '#0f172a',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0 12px',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                width: '100%',
                padding: '12px 18px',
                borderRadius: 10,
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.94rem',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                transition: 'background-color 0.15s ease',
              }}
            >
              {loading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In to Agent Desk</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Quick 1-Click Fill Button */}
            <button
              type="button"
              onClick={handleQuickFillAndLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              ⚡ Quick Fill & Login as Verified Agent (9876543211)
            </button>
          </form>

          {/* Footer Assistance */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              fontSize: '0.78rem',
              color: '#64748b',
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
              <ShieldCheck size={14} color="#059669" />
              <span>Direct B2B Agent Partner Portal</span>
            </div>
            <div>
              Support: <strong>{COMPANY_BRANDING.owner}</strong> ({COMPANY_BRANDING.phoneDisplay})
            </div>
          </div>
        </div>

        {/* Outer subtle copyright */}
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.75rem', color: '#94a3b8' }}>
          © {new Date().getFullYear()} {COMPANY_BRANDING.name} • All rights reserved
        </div>
      </div>
    </div>
  );
}

export default function AgentLoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
          <div style={{ color: '#475569', fontSize: '0.9rem', fontFamily: 'sans-serif' }}>
            Loading Partner Travel Desk...
          </div>
        </div>
      }
    >
      <AgentLoginForm />
    </Suspense>
  );
}
