import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { SearchOff as SearchOffIcon } from '@mui/icons-material';

/**
 * Empty state component for tables and lists
 * Displays a friendly message when no data is available
 */
const EmptyState = ({ message = 'No data available', icon: Icon = SearchOffIcon }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 2,
      }}
    >
      <Icon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {message}
      </Typography>
      <Typography variant="body2" color="text.disabled">
        Try adjusting your search or filters
      </Typography>
    </Box>
  );
};

EmptyState.propTypes = {
  message: PropTypes.string,
  icon: PropTypes.elementType,
};

export default EmptyState;
