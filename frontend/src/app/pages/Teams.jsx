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
import TeamForm from '../components/TeamForm';

/**
 * Teams page component
 * Displays and manages team data in a DataGrid
 */
const Teams = () => {
  const { currentUser, hasPermission, isAdmin } = useAuth();
  const { showNotification } = useNotification();
  const [teams, setTeams] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const fetchData = async () => {
    try {
      const [teamsData, individualsData] = await Promise.all([
        api.get('/api/teams'),
        api.get('/api/employees')
      ]);
      
      const indMap = {};
      if (individualsData) {
        individualsData.forEach(ind => {
          indMap[ind._id] = ind.name;
        });
      }
      
      if (teamsData) {
        const formatted = teamsData.map(t => ({
          ...t,
          id: t._id,
          leader_name: indMap[t.leader_id] || t.leader_id,
          employee_count: t.employee_ids ? t.employee_ids.length : 0
        }));
        setTeams(formatted);
      }
    } catch (err) {
      showNotification('Failed to load teams', 'error');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /**
   * Filter teams based on search text
   */
  const filteredTeams = teams.filter((team) =>
    Object.values(team).some((value) =>
      String(value).toLowerCase().includes(searchText.toLowerCase())
    )
  );

  /**
   * Handle create new team
   */
  const handleCreate = () => {
    if (!isAdmin) {
      showNotification('You do not have permission to create teams', 'error');
      return;
    }
    setSelectedTeam(null);
    setFormOpen(true);
  };

  /**
   * Handle edit team
   */
  const handleEdit = (team) => {
    if (!hasPermission('edit')) {
      showNotification('You do not have permission to edit teams', 'error');
      return;
    }
    setSelectedTeam(team);
    setFormOpen(true);
  };

  /**
   * Handle delete team
   */
  const handleDelete = async (id) => {
    if (!hasPermission('delete')) {
      showNotification('You do not have permission to delete teams', 'error');
      return;
    }
    try {
      await api.delete(`/api/teams/${id}`);
      setTeams(teams.filter((team) => team.id !== id));
      showNotification('Team deleted successfully', 'success');
    } catch (err) {
      showNotification(err.message || 'Failed to delete team', 'error');
    }
  };

  /**
   * Handle save team (create or update)
   */
  const handleSave = () => {
    fetchData();
    showNotification(
      selectedTeam ? 'Team updated successfully' : 'Team created successfully',
      'success'
    );
  };

  const columns = [
    {
      field: 'name',
      headerName: 'Team Name',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'organization',
      headerName: 'Organization',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'region',
      headerName: 'Region',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'leader_name',
      headerName: 'Team Leader',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'employee_count',
      headerName: 'Total Members',
      width: 130,
      type: 'number',
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
              aria-label="edit team"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => handleDelete(params.row.id)}
              disabled={!hasPermission('delete', params.row)}
              aria-label="delete team"
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
          Teams
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          disabled={!isAdmin}
        >
          Add Team
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search teams..."
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
          rows={filteredTeams}
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

      <TeamForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        team={selectedTeam}
      />
    </Box>
  );
};

export default Teams;
