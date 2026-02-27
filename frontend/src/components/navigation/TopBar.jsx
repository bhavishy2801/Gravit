import { Hash, Search, Bell, HelpCircle, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TopBar({ channelName = 'general', description = '' }) {
    return (
        <div style={{
            height: '48px',
            minHeight: '48px',
            background: '#313338',
            borderBottom: '2px solid #1e1f22',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '8px',
        }}>
            {/* Channel name */}
            <Hash size={20} color="#949ba4" />
            <span style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#f2f3f5',
                marginRight: '4px',
            }}>
                {channelName}
            </span>

            {description && (
                <>
                    <div style={{
                        width: '1px',
                        height: '24px',
                        background: '#3f4147',
                        margin: '0 8px',
                    }} />
                    <span style={{
                        fontSize: '13px',
                        color: '#949ba4',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                    }}>
                        {description}
                    </span>
                </>
            )}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Action icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <motion.button
                    whileHover={{ scale: 1.1, color: '#f2f3f5' }}
                    style={{ display: 'flex', color: '#b5bac1' }}
                    title="Members"
                >
                    <Users size={20} />
                </motion.button>

                {/* Search bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    background: '#1e1f22',
                    borderRadius: '4px',
                    width: '170px',
                    cursor: 'text',
                }}>
                    <span style={{ fontSize: '12px', color: '#949ba4', flex: 1 }}>Search</span>
                    <Search size={14} color="#949ba4" />
                </div>

                <motion.button
                    whileHover={{ scale: 1.1, color: '#f2f3f5' }}
                    style={{ display: 'flex', color: '#b5bac1', position: 'relative' }}
                    title="Notifications"
                >
                    <Bell size={20} />
                    <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-6px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#da373c',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        3
                    </span>
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.1, color: '#f2f3f5' }}
                    style={{ display: 'flex', color: '#b5bac1' }}
                    title="Help"
                >
                    <HelpCircle size={20} />
                </motion.button>
            </div>
        </div>
    );
}
