import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
    const navigate = useNavigate();
    const { registerWithEmail, loginWithGoogle, user } = useAuth();

    const [form, setForm] = useState({
        email: '', password: '', confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect if already logged in
    if (user) {
        navigate('/channels/curriculum', { replace: true });
        return null;
    }

    const handleChange = (field) => (e) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (!form.email.endsWith('@iitj.ac.in')) {
            setError('Only @iitj.ac.in email addresses are allowed');
            return;
        }
        setLoading(true);
        try {
            await registerWithEmail(form.email, form.password);
            navigate('/channels/curriculum');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleRegister = async () => {
        setError('');
        setLoading(true);
        try {
            const client = window.google?.accounts?.id;
            if (!client) {
                setError('Google Sign-In not loaded. Please refresh the page.');
                setLoading(false);
                return;
            }
            window.google.accounts.id.initialize({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
                callback: async (response) => {
                    try {
                        await loginWithGoogle(response.credential);
                        navigate('/channels/curriculum');
                    } catch (err) {
                        setError(err.response?.data?.error || 'Google sign-up failed. Only @iitj.ac.in emails allowed.');
                        setLoading(false);
                    }
                },
            });
            window.google.accounts.id.prompt();
            setLoading(false);
        } catch (err) {
            setError('Google sign-up failed');
            setLoading(false);
        }
    };

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
            {/* Background orbs */}
            <div style={{
                position: 'absolute',
                width: '500px', height: '500px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(35,165,89,0.12) 0%, transparent 70%)',
                top: '-100px', right: '-100px',
            }} />
            <div style={{
                position: 'absolute',
                width: '400px', height: '400px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(88,101,242,0.12) 0%, transparent 70%)',
                bottom: '-80px', left: '-80px',
            }} />

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                style={{
                    width: '480px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: '#1a1b1e',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                    padding: '32px',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        style={{
                            width: '64px', height: '64px',
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, #23a559, #5865f2)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            fontWeight: 800,
                            color: '#fff',
                            marginBottom: '16px',
                            boxShadow: '0 4px 20px rgba(35,165,89,0.3)',
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
                    Create an account
                </h1>
                <p style={{
                    textAlign: 'center',
                    fontSize: '14px',
                    color: '#949ba4',
                    marginBottom: '8px',
                }}>
                    Your voice matters. Make it heard.
                </p>
                <p style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#5865f2',
                    marginBottom: '24px',
                    fontWeight: 600,
                }}>
                    🏛️ IIT Jodhpur — Exclusive Platform
                </p>

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

                {/* Google Sign Up — Primary */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGoogleRegister}
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
                        marginBottom: '16px',
                        opacity: loading ? 0.7 : 1,
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                    Sign up with Google (@iitj.ac.in)
                </motion.button>

                {/* Divider */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    marginBottom: '16px',
                }}>
                    <div style={{ flex: 1, height: '1px', background: '#2e3035' }} />
                    <span style={{ fontSize: '12px', color: '#949ba4', fontWeight: 600 }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: '#2e3035' }} />
                </div>

                <form onSubmit={handleSubmit} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                }}>
                    {/* Email */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Email <span style={{ color: '#da373c' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} color="#949ba4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input type="email" value={form.email} onChange={handleChange('email')} placeholder="you@iitj.ac.in" style={{ width: '100%', paddingLeft: '36px' }} required />
                        </div>
                        <p style={{ fontSize: '11px', color: '#949ba4', marginTop: '4px' }}>Must be an @iitj.ac.in email address</p>
                    </div>

                    {/* Password */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Password <span style={{ color: '#da373c' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} color="#949ba4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input type="password" value={form.password} onChange={handleChange('password')} placeholder="Min 6 characters" style={{ width: '100%', paddingLeft: '36px' }} required minLength={6} />
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Confirm Password <span style={{ color: '#da373c' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} color="#949ba4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input type="password" value={form.confirmPassword} onChange={handleChange('confirmPassword')} placeholder="••••••••" style={{ width: '100%', paddingLeft: '36px' }} required />
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
                            marginTop: '4px',
                            opacity: loading ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                        }}
                    >
                        {loading && <Loader size={16} />}
                        Create Account
                    </motion.button>
                </form>

                <p style={{ marginTop: '16px', fontSize: '13px', color: '#949ba4' }}>
                    <Link to="/login" style={{ color: '#00a8fc' }}>Already have an account?</Link>
                </p>

                <div style={{
                    marginTop: '16px',
                    padding: '10px 12px',
                    background: 'rgba(35,165,89,0.08)',
                    borderRadius: '4px',
                    borderLeft: '3px solid #23a559',
                    fontSize: '12px',
                    color: '#b5bac1',
                }}>
                    🛡️ A persistent pseudonym will be generated for you. Your real identity is encrypted and inaccessible to admins.
                    <br /><br />
                    📱 You can link your phone number later in Profile Settings to enable phone-based login.
                </div>
            </motion.div>
        </div>
    );
}
