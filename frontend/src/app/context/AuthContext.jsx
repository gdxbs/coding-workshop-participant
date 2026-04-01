import React, { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';
import { USER_ROLES } from '../data/mockData';

const AuthContext = createContext();

/**
 * Custom hook to access authentication context
 * @returns {Object} Authentication context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * Authentication provider component
 * Manages user authentication state and role-based access control
 */
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState({
    name: 'John Doe',
    email: 'john.doe@acme.com',
    role: USER_ROLES.ADMIN, // Change this to test different roles: ADMIN, MANAGER, CONTRIBUTOR, VIEWER
  });

  /**
   * Check if user has permission for a specific action
   * @param {string} action - The action to check (create, edit, delete)
   * @returns {boolean} Whether the user has permission
   */
  const hasPermission = (action) => {
    const { role } = currentUser;
    
    switch (action) {
      case 'create':
        return role !== USER_ROLES.VIEWER;
      case 'edit':
        return role !== USER_ROLES.VIEWER;
      case 'delete':
        return role === USER_ROLES.ADMIN || role === USER_ROLES.MANAGER;
      default:
        return false;
    }
  };

  const value = {
    currentUser,
    setCurrentUser,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
