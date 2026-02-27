import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';

function formatTimeRemaining(ms) {
    if (ms <= 0) return { text: 'EXPIRED', urgent: true };
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return { text: `${days}d ${remainingHours}h ${minutes}m`, urgent: false };
    }
    if (hours > 0) {
        return { text: `${hours}h ${minutes}m ${seconds}s`, urgent: hours < 12 };
    }
    return { text: `${minutes}m ${seconds}s`, urgent: true };
}

const escalationLabels = {
    0: 'Not Escalated',
    1: 'HoD',
    2: 'Dean',
    3: 'Vice Chancellor',
    4: 'Public Report',
};

export default function DMSTimer({ deadline, escalationLevel = 1, categoryId = 'academia' }) {
    const [remaining, setRemaining] = useState(new Date(deadline) - Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setRemaining(new Date(deadline) - Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, [deadline]);

    const { text, urgent } = formatTimeRemaining(remaining);
    const nextLevel = escalationLabels[escalationLevel + 1] || 'Public';
    const currentLevel = escalationLabels[escalationLevel] || 'Unknown';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                padding: '16px',
                background: urgent ? 'rgba(218,55,60,0.08)' : 'rgba(88,101,242,0.08)',
                borderRadius: '8px',
                border: `1px solid ${urgent ? '#da373c33' : '#5865f233'}`,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                {urgent ? (
                    <AlertTriangle size={16} color="#da373c" />
                ) : (
                    <Clock size={16} color="#5865f2" />
                )}
                <span style={{
                    fontSize: '12px', fontWeight: 600,
                    color: urgent ? '#da373c' : '#5865f2',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                }}>
                    Dead Man's Switch Active
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                <span style={{
                    fontSize: '28px', fontWeight: 800,
                    color: urgent ? '#da373c' : '#f2f3f5',
                    fontFamily: 'monospace',
                    ...(urgent ? { animation: 'pulse-red 1.5s infinite' } : {}),
                }}>
                    {text}
                </span>
                <span style={{ fontSize: '12px', color: '#949ba4' }}>remaining</span>
            </div>

            <div style={{
                display: 'flex', gap: '16px', fontSize: '12px', color: '#b5bac1',
            }}>
                <div>
                    <span style={{ color: '#949ba4' }}>Current: </span>
                    <span style={{ fontWeight: 600, color: '#f0b232' }}>{currentLevel}</span>
                </div>
                <div>
                    <span style={{ color: '#949ba4' }}>Auto-escalates to: </span>
                    <span style={{ fontWeight: 600, color: '#da373c' }}>{nextLevel}</span>
                </div>
            </div>

            {/* Progress bar */}
            <div style={{
                marginTop: '12px',
                width: '100%', height: '3px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '2px',
                overflow: 'hidden',
            }}>
                <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: `${Math.max(0, (remaining / (72 * 60 * 60 * 1000)) * 100)}%` }}
                    transition={{ duration: 1 }}
                    style={{
                        height: '100%',
                        background: urgent ? '#da373c' : '#5865f2',
                        borderRadius: '2px',
                    }}
                />
            </div>
        </motion.div>
    );
}
