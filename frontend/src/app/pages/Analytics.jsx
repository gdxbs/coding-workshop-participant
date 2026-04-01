import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Line,
  LineChart,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import { api } from '../../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '../components/ui/chart';

const COLORS = [
  'var(--primary)',
  '#2dd4bf',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#10b981'
];

/**
 * Analytics page component
 * Displays various charts and visualizations for organizational insights
 */
const Analytics = () => {
  const { currentUser } = useAuth();
  const [teams, setTeams] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [useMyScope, setUseMyScope] = useState(currentUser?.system_role === 'Employee');
  const [selectedOrg, setSelectedOrg] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [t, i, a] = await Promise.all([
          api.get('/api/teams').catch(() => []),
          api.get('/api/employees').catch(() => []),
          api.get('/api/achievements').catch(() => [])
        ]);
        setTeams(t || []);
        setIndividuals(i || []);
        setAchievements(a || []);
      } catch (err) {
        console.error("Failed to fetch analytics data:", err);
        setError("Could not load analytics. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Identify User's Scope
  const userScope = useMemo(() => {
    if (!currentUser) return { orgs: [], region: 'Unknown' };
    
    const userProfile = individuals.find(ind => ind._id === currentUser._id);
    const userRegion = userProfile?.region || 'Unknown';
    
    const userTeams = teams.filter(t => 
      t.leader_id === currentUser._id || 
      (t.employee_ids && t.employee_ids.includes(currentUser._id))
    );
    
    const userOrgs = [...new Set(userTeams.map(t => t.organization).filter(Boolean))];
    
    return { orgs: userOrgs, region: userRegion };
  }, [currentUser, individuals, teams]);

  // Aggregate Unique Values for Filters
  const organizations = useMemo(() => [...new Set(teams.map(t => t.organization).filter(Boolean))], [teams]);
  const regions = useMemo(() => [...new Set(teams.map(t => t.region).filter(Boolean))], [teams]);

  // Filter Logic
  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      if (useMyScope && currentUser?.system_role === 'Employee') {
        const inOwnOrg = userScope.orgs.includes(t.organization);
        const inOwnRegion = t.region === userScope.region;
        if (!inOwnOrg && !inOwnRegion) return false;
      }
      
      if (selectedOrg !== 'All' && t.organization !== selectedOrg) return false;
      if (selectedRegion !== 'All' && t.region !== selectedRegion) return false;
      
      return true;
    });
  }, [teams, useMyScope, currentUser, userScope, selectedOrg, selectedRegion]);

  const filteredAchievements = useMemo(() => {
    const teamIds = new Set(filteredTeams.map(t => t._id));
    return achievements.filter(a => teamIds.has(a.team_id));
  }, [achievements, filteredTeams]);

  // Task 1: Fetch and Aggregate Data
  
  // 1. Achievements Over Time
  const achievementsByMonth = useMemo(() => {
    const counts = filteredAchievements.reduce((acc, ach) => {
      const month = ach.month || 'N/A';
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(counts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredAchievements]);

  // 2. Teams by Organization
  const teamsByOrg = useMemo(() => {
    const counts = filteredTeams.reduce((acc, team) => {
      const org = team.organization || 'Other';
      acc[org] = (acc[org] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTeams]);

  // 3. Achievements by Organization
  const achievementsByOrg = useMemo(() => {
    // We need to join achievements with their team's organization
    const orgCounts = filteredAchievements.reduce((acc, ach) => {
      const team = teams.find(t => t._id === ach.team_id);
      const org = team?.organization || 'Other';
      acc[org] = (acc[org] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(orgCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredAchievements, teams]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const chartConfig = {
    count: { label: "Count", color: "var(--primary)" },
    achievements: { label: "Achievements", color: "var(--primary)" },
    impact: { label: "Impact", color: "var(--primary)" }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
        Analytics & Reporting
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.02)' }}>
        <Grid container spacing={4} alignItems="center">
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="medium">
              <InputLabel id="org-select-label">Organization</InputLabel>
              <Select
                labelId="org-select-label"
                id="org-select"
                value={selectedOrg}
                label="Organization"
                onChange={(e) => setSelectedOrg(e.target.value)}
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="All">All Organizations</MenuItem>
                {organizations.map(org => (
                  <MenuItem key={org} value={org}>{org}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="medium">
              <InputLabel id="region-select-label">Region</InputLabel>
              <Select
                labelId="region-select-label"
                id="region-select"
                value={selectedRegion}
                label="Region"
                onChange={(e) => setSelectedRegion(e.target.value)}
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="All">All Regions</MenuItem>
                {regions.map(r => (
                  <MenuItem key={r} value={r}>{r}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', justifyContent: { md: 'flex-end' } }}>
            {currentUser?.system_role === 'Employee' && (
              <FormControlLabel
                control={
                  <Switch 
                    checked={useMyScope} 
                    onChange={(e) => setUseMyScope(e.target.checked)} 
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body1" sx={{ fontWeight: 600, ml: 1 }}>
                    Show My Scope Only ({userScope.region})
                  </Typography>
                }
              />
            )}
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={4}>
        {/* Achievements Trends - Task 2.1 */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 4, height: '100%', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.02)' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 800 }}>
              Achievements Trends
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Month-over-month productivity view
            </Typography>
            <Box sx={{ height: 350, width: '100%' }}>
              <ChartContainer config={chartConfig}>
                <AreaChart data={achievementsByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="var(--primary)" 
                    fillOpacity={1} 
                    fill="url(#colorCount)" 
                    strokeWidth={3}
                  />
                </AreaChart>
              </ChartContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Teams by Organization - Task 2.2 */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 4, height: '100%', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.02)' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 800 }}>
              Teams by Organization
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Distribution of teams across business units
            </Typography>
            <Box sx={{ height: 350, width: '100%' }}>
              <ChartContainer config={chartConfig}>
                <PieChart>
                  <Pie
                    data={teamsByOrg}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {teamsByOrg.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.2)" />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Achievements by Organization - Task 2.3 Refined */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.02)' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 800 }}>
              Achievements by Organization
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Impact distribution across business units
            </Typography>
            <Box sx={{ height: 350, width: '100%' }}>
              <ChartContainer config={chartConfig}>
                <BarChart data={achievementsByOrg} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="count" 
                    fill="var(--primary)" 
                    radius={[10, 10, 0, 0]} 
                    barSize={60}
                  />
                </BarChart>
              </ChartContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Org Health Stats */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 4, height: '100%', borderRadius: '24px', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', background: 'linear-gradient(135deg, var(--primary) 0%, #1e40af 100%)', color: 'white' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, color: 'white opacity 0.8' }}>
              Insights Score
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 4 }}>
              <Typography variant="h1" sx={{ fontWeight: 900, mb: 1, letterSpacing: '-0.05em' }}>
                {Math.round((filteredTeams.length / (teams.length || 1)) * 100)}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, opacity: 0.9 }}>
                Coverage Score
              </Typography>
              <Typography variant="body1" sx={{ mt: 3, textAlign: 'center', opacity: 0.8, maxWidth: 300 }}>
                This metric represents the portion of the company metrics currently in your view.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;
