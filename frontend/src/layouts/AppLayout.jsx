import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import ServerBar from '../components/navigation/ServerBar';
import ChannelSidebar from '../components/navigation/ChannelSidebar';
import TopBar from '../components/navigation/TopBar';

export default function AppLayout({ channelName, channelDescription }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div style={{
            display: 'flex',
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
        }}>
            {/* Mobile Overlay */}
            <div
                className={`drawer-overlay ${isMobileMenuOpen ? 'open' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Sidebar Wrapper (Drawer on mobile) */}
            <div
                className={`sidebar-drawer ${isMobileMenuOpen ? 'open' : ''}`}
                style={{ display: 'flex', height: '100%', zIndex: 50 }}
            >
                {/* Server bar (leftmost) */}
                <ServerBar />

                {/* Channel sidebar */}
                <ChannelSidebar />
            </div>

            {/* Main content area */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'hidden',
                background: '#1a1b1e',
            }}>
                {/* Top bar */}
                <TopBar
                    channelName={channelName}
                    description={channelDescription}
                    onMenuClick={() => setIsMobileMenuOpen(true)}
                />

                {/* Page content */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    overflow: 'hidden',
                }}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
