import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // Importing Navigate
import './App.css';

// Hooks
import { useAuth } from './hooks/useAuth';

// Components
import LoadingSpinner from './components/LoadingSpinner';


// Pages
import AuthPage from './pages/AuthPage';
import TeamTasksPage from './pages/TeamTasksPage';
import PersonalTasksPage from './pages/PersonalTasksPage';
import TeamsPage from './pages/TeamsPage';
import SettingsPage from './pages/SettingsPage';


// Context
import { ErrorProvider } from './context/ErrorContext';
import { ProjectsProvider } from './context/ProjectsContext';
import { TeamsProvider } from './context/TeamsContext';

import MainLayout from './components/MainLayout';

const App = () => {
  const { isAuthenticated, user, loading, login, register } = useAuth();

  // Loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen w-full flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage onLogin={login} onRegister={register} />} />
      <Route path="/*" element={isAuthenticated ? <MainLayout /> : <Navigate to="/auth" />}>
        <Route path="personal/:projectId?" element={<PersonalTasksPage user={user} />} />
        <Route path="teams" element={<TeamsPage user={user} />} />
        <Route path="teams/:teamId" element={<TeamsPage user={user} />} />
        <Route path="teams/:teamId/projects/:projectId" element={<TeamTasksPage user={user} />} />
        <Route path="settings" element={<SettingsPage user={user} />} />
        <Route path="" element={<Navigate to="/personal" />} />
      </Route>
    </Routes>
  );
};

const Root = () => (
  <ErrorProvider>
    <ProjectsProvider>
      <TeamsProvider>
        <App />
      </TeamsProvider>
    </ProjectsProvider>
  </ErrorProvider>
);

export default Root;