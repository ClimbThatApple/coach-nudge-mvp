import { BotFrameworkAdapter } from 'botbuilder';
import { NudgeBot } from './nudgeBot.js';

export const adapter = new BotFrameworkAdapter({
  appId: process.env.BOT_ID,
  appPassword: process.env.BOT_PASSWORD,
});

adapter.onTurnError = async (context, error) => {
  console.error('[Bot] Unhandled error:', error);
  await context.sendActivity('Sorry, something went wrong. Please try again.');
};

export const bot = new NudgeBot();
