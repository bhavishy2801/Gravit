import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('gravit_token'));
  const [loading, setLoading] = useState(true);

  // Set token in axios defaults and localStorage
  const saveToken = useCallback((newToken) => {
    if (newToken) {
      localStorage.setItem('gravit_token', newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } else {
      localStorage.removeItem('gravit_token');
      delete api.defaults.headers.common['Authorization'];
    }
    setToken(newToken);
  }, []);

  // Load user on mount if token exists
  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch {
        // Invalid token
        saveToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auth Methods ─────────────────────────────────

  const loginWithEmail = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    saveToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const registerWithEmail = async (email, password) => {
    const res = await api.post('/auth/register', { email, password });
    saveToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const loginWithGoogle = async (credential) => {
    const res = await api.post('/auth/google', { credential });
    saveToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const sendPhoneOTP = async (phone) => {
    const res = await api.post('/auth/phone/send-otp', { phone });
    return res.data;
  };

  const loginWithPhone = async (phone, otp) => {
    const res = await api.post('/auth/phone/verify-otp', { phone, otp });
    saveToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    saveToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch {
      // ignore
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    sendPhoneOTP,
    loginWithPhone,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;
