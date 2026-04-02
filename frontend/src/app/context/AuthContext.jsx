import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { api } from '../../services/api';

const AuthContext = createContext();

/**
 * Hook to access the auth context.
 * @returns {Object} The auth context value.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Provides authentication state and helpers to the component tree.
 * @param {{ children: React.ReactNode }} props
 * @returns {React.ReactElement}
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('authToken');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const profile = await api.fetchCurrentUser();
        setToken(storedToken);
        setUser(profile);
        setIsAuthenticated(true);
        localStorage.setItem('currentUser', JSON.stringify(profile));
      } catch (e) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  /**
   * Authenticate a user with email and password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<void>}
   */
  const login = useCallback(async (email, password) => {
    const response = await api.login(email, password);
    const { token: newToken, user: newUser } = response;

    localStorage.setItem('authToken', newToken);
    localStorage.setItem('currentUser', JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
  }, []);

  /**
   * Clear the session. Callers are responsible for redirecting to /login.
   */
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }, []);

  /**
   * Check if user has permission for a specific action on a specific resource.
   * @param {string} action - The action to check (create, edit, delete).
   * @param {Object} resource - The resource being operated on (optional).
   * @returns {boolean} Whether the user has permission.
   */
  const hasPermission = useCallback((action, resource = null) => {
    if (!user) return false;
    
    // Rule 1: Admins have full access
    if (user.system_role === 'Admin') {
      return true;
    }
    
    // Rule 2 & 3: Employees
    if (user.system_role === 'Employee') {
      if (action === 'create') {
        return true;
      }
      
      if (action === 'edit' || action === 'delete') {
        if (resource && resource.leader_id === user._id) {
          return true;
        }
        return false;
      }
    }
    
    return false;
  }, [user]);

  const value = {
    currentUser: user,
    user,
    token,
    isAuthenticated,
    loading,
    login,
    logout,
    hasPermission,
    isAdmin: user?.system_role === 'Admin',
    isEmployee: user?.system_role === 'Employee',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
