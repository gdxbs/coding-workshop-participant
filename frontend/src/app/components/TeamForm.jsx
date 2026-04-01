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

const orgOptions = ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'Operations'];
const regionOptions = ['North America', 'EMEA', 'APAC', 'LATAM'];

/**
 * Team form component for creating and editing teams
 */
const TeamForm = ({ open, onClose, onSave, team }) => {
  const [loading, setLoading] = useState(false);
  const [individuals, setIndividuals] = useState([]);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    region: '',
    leader_id: '',
    employee_ids: [],
  });

  useEffect(() => {
    if (open) {
      fetchIndividuals();
      if (team) {
        setFormData({
          name: team.name || '',
          organization: team.organization || '',
          region: team.region || '',
          leader_id: team.leader_id || '',
          employee_ids: team.employee_ids || [],
        });
      } else {
        setFormData({
          name: '',
          organization: '',
          region: '',
          leader_id: '',
          employee_ids: [],
        });
      }
      setErrors({});
      setApiError('');
    }
  }, [open, team]);

  /**
   * Fetch individuals to populate dropdowns
   */
  const fetchIndividuals = async () => {
    try {
      const data = await api.get('/api/individuals');
      setIndividuals(data || []);
    } catch (err) {
      console.error('Failed to fetch individuals', err);
    }
  };

  /**
   * Handle form field changes
   */
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
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
    if (!formData.organization) {
      newErrors.organization = 'Organization is required';
    }
    if (!formData.region) {
      newErrors.region = 'Region is required';
    }
    if (!formData.leader_id) {
      newErrors.leader_id = 'Team leader is required';
    }
    
    // Check if employee_ids already exceeds 5
    if (formData.employee_ids.length > 5) {
      newErrors.employee_ids = 'A team cannot exceed 5 members';
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
    setApiError('');

    try {
      // Rule 3: Ensure the selected leader_id is automatically included in the employee_ids array.
      const finalEmployeeIds = [...formData.employee_ids];
      if (formData.leader_id && !finalEmployeeIds.includes(formData.leader_id)) {
        finalEmployeeIds.push(formData.leader_id);
      }

      // Rule 2: Enforce the business rule: The employee_ids array CANNOT exceed 5 members.
      if (finalEmployeeIds.length > 5) {
        setErrors({ 
          employee_ids: 'Including the leader, the team cannot exceed 5 members. Please remove some members.' 
        });
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        employee_ids: finalEmployeeIds,
      };

      let result;
      if (team && (team._id || team.id)) {
        const id = team._id || team.id;
        result = await api.put(`/api/teams/${id}`, payload);
      } else {
        result = await api.post('/api/teams', payload);
      }

      onSave(result || payload);
      onClose();
    } catch (err) {
      setApiError(err.message || 'An error occurred while saving the team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{team ? 'Edit Team' : 'Create New Team'}</DialogTitle>
      <DialogContent dividers>
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}
        
        <Grid container spacing={3} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Team Name"
              placeholder="e.g. Platform Engineering"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Autocomplete
              fullWidth
              options={orgOptions}
              value={formData.organization}
              onChange={(event, newValue) => handleChange('organization', newValue || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Organization"
                  error={!!errors.organization}
                  helperText={errors.organization}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Autocomplete
              fullWidth
              options={regionOptions}
              value={formData.region}
              onChange={(event, newValue) => handleChange('region', newValue || '')}
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

          <Grid item xs={12}>
            <Autocomplete
              fullWidth
              options={individuals}
              getOptionLabel={(option) => option.name || ''}
              value={individuals.find(i => i._id === formData.leader_id) || null}
              onChange={(event, newValue) => handleChange('leader_id', newValue ? newValue._id : '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Team Leader"
                  placeholder="Select a leader"
                  error={!!errors.leader_id}
                  helperText={errors.leader_id || "The leader will automatically be added to the employee list."}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Autocomplete
              multiple
              fullWidth
              options={individuals}
              getOptionLabel={(option) => option.name || ''}
              value={individuals.filter(i => formData.employee_ids.includes(i._id))}
              onChange={(event, newValue) => handleChange('employee_ids', newValue.map(item => item._id))}
              filterSelectedOptions
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Additional Team Members"
                  placeholder="Select up to 5 members total"
                  error={!!errors.employee_ids}
                  helperText={errors.employee_ids || "Max 5 members including the leader."}
                />
              )}
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
          {loading ? 'Saving...' : 'Save Team'}
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
    _id: PropTypes.string,
    id: PropTypes.string,
    name: PropTypes.string,
    organization: PropTypes.string,
    region: PropTypes.string,
    leader_id: PropTypes.string,
    employee_ids: PropTypes.arrayOf(PropTypes.string),
  }),
};

export default TeamForm;
