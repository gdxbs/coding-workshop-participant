import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Autocomplete,
  Alert,
} from '@mui/material';
import { api } from '../../services/api';

const systemRoleOptions = ['Admin', 'Employee'];
const regionOptions = ['North America', 'EMEA', 'APAC', 'LATAM'];

/**
 * Individual form component for creating and editing individuals
 */
const IndividualForm = ({ open, onClose, onSave, individual }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    system_role: 'Employee',
    region: 'North America',
    job_title: '',
  });

  useEffect(() => {
    if (open) {
      if (individual) {
        setFormData({
          name: individual.name || '',
          email: individual.email || '',
          system_role: individual.system_role || 'Employee',
          region: individual.region || 'North America',
          job_title: individual.job_title || '',
        });
      } else {
        setFormData({
          name: '',
          email: '',
          system_role: 'Employee',
          region: 'North America',
          job_title: '',
        });
      }
      setErrors({});
      setApiError('');
    }
  }, [open, individual]);

  /**
   * Handle form field changes
   */
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  /**
   * Validate email format
   */
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  /**
   * Validate form data
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.system_role) newErrors.system_role = 'System role is required';
    if (!formData.region) newErrors.region = 'Region is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setApiError('');

    try {
      let result;
      if (individual && (individual._id || individual.id)) {
        const id = individual._id || individual.id;
        result = await api.put(`/api/individuals/${id}`, formData);
      } else {
        result = await api.post('/api/individuals', formData);
      }

      onSave(result || formData);
      onClose();
    } catch (err) {
      setApiError(err.message || 'An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{individual ? 'Edit Individual' : 'Add New Individual'}</DialogTitle>
      <DialogContent dividers>
        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
        
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Full Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              type="email"
              label="Email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Job Title"
              placeholder="e.g. Senior Software Engineer"
              value={formData.job_title}
              onChange={(e) => handleChange('job_title', e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Autocomplete
              fullWidth
              options={systemRoleOptions}
              value={formData.system_role}
              onChange={(event, newValue) => handleChange('system_role', newValue || 'Employee')}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  required 
                  label="System Role" 
                  error={!!errors.system_role}
                  helperText={errors.system_role}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Autocomplete
              fullWidth
              options={regionOptions}
              value={formData.region}
              onChange={(event, newValue) => handleChange('region', newValue || 'North America')}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  required 
                  label="Region" 
                  error={!!errors.region}
                  helperText={errors.region}
                />
              )}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

IndividualForm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  individual: PropTypes.shape({
    _id: PropTypes.string,
    id: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    system_role: PropTypes.string,
    region: PropTypes.string,
    job_title: PropTypes.string,
  }),
};

export default IndividualForm;
