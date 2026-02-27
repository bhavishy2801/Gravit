import { motion } from 'framer-motion';

function getUrgencyColor(score) {
    if (score < 15) return { color: '#23a559', label: 'Low' };
    if (score < 35) return { color: '#f0b232', label: 'Medium' };
    if (score < 55) return { color: '#e67e22', label: 'High' };
    return { color: '#da373c', label: 'Critical' };
}

function getGradient(score) {
    const pct = Math.min(score / 80, 1) * 100;
    return `linear-gradient(90deg, #23a559 0%, #f0b232 30%, #e67e22 60%, #da373c ${pct}%)`;
}

export default function UrgencyMeter({ score, compact = false }) {
    const { color, label } = getUrgencyColor(score);
    const width = Math.min((score / 80) * 100, 100);

    if (compact) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                    width: '40px', height: '4px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{ height: '100%', background: color, borderRadius: '2px' }}
                    />
                </div>
                <span style={{ fontSize: '10px', color, fontWeight: 600 }}>{score.toFixed(1)}</span>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', gap: '6px',
            padding: '12px 16px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '8px',
            border: `1px solid ${color}22`,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#b5bac1', fontWeight: 500 }}>URGENCY SCORE</span>
                <span style={{
                    fontSize: '18px', fontWeight: 700, color,
                    ...(score >= 55 ? { animation: 'pulse-red 2s infinite' } : {}),
                }}>
                    {score.toFixed(1)}
                </span>
            </div>
            <div style={{
                width: '100%', height: '8px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '4px',
                overflow: 'hidden',
            }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    style={{
                        height: '100%',
                        background: getGradient(score),
                        borderRadius: '4px',
                        boxShadow: score >= 55 ? `0 0 12px ${color}66` : 'none',
                    }}
                />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#949ba4' }}>
                <span>Low</span>
                <span style={{ color, fontWeight: 600 }}>{label}</span>
                <span>Critical</span>
            </div>
        </div>
    );
}
