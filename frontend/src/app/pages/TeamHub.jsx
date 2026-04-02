import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router';
import {
  Box,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MuiButton,
  TextField,
  Grid,
  Autocomplete,
  Alert as MuiAlert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  EmojiEvents as EmojiEventsIcon,
} from '@mui/icons-material';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { api } from '../../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import AchievementForm from '../components/AchievementForm';

/**
 * Team Hub page component.
 * Displays a unified view of a single team: overview, members, and achievements.
 * Fetches data from the GET /api/teams/:id/hub aggregation endpoint.
 * @returns {React.ReactElement}
 */
const TeamHub = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const { showNotification } = useNotification();

  const [hubData, setHubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [achievementFormOpen, setAchievementFormOpen] = useState(false);

  /**
   * Fetch hub data from the aggregation endpoint.
   */
  const fetchHub = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/api/teams/${id}/hub`);
      setHubData(data);
    } catch (err) {
      console.error('Failed to fetch team hub:', err);
      setError(err.message || 'Failed to load team data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHub();
  }, [id]);

  if (loading) {
    return <HubSkeleton />;
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error" variant="h5" sx={{ fontWeight: 700 }}>
          Something went wrong
        </Typography>
        <Typography variant="body1" sx={{ mt: 1 }}>{error}</Typography>
        <MuiButton sx={{ mt: 2 }} variant="outlined" onClick={() => navigate(-1)}>
          Go Back
        </MuiButton>
      </Box>
    );
  }

  const { team, members, achievements, metadata } = hubData;
  const isTeamLeader = currentUser?._id === team?.leader_id;
  const canManage = isAdmin || isTeamLeader;
  const leaderProfile = members.find((m) => m._id === team?.leader_id);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <MuiButton
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ textTransform: 'none' }}
        >
          Back
        </MuiButton>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
            {team.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {team.organization && <Badge variant="secondary">{team.organization}</Badge>}
            {team.region && <Badge variant="outline">{team.region}</Badge>}
            <Badge>{members.length} members</Badge>
          </Box>
        </Box>

        {canManage && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <EditIcon sx={{ fontSize: 16, mr: 0.5 }} /> Edit Team
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAchievementFormOpen(true)}>
              <EmojiEventsIcon sx={{ fontSize: 16, mr: 0.5 }} /> Add Achievement
            </Button>
          </Box>
        )}
      </Box>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
            <Card>
              <CardHeader>
                <CardDescription>Team Name</CardDescription>
                <CardTitle>{team.name}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Organization</CardDescription>
                <CardTitle>{team.organization || '\u2014'}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Region</CardDescription>
                <CardTitle>{team.region || '\u2014'}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Team Leader</CardDescription>
                <CardTitle>{leaderProfile?.name || team.leader_id}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {metadata.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metadata.map((m) => (
                      <TableRow key={m._id}>
                        <TableCell className="font-medium">{m.key || m._id}</TableCell>
                        <TableCell>{typeof m.value === 'object' ? JSON.stringify(m.value) : String(m.value ?? '')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>{members.length} member{members.length !== 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No members found.
                </Typography>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Region</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member._id}>
                        <TableCell className="font-medium">
                          {member.name}
                          {member._id === team.leader_id && (
                            <Badge variant="secondary" className="ml-2">Leader</Badge>
                          )}
                        </TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>{member.system_role || '\u2014'}</TableCell>
                        <TableCell>{member.region || '\u2014'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements">
          <Card className="mt-4">
            <CardHeader>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Box>
                  <CardTitle>Achievements</CardTitle>
                  <CardDescription>{achievements.length} achievement{achievements.length !== 1 ? 's' : ''}</CardDescription>
                </Box>
              </Box>
            </CardHeader>
            <CardContent>
              {achievements.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No achievements yet.
                </Typography>
              ) : (
                <div className="space-y-4">
                  {achievements.map((ach) => (
                    <Card key={ach._id} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                          <Box>
                            <CardTitle className="text-base">{ach.title}</CardTitle>
                            {ach.description && (
                              <CardDescription className="mt-1">{ach.description}</CardDescription>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {ach.impact && (
                              <Badge variant={ach.impact === 'High' ? 'destructive' : ach.impact === 'Medium' ? 'default' : 'secondary'}>
                                {ach.impact}
                              </Badge>
                            )}
                            {ach.category && <Badge variant="outline">{ach.category}</Badge>}
                          </Box>
                        </Box>
                      </CardHeader>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          {ach.month
                            ? new Date(ach.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                            : '\u2014'}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Team Dialog */}
      <EditTeamDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        team={team}
        members={members}
        onSaved={() => {
          setEditOpen(false);
          showNotification('Team updated successfully', 'success');
          fetchHub();
        }}
      />

      {/* Add Achievement Dialog */}
      <AchievementForm
        open={achievementFormOpen}
        onClose={() => setAchievementFormOpen(false)}
        onSave={() => {
          setAchievementFormOpen(false);
          showNotification('Achievement added successfully', 'success');
          fetchHub();
        }}
        achievement={{ team_id: team._id }}
      />
    </Box>
  );
};

/**
 * Loading skeleton for the hub page.
 * @returns {React.ReactElement}
 */
const HubSkeleton = () => (
  <Box sx={{ p: { xs: 2, md: 3 } }}>
    <Skeleton className="h-6 w-16 mb-4" />
    <Skeleton className="h-10 w-64 mb-2" />
    <Box sx={{ display: 'flex', gap: 1, mb: 4 }}>
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-5 w-20" />
    </Box>
    <Skeleton className="h-10 w-80 mb-4" />
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  </Box>
);

/**
 * Edit Team dialog with leadership transfer warning.
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open.
 * @param {Function} props.onClose - Callback to close the dialog.
 * @param {Object} props.team - The team being edited.
 * @param {Array} props.members - Current team members.
 * @param {Function} props.onSaved - Callback after successful save.
 * @returns {React.ReactElement}
 */
const EditTeamDialog = ({ open, onClose, team, members, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [apiError, setApiError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    region: '',
    leader_id: '',
  });

  useEffect(() => {
    if (open && team) {
      setFormData({
        name: team.name || '',
        organization: team.organization || '',
        region: team.region || '',
        leader_id: team.leader_id || '',
      });
      setApiError('');
      fetchEmployees();
    }
  }, [open, team]);

  /**
   * Fetch all employees for the leader dropdown.
   */
  const fetchEmployees = async () => {
    try {
      const data = await api.get('/api/employees');
      setAllEmployees(data || []);
    } catch (err) {
      setAllEmployees(members || []);
    }
  };

  /**
   * Handle form field changes.
   * @param {string} field - The field name.
   * @param {string} value - The new value.
   */
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Handle form submission.
   */
  const handleSubmit = async () => {
    setLoading(true);
    setApiError('');
    try {
      await api.put(`/api/teams/${team._id}`, formData);
      onSaved();
    } catch (err) {
      setApiError(err.message || 'Failed to update team');
    } finally {
      setLoading(false);
    }
  };

  const isLeaderChanged = formData.leader_id && formData.leader_id !== team?.leader_id;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Team</DialogTitle>
      <DialogContent dividers>
        {apiError && (
          <MuiAlert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </MuiAlert>
        )}

        <Grid container spacing={3} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Team Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Organization"
              value={formData.organization}
              onChange={(e) => handleChange('organization', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Region"
              value={formData.region}
              onChange={(e) => handleChange('region', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              fullWidth
              options={allEmployees}
              getOptionLabel={(option) => option.name || ''}
              value={allEmployees.find((e) => e._id === formData.leader_id) || null}
              onChange={(event, newValue) =>
                handleChange('leader_id', newValue ? newValue._id : '')
              }
              renderInput={(params) => (
                <TextField {...params} label="Team Leader" />
              )}
            />
            {isLeaderChanged && (
              <MuiAlert severity="warning" sx={{ mt: 1 }}>
                Warning: Changing the Team Leader will immediately transfer your
                administrative privileges to the new user.
              </MuiAlert>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <MuiButton onClick={onClose} disabled={loading}>Cancel</MuiButton>
        <MuiButton
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
};

EditTeamDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  team: PropTypes.object,
  members: PropTypes.array,
  onSaved: PropTypes.func.isRequired,
};

TeamHub.propTypes = {};

export default TeamHub;
