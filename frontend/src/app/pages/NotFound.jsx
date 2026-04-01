import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router';
import { Home as HomeIcon } from '@mui/icons-material';

/**
 * 404 Not Found page component
 */
const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
      }}
    >
      <Typography variant="h1" sx={{ fontWeight: 700, fontSize: '6rem', mb: 2 }}>
        404
      </Typography>
      <Typography variant="h4" gutterBottom>
        Page Not Found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        The page you are looking for does not exist.
      </Typography>
      <Button
        variant="contained"
        startIcon={<HomeIcon />}
        onClick={() => navigate('/')}
      >
        Go to Dashboard
      </Button>
    </Box>
  );
};

export default NotFound;
