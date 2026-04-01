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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { mockTeams } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import TeamForm from '../components/TeamForm';

/**
 * Teams page component
 * Displays and manages team data in a DataGrid
 */
const Teams = () => {
  const { hasPermission } = useAuth();
  const { showNotification } = useNotification();
  const [teams, setTeams] = useState(mockTeams);
  const [searchText, setSearchText] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

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
    if (!hasPermission('create')) {
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
  const handleDelete = (id) => {
    if (!hasPermission('delete')) {
      showNotification('You do not have permission to delete teams', 'error');
      return;
    }
    setTeams(teams.filter((team) => team.id !== id));
    showNotification('Team deleted successfully', 'success');
  };

  /**
   * Handle save team (create or update)
   */
  const handleSave = (teamData) => {
    if (selectedTeam) {
      // Update existing team
      setTeams(teams.map((team) => (team.id === teamData.id ? teamData : team)));
      showNotification('Team updated successfully', 'success');
    } else {
      // Create new team
      setTeams([...teams, teamData]);
      showNotification('Team created successfully', 'success');
    }
  };

  const columns = [
    {
      field: 'name',
      headerName: 'Team Name',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'leader',
      headerName: 'Team Leader',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'location',
      headerName: 'Location',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'totalMembers',
      headerName: 'Total Members',
      width: 130,
      type: 'number',
    },
    {
      field: 'nonDirectRatio',
      headerName: 'Non-Direct Ratio',
      width: 150,
      type: 'number',
      valueFormatter: (value) => `${value.toFixed(2)}%`,
    },
    {
      field: 'isCoLocated',
      headerName: 'Co-Located',
      width: 120,
      type: 'boolean',
    },
    {
      field: 'reportsToOrgLeader',
      headerName: 'Reports to Org Leader',
      width: 170,
      type: 'boolean',
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
              aria-label="edit team"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => handleDelete(params.row.id)}
              disabled={!hasPermission('delete')}
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
          disabled={!hasPermission('create')}
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
