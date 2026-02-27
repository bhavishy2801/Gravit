import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Shield, Key, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Phone linking
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState('idle'); // idle, sent, verifying
  const [phoneMsg, setPhoneMsg] = useState('');

  // Password
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passMsg, setPassMsg] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await api.get('/users/profile');
      setProfile(res.data.profile);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }

  // ─── Phone Linking ─────────────────────────────
  async function handleLinkPhone() {
    try {
      setPhoneMsg('');
      await api.post('/users/phone/link', { phone });
      setPhoneStep('sent');
      setPhoneMsg('OTP sent! For demo, use: 123456');
    } catch (err) {
      setPhoneMsg(err.response?.data?.error || 'Failed to link phone');
    }
  }

  async function handleVerifyPhone() {
    try {
      setPhoneStep('verifying');
      setPhoneMsg('');
      await api.post('/users/phone/verify', { otp });
      setPhoneMsg('Phone verified successfully!');
      setPhoneStep('idle');
      await refreshUser();
      await loadProfile();
    } catch (err) {
      setPhoneMsg(err.response?.data?.error || 'Verification failed');
      setPhoneStep('sent');
    }
  }

  // ─── Password ──────────────────────────────────
  async function handlePasswordUpdate(e) {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setPassMsg('Passwords do not match');
      return;
    }
    try {
      setPassMsg('');
      await api.put('/users/password', {
        currentPassword: passwords.current || undefined,
        newPassword: passwords.new,
      });
      setPassMsg('Password updated successfully!');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      setPassMsg(err.response?.data?.error || 'Failed to update password');
    }
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#949ba4' }}>
        <Loader size={24} className="animate-pulse-red" /> Loading profile...
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#1a1b1e',
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f2f3f5', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={22} /> Profile Settings
        </h1>
        <p style={{ fontSize: '13px', color: '#949ba4', marginTop: '2px' }}>
          Manage your account, link phone number, and security settings
        </p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* ─── Identity Card ─────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '24px',
              background: '#141517',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{
                width: '64px', height: '64px',
                borderRadius: '50%',
                background: `hsl(${profile?.avatarHue || 0}, 60%, 45%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 800, color: '#fff',
              }}>
                {profile?.pseudonym?.slice(5, 7) || '??'}
              </div>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f2f3f5' }}>
                  {profile?.pseudonym}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{
                    padding: '2px 10px',
                    borderRadius: '100px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#5865f2',
                    background: 'rgba(88,101,242,0.15)',
                    textTransform: 'uppercase',
                  }}>
                    {profile?.role}
                  </span>
                  <span style={{ fontSize: '12px', color: '#949ba4' }}>
                    🏛️ {profile?.institution}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <InfoRow icon={<Mail size={16} />} label="Email" value={profile?.email} verified />
              <InfoRow
                icon={<Phone size={16} />}
                label="Phone"
                value={profile?.phone || 'Not linked'}
                verified={profile?.phoneVerified}
                missing={!profile?.phone}
              />
              <InfoRow icon={<Shield size={16} />} label="Google" value={profile?.hasGoogle ? 'Connected' : 'Not connected'} verified={profile?.hasGoogle} />
              <InfoRow icon={<Key size={16} />} label="Password" value={profile?.hasPassword ? 'Set' : 'Not set'} verified={profile?.hasPassword} />
            </div>
          </motion.div>

          {/* ─── Link Phone Number ─────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              padding: '24px',
              background: '#141517',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f2f3f5', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={18} /> {profile?.phoneVerified ? 'Phone Number' : 'Link Phone Number'}
            </h3>
            <p style={{ fontSize: '13px', color: '#949ba4', marginBottom: '16px' }}>
              {profile?.phoneVerified
                ? 'Your phone is verified. You can use it to log in.'
                : 'Link your phone number to enable phone-based login. You\'ll receive an OTP for verification.'}
            </p>

            {!profile?.phoneVerified && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    style={{ flex: 1 }}
                    disabled={phoneStep === 'sent'}
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLinkPhone}
                    disabled={!phone || phoneStep === 'sent'}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '4px',
                      background: '#5865f2',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                      opacity: !phone || phoneStep === 'sent' ? 0.5 : 1,
                    }}
                  >
                    Send OTP
                  </motion.button>
                </div>

                {phoneStep === 'sent' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      style={{ flex: 1 }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleVerifyPhone}
                      disabled={otp.length !== 6}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '4px',
                        background: '#23a559',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 600,
                        opacity: otp.length !== 6 ? 0.5 : 1,
                      }}
                    >
                      Verify
                    </motion.button>
                  </div>
                )}

                {phoneMsg && (
                  <p style={{
                    fontSize: '12px',
                    color: phoneMsg.includes('success') || phoneMsg.includes('OTP sent') ? '#23a559' : '#da373c',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    {phoneMsg.includes('success') || phoneMsg.includes('OTP sent')
                      ? <CheckCircle size={14} />
                      : <AlertCircle size={14} />
                    }
                    {phoneMsg}
                  </p>
                )}
              </div>
            )}

            {profile?.phoneVerified && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(35,165,89,0.08)',
                borderRadius: '6px',
                border: '1px solid rgba(35,165,89,0.2)',
                fontSize: '13px',
                color: '#23a559',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <CheckCircle size={16} />
                {profile.phone} — Verified. Phone login is enabled.
              </div>
            )}
          </motion.div>

          {/* ─── Set / Change Password ─────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              padding: '24px',
              background: '#141517',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f2f3f5', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={18} /> {profile?.hasPassword ? 'Change Password' : 'Set Password'}
            </h3>
            <p style={{ fontSize: '13px', color: '#949ba4', marginBottom: '16px' }}>
              {profile?.hasPassword
                ? 'Update your account password.'
                : 'Set a password to enable email + password login.'}
            </p>

            <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {profile?.hasPassword && (
                <input
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
                  placeholder="Current password"
                />
              )}
              <input
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))}
                placeholder="New password (min 6 characters)"
              />
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Confirm new password"
              />

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!passwords.new || passwords.new.length < 6}
                style={{
                  padding: '10px',
                  borderRadius: '4px',
                  background: '#5865f2',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  opacity: !passwords.new || passwords.new.length < 6 ? 0.5 : 1,
                  alignSelf: 'flex-start',
                }}
              >
                {profile?.hasPassword ? 'Update Password' : 'Set Password'}
              </motion.button>

              {passMsg && (
                <p style={{
                  fontSize: '12px',
                  color: passMsg.includes('success') ? '#23a559' : '#da373c',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  {passMsg.includes('success') ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {passMsg}
                </p>
              )}
            </form>
          </motion.div>

          {/* ─── Login Methods Summary ─────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              padding: '16px 20px',
              background: 'rgba(88,101,242,0.06)',
              borderRadius: '8px',
              border: '1px solid rgba(88,101,242,0.15)',
              fontSize: '13px',
              color: '#b5bac1',
            }}
          >
            <div style={{ fontWeight: 600, color: '#f2f3f5', marginBottom: '8px' }}>
              🔐 Available Login Methods
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <LoginMethod label="Google OAuth" enabled={profile?.hasGoogle} />
              <LoginMethod label="Email + Password" enabled={profile?.hasPassword} />
              <LoginMethod label="Phone + OTP" enabled={profile?.phoneVerified} />
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, verified, missing }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px 12px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '6px',
    }}>
      <span style={{ color: '#949ba4' }}>{icon}</span>
      <span style={{ fontSize: '12px', color: '#949ba4', width: '70px' }}>{label}</span>
      <span style={{
        flex: 1, fontSize: '13px',
        color: missing ? '#949ba4' : '#f2f3f5',
        fontStyle: missing ? 'italic' : 'normal',
      }}>
        {value}
      </span>
      {verified !== undefined && (
        <span style={{ color: verified ? '#23a559' : '#949ba4' }}>
          {verified ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
        </span>
      )}
    </div>
  );
}

function LoginMethod({ label, enabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ color: enabled ? '#23a559' : '#949ba4' }}>
        {enabled ? '✅' : '⬜'}
      </span>
      <span style={{ color: enabled ? '#f2f3f5' : '#949ba4' }}>{label}</span>
      {!enabled && <span style={{ fontSize: '11px', color: '#949ba4', fontStyle: 'italic' }}>— not configured</span>}
    </div>
  );
}
