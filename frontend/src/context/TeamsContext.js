import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { teamAPI } from '../utils/api';
import { useErrorContext } from './ErrorContext';
import { useAuth } from '../hooks/useAuth';

export const TeamsContext = createContext();

export const TeamsProvider = ({ children }) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showError } = useErrorContext();
  const { isAuthenticated } = useAuth();

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const response = await teamAPI.getAll();
      setTeams(response || []);
    } catch (error) {
      showError('Failed to load teams.');
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const refreshTeams = useCallback(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (isAuthenticated && teams.length === 0) {
      fetchTeams();
    }
  }, [isAuthenticated, teams.length, fetchTeams]);

  const addTeam = useCallback((newTeam) => {
    setTeams((prevTeams) => [...prevTeams, newTeam]);
  }, []);

  const updateTeam = useCallback((updatedTeam) => {
    setTeams((prevTeams) =>
      prevTeams.map((team) => (team.id === updatedTeam.id ? updatedTeam : team))
    );
  }, []);

  const deleteTeam = useCallback((teamId) => {
    setTeams((prevTeams) => prevTeams.filter((team) => team.id !== teamId));
  }, []);

  const value = useMemo(() => ({
    teams,
    loading,
    fetchTeams,
    addTeam,
    updateTeam,
    deleteTeam,
    refreshTeams,
  }), [teams, loading, fetchTeams, addTeam, updateTeam, deleteTeam, refreshTeams]);

  return (
    <TeamsContext.Provider value={value}>
      {children}
    </TeamsContext.Provider>
  );
};

export const useTeams = () => {
  return useContext(TeamsContext);
};