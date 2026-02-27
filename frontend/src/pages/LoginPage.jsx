import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Phone, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
    const navigate = useNavigate();
    const { loginWithEmail, loginWithGoogle, sendPhoneOTP, loginWithPhone, user } = useAuth();

    const [tab, setTab] = useState('email'); // email | google | phone
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [phoneNum, setPhoneNum] = useState('');
    const [otp, setOtp] = useState('');
    const [phoneStep, setPhoneStep] = useState('input'); // input | otp
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect if already logged in
    if (user) {
        navigate('/channels/curriculum', { replace: true });
        return null;
    }

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await loginWithEmail(email, password);
            navigate('/channels/curriculum');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            // Use Google's popup flow
            const client = window.google?.accounts?.id;
            if (!client) {
                // Fallback: redirect approach or show error
                setError('Google Sign-In not loaded. Please refresh the page.');
                setLoading(false);
                return;
            }
            // Using credential callback approach
            window.google.accounts.id.initialize({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
                callback: async (response) => {
                    try {
                        await loginWithGoogle(response.credential);
                        navigate('/channels/curriculum');
                    } catch (err) {
                        setError(err.response?.data?.error || 'Google login failed. Only @iitj.ac.in emails allowed.');
                        setLoading(false);
                    }
                },
            });
            window.google.accounts.id.prompt();
            setLoading(false);
        } catch (err) {
            setError('Google login failed');
            setLoading(false);
        }
    };

    const handleSendOTP = async () => {
        setError('');
        setLoading(true);
        try {
            await sendPhoneOTP(phoneNum);
            setPhoneStep('otp');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP. Phone must be linked first.');
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneLogin = async () => {
        setError('');
        setLoading(true);
        try {
            await loginWithPhone(phoneNum, otp);
            navigate('/channels/curriculum');
        } catch (err) {
            setError(err.response?.data?.error || 'Phone login failed');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'email', label: 'Email' },
        { id: 'google', label: 'Google' },
        { id: 'phone', label: 'Phone' },
    ];

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            background: '#0d0e10',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Animated background orbs */}
            <div style={{
                position: 'absolute',
                width: '500px', height: '500px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(88,101,242,0.15) 0%, transparent 70%)',
                top: '-100px', left: '-100px',
                animation: 'float 8s ease-in-out infinite',
            }} />
            <div style={{
                position: 'absolute',
                width: '400px', height: '400px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(235,69,158,0.1) 0%, transparent 70%)',
                bottom: '-80px', right: '-80px',
                animation: 'float 10s ease-in-out infinite reverse',
            }} />

            <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
      `}</style>

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                style={{
                    width: '480px',
                    background: '#1a1b1e',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                    padding: '32px',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        style={{
                            width: '64px', height: '64px',
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, #5865f2, #7289da)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            fontWeight: 800,
                            color: '#fff',
                            marginBottom: '16px',
                            boxShadow: '0 4px 20px rgba(88,101,242,0.4)',
                        }}
                    >
                        G
                    </motion.div>
                </div>

                <h1 style={{
                    textAlign: 'center',
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#f2f3f5',
                    marginBottom: '4px',
                }}>
                    Welcome back!
                </h1>
                <p style={{
                    textAlign: 'center',
                    fontSize: '14px',
                    color: '#949ba4',
                    marginBottom: '20px',
                }}>
                    Sign in to IIT Jodhpur Grievance Platform
                </p>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '20px',
                    background: '#0d0e10',
                    borderRadius: '6px',
                    padding: '3px',
                }}>
                    {tabs.map((t) => (
                        <motion.button
                            key={t.id}
                            onClick={() => { setTab(t.id); setError(''); }}
                            whileTap={{ scale: 0.97 }}
                            style={{
                                flex: 1,
                                padding: '8px',
                                borderRadius: '4px',
                                fontSize: '13px',
                                fontWeight: 600,
                                background: tab === t.id ? '#5865f2' : 'transparent',
                                color: tab === t.id ? '#fff' : '#949ba4',
                                transition: 'background 0.15s, color 0.15s',
                            }}
                        >
                            {t.label}
                        </motion.button>
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            marginBottom: '16px',
                            padding: '10px 12px',
                            background: 'rgba(218,55,60,0.1)',
                            border: '1px solid rgba(218,55,60,0.3)',
                            borderRadius: '4px',
                            fontSize: '13px',
                            color: '#da373c',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        <AlertCircle size={16} /> {error}
                    </motion.div>
                )}

                {/* ─── Email Tab ─── */}
                {tab === 'email' && (
                    <form onSubmit={handleEmailLogin} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                    }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#b5bac1',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                marginBottom: '8px',
                            }}>
                                Email <span style={{ color: '#da373c' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} color="#949ba4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@iitj.ac.in"
                                    style={{ width: '100%', paddingLeft: '36px' }}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#b5bac1',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                marginBottom: '8px',
                            }}>
                                Password <span style={{ color: '#da373c' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} color="#949ba4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    style={{ width: '100%', paddingLeft: '36px', paddingRight: '40px' }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#949ba4' }}
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '4px',
                                background: '#5865f2',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600,
                                transition: 'background 0.15s',
                                marginTop: '4px',
                                opacity: loading ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                        >
                            {loading && <Loader size={16} className="animate-pulse-red" />}
                            Log In
                        </motion.button>
                    </form>
                )}

                {/* ─── Google Tab ─── */}
                {tab === 'google' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                        <p style={{ fontSize: '13px', color: '#b5bac1', textAlign: 'center' }}>
                            Sign in with your <strong>@iitj.ac.in</strong> Google account
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '4px',
                                background: '#fff',
                                color: '#1a1b1e',
                                fontSize: '14px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                            Continue with Google
                        </motion.button>
                        <p style={{ fontSize: '11px', color: '#949ba4', textAlign: 'center' }}>
                            Only @iitj.ac.in Google accounts are accepted
                        </p>
                    </div>
                )}

                {/* ─── Phone Tab ─── */}
                {tab === 'phone' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <p style={{ fontSize: '13px', color: '#b5bac1' }}>
                            Phone login is available after you link &amp; verify your phone number in your profile settings.
                        </p>

                        {phoneStep === 'input' && (
                            <>
                                <div>
                                    <label style={{
                                        display: 'block', fontSize: '12px', fontWeight: 700,
                                        color: '#b5bac1', textTransform: 'uppercase',
                                        letterSpacing: '0.05em', marginBottom: '8px',
                                    }}>
                                        Phone Number <span style={{ color: '#da373c' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Phone size={16} color="#949ba4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                        <input
                                            type="tel"
                                            value={phoneNum}
                                            onChange={(e) => setPhoneNum(e.target.value)}
                                            placeholder="+91 9876543210"
                                            style={{ width: '100%', paddingLeft: '36px' }}
                                        />
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSendOTP}
                                    disabled={loading || !phoneNum}
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: '4px',
                                        background: '#5865f2', color: '#fff',
                                        fontSize: '14px', fontWeight: 600,
                                        opacity: loading || !phoneNum ? 0.7 : 1,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    }}
                                >
                                    {loading && <Loader size={16} />}
                                    Send OTP
                                </motion.button>
                            </>
                        )}

                        {phoneStep === 'otp' && (
                            <>
                                <div style={{
                                    padding: '8px 12px',
                                    background: 'rgba(35,165,89,0.08)',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    color: '#23a559',
                                }}>
                                    OTP sent! For demo, use: <strong>123456</strong>
                                </div>
                                <div>
                                    <label style={{
                                        display: 'block', fontSize: '12px', fontWeight: 700,
                                        color: '#b5bac1', textTransform: 'uppercase',
                                        letterSpacing: '0.05em', marginBottom: '8px',
                                    }}>
                                        Enter OTP <span style={{ color: '#da373c' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        placeholder="123456"
                                        maxLength={6}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handlePhoneLogin}
                                    disabled={loading || otp.length !== 6}
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: '4px',
                                        background: '#23a559', color: '#fff',
                                        fontSize: '14px', fontWeight: 600,
                                        opacity: loading || otp.length !== 6 ? 0.7 : 1,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    }}
                                >
                                    {loading && <Loader size={16} />}
                                    Verify &amp; Log In
                                </motion.button>
                            </>
                        )}
                    </div>
                )}

                <p style={{
                    marginTop: '16px',
                    fontSize: '13px',
                    color: '#949ba4',
                }}>
                    Need an account? <Link to="/register" style={{ color: '#00a8fc' }}>Register</Link>
                </p>

                {/* IIT Jodhpur notice */}
                <div style={{
                    marginTop: '16px',
                    padding: '10px 12px',
                    background: 'rgba(88,101,242,0.08)',
                    borderRadius: '4px',
                    borderLeft: '3px solid #5865f2',
                    fontSize: '12px',
                    color: '#b5bac1',
                }}>
                    🔒 Only verified <strong>@iitj.ac.in</strong> email addresses can access Gravit. Your identity remains pseudonymous.
                </div>
            </motion.div>
        </div>
    );
}
