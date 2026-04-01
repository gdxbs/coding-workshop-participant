import { createBrowserRouter } from 'react-router';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Teams from './pages/Teams';
import Individuals from './pages/Individuals';
import Achievements from './pages/Achievements';
import Metadata from './pages/Metadata';
import NotFound from './pages/NotFound';

/**
 * Application router configuration
 * Defines all routes and their corresponding components
 */
export const router = createBrowserRouter([
  {
    path: '/',
    Component: MainLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'analytics', Component: Analytics },
      { path: 'teams', Component: Teams },
      { path: 'individuals', Component: Individuals },
      { path: 'achievements', Component: Achievements },
      { path: 'metadata', Component: Metadata },
      { path: '*', Component: NotFound },
    ],
  },
]);
