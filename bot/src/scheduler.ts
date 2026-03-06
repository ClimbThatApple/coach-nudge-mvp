import cron from 'node-cron';
import { BotFrameworkAdapter } from 'botbuilder';
import { NudgeBot } from './nudgeBot.js';
import { generateNudge } from './nudgeService.js';
import { store, type StoredSupervisee } from './store.js';
import type { NudgeCardData } from './adaptiveCards.js';

/**
 * Runs a cron job every hour to check if any nudges need to be sent.
 * In the MVP, we check schedules stored per-user and fire proactive messages.
 */
export function startScheduler(
  adapter: BotFrameworkAdapter,
  bot: NudgeBot,
): void {
  // Run every hour at :00
  cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] Checking for scheduled nudges...');

    const now = new Date();
    const currentDay = now
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase();
    const currentHour = now.getHours();

    for (const [userId, ref] of store.getAllConversationRefs()) {
      const supervisees = store.getSupervisees(userId);
      if (supervisees.length === 0) continue;

      // Pick the supervisee least recently nudged
      const sorted = [...supervisees].sort(
        (a, b) => (a.lastNudgeAt ?? 0) - (b.lastNudgeAt ?? 0),
      );
      const target = sorted[0];

      // For MVP: send one nudge per day at 9am on weekdays
      if (
        currentHour === 9 &&
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(
          currentDay,
        )
      ) {
        await sendScheduledNudge(adapter, bot, userId, target);
      }
    }
  });

  console.log('[Scheduler] Nudge scheduler started (hourly checks).');
}

async function sendScheduledNudge(
  adapter: BotFrameworkAdapter,
  bot: NudgeBot,
  userId: string,
  supervisee: StoredSupervisee,
): Promise<void> {
  try {
    const nudgeType = Math.random() > 0.5 ? 'reflection' : 'coaching';
    const content = await generateNudge(supervisee, nudgeType);
    const nudgeId = crypto.randomUUID();

    store.addNudge({
      id: nudgeId,
      superviseeId: supervisee.id,
      type: nudgeType,
      content,
      status: 'pending',
      createdAt: Date.now(),
    });

    const cardData: NudgeCardData = {
      superviseeId: supervisee.id,
      superviseeName: supervisee.name,
      nudgeId,
      nudgeType,
      content,
    };

    await bot.sendProactiveNudge(adapter, userId, cardData);
    console.log(
      `[Scheduler] Sent ${nudgeType} nudge for ${supervisee.name} to user ${userId}`,
    );
  } catch (error) {
    console.error(
      `[Scheduler] Failed to send nudge for ${supervisee.name}:`,
      error,
    );
  }
}
