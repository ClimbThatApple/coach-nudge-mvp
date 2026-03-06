import { useEffect, useState } from 'react';
import { initializeTeams, getTeamsUserId, syncSuperviseesToBot } from './services/teams';
import { useApp } from './contexts/AppContext';

const BOT_API_URL = import.meta.env.VITE_BOT_API_URL ?? '';

/**
 * Wrapper that initializes Teams SDK and syncs data when running inside Teams.
 * Renders children (the normal app) once ready.
 */
export function TeamsTab({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const { state } = useApp();

  useEffect(() => {
    initializeTeams().then(() => setReady(true));
  }, []);

  // Sync supervisees to bot whenever they change (only when running in Teams)
  useEffect(() => {
    if (!ready || !BOT_API_URL || state.supervisees.length === 0) return;

    getTeamsUserId().then((userId) => {
      if (userId) {
        syncSuperviseesToBot(BOT_API_URL, userId, state.supervisees);
      }
    });
  }, [ready, state.supervisees]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
