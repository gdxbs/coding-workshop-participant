import React from 'react';
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
  LocationOn as LocationIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as EmojiEventsIcon,
} from '@mui/icons-material';
import { mockTeams, mockAchievements } from '../data/mockData';

/**
 * Metric card component for displaying key statistics
 */
const MetricCard = ({ title, value, icon: Icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography color="text.secondary" gutterBottom variant="overline">
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: `${color}.light`,
            borderRadius: '50%',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon sx={{ fontSize: 40, color: `${color}.main` }} />
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
  const totalTeams = mockTeams.length;
  const totalIndividuals = mockTeams.reduce((sum, team) => sum + team.totalMembers, 0);
  const nonCoLocatedLeaders = mockTeams.filter((team) => !team.isCoLocated).length;
  const highNonDirectRatio = mockTeams.filter((team) => team.nonDirectRatio > 20).length;
  const reportsToOrgLeader = mockTeams.filter((team) => team.reportsToOrgLeader).length;

  const recentAchievements = mockAchievements
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

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

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Total Teams"
            value={totalTeams}
            icon={GroupsIcon}
            color="primary"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Total Individuals"
            value={totalIndividuals}
            icon={PersonIcon}
            color="success"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Non Co-Located Leaders"
            value={nonCoLocatedLeaders}
            icon={LocationIcon}
            color="warning"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="High Non-Direct Ratio (>20%)"
            value={highNonDirectRatio}
            icon={TrendingUpIcon}
            color="error"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Reports to Org Leader"
            value={reportsToOrgLeader}
            icon={GroupsIcon}
            color="info"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Recent Achievements"
            value={recentAchievements.length}
            icon={EmojiEventsIcon}
            color="secondary"
          />
        </Grid>

        {/* Recent Achievements Feed */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EmojiEventsIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recent Achievements
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <List>
              {recentAchievements.map((achievement, index) => (
                <React.Fragment key={achievement.id}>
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {achievement.title}
                          </Typography>
                          <Chip
                            label={achievement.impact}
                            color={getImpactColor(achievement.impact)}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="body2"
                            color="text.primary"
                            sx={{ mb: 1 }}
                          >
                            {achievement.description}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label={achievement.team}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={achievement.category}
                              size="small"
                              variant="outlined"
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                              {new Date(achievement.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < recentAchievements.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
