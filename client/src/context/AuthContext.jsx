import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('campuspro_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await API.get('/auth/me');
        setUser(data.user);
        setProfile(data.profile);
      } catch (error) {
        console.error('Session restore failed:', error);
        localStorage.removeItem('campuspro_token');
      } finally {
        setLoading(false);
      }
    };
    checkLoggedIn();
  }, []);

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    localStorage.setItem('campuspro_token', data.token);
    setUser(data.user);
    setProfile(data.profile);
    return data;
  };

  const register = async (formData) => {
    const { data } = await API.post('/auth/register', formData);
    localStorage.setItem('campuspro_token', data.token);
    setUser(data.user);
    setProfile(data.profile);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('campuspro_token');
    setUser(null);
    setProfile(null);
  };

  const updateProfileState = (updatedProfile, updatedUser) => {
    if (updatedProfile) setProfile(updatedProfile);
    if (updatedUser) setUser(prev => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, updateProfileState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
