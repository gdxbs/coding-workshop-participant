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
import { mockAchievements } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import AchievementForm from '../components/AchievementForm';

/**
 * Achievements page component
 * Displays and manages achievement data in a DataGrid
 */
const Achievements = () => {
  const { hasPermission } = useAuth();
  const { showNotification } = useNotification();
  const [achievements, setAchievements] = useState(mockAchievements);
  const [searchText, setSearchText] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState(null);

  /**
   * Filter achievements based on search text
   */
  const filteredAchievements = achievements.filter((achievement) =>
    Object.values(achievement).some((value) =>
      String(value).toLowerCase().includes(searchText.toLowerCase())
    )
  );

  /**
   * Handle create new achievement
   */
  const handleCreate = () => {
    if (!hasPermission('create')) {
      showNotification('You do not have permission to log achievements', 'error');
      return;
    }
    setSelectedAchievement(null);
    setFormOpen(true);
  };

  /**
   * Handle edit achievement
   */
  const handleEdit = (achievement) => {
    if (!hasPermission('edit')) {
      showNotification('You do not have permission to edit achievements', 'error');
      return;
    }
    setSelectedAchievement(achievement);
    setFormOpen(true);
  };

  /**
   * Handle delete achievement
   */
  const handleDelete = (id) => {
    if (!hasPermission('delete')) {
      showNotification('You do not have permission to delete achievements', 'error');
      return;
    }
    setAchievements(achievements.filter((achievement) => achievement.id !== id));
    showNotification('Achievement deleted successfully', 'success');
  };

  /**
   * Handle save achievement (create or update)
   */
  const handleSave = (achievementData) => {
    if (selectedAchievement) {
      // Update existing achievement
      setAchievements(
        achievements.map((achievement) =>
          achievement.id === achievementData.id ? achievementData : achievement
        )
      );
      showNotification('Achievement updated successfully', 'success');
    } else {
      // Create new achievement
      setAchievements([...achievements, achievementData]);
      showNotification('Achievement logged successfully', 'success');
    }
  };

  /**
   * Get impact color based on impact level
   */
  const getImpactColor = (impact) => {
    switch (impact) {
      case 'High':
        return 'error';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'success';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      field: 'title',
      headerName: 'Title',
      flex: 1,
      minWidth: 250,
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 300,
    },
    {
      field: 'team',
      headerName: 'Team',
      width: 180,
    },
    {
      field: 'month',
      headerName: 'Month',
      width: 120,
      valueFormatter: (value) => {
        const date = new Date(value);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      },
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" />
      ),
    },
    {
      field: 'impact',
      headerName: 'Impact',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getImpactColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'createdBy',
      headerName: 'Created By',
      width: 150,
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
              aria-label="edit achievement"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => handleDelete(params.row.id)}
              disabled={!hasPermission('delete')}
              aria-label="delete achievement"
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
          Achievements
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          disabled={!hasPermission('create')}
        >
          Log Achievement
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search achievements..."
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
          rows={filteredAchievements}
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

      <AchievementForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        achievement={selectedAchievement}
      />
    </Box>
  );
};

export default Achievements;
