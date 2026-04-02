import { createBrowserRouter, Navigate, useLocation, Outlet } from 'react-router';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Teams from './pages/Teams';
import TeamHub from './pages/TeamHub';
import Individuals from './pages/Individuals';
import Achievements from './pages/Achievements';
import Metadata from './pages/Metadata';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import { useAuth } from './context/AuthContext';

/**
 * Route guard that redirects unauthenticated users to /login.
 * @returns {React.ReactElement}
 */
function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

/**
 * Application router configuration
 * Defines all routes and their corresponding components
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
  },
  {
    Component: ProtectedRoute,
    children: [
      {
        path: '/',
        Component: MainLayout,
        children: [
          { index: true, Component: Dashboard },
          { path: 'analytics', Component: Analytics },
          { path: 'teams', Component: Teams },
          { path: 'teams/:id', Component: TeamHub },
          { path: 'individuals', Component: Individuals },
          { path: 'achievements', Component: Achievements },
          { path: 'metadata', Component: Metadata },
          { path: '*', Component: NotFound },
        ],
      },
    ],
  },
]);
