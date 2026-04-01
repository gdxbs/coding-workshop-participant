import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const mockUsers = [
  { _id: "e_001", name: "Alice Smith", system_role: "Admin", email: "alice.smith@acme.com" },
  { _id: "e_002", name: "Bob Jones", system_role: "Employee", email: "bob.jones@acme.com" },
  { _id: "e_003", name: "Charlie Davis", system_role: "Employee", email: "charlie.davis@acme.com" }
];

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(mockUsers[0]); // Default Alice

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const loginAs = (userId) => {
    const user = mockUsers.find(u => u._id === userId);
    if (user) {
      setCurrentUser(user);
    } else {
      console.warn(`Mock user with ID ${userId} not found`);
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  /**
   * Check if user has permission for a specific action on a specific resource
   * @param {string} action - The action to check (create, edit, delete)
   * @param {Object} resource - The resource being operated on (optional)
   * @returns {boolean} Whether the user has permission
   */
  const hasPermission = (action, resource = null) => {
    if (!currentUser) return false;
    
    // Rule 1: Admins have full access
    if (currentUser.system_role === 'Admin') {
      return true;
    }
    
    // Rule 2 & 3: Employees
    if (currentUser.system_role === 'Employee') {
      // Task 3: Ensure "Create New Team" remains accessible
      if (action === 'create') {
        return true;
      }
      
      // Task 2: Edit/Delete active ONLY if current user is the leader
      if (action === 'edit' || action === 'delete') {
        if (resource && resource.leader_id === currentUser._id) {
          return true;
        }
        return false;
      }
    }
    
    return false;
  };

  const value = {
    currentUser,
    users: mockUsers,
    loginAs,
    logout,
    hasPermission,
    isAdmin: currentUser?.system_role === 'Admin',
    isEmployee: currentUser?.system_role === 'Employee'
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
