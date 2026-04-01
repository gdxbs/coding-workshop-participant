import React, { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';
import { Snackbar, Alert } from '@mui/material';

const NotificationContext = createContext();

/**
 * Custom hook to access notification context
 * @returns {Object} Notification context value
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

/**
 * Notification provider component
 * Manages global notifications using Material UI Snackbar
 */
export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success', // success, error, warning, info
  });

  /**
   * Show a notification
   * @param {string} message - The notification message
   * @param {string} severity - The notification severity (success, error, warning, info)
   */
  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  /**
   * Close the notification
   */
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  const value = {
    showNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleClose}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
