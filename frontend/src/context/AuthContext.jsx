import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token       = window.localStorage.getItem('gp_token');
      const storedUser  = window.localStorage.getItem('gp_user');
      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('gp_token', token);
      window.localStorage.setItem('gp_user', JSON.stringify(userData));
    }
    setUser(userData);
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('gp_token');
      window.localStorage.removeItem('gp_user');
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
