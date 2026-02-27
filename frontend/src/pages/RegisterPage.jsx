import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Building2, Shield } from 'lucide-react';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        email: '', password: '', confirmPassword: '',
        institution: '', role: 'student',
    });

    const handleChange = (field) => (e) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        navigate('/channels/curriculum');
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
                    marginBottom: '24px',
                }}>
                    Your voice matters. Make it heard.
                </p>

                <form onSubmit={handleSubmit} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                }}>
                    {/* Institution */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Institution <span style={{ color: '#da373c' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Building2 size={16} color="#949ba4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <select
                                value={form.institution}
                                onChange={handleChange('institution')}
                                style={{ width: '100%', paddingLeft: '36px', appearance: 'none' }}
                            >
                                <option value="">Select your institution...</option>
                                <option value="nit">National Institute of Technology</option>
                                <option value="iit">Indian Institute of Technology</option>
                                <option value="iiit">IIIT</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Email <span style={{ color: '#da373c' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} color="#949ba4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input type="email" value={form.email} onChange={handleChange('email')} placeholder="you@university.edu" style={{ width: '100%', paddingLeft: '36px' }} />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Password <span style={{ color: '#da373c' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} color="#949ba4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input type="password" value={form.password} onChange={handleChange('password')} placeholder="••••••••" style={{ width: '100%', paddingLeft: '36px' }} />
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Confirm Password <span style={{ color: '#da373c' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} color="#949ba4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input type="password" value={form.confirmPassword} onChange={handleChange('confirmPassword')} placeholder="••••••••" style={{ width: '100%', paddingLeft: '36px' }} />
                        </div>
                    </div>

                    {/* Role */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Role <span style={{ color: '#da373c' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Shield size={16} color="#949ba4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <select value={form.role} onChange={handleChange('role')} style={{ width: '100%', paddingLeft: '36px', appearance: 'none' }}>
                                <option value="student">Student</option>
                                <option value="moderator">Moderator</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '4px',
                            background: '#5865f2',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 600,
                            marginTop: '4px',
                        }}
                    >
                        Continue
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
                </div>
            </motion.div>
        </div>
    );
}
