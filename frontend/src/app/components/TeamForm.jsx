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

/**
 * Team form component for creating and editing teams
 */
const TeamForm = ({ open, onClose, onSave, team }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(
    team || {
      name: '',
      leader: '',
      leaderLocation: '',
      location: '',
      totalMembers: '',
      directStaff: '',
      nonDirectStaff: '',
      isCoLocated: true,
      reportsToOrgLeader: false,
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
   * Validate form data
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required';
    }
    if (!formData.leader.trim()) {
      newErrors.leader = 'Team leader is required';
    }
    if (!formData.leaderLocation) {
      newErrors.leaderLocation = 'Leader location is required';
    }
    if (!formData.location) {
      newErrors.location = 'Team location is required';
    }
    if (!formData.totalMembers || formData.totalMembers <= 0) {
      newErrors.totalMembers = 'Total members must be greater than 0';
    }
    if (!formData.directStaff || formData.directStaff < 0) {
      newErrors.directStaff = 'Direct staff must be 0 or greater';
    }
    if (!formData.nonDirectStaff || formData.nonDirectStaff < 0) {
      newErrors.nonDirectStaff = 'Non-direct staff must be 0 or greater';
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
      const totalMembers = parseInt(formData.totalMembers, 10);
      const directStaff = parseInt(formData.directStaff, 10);
      const nonDirectStaff = parseInt(formData.nonDirectStaff, 10);
      const nonDirectRatio = totalMembers > 0 ? (nonDirectStaff / totalMembers) * 100 : 0;

      const teamData = {
        ...formData,
        totalMembers,
        directStaff,
        nonDirectStaff,
        nonDirectRatio: parseFloat(nonDirectRatio.toFixed(2)),
        id: team ? team.id : Date.now(),
        createdAt: team ? team.createdAt : new Date().toISOString().split('T')[0],
      };

      onSave(teamData);
      setLoading(false);
      onClose();
    }, 1000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{team ? 'Edit Team' : 'Create New Team'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              required
              label="Team Name"
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
              label="Team Leader"
              value={formData.leader}
              onChange={(e) => handleChange('leader', e.target.value)}
              error={!!errors.leader}
              helperText={errors.leader}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete
              fullWidth
              options={locationOptions}
              value={formData.leaderLocation}
              onChange={(event, newValue) => handleChange('leaderLocation', newValue || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Leader Location"
                  error={!!errors.leaderLocation}
                  helperText={errors.leaderLocation}
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
                  label="Team Location"
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
              type="number"
              label="Total Members"
              value={formData.totalMembers}
              onChange={(e) => handleChange('totalMembers', e.target.value)}
              error={!!errors.totalMembers}
              helperText={errors.totalMembers}
              inputProps={{ min: 1 }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              required
              type="number"
              label="Direct Staff"
              value={formData.directStaff}
              onChange={(e) => handleChange('directStaff', e.target.value)}
              error={!!errors.directStaff}
              helperText={errors.directStaff}
              inputProps={{ min: 0 }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              required
              type="number"
              label="Non-Direct Staff"
              value={formData.nonDirectStaff}
              onChange={(e) => handleChange('nonDirectStaff', e.target.value)}
              error={!!errors.nonDirectStaff}
              helperText={errors.nonDirectStaff}
              inputProps={{ min: 0 }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isCoLocated}
                  onChange={(e) => handleChange('isCoLocated', e.target.checked)}
                />
              }
              label="Leader is Co-Located with Team"
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.reportsToOrgLeader}
                  onChange={(e) => handleChange('reportsToOrgLeader', e.target.checked)}
                />
              }
              label="Reports to Organization Leader"
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

TeamForm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  team: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    leader: PropTypes.string,
    leaderLocation: PropTypes.string,
    location: PropTypes.string,
    totalMembers: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    directStaff: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    nonDirectStaff: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    isCoLocated: PropTypes.bool,
    reportsToOrgLeader: PropTypes.bool,
    createdAt: PropTypes.string,
  }),
};

export default TeamForm;
