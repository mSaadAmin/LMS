import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { toast } from 'sonner';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        // In a real app, you might want to fetch user profile here
        // For now, we assume if there's a token, we're "logged in"
        setIsAuthenticated(true);
        // Optionally set some dummy user data or decode JWT
        setUser({ role: 'teacher' });
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authApi.login({ username: email, password });
      const { access_token, refresh_token } = response.data.data;
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      
      setIsAuthenticated(true);
      setUser({ role: 'teacher' });
      toast.success('LoggedIn successfully');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Login failed');
      return false;
    }
  };

  const register = async (email, fullName, password) => {
    try {
      await authApi.register({
        email,
        full_name: fullName,
        password,
        role: 'teacher'
      });
      toast.success('Account created! Please login.');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Registration failed');
      return false;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setIsAuthenticated(false);
      setUser(null);
      toast.success('Logged out');
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
