import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { User } from '../types/navigation';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  sendPhoneVerification: (phone: string, name: string) => Promise<void>;
  verifyPhone: (phone: string, code: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
  businessName?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = 'https://complain-app-backend.onrender.com/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('auth_token');
      const storedUser = await SecureStore.getItemAsync('auth_user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const storeAuth = async (token: string, user: User) => {
    try {
      await SecureStore.setItemAsync('auth_token', token);
      await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
    } catch (error) {
      console.error('Error storing auth:', error);
    }
  };

  const clearAuth = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('auth_user');
    } catch (error) {
      console.error('Error clearing auth:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      if (response.data.success) {
        const { token: newToken, user: newUser } = response.data.data;
        setToken(newToken);
        setUser(newUser);
        await storeAuth(newToken, newUser);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);

      if (response.data.success) {
        if (response.data.needsVerification) {
          // Registration initiated, verification needed
          return;
        } else {
          throw new Error('Unexpected response from registration');
        }
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const sendPhoneVerification = async (phone: string, name: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/send-phone-verification`, {
        phone,
        name,
      });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const verifyPhone = async (phone: string, code: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-phone-registration`, {
        phone,
        verificationCode: code,
      });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const verifyEmail = async (email: string, code: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-email`, {
        email,
        verificationToken: code,
      });

      if (response.data.success) {
        const { token: newToken, user: newUser } = response.data.data;
        setToken(newToken);
        setUser(newUser);
        await storeAuth(newToken, newUser);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await clearAuth();
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    register,
    logout,
    sendPhoneVerification,
    verifyPhone,
    verifyEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 