import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Autocomplete,
} from '@mui/material';

const teamOptions = [
  'Engineering - Platform',
  'Engineering - Mobile',
  'Product Management',
  'Design & UX',
  'Data Science',
  'Marketing',
];

const locationOptions = [
  'San Francisco, CA',
  'New York, NY',
  'Austin, TX',
  'Boston, MA',
  'Seattle, WA',
  'Chicago, IL',
  'Los Angeles, CA',
  'Remote',
];

const roleOptions = [
  'Engineering Manager',
  'Software Engineer',
  'Senior Software Engineer',
  'Product Manager',
  'Design Lead',
  'UX Designer',
  'Data Scientist',
  'Data Analyst',
  'Marketing Manager',
  'Marketing Specialist',
];

/**
 * Individual form component for creating and editing individuals
 */
const IndividualForm = ({ open, onClose, onSave, individual }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(
    individual || {
      name: '',
      email: '',
      role: '',
      team: '',
      location: '',
      hireDate: '',
      isDirect: true,
    }
  );

  /**
   * Handle form field changes
   */
  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
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

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }
    if (!formData.team) {
      newErrors.team = 'Team is required';
    }
    if (!formData.location) {
      newErrors.location = 'Location is required';
    }
    if (!formData.hireDate) {
      newErrors.hireDate = 'Hire date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const individualData = {
        ...formData,
        id: individual ? individual.id : Date.now(),
      };

      onSave(individualData);
      setLoading(false);
      onClose();
    }, 1000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{individual ? 'Edit Individual' : 'Add New Individual'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
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

          <Grid size={{ xs: 12, md: 6 }}>
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

          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete
              fullWidth
              options={roleOptions}
              value={formData.role}
              onChange={(event, newValue) => handleChange('role', newValue || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Role"
                  error={!!errors.role}
                  helperText={errors.role}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete
              fullWidth
              options={teamOptions}
              value={formData.team}
              onChange={(event, newValue) => handleChange('team', newValue || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Team"
                  error={!!errors.team}
                  helperText={errors.team}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete
              fullWidth
              options={locationOptions}
              value={formData.location}
              onChange={(event, newValue) => handleChange('location', newValue || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Location"
                  error={!!errors.location}
                  helperText={errors.location}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              required
              type="date"
              label="Hire Date"
              value={formData.hireDate}
              onChange={(e) => handleChange('hireDate', e.target.value)}
              error={!!errors.hireDate}
              helperText={errors.hireDate}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isDirect}
                  onChange={(e) => handleChange('isDirect', e.target.checked)}
                />
              }
              label="Direct Employee"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
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
    id: PropTypes.number,
    name: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
    team: PropTypes.string,
    location: PropTypes.string,
    hireDate: PropTypes.string,
    isDirect: PropTypes.bool,
  }),
};

export default IndividualForm;
