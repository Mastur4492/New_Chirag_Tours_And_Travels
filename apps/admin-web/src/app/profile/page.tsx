'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Building2,
  Mail,
  Phone,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  MapPin,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  Star,
  RefreshCw,
  Landmark,
  CreditCard,
  QrCode,
  Edit3,
  Check,
  X,
  CheckCircle,
} from 'lucide-react';
import { authApi, agencySettingsApi, getUserInfo, setUserSession, clearClientCache } from '@/lib/api';
import { COMPANY_BRANDING } from '@/lib/branding';
import { AgencySettingsDto } from '@chirag/types';

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Profile Form State
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Agency Branding & Bank Settings State
  const [agencySettings, setAgencySettings] = useState<AgencySettingsDto>({
    agencyName: 'New Chirag Tours and Travels',
    founderName: 'Faisal Bikanerwala',
    tagline: 'Ahmedabad Travel Desk • Customized Holidays & Tour Packages',
    supportPhone: '+918866006640',
    supportPhoneDisplay: '+91 88660 06640',
    altPhone: '+917043046833',
    altPhoneDisplay: '+91 70430 46833',
    supportEmail: 'newchiragtoursandtravels@gmail.com',
    operatingHours: 'Daily 10:00 AM – 8:30 PM',
    headOfficeAddress:
      'Shop No 3, Al-Rehman Plaza, nr. Nagori Complex, opp. Alishan Complex, Shakti Society, Danilimda, Ahmedabad, Gujarat 382405',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '382405',
    websiteUrl: 'https://newchirag.com',
    bankName: 'HDFC Bank Ltd',
    accountHolderName: 'NEW CHIRAG TOURS AND TRAVELS',
    accountNumber: '50200084920194',
    ifscCode: 'HDFC0001842',
    branchName: 'Danilimda Branch, Ahmedabad',
    accountType: 'Current Account',
    upiId: '8866006640@upi',
    upiNumber: '+91 88660 06640',
    advancePercentage: 35,
    paymentTerms: '35% Advance to Lock Allotments • Balance 65% on Arrival / Prior to Hotel Check-in',
  });

  const [isEditingAgency, setIsEditingAgency] = useState(false);
  const [agencyForm, setAgencyForm] = useState<Partial<AgencySettingsDto>>({});
  const [savingAgency, setSavingAgency] = useState(false);
  const [agencySuccess, setAgencySuccess] = useState<string | null>(null);
  const [agencyError, setAgencyError] = useState<string | null>(null);

  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState<Partial<AgencySettingsDto>>({});
  const [savingBank, setSavingBank] = useState(false);
  const [bankSuccess, setBankSuccess] = useState<string | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        const cached = getUserInfo();
        if (cached) {
          setUser(cached);
          setFullName(cached.fullName || '');
          setMobile(cached.mobile || '');
          setEmail(cached.email || '');
        }

        const fresh = await authApi.getMe();
        if (fresh) {
          setUser(fresh);
          setFullName(fresh.fullName || '');
          setMobile(fresh.mobile || '');
          setEmail(fresh.email || '');
          setUserSession(localStorage.getItem('chirag_admin_token') || '', fresh);
        }

        // Fetch Agency & Bank Settings
        try {
          const settings = await agencySettingsApi.get();
          if (settings) {
            setAgencySettings(settings);
            setAgencyForm(settings);
            setBankForm(settings);
          }
        } catch (settingsErr) {
          console.warn('Could not load dynamic agency settings, using system defaults', settingsErr);
        }
      } catch (err: any) {
        setProfileError(err.message || 'Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setProfileError('Full name must be at least 2 characters.');
      return;
    }

    if (!mobile.trim() || mobile.trim().length < 10) {
      setProfileError('Please provide a valid 10-digit mobile number.');
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await authApi.updateProfile({
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        email: email.trim() || null,
      });

      setUser(updated);
      setUserSession(localStorage.getItem('chirag_admin_token') || '', updated);
      setProfileSuccess('Profile credentials successfully updated across the agency system!');
      setTimeout(() => setProfileSuccess(null), 5000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile details.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError('New password must contain at least one letter and one number.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPasswordSuccess('Password successfully updated! Your account security has been verified.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAgency(true);
    setAgencyError(null);
    setAgencySuccess(null);
    try {
      const payload: Partial<AgencySettingsDto> = {
        agencyName: agencyForm.agencyName?.trim() || agencySettings.agencyName,
        founderName: agencyForm.founderName?.trim() || agencySettings.founderName,
        tagline: agencyForm.tagline?.trim() || agencySettings.tagline,
        supportPhone: agencyForm.supportPhone?.trim() || agencySettings.supportPhone,
        supportPhoneDisplay: agencyForm.supportPhoneDisplay?.trim() || agencySettings.supportPhoneDisplay,
        supportEmail: agencyForm.supportEmail?.trim() || agencySettings.supportEmail,
        operatingHours: agencyForm.operatingHours?.trim() || agencySettings.operatingHours,
        headOfficeAddress: agencyForm.headOfficeAddress?.trim() || agencySettings.headOfficeAddress,
        city: agencyForm.city?.trim() || agencySettings.city,
        state: agencyForm.state?.trim() || agencySettings.state,
        pincode: agencyForm.pincode?.trim() || agencySettings.pincode,
      };

      const updated = await agencySettingsApi.update(payload);
      clearClientCache();
      setAgencySettings(updated);
      setAgencyForm(updated);
      setIsEditingAgency(false);
      setAgencySuccess('Agency details successfully updated and synced across all customer portals & proposals!');
      setTimeout(() => setAgencySuccess(null), 5000);
    } catch (err: any) {
      setAgencyError(err.message || 'Failed to update agency branding.');
    } finally {
      setSavingAgency(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    setBankError(null);
    setBankSuccess(null);
    try {
      const advanceVal = Number(bankForm.advancePercentage ?? agencySettings.advancePercentage ?? 35);
      const balanceVal = 100 - advanceVal;
      const terms = bankForm.paymentTerms?.trim() || `${advanceVal}% Advance to Lock Allotments • Balance ${balanceVal}% on Arrival / Prior to Hotel Check-in`;
      const payload: Partial<AgencySettingsDto> = {
        bankName: bankForm.bankName?.trim() || agencySettings.bankName,
        accountHolderName: bankForm.accountHolderName?.trim() || agencySettings.accountHolderName,
        accountNumber: bankForm.accountNumber?.trim() || agencySettings.accountNumber,
        ifscCode: bankForm.ifscCode?.trim()?.toUpperCase() || agencySettings.ifscCode,
        branchName: bankForm.branchName?.trim() || agencySettings.branchName,
        accountType: bankForm.accountType || agencySettings.accountType,
        upiId: bankForm.upiId?.trim() || agencySettings.upiId,
        upiNumber: bankForm.upiNumber?.trim() || agencySettings.upiNumber,
        advancePercentage: advanceVal,
        paymentTerms: terms,
      };

      const updated = await agencySettingsApi.update(payload);
      clearClientCache();
      setAgencySettings(updated);
      setBankForm(updated);
      setIsEditingBank(false);
      setBankSuccess('Official bank credentials & UPI payment details updated across proposals & vouchers!');
      setTimeout(() => setBankSuccess(null), 5000);
    } catch (err: any) {
      setBankError(err.message || 'Failed to update official bank details.');
    } finally {
      setSavingBank(false);
    }
  };

  const initials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'FB';

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 20px 60px' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0d9488', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
          <ShieldCheck size={16} />
          <span>SUPER ADMIN & OPERATIONS DESK</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
          Executive Profile & Security Settings
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
          Manage your administrator account credentials, executive contact info, and official agency details.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #04140D 0%, #062317 55%, #0A3722 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: '#ffffff',
          border: '1.5px solid #10b981',
          boxShadow: '0 8px 24px rgba(4, 20, 13, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                {fullName || 'Administrator'}
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(52, 211, 153, 0.2)',
                  border: '1px solid #34d399',
                  color: '#6ee7b7',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Super Admin • Authorized Owner
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#cbd5e1' }}>
              {COMPANY_BRANDING.name} • {COMPANY_BRANDING.city} Central Hub
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={13} color="#34d399" />
                <span style={{ color: '#e2e8f0' }}>{mobile || COMPANY_BRANDING.phoneDisplay}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mail size={13} color="#34d399" />
                <span style={{ color: '#e2e8f0' }}>{email || COMPANY_BRANDING.email}</span>
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#34d399',
            }}
          >
            <Star size={14} fill="#34d399" />
            <span>Verified 5.0 Google Rating</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
        {/* Card 1: Personal Account Info */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={18} color="#0d9488" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Administrator Credentials
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Update your login phone number and executive profile name
              </p>
            </div>
          </div>

          {profileSuccess && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                Executive Full Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Faisal Bikanerwala"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                Login Mobile Number <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile number"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'block' }}>
                Used to authenticate and access Super Admin dashboard.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                Official Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. newchiragtoursandtravels@gmail.com"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                }}
              />
            </div>

            <div style={{ marginTop: '8px' }}>
              <button
                type="submit"
                disabled={savingProfile}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: savingProfile ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)',
                }}
              >
                {savingProfile ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Security & Password Management */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyRound size={18} color="#ef4444" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Account Security & Password
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Change your Super Admin password with strict audit protection
              </p>
            </div>
          </div>

          {passwordSuccess && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                Current Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 38px 9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                >
                  {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                New Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters (letters + numbers)"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 38px 9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                >
                  {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                }}
              />
            </div>

            <div style={{ marginTop: '8px' }}>
              <button
                type="submit"
                disabled={savingPassword}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: savingPassword ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.25)',
                }}
              >
                {savingPassword ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                <span>{savingPassword ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Card 3: Central Agency & Official Travel Desk Information */}
      <div
        style={{
          marginTop: '28px',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} color="#0d9488" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Central Agency & Travel Desk Information
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Verified business branding displayed across customer proposals, invoices, vouchers, and website
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '9999px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Synced with Customer Facing Portal
            </span>
            <button
              type="button"
              onClick={() => {
                setIsEditingAgency(!isEditingAgency);
                setAgencyForm(agencySettings);
                setAgencyError(null);
                setAgencySuccess(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: isEditingAgency ? '#f1f5f9' : '#0d9488',
                color: isEditingAgency ? '#475569' : '#ffffff',
                border: isEditingAgency ? '1px solid #cbd5e1' : 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isEditingAgency ? <X size={13} /> : <Edit3 size={13} />}
              <span>{isEditingAgency ? 'Cancel' : 'Edit Agency Info'}</span>
            </button>
          </div>
        </div>

        {agencySuccess && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{agencySuccess}</span>
          </div>
        )}

        {agencyError && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{agencyError}</span>
          </div>
        )}

        {isEditingAgency ? (
          <form onSubmit={handleSaveAgency}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Agency Business Name *
                </label>
                <input
                  type="text"
                  value={agencyForm.agencyName || ''}
                  onChange={(e) => setAgencyForm({ ...agencyForm, agencyName: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Founder / Managing Desk Head *
                </label>
                <input
                  type="text"
                  value={agencyForm.founderName || ''}
                  onChange={(e) => setAgencyForm({ ...agencyForm, founderName: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Support Helpline (WhatsApp / Call) *
                </label>
                <input
                  type="text"
                  value={agencyForm.supportPhoneDisplay || ''}
                  onChange={(e) => setAgencyForm({ ...agencyForm, supportPhoneDisplay: e.target.value, supportPhone: e.target.value.replace(/\s+/g, '') })}
                  required
                  placeholder="+91 88660 06640"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Official Travel Desk Email *
                </label>
                <input
                  type="email"
                  value={agencyForm.supportEmail || ''}
                  onChange={(e) => setAgencyForm({ ...agencyForm, supportEmail: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Operating Hours / Working Desk *
                </label>
                <input
                  type="text"
                  value={agencyForm.operatingHours || ''}
                  onChange={(e) => setAgencyForm({ ...agencyForm, operatingHours: e.target.value })}
                  required
                  placeholder="Daily 10:00 AM – 8:30 PM"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Agency Tagline / Slogan
                </label>
                <input
                  type="text"
                  value={agencyForm.tagline || ''}
                  onChange={(e) => setAgencyForm({ ...agencyForm, tagline: e.target.value })}
                  placeholder="Ahmedabad Travel Desk • Customized Holidays & Tour Packages"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Registered Head Office Address *
                </label>
                <textarea
                  rows={2}
                  value={agencyForm.headOfficeAddress || ''}
                  onChange={(e) => setAgencyForm({ ...agencyForm, headOfficeAddress: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  City *
                </label>
                <input
                  type="text"
                  value={agencyForm.city || ''}
                  onChange={(e) => setAgencyForm({ ...agencyForm, city: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  State *
                </label>
                <input
                  type="text"
                  value={agencyForm.state || ''}
                  onChange={(e) => setAgencyForm({ ...agencyForm, state: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Pincode *
                </label>
                <input
                  type="text"
                  value={agencyForm.pincode || ''}
                  onChange={(e) => setAgencyForm({ ...agencyForm, pincode: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={savingAgency}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#0d9488',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: savingAgency ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)',
                }}
              >
                {savingAgency ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{savingAgency ? 'Saving Agency Info...' : 'Save Agency Information'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingAgency(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Agency Name & Head
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {agencySettings.agencyName}
              </div>
              <div style={{ fontSize: '12px', color: '#0d9488', fontWeight: 600, marginTop: '2px' }}>
                Founder: {agencySettings.founderName}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Support Helpline & WhatsApp
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {agencySettings.supportPhoneDisplay}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                {agencySettings.operatingHours}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Official Travel Desk Email
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {agencySettings.supportEmail}
              </div>
              <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                Automated Voucher & Lead Dispatch
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Registered Head Office Address
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '4px', lineHeight: 1.5 }}>
                {agencySettings.headOfficeAddress}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card 4: Official Bank Details & Instant UPI Payment */}
      <div
        style={{
          marginTop: '28px',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Landmark size={18} color="#2563eb" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Official Bank Details & Instant UPI Payment
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Primary remittance account & QR payment options attached to client proposals and tax invoices
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '9999px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Active for Proposals & Invoices
            </span>
            <button
              type="button"
              onClick={() => {
                setIsEditingBank(!isEditingBank);
                setBankForm(agencySettings);
                setBankError(null);
                setBankSuccess(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: isEditingBank ? '#f1f5f9' : '#2563eb',
                color: isEditingBank ? '#475569' : '#ffffff',
                border: isEditingBank ? '1px solid #cbd5e1' : 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isEditingBank ? <X size={13} /> : <Edit3 size={13} />}
              <span>{isEditingBank ? 'Cancel' : 'Edit Bank Details'}</span>
            </button>
          </div>
        </div>

        {bankSuccess && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{bankSuccess}</span>
          </div>
        )}

        {bankError && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{bankError}</span>
          </div>
        )}

        {isEditingBank ? (
          <form onSubmit={handleSaveBank}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Bank Name *
                </label>
                <input
                  type="text"
                  value={bankForm.bankName || ''}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  required
                  placeholder="e.g. HDFC Bank Ltd"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Beneficiary / Account Holder Name *
                </label>
                <input
                  type="text"
                  value={bankForm.accountHolderName || ''}
                  onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                  required
                  placeholder="e.g. NEW CHIRAG TOURS AND TRAVELS"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Account Number *
                </label>
                <input
                  type="text"
                  value={bankForm.accountNumber || ''}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  required
                  placeholder="e.g. 50200084920194"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  IFSC Code *
                </label>
                <input
                  type="text"
                  value={bankForm.ifscCode || ''}
                  onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                  required
                  placeholder="e.g. HDFC0001842"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace', textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Branch Name & Location *
                </label>
                <input
                  type="text"
                  value={bankForm.branchName || ''}
                  onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })}
                  required
                  placeholder="e.g. Danilimda Branch, Ahmedabad"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Account Type *
                </label>
                <select
                  value={bankForm.accountType || 'Current Account'}
                  onChange={(e) => setBankForm({ ...bankForm, accountType: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
                >
                  <option value="Current Account">Current Account</option>
                  <option value="Savings Account">Savings Account</option>
                  <option value="OD / CC Account">OD / CC Account</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Official UPI ID *
                </label>
                <input
                  type="text"
                  value={bankForm.upiId || ''}
                  onChange={(e) => setBankForm({ ...bankForm, upiId: e.target.value })}
                  required
                  placeholder="e.g. 8866006640@upi"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  GPay / PhonePe Mobile Number *
                </label>
                <input
                  type="text"
                  value={bankForm.upiNumber || ''}
                  onChange={(e) => setBankForm({ ...bankForm, upiNumber: e.target.value })}
                  required
                  placeholder="e.g. +91 88660 06640"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Booking Advance Percentage (%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={bankForm.advancePercentage ?? 35}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const bal = Math.max(0, 100 - val);
                    setBankForm({
                      ...bankForm,
                      advancePercentage: val,
                      paymentTerms: `${val}% Advance to Lock Allotments • Balance ${bal}% on Arrival / Prior to Hotel Check-in`,
                    });
                  }}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Payment Policy & Terms Note *
                </label>
                <textarea
                  rows={2}
                  value={bankForm.paymentTerms || ''}
                  onChange={(e) => setBankForm({ ...bankForm, paymentTerms: e.target.value })}
                  required
                  placeholder="35% Advance to Lock Allotments • Balance 65% on Arrival / Prior to Hotel Check-in"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={savingBank}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: savingBank ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                }}
              >
                {savingBank ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{savingBank ? 'Saving Bank Details...' : 'Save Bank Details'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingBank(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Bank Name & Branch
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {agencySettings.bankName}
              </div>
              <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, marginTop: '2px' }}>
                {agencySettings.branchName}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Account Name / Beneficiary
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {agencySettings.accountHolderName}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Official Travel Desk Commercial Account
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Account Number & Type
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '4px', fontFamily: 'monospace' }}>
                {agencySettings.accountNumber}
              </div>
              <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                {agencySettings.accountType}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                IFSC Code (RTGS / NEFT / IMPS)
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '4px', fontFamily: 'monospace' }}>
                {agencySettings.ifscCode}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Verified for Instant National Settlement
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Instant UPI ID
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0d9488', marginTop: '4px', fontFamily: 'monospace' }}>
                {agencySettings.upiId}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                GPay / PhonePe: {agencySettings.upiNumber}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Advance Token Policy
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {agencySettings.advancePercentage}% Advance Deposit
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Required to lock hotel allotments
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Official Payment Terms Note
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '4px', lineHeight: 1.5 }}>
                {agencySettings.paymentTerms}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

