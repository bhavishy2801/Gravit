import { motion } from 'framer-motion';

const stateConfig = {
    open: { label: 'Open', color: '#949ba4', bg: 'rgba(148,155,164,0.15)' },
    trending: { label: '🔥 Trending', color: '#f0b232', bg: 'rgba(240,178,50,0.15)' },
    escalated: { label: '🚨 Escalated', color: '#da373c', bg: 'rgba(218,55,60,0.15)' },
    pending_verification: { label: '🔍 Pending Verification', color: '#5865f2', bg: 'rgba(88,101,242,0.15)' },
    resolved: { label: '✅ Resolved', color: '#23a559', bg: 'rgba(35,165,89,0.15)' },
    resolution_rejected: { label: '❌ Resolution Rejected', color: '#ed4245', bg: 'rgba(237,66,69,0.15)' },
};

export default function StateBadge({ state }) {
    const config = stateConfig[state] || stateConfig.open;

    return (
        <motion.span
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 10px',
                borderRadius: '100px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                color: config.color,
                background: config.bg,
                border: `1px solid ${config.color}33`,
                whiteSpace: 'nowrap',
            }}
        >
            {config.label}
        </motion.span>
    );
}
