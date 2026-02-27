import { Outlet } from 'react-router-dom';
import ServerBar from '../components/navigation/ServerBar';
import ChannelSidebar from '../components/navigation/ChannelSidebar';
import TopBar from '../components/navigation/TopBar';

export default function AppLayout({ channelName, channelDescription }) {
    return (
        <div style={{
            display: 'flex',
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
        }}>
            {/* Server bar (leftmost) */}
            <ServerBar />

            {/* Channel sidebar */}
            <ChannelSidebar />

            {/* Main content area */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'hidden',
                background: '#313338',
            }}>
                {/* Top bar */}
                <TopBar channelName={channelName} description={channelDescription} />

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
