import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        navigate('/channels/curriculum');
    };

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            background: '#1e1f22',
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
                    background: '#313338',
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
                    marginBottom: '24px',
                }}>
                    We&apos;re so excited to see you again!
                </p>

                <form onSubmit={handleSubmit} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                }}>
                    {/* Email */}
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
                                placeholder="you@university.edu"
                                style={{ width: '100%', paddingLeft: '36px' }}
                            />
                        </div>
                    </div>

                    {/* Password */}
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

                    <a href="#" style={{ fontSize: '13px', color: '#00a8fc' }}>
                        Forgot your password?
                    </a>

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
                            transition: 'background 0.15s',
                            marginTop: '4px',
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#4752c4'}
                        onMouseLeave={(e) => e.target.style.background = '#5865f2'}
                    >
                        Log In
                    </motion.button>
                </form>

                <p style={{
                    marginTop: '16px',
                    fontSize: '13px',
                    color: '#949ba4',
                }}>
                    Need an account? <Link to="/register" style={{ color: '#00a8fc' }}>Register</Link>
                </p>

                {/* .edu notice */}
                <div style={{
                    marginTop: '16px',
                    padding: '10px 12px',
                    background: 'rgba(88,101,242,0.08)',
                    borderRadius: '4px',
                    borderLeft: '3px solid #5865f2',
                    fontSize: '12px',
                    color: '#b5bac1',
                }}>
                    🔒 Only verified <strong>.edu</strong> email addresses can access Gravit. Your identity remains pseudonymous.
                </div>
            </motion.div>
        </div>
    );
}
