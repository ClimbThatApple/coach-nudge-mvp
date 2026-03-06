import * as microsoftTeams from '@microsoft/teams-js';

let teamsInitialized = false;

export function isInTeams(): boolean {
  // Teams embeds the app in an iframe with specific query params
  const searchParams = new URLSearchParams(window.location.search);
  return (
    searchParams.has('inTeams') ||
    searchParams.has('inTeamsSSO') ||
    window.parent !== window
  );
}

export async function initializeTeams(): Promise<boolean> {
  if (teamsInitialized) return true;

  try {
    await microsoftTeams.app.initialize();
    teamsInitialized = true;

    // Notify Teams that the app loaded successfully
    await microsoftTeams.app.notifySuccess();
    return true;
  } catch {
    console.log('Not running inside Teams, continuing as standalone app.');
    return false;
  }
}

export async function getTeamsContext(): Promise<microsoftTeams.app.Context | null> {
  if (!teamsInitialized) return null;

  try {
    return await microsoftTeams.app.getContext();
  } catch {
    return null;
  }
}

export async function getTeamsUserId(): Promise<string | null> {
  const context = await getTeamsContext();
  return context?.user?.id ?? null;
}

/**
 * Sync supervisee data from localStorage to the bot backend
 * so the bot knows who to send proactive nudges to.
 */
export async function syncSuperviseesToBot(
  botApiUrl: string,
  userId: string,
  supervisees: ReadonlyArray<{ id: string; name: string; notes: ReadonlyArray<{ id: string; content: string; createdAt: Date; source: string }> }>,
): Promise<void> {
  try {
    const payload = supervisees.map((s) => ({
      id: s.id,
      name: s.name,
      notes: s.notes.map((n) => ({
        id: n.id,
        content: n.content,
        createdAt: new Date(n.createdAt).getTime(),
        source: n.source,
      })),
      lastNudgeAt: null,
    }));

    await fetch(`${botApiUrl}/api/sync/supervisees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, supervisees: payload }),
    });
  } catch (error) {
    console.error('Failed to sync supervisees to bot:', error);
  }
}
