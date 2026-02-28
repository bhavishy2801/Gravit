import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChannelFeed from './pages/ChannelFeed';
import PostDetail from './pages/PostDetail';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import CreateServerPage from './pages/CreateServerPage';
import ExplorePage from './pages/ExplorePage';
import ServerView from './pages/ServerView';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Auth routes (no sidebar) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Main app routes (with sidebar layout) */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/channels/:channelId" element={<ChannelFeed />} />
              <Route path="/posts/:postId" element={<PostDetail />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/create-server" element={<CreateServerPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/servers/:serverId" element={<ServerView />} />
              <Route path="/servers/:serverId/channels/:channelId" element={<ServerView />} />
            </Route>

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
