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
  MenuItem,
  Alert,
} from '@mui/material';
import { api } from '../../services/api';

const categoryOptions = ['Technical', 'Product', 'Delivery', 'Process', 'Business'];
const impactOptions = ['High', 'Medium', 'Low'];

/**
 * Achievement form component for creating and editing achievements
 */
const AchievementForm = ({ open, onClose, onSave, achievement }) => {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    team_id: '',
    month: '',
    category: '',
    impact: 'Medium',
  });

  useEffect(() => {
    if (open) {
      fetchTeams();
      if (achievement) {
        setFormData({
          title: achievement.title || '',
          description: achievement.description || '',
          team_id: achievement.team_id || '',
          month: achievement.month || '',
          category: achievement.category || '',
          impact: achievement.impact || 'Medium',
        });
      } else {
        setFormData({
          title: '',
          description: '',
          team_id: '',
          month: '',
          category: '',
          impact: 'Medium',
        });
      }
      setErrors({});
      setApiError('');
    }
  }, [open, achievement]);

  /**
   * Fetch teams to populate selection list
   */
  const fetchTeams = async () => {
    try {
      const data = await api.get('/api/teams');
      setTeams(data || []);
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  };

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
   * Validate form data
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.team_id) newErrors.team_id = 'Team is required';
    if (!formData.month) newErrors.month = 'Month is required';
    if (!formData.category) newErrors.category = 'Category is required';

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
      if (achievement && (achievement._id || achievement.id)) {
        const id = achievement._id || achievement.id;
        result = await api.put(`/api/achievements/${id}`, formData);
      } else {
        result = await api.post('/api/achievements', formData);
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {achievement ? 'Edit Achievement' : 'Log New Achievement'}
      </DialogTitle>
      <DialogContent dividers>
        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
        
        <Grid container spacing={3} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Achievement Title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              multiline
              rows={4}
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Autocomplete
              fullWidth
              options={teams}
              getOptionLabel={(option) => option.name || ''}
              value={teams.find(t => t._id === formData.team_id) || null}
              onChange={(event, newValue) => handleChange('team_id', newValue ? newValue._id : '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Team"
                  error={!!errors.team_id}
                  helperText={errors.team_id}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              type="month"
              label="Month"
              value={formData.month}
              onChange={(e) => handleChange('month', e.target.value)}
              error={!!errors.month}
              helperText={errors.month}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Autocomplete
              fullWidth
              options={categoryOptions}
              value={formData.category}
              onChange={(event, newValue) => handleChange('category', newValue || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Category"
                  error={!!errors.category}
                  helperText={errors.category}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              select
              label="Impact"
              value={formData.impact}
              onChange={(e) => handleChange('impact', e.target.value)}
            >
              {impactOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
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

AchievementForm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  achievement: PropTypes.shape({
    _id: PropTypes.string,
    id: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    team_id: PropTypes.string,
    month: PropTypes.string,
    category: PropTypes.string,
    impact: PropTypes.string,
    createdAt: PropTypes.string,
  }),
};

export default AchievementForm;
