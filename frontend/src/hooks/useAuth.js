import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, initAPI } from '../utils/api';
import { useErrorContext } from '../context/ErrorContext';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showError } = useErrorContext();
  const navigate = useNavigate();

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    // Set loading to true before making the API call
    setLoading(true);
    try {
      const response = await authAPI.getMe();
      setUser(response);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Authentication check failed:', error);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const initializeRoles = useCallback(async () => {
    try {
      await initAPI.initialize();
    } catch (error) {
      console.error('Error initializing roles:', error);
    }
  }, []);

  useEffect(() => {
    const initialLoad = async () => {
      await initializeRoles();
      await checkAuth();
    };
    initialLoad();
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await authAPI.login(credentials);
      localStorage.setItem('token', response.access_token);
      
      // Manually update the auth state after successful login
      // The interceptor in api.js will pick up the new token for this call
      const meResponse = await authAPI.getMe();
      setUser(meResponse);
      setIsAuthenticated(true);

      navigate('/personal'); // Navigate using React Router
      return { success: true };

    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Login failed. Please check your credentials.';
      showError(errorMessage);
      
      // Clear any potentially lingering auth state
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);

      return { 
        success: false, 
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      await authAPI.register(userData);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Registration failed. Please try again.';
      showError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/auth');
    window.location.reload();
  };

  return {
    isAuthenticated,
    user,
    loading,
    login,
    register,
    logout,
    checkAuth
  };
};