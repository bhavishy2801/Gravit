import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d0e10',
        color: '#949ba4',
        fontSize: '16px',
        gap: '12px',
      }}>
        <div style={{
          width: '40px', height: '40px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #5865f2, #7289da)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          fontWeight: 800,
          color: '#fff',
          animation: 'pulse-red 1.5s ease-in-out infinite',
        }}>
          G
        </div>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
