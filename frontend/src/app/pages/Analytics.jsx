import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  locationDistributionData,
  achievementTrendsData,
  staffingRatiosData,
} from '../data/mockData';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

/**
 * Analytics page component
 * Displays various charts and visualizations for organizational insights
 */
const Analytics = () => {
  const [quarter, setQuarter] = useState('Q1 2026');
  const [selectedTeam, setSelectedTeam] = useState('All Teams');

  /**
   * Handle quarter filter change
   */
  const handleQuarterChange = (event) => {
    setQuarter(event.target.value);
  };

  /**
   * Handle team filter change
   */
  const handleTeamChange = (event) => {
    setSelectedTeam(event.target.value);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
        Analytics & Reporting
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="quarter-select-label">Quarter</InputLabel>
              <Select
                labelId="quarter-select-label"
                id="quarter-select"
                value={quarter}
                label="Quarter"
                onChange={handleQuarterChange}
              >
                <MenuItem value="Q1 2026">Q1 2026</MenuItem>
                <MenuItem value="Q4 2025">Q4 2025</MenuItem>
                <MenuItem value="Q3 2025">Q3 2025</MenuItem>
                <MenuItem value="Q2 2025">Q2 2025</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="team-select-label">Team</InputLabel>
              <Select
                labelId="team-select-label"
                id="team-select"
                value={selectedTeam}
                label="Team"
                onChange={handleTeamChange}
              >
                <MenuItem value="All Teams">All Teams</MenuItem>
                <MenuItem value="Engineering - Platform">Engineering - Platform</MenuItem>
                <MenuItem value="Engineering - Mobile">Engineering - Mobile</MenuItem>
                <MenuItem value="Product Management">Product Management</MenuItem>
                <MenuItem value="Design & UX">Design & UX</MenuItem>
                <MenuItem value="Data Science">Data Science</MenuItem>
                <MenuItem value="Marketing">Marketing</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Location Distribution */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Location Distribution
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Distribution of teams across geographic locations
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={locationDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {locationDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Achievement Trends */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Achievement Trends
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Month-over-month view of team achievements
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={achievementTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="achievements"
                  stroke="#8884d8"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Staffing Ratios */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Staffing Ratios
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Comparison of direct vs. non-direct staff across teams
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={staffingRatiosData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="team" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="directStaff" stackId="a" fill="#0088FE" name="Direct Staff" />
                <Bar dataKey="nonDirectStaff" stackId="a" fill="#FF8042" name="Non-Direct Staff" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Additional Charts Row */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Team Performance Overview
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Quarterly team performance metrics
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={achievementTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="achievements" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Organizational Health Score
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Overall organizational health metrics
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: 300,
              }}
            >
              <Typography variant="h1" color="primary" sx={{ fontWeight: 700 }}>
                85
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Health Score
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                Based on team co-location, staffing ratios, and achievement trends
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;
