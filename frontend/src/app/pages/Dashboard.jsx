import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import {
  Groups as GroupsIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as EmojiEventsIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { api } from '../../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent
} from '../components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import DashboardSkeleton from '../components/DashboardSkeleton';

/**
 * Metric card component for displaying key statistics
 */
const MetricCard = ({ title, value, icon: Icon, color }) => (
  <Card sx={{ boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', borderRadius: '16px' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography color="text.secondary" gutterBottom variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ fontWeight: 800, color: 'text.primary' }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: `${color}.light`,
            borderRadius: '12px',
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon sx={{ fontSize: 32, color: `${color}.main` }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

/**
 * Dashboard page component
 * Displays overview of key metrics and recent achievements
 */
const Dashboard = () => {
  const { currentUser } = useAuth();
  const [teams, setTeams] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error" variant="h5" sx={{ fontWeight: 700 }}>Something went wrong</Typography>
        <Typography variant="body1" sx={{ mt: 1 }}>{error}</Typography>
      </Box>
    );
  }

  // Task 2: Calculate Summary Metrics
  const totalTeams = teams.length;
  const totalEmployees = individuals.length;
  const totalAchievements = achievements.length;
  
  // Highlight: "Your Team(s)"
  const myTeamsCount = teams.filter(t => 
    t.leader_id === currentUser?._id || 
    (t.employee_ids && t.employee_ids.includes(currentUser?._id))
  ).length;

  // Task 3: Wire up the UI Chart - Aggregating Teams by Region
  const regionAggregate = teams.reduce((acc, team) => {
    const r = team.region || 'Unknown';
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(regionAggregate).map(([region, count]) => ({
    region,
    count,
  })).sort((a, b) => b.count - a.count);

  const chartConfig = {
    count: {
      label: "Teams",
      color: "var(--primary)",
    }
  };

  // Task 4: Recent Activity Feed
  const recentAchievements = [...achievements]
    .sort((a, b) => new Date(b.month || 0) - new Date(a.month || 0))
    .slice(0, 5);

  const getTeamName = (teamId) => {
    const team = teams.find(t => t._id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: '-0.02em' }}>
          Overview
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
          Welcome back, <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>{currentUser?.name || 'User'}</Box>.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Key Metrics */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Total Employees"
            value={totalEmployees}
            icon={PersonIcon}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Total Teams"
            value={totalTeams}
            icon={GroupsIcon}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Your Team(s)"
            value={myTeamsCount}
            icon={BusinessIcon}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Achievements"
            value={totalAchievements}
            icon={EmojiEventsIcon}
            color="info"
          />
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* Chart: Teams by Region */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 4, height: '100%', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', borderRadius: '24px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Teams by Region
              </Typography>
              <Chip label="Distribution" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
            </Box>
            <Box sx={{ height: 350, width: '100%' }}>
              <ChartContainer config={chartConfig}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis 
                    dataKey="region" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12, fontWeight: 500 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="count" 
                    fill="var(--primary)" 
                    radius={[8, 8, 0, 0]} 
                    barSize={48}
                  />
                </BarChart>
              </ChartContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Achievements Feed */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 4, height: '100%', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', borderRadius: '24px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <TrendingUpIcon sx={{ mr: 1.5, color: 'primary.main', fontSize: 28 }} />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Top Highlights
              </Typography>
            </Box>
            <Divider sx={{ mb: 1, opacity: 0.6 }} />
            <List sx={{ p: 0 }}>
              {recentAchievements.length > 0 ? (
                recentAchievements.map((achievement, index) => (
                  <React.Fragment key={achievement._id || index}>
                    <ListItem alignItems="flex-start" sx={{ px: 0, py: 3 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                              {achievement.title}
                            </Typography>
                            <Chip
                              label={achievement.impact}
                              color={getImpactColor(achievement.impact)}
                              size="small"
                              sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700, borderRadius: '6px' }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
                              {achievement.description}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <GroupsIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                  {getTeamName(achievement.team_id)}
                                </Typography>
                              </Box>
                              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 500 }}>
                                {achievement.month ? new Date(achievement.month).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'N/A'}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < recentAchievements.length - 1 && <Divider component="li" sx={{ opacity: 0.4 }} />}
                  </React.Fragment>
                ))
              ) : (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <EmojiEventsIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 2, opacity: 0.2 }} />
                  <Typography variant="body2" color="text.secondary">
                    No recent highlights to show.
                  </Typography>
                </Box>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
