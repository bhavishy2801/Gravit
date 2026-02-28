import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, Users, Shield, Timer, Award, Loader } from 'lucide-react';
import api from '../services/api';

function getRankEmoji(rank) {
    if (rank === 1) return '';
    if (rank === 2) return '';
    if (rank === 3) return '';
    return `#${rank}`;
}

const statIcons = {
    totalPosts: { icon: TrendingUp, color: '#5865f2', bg: 'rgba(88,101,242,0.1)' },
    escalatedActive: { icon: AlertTriangle, color: '#da373c', bg: 'rgba(218,55,60,0.1)' },
    resolvedThisMonth: { icon: CheckCircle, color: '#23a559', bg: 'rgba(35,165,89,0.1)' },
    pendingVerification: { icon: Clock, color: '#f0b232', bg: 'rgba(240,178,50,0.1)' },
    avgResolutionTime: { icon: Timer, color: '#e67e22', bg: 'rgba(230,126,34,0.1)' },
    dmsTriggered: { icon: Shield, color: '#ed4245', bg: 'rgba(237,66,69,0.1)' },
    verificationSuccessRate: { icon: Award, color: '#23a559', bg: 'rgba(35,165,89,0.1)' },
    activeUsers: { icon: Users, color: '#5865f2', bg: 'rgba(88,101,242,0.1)' },
};

const statLabels = {
    totalPosts: 'Total Grievances',
    escalatedActive: 'Escalated (Active)',
    resolvedThisMonth: 'Resolved This Month',
    pendingVerification: 'Pending Verification',
    avgResolutionTime: 'Avg. Resolution Time',
    dmsTriggered: 'DMS Triggered',
    verificationSuccessRate: 'Verification Success',
    activeUsers: 'Active Users',
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [escalations, setEscalations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboard() {
            try {
                const [statsRes, leaderboardRes, escalationsRes] = await Promise.all([
                    api.get('/dashboard/stats'),
                    api.get('/dashboard/leaderboard'),
                    api.get('/dashboard/escalations'),
                ]);
                setStats(statsRes.data.stats);
                setLeaderboard(leaderboardRes.data.leaderboard);
                setEscalations(escalationsRes.data.posts);
            } catch (err) {
                console.error('Failed to load dashboard:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#949ba4' }}>
                <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    const statCards = stats ? Object.entries(stats).map(([key, value]) => ({
        key,
        label: statLabels[key] || key,
        value,
        ...(statIcons[key] || { icon: TrendingUp, color: '#5865f2', bg: 'rgba(88,101,242,0.1)' }),
    })) : [];

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
                minHeight: '48px',
            }}>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f2f3f5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Admin Dashboard
                </h1>
                <p style={{ fontSize: '13px', color: '#949ba4', marginTop: '2px' }}>
                    Institutional performance metrics & accountability tracker
                </p>
            </div>

            {/* Content */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
            }}>
                {/* Stats grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px',
                    marginBottom: '24px',
                }}>
                    {statCards.map((stat, idx) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={stat.key}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                style={{
                                    padding: '16px',
                                    background: '#141517',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#949ba4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {stat.label}
                                    </span>
                                    <div style={{
                                        width: '28px', height: '28px',
                                        borderRadius: '6px',
                                        background: stat.bg,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Icon size={14} color={stat.color} />
                                    </div>
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: 800, color: stat.color }}>
                                    {stat.value}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Two-column layout */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                }}>
                    {/* Leaderboard */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        style={{
                            background: '#141517',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            <Award size={18} color="#f0b232" />
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#f2f3f5' }}>
                                Department Leaderboard
                            </span>
                        </div>
                        <div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '40px 1fr 70px 70px 60px 50px',
                                padding: '8px 16px',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#949ba4',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                            }}>
                                <span>#</span>
                                <span>Department</span>
                                <span>Resolved</span>
                                <span>Avg Time</span>
                                <span>Success</span>
                                <span>DMS</span>
                            </div>
                            {leaderboard.length === 0 && (
                                <div style={{ padding: '24px', textAlign: 'center', color: '#949ba4', fontSize: '13px' }}>
                                    No data yet
                                </div>
                            )}
                            {leaderboard.map((dept, idx) => (
                                <motion.div
                                    key={dept.department}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 + idx * 0.05 }}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '40px 1fr 70px 70px 60px 50px',
                                        padding: '10px 16px',
                                        fontSize: '13px',
                                        color: '#b5bac1',
                                        borderBottom: '1px solid rgba(255,255,255,0.02)',
                                        alignItems: 'center',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <span style={{ fontSize: '14px' }}>{getRankEmoji(dept.rank)}</span>
                                    <span style={{ fontWeight: 500, color: '#f2f3f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {dept.department}
                                    </span>
                                    <span style={{ fontWeight: 600, color: '#23a559' }}>{dept.resolvedCount}</span>
                                    <span>{dept.avgResolutionDays}d</span>
                                    <span style={{
                                        color: dept.successRate >= 80 ? '#23a559' : dept.successRate >= 60 ? '#f0b232' : '#da373c',
                                        fontWeight: 600,
                                    }}>
                                        {dept.successRate}%
                                    </span>
                                    <span style={{
                                        color: dept.dmsCount > 3 ? '#da373c' : '#949ba4',
                                        fontWeight: dept.dmsCount > 3 ? 700 : 400,
                                    }}>
                                        {dept.dmsCount}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Recent Escalated */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        style={{
                            background: '#141517',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            <AlertTriangle size={18} color="#da373c" />
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#f2f3f5' }}>
                                Critical Escalations
                            </span>
                        </div>
                        <div>
                            {escalations.length === 0 && (
                                <div style={{ padding: '24px', textAlign: 'center', color: '#949ba4', fontSize: '13px' }}>
                                    No active escalations
                                </div>
                            )}
                            {escalations.map((post, idx) => (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 + idx * 0.05 }}
                                    onClick={() => navigate(`/posts/${post.id}`)}
                                    style={{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <div style={{
                                            width: '8px', height: '8px',
                                            borderRadius: '50%',
                                            background: post.urgencyScore >= 55 ? '#da373c' : '#e67e22',
                                        }} />
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#da373c' }}>
                                            Level {post.escalationLevel}
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#949ba4' }}>
                                            Score: {post.urgencyScore.toFixed(1)}
                                        </span>
                                    </div>
                                    <p style={{
                                        fontSize: '13px', fontWeight: 500, color: '#f2f3f5',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {post.title}
                                    </p>
                                    <div style={{ fontSize: '11px', color: '#949ba4', marginTop: '4px' }}>
                                        #{post.channelId}  {post.upvotes} upvotes  {post.commentCount} comments
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* State machine diagram */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    style={{
                        marginTop: '20px',
                        padding: '20px',
                        background: '#2b2d31',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f2f3f5', marginBottom: '16px' }}>
                        Post Lifecycle Pipeline
                    </h3>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        flexWrap: 'wrap',
                        padding: '8px 0',
                    }}>
                        {[
                            { label: 'Open', color: '#949ba4' },
                            { label: '\u2192', color: '#3f4147' },
                            { label: 'Trending', color: '#f0b232' },
                            { label: '\u2192', color: '#3f4147' },
                            { label: 'Escalated', color: '#da373c' },
                            { label: '\u2192', color: '#3f4147' },
                            { label: 'Pending Verification', color: '#5865f2' },
                            { label: '\u2192', color: '#3f4147' },
                            { label: 'Resolved', color: '#23a559' },
                        ].map((step, idx) => (
                            <span key={idx} style={{
                                padding: step.label === '\u2192' ? '0' : '6px 14px',
                                borderRadius: '100px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: step.label === '\u2192' ? '#3f4147' : '#fff',
                                background: step.label === '\u2192' ? 'transparent' : `${step.color}22`,
                                border: step.label === '\u2192' ? 'none' : `1px solid ${step.color}44`,
                            }}>
                                {step.label}
                            </span>
                        ))}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#949ba4', marginTop: '8px' }}>
                        Resolution Rejected auto re-escalates at next hierarchy level
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
