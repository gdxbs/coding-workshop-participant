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
  CircularProgress,
  Autocomplete,
  MenuItem,
} from '@mui/material';

const teamOptions = [
  'Engineering - Platform',
  'Engineering - Mobile',
  'Product Management',
  'Design & UX',
  'Data Science',
  'Marketing',
];

const categoryOptions = ['Technical', 'Product', 'Delivery', 'Process', 'Business'];

const impactOptions = ['High', 'Medium', 'Low'];

/**
 * Achievement form component for creating and editing achievements
 */
const AchievementForm = ({ open, onClose, onSave, achievement }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(
    achievement || {
      title: '',
      description: '',
      team: '',
      month: '',
      category: '',
      impact: 'Medium',
      createdBy: '',
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

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.team) {
      newErrors.team = 'Team is required';
    }
    if (!formData.month) {
      newErrors.month = 'Month is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (!formData.createdBy.trim()) {
      newErrors.createdBy = 'Created by is required';
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
      const achievementData = {
        ...formData,
        id: achievement ? achievement.id : Date.now(),
        createdAt: achievement
          ? achievement.createdAt
          : new Date().toISOString().split('T')[0],
      };

      onSave(achievementData);
      setLoading(false);
      onClose();
    }, 1000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {achievement ? 'Edit Achievement' : 'Log New Achievement'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12 }}>
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

          <Grid size={{ xs: 12 }}>
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

          <Grid size={{ xs: 12, md: 6 }}>
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

          <Grid size={{ xs: 12, md: 6 }}>
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

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              required
              label="Created By"
              value={formData.createdBy}
              onChange={(e) => handleChange('createdBy', e.target.value)}
              error={!!errors.createdBy}
              helperText={errors.createdBy}
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

AchievementForm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  achievement: PropTypes.shape({
    id: PropTypes.number,
    title: PropTypes.string,
    description: PropTypes.string,
    team: PropTypes.string,
    month: PropTypes.string,
    category: PropTypes.string,
    impact: PropTypes.string,
    createdBy: PropTypes.string,
    createdAt: PropTypes.string,
  }),
};

export default AchievementForm;
