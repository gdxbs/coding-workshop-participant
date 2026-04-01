import React, { useState } from 'react';
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
import { mockIndividuals } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import IndividualForm from '../components/IndividualForm';

/**
 * Individuals page component
 * Displays and manages individual employee data in a DataGrid
 */
const Individuals = () => {
  const { hasPermission } = useAuth();
  const { showNotification } = useNotification();
  const [individuals, setIndividuals] = useState(mockIndividuals);
  const [searchText, setSearchText] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedIndividual, setSelectedIndividual] = useState(null);

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
    if (!hasPermission('create')) {
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
  const handleDelete = (id) => {
    if (!hasPermission('delete')) {
      showNotification('You do not have permission to delete individuals', 'error');
      return;
    }
    setIndividuals(individuals.filter((individual) => individual.id !== id));
    showNotification('Individual deleted successfully', 'success');
  };

  /**
   * Handle save individual (create or update)
   */
  const handleSave = (individualData) => {
    if (selectedIndividual) {
      // Update existing individual
      setIndividuals(
        individuals.map((individual) =>
          individual.id === individualData.id ? individualData : individual
        )
      );
      showNotification('Individual updated successfully', 'success');
    } else {
      // Create new individual
      setIndividuals([...individuals, individualData]);
      showNotification('Individual added successfully', 'success');
    }
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
      field: 'role',
      headerName: 'Role',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'team',
      headerName: 'Team',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'location',
      headerName: 'Location',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'hireDate',
      headerName: 'Hire Date',
      width: 120,
      valueFormatter: (value) => new Date(value).toLocaleDateString(),
    },
    {
      field: 'isDirect',
      headerName: 'Employment Type',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Direct' : 'Non-Direct'}
          color={params.value ? 'success' : 'warning'}
          size="small"
        />
      ),
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
              aria-label="edit individual"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => handleDelete(params.row.id)}
              disabled={!hasPermission('delete')}
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
          disabled={!hasPermission('create')}
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
