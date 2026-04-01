import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { api } from '../../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

/**
 * Metadata form component
 */
const MetadataForm = ({ open, onClose, onSave, metadata }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(
    metadata || {
      category: '',
      key: '',
      value: '',
      description: '',
    }
  );

  const [apiError, setApiError] = useState('');

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.category.trim()) newErrors.category = 'Category is required';
    if (!formData.key.trim()) newErrors.key = 'Key is required';
    if (!formData.value.trim()) newErrors.value = 'Value is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setApiError('');

    try {
      const payload = {
        ...formData,
        _id: formData.key, // Using key as _id for metadata consistency
        lastUpdated: new Date().toISOString(),
      };

      if (metadata) {
        await api.put(`/api/metadata/${metadata._id || metadata.id}`, payload);
      } else {
        await api.post('/api/metadata', payload);
      }

      onSave();
      onClose();
    } catch (err) {
      setApiError(err.message || 'An error occurred while saving metadata');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{metadata ? 'Edit Metadata' : 'Add New Metadata'}</DialogTitle>
      <DialogContent dividers>
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              required
              label="Category"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              error={!!errors.category}
              helperText={errors.category}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              required
              label="Key"
              value={formData.key}
              onChange={(e) => handleChange('key', e.target.value)}
              error={!!errors.key}
              helperText={errors.key}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              required
              label="Value"
              value={formData.value}
              onChange={(e) => handleChange('value', e.target.value)}
              error={!!errors.value}
              helperText={errors.value}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
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

/**
 * Metadata page component
 * Displays and manages metadata records in a DataGrid
 */
const Metadata = () => {
  const { hasPermission } = useAuth();
  const { showNotification } = useNotification();
  const [metadata, setMetadata] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState(null);

  const fetchMetadata = async () => {
    try {
      const data = await api.get('/api/metadata');
      if (data) {
        const formatted = data.map(m => ({ ...m, id: m._id }));
        setMetadata(formatted);
      }
    } catch (err) {
      showNotification('Failed to load metadata', 'error');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  const filteredMetadata = metadata.filter((item) =>
    Object.values(item).some((value) =>
      String(value).toLowerCase().includes(searchText.toLowerCase())
    )
  );

  const handleCreate = () => {
    if (!hasPermission('create')) {
      showNotification('You do not have permission to add metadata', 'error');
      return;
    }
    setSelectedMetadata(null);
    setFormOpen(true);
  };

  const handleEdit = (item) => {
    if (!hasPermission('edit')) {
      showNotification('You do not have permission to edit metadata', 'error');
      return;
    }
    setSelectedMetadata(item);
    setFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!hasPermission('delete')) {
      showNotification('You do not have permission to delete metadata', 'error');
      return;
    }
    
    try {
      await api.delete(`/api/metadata/${id}`);
      fetchMetadata();
      showNotification('Metadata deleted successfully', 'success');
    } catch (err) {
      showNotification(err.message || 'Failed to delete metadata', 'error');
    }
  };

  const handleSave = () => {
    fetchMetadata();
    showNotification(
      selectedMetadata ? 'Metadata updated successfully' : 'Metadata added successfully',
      'success'
    );
  };

  const columns = [
    {
      field: 'category',
      headerName: 'Category',
      width: 150,
    },
    {
      field: 'key',
      headerName: 'Key',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'value',
      headerName: 'Value',
      width: 120,
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 250,
    },
    {
      field: 'lastUpdated',
      headerName: 'Last Updated',
      width: 140,
      valueFormatter: (value) => new Date(value).toLocaleDateString(),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => handleEdit(params.row)}
              disabled={!hasPermission('edit')}
              aria-label="edit metadata"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => handleDelete(params.row.id)}
              disabled={!hasPermission('delete')}
              aria-label="delete metadata"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Metadata
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          disabled={!hasPermission('create')}
        >
          Add Metadata
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search metadata..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <DataGrid
          rows={filteredMetadata}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          pageSizeOptions={[5, 10, 25, 50]}
          checkboxSelection
          disableRowSelectionOnClick
          autoHeight
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        />
      </Paper>

      <MetadataForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        metadata={selectedMetadata}
      />
    </Box>
  );
};

export default Metadata;
