import { useState, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { connectSocket, disconnectSocket } from '../services/socket';

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('educhat_token');
      if (token) {
        try {
          const res = await axios.get('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(res.data.user);
          connectSocket(token);
        } catch {
          localStorage.removeItem('educhat_token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('educhat_token', token);
    setUser(userData);
    connectSocket(token);
  };

  const logout = () => {
    localStorage.removeItem('educhat_token');
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}