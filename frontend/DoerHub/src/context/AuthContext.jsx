import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser ] = useState(null); // { role: 'user' | 'provider' | 'admin', id: 1 }

  const login = (role, id) => setUser ({ role, id });
  const logout = () => setUser (null);
  const isAuthenticated = () => !!user;
  const isAdmin = () => user?.role === 'admin';
  const isUser  = () => user?.role === 'user';
  const isProvider = () => user?.role === 'provider';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isAdmin, isUser , isProvider }}>
      {children}
    </AuthContext.Provider>
  );
};
