import React from 'react';
import { Box, Grid, Card, CardContent, Paper, List, ListItem, Divider } from '@mui/material';
import { Skeleton } from './ui/skeleton';

const MetricSkeleton = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ width: '60%' }}>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-16" />
        </Box>
        <Skeleton className="h-14 w-14 rounded-full" />
      </Box>
    </CardContent>
  </Card>
);

const DashboardSkeleton = () => {
  return (
    <Box>
      <Skeleton className="h-10 w-48 mb-6" />
      
      <Grid container spacing={3}>
        {/* Metric Skeletons */}
        {[1, 2, 3, 4].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricSkeleton />
          </Grid>
        ))}

        {/* Chart Skeleton */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 400 }}>
             <Skeleton className="h-6 w-32 mb-4" />
             <Skeleton className="h-[300px] w-full" />
          </Paper>
        </Grid>

        {/* Activity Feed Skeleton */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Skeleton className="h-6 w-48 mb-4" />
            <List>
              {[1, 2, 3, 4, 5].map((i) => (
                <React.Fragment key={i}>
                  <ListItem sx={{ px: 0, py: 2 }}>
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-5 w-16" />
                      </Box>
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-4 w-1/2" />
                    </Box>
                  </ListItem>
                  {i < 5 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardSkeleton;
