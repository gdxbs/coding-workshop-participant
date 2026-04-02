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
  Chip,
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
import IndividualForm from '../components/IndividualForm';

/**
 * Individuals page component
 * Displays and manages individual employee data in a DataGrid
 */
const Individuals = () => {
  const { hasPermission, isAdmin } = useAuth();
  const { showNotification } = useNotification();
  const [individuals, setIndividuals] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedIndividual, setSelectedIndividual] = useState(null);

  const fetchIndividualsData = async () => {
    try {
      const data = await api.get('/api/employees');
      if (data) {
        const formatted = data.map(ind => ({ ...ind, id: ind._id }));
        setIndividuals(formatted);
      }
    } catch (err) {
      showNotification('Failed to load individuals', 'error');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIndividualsData();
  }, []);

  /**
   * Filter individuals based on search text
   */
  const filteredIndividuals = individuals.filter((individual) =>
    Object.values(individual).some((value) =>
      String(value).toLowerCase().includes(searchText.toLowerCase())
    )
  );

  /**
   * Handle create new individual
   */
  const handleCreate = () => {
    if (!isAdmin) {
      showNotification('You do not have permission to add individuals', 'error');
      return;
    }
    setSelectedIndividual(null);
    setFormOpen(true);
  };

  /**
   * Handle edit individual
   */
  const handleEdit = (individual) => {
    if (!hasPermission('edit')) {
      showNotification('You do not have permission to edit individuals', 'error');
      return;
    }
    setSelectedIndividual(individual);
    setFormOpen(true);
  };

  /**
   * Handle delete individual
   */
  const handleDelete = async (id) => {
    if (!hasPermission('delete')) {
      showNotification('You do not have permission to delete individuals', 'error');
      return;
    }
    try {
      await api.delete(`/api/employees/${id}`);
      setIndividuals(individuals.filter((individual) => individual.id !== id));
      showNotification('Individual deleted successfully', 'success');
    } catch (err) {
      showNotification(err.message || 'Failed to delete individual', 'error');
    }
  };

  /**
   * Handle save individual (create or update)
   */
  const handleSave = () => {
    fetchIndividualsData();
    showNotification(
      selectedIndividual ? 'Individual updated successfully' : 'Individual added successfully',
      'success'
    );
  };

  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 220,
    },
    {
      field: 'system_role',
      headerName: 'System Role',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === 'Admin' ? 'error' : 'primary'}
          size="small"
        />
      ),
    },
    {
      field: 'region',
      headerName: 'Region',
      flex: 1,
      minWidth: 150,
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
              disabled={!hasPermission('edit', params.row)}
              aria-label="edit individual"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => handleDelete(params.row.id)}
              disabled={!hasPermission('delete', params.row)}
              aria-label="delete individual"
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
          Individuals
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          disabled={!isAdmin}
        >
          Add Individual
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search individuals..."
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
          rows={filteredIndividuals}
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

      <IndividualForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        individual={selectedIndividual}
      />
    </Box>
  );
};

export default Individuals;
