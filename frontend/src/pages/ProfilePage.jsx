import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Key, CheckCircle, AlertCircle, Loader, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const VALID_HOSTELS = ['B1','B2','B3','B4','B5','G1','G2','G3','G4','G5','G6','I2','I3','O3','O4','Y3','Y4'];
const VALID_GENDERS = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
const VALID_PROGRAMMES = ['B.Tech', 'M.Tech', 'M.Sc', 'Ph.D', 'MBA', 'M.Des', 'Other'];

const selectStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '4px',
  background: '#1a1b1e',
  color: '#f2f3f5',
  border: '1px solid rgba(255,255,255,0.1)',
  fontSize: '13px',
  outline: 'none',
  appearance: 'auto',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '4px',
  background: '#1a1b1e',
  color: '#f2f3f5',
  border: '1px solid rgba(255,255,255,0.1)',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Phone linking
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState('idle');
  const [phoneMsg, setPhoneMsg] = useState('');

  // Password
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passMsg, setPassMsg] = useState('');

  // Profile editing
  const [profileForm, setProfileForm] = useState({
    gender: '',
    hostel: '',
    yearOfStudy: '',
    programme: '',
    department: '',
  });
  const [profileMsg, setProfileMsg] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await api.get('/users/profile');
      const p = res.data.profile;
      setProfile(p);
      setProfileForm({
        gender: p.gender || '',
        hostel: p.hostel || '',
        yearOfStudy: p.yearOfStudy || '',
        programme: p.programme || '',
        department: p.department || '',
      });
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
      setPhoneMsg('OTP sent to your phone!');
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

  // ─── Profile Update ───────────────────────────
  async function handleProfileUpdate() {
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const payload = {};
      if (profileForm.gender) payload.gender = profileForm.gender;
      if (profileForm.hostel && !profile.hostel) payload.hostel = profileForm.hostel;
      if (profileForm.yearOfStudy) payload.yearOfStudy = parseInt(profileForm.yearOfStudy);
      if (profileForm.programme) payload.programme = profileForm.programme;
      if (profileForm.department) payload.department = profileForm.department;

      if (Object.keys(payload).length === 0) {
        setProfileMsg('No changes to save');
        setSavingProfile(false);
        return;
      }

      await api.put('/users/profile', payload);
      setProfileMsg('Profile updated successfully!');
      await refreshUser();
      await loadProfile();
    } catch (err) {
      setProfileMsg(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#949ba4' }}>
        <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading profile...
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
          <User size={22} /> Profile & Settings
        </h1>
        <p style={{ fontSize: '13px', color: '#949ba4', marginTop: '2px' }}>
          Manage your account, profile details, and security settings
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
                {(profile?.displayName || profile?.pseudonym)?.slice(0, 2)?.toUpperCase() || '??'}
              </div>
              <div>
                {profile?.displayName && (
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f2f3f5' }}>
                    {profile.displayName}
                  </h2>
                )}
                <div style={{
                  fontSize: profile?.displayName ? '13px' : '22px',
                  fontWeight: profile?.displayName ? 400 : 700,
                  color: profile?.displayName ? '#949ba4' : '#f2f3f5',
                  marginTop: profile?.displayName ? '2px' : 0,
                }}>
                  {profile?.pseudonym}
                </div>
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
                  {profile?.hostel && (
                    <span style={{ fontSize: '12px', color: '#949ba4' }}>
                      🏠 {profile.hostel}
                    </span>
                  )}
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
              <InfoRow icon={<Key size={16} />} label="Password" value={profile?.hasPassword ? 'Set' : 'Not set'} verified={profile?.hasPassword} />
            </div>
          </motion.div>

          {/* ─── Profile Details ──────────────────── */}
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
              <User size={18} /> Profile Details
            </h3>
            <p style={{ fontSize: '13px', color: '#949ba4', marginBottom: '16px' }}>
              Update your profile information. Hostel can only be set once.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Gender */}
              <div>
                <label style={{ fontSize: '12px', color: '#949ba4', marginBottom: '4px', display: 'block' }}>Gender</label>
                <select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm(f => ({ ...f, gender: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="">Select gender</option>
                  {VALID_GENDERS.map(g => (
                    <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1).replace(/-/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Hostel */}
              <div>
                <label style={{ fontSize: '12px', color: '#949ba4', marginBottom: '4px', display: 'block' }}>
                  Hostel {profile?.hostel && <span style={{ color: '#f0b232' }}>(locked — already set to {profile.hostel})</span>}
                </label>
                <select
                  value={profileForm.hostel}
                  onChange={(e) => setProfileForm(f => ({ ...f, hostel: e.target.value }))}
                  disabled={!!profile?.hostel}
                  style={{ ...selectStyle, opacity: profile?.hostel ? 0.5 : 1 }}
                >
                  <option value="">Select hostel</option>
                  {VALID_HOSTELS.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Programme */}
              <div>
                <label style={{ fontSize: '12px', color: '#949ba4', marginBottom: '4px', display: 'block' }}>Programme</label>
                <select
                  value={profileForm.programme}
                  onChange={(e) => setProfileForm(f => ({ ...f, programme: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="">Select programme</option>
                  {VALID_PROGRAMMES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Year of Study */}
              <div>
                <label style={{ fontSize: '12px', color: '#949ba4', marginBottom: '4px', display: 'block' }}>Year of Study</label>
                <select
                  value={profileForm.yearOfStudy}
                  onChange={(e) => setProfileForm(f => ({ ...f, yearOfStudy: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="">Select year</option>
                  {[1, 2, 3, 4, 5].map(y => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label style={{ fontSize: '12px', color: '#949ba4', marginBottom: '4px', display: 'block' }}>Department</label>
                <input
                  type="text"
                  value={profileForm.department}
                  onChange={(e) => setProfileForm(f => ({ ...f, department: e.target.value }))}
                  placeholder="e.g. Computer Science"
                  style={inputStyle}
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleProfileUpdate}
                disabled={savingProfile}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px',
                  borderRadius: '4px',
                  background: '#5865f2',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  opacity: savingProfile ? 0.5 : 1,
                  alignSelf: 'flex-start',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Save size={14} /> {savingProfile ? 'Saving...' : 'Save Profile'}
              </motion.button>

              {profileMsg && (
                <p style={{
                  fontSize: '12px',
                  color: profileMsg.includes('success') ? '#23a559' : '#da373c',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  {profileMsg.includes('success') ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {profileMsg}
                </p>
              )}
            </div>
          </motion.div>

          {/* ─── Link Phone Number ─────────────────── */}
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
                    style={{ ...inputStyle, flex: 1, width: 'auto' }}
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
                      border: 'none',
                      cursor: 'pointer',
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
                      style={{ ...inputStyle, flex: 1, width: 'auto' }}
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
                        border: 'none',
                        cursor: 'pointer',
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
            transition={{ delay: 0.3 }}
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
                  style={inputStyle}
                />
              )}
              <input
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))}
                placeholder="New password (min 6 characters)"
                style={inputStyle}
              />
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Confirm new password"
                style={inputStyle}
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
                  border: 'none',
                  cursor: 'pointer',
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
