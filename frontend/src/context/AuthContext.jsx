import React, { createContext, useContext, useState, useEffect } from 'react';

const mockUsers = [
  { _id: "e_001", name: "Alice Smith", system_role: "Admin" },
  { _id: "e_002", name: "Bob Jones", system_role: "Employee" },
  { _id: "e_003", name: "Charlie Davis", system_role: "Employee" }
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
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Default to the first user for convenience during mock login.
    setCurrentUser(mockUsers[0]);
  }, []);

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

  const value = {
    currentUser,
    users: mockUsers,
    loginAs,
    logout,
    isAdmin: currentUser?.system_role === 'Admin',
    isEmployee: currentUser?.system_role === 'Employee'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
