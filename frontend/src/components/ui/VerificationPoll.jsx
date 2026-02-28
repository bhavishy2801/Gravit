import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function VerificationPoll({
    adminResponse,
    deadline,
    votes = { yes: 0, no: 0 },
    userVote: initialUserVote = null,
    onVote,
}) {
    const [userVote, setUserVote] = useState(initialUserVote);
    const [localVotes, setLocalVotes] = useState(votes);
    const total = localVotes.yes + localVotes.no;
    const yesPct = total > 0 ? (localVotes.yes / total) * 100 : 50;
    const noPct = total > 0 ? (localVotes.no / total) * 100 : 50;
    const deadlineDate = new Date(deadline);
    const hoursLeft = Math.max(0, Math.floor((deadlineDate - Date.now()) / (1000 * 60 * 60)));

    const handleVote = async (vote) => {
        if (userVote) return;
        setUserVote(vote);
        // Optimistic update
        setLocalVotes(prev => ({
            yes: prev.yes + (vote === 'yes' ? 1 : 0),
            no: prev.no + (vote === 'no' ? 1 : 0),
        }));
        try {
            await onVote?.(vote);
        } catch (err) {
            // Revert on error
            setUserVote(null);
            setLocalVotes(votes);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                padding: '20px',
                background: 'rgba(88,101,242,0.06)',
                borderRadius: '8px',
                border: '1px solid rgba(88,101,242,0.2)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{
                    width: '32px', height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(88,101,242,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px',
                }}>
                    
                </div>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f2f3f5' }}>
                        Resolution Verification
                    </div>
                    <div style={{ fontSize: '11px', color: '#949ba4', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} /> {hoursLeft}h remaining  {total} votes cast
                    </div>
                </div>
            </div>

            {/* Admin's claimed resolution */}
            <div style={{
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '6px',
                borderLeft: '3px solid #5865f2',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#b5bac1',
            }}>
                <span style={{ fontSize: '10px', color: '#949ba4', textTransform: 'uppercase', fontWeight: 600 }}>
                    Admin&apos;s Resolution
                </span>
                <p style={{ marginTop: '4px' }}>{adminResponse}</p>
            </div>

            {/* Question */}
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#f2f3f5', marginBottom: '12px' }}>
                Was this issue actually resolved?
            </p>

            {/* Vote buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                    onClick={() => handleVote('yes')}
                    disabled={userVote !== null}
                    style={{
                        flex: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        padding: '10px',
                        borderRadius: '6px',
                        fontSize: '13px', fontWeight: 600,
                        background: userVote === 'yes' ? '#23a559' : 'rgba(35,165,89,0.1)',
                        color: userVote === 'yes' ? '#fff' : '#23a559',
                        border: `1px solid ${userVote === 'yes' ? '#23a559' : '#23a55933'}`,
                        transition: 'all 0.2s',
                        cursor: userVote ? 'default' : 'pointer',
                        opacity: userVote && userVote !== 'yes' ? 0.5 : 1,
                    }}
                >
                    <CheckCircle size={16} /> Yes, Resolved
                </button>
                <button
                    onClick={() => handleVote('no')}
                    disabled={userVote !== null}
                    style={{
                        flex: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        padding: '10px',
                        borderRadius: '6px',
                        fontSize: '13px', fontWeight: 600,
                        background: userVote === 'no' ? '#da373c' : 'rgba(218,55,60,0.1)',
                        color: userVote === 'no' ? '#fff' : '#da373c',
                        border: `1px solid ${userVote === 'no' ? '#da373c' : '#da373c33'}`,
                        transition: 'all 0.2s',
                        cursor: userVote ? 'default' : 'pointer',
                        opacity: userVote && userVote !== 'no' ? 0.5 : 1,
                    }}
                >
                    <XCircle size={16} /> No, Not Fixed
                </button>
            </div>

            {/* Tally bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span style={{ color: '#23a559', fontWeight: 600 }}>Yes ({localVotes.yes})</span>
                        <span style={{ color: '#949ba4' }}>{yesPct.toFixed(0)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${yesPct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            style={{ height: '100%', background: '#23a559', borderRadius: '3px' }}
                        />
                    </div>
                </div>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span style={{ color: '#da373c', fontWeight: 600 }}>No ({localVotes.no})</span>
                        <span style={{ color: '#949ba4' }}>{noPct.toFixed(0)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${noPct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            style={{ height: '100%', background: '#da373c', borderRadius: '3px' }}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
