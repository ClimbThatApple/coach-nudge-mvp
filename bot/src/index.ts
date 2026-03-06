import express from 'express';
import {
  BotFrameworkAdapter,
  MemoryStorage,
  ConversationState,
  UserState,
} from 'botbuilder';
import { NudgeBot } from './nudgeBot.js';
import { startScheduler } from './scheduler.js';
import { store } from './store.js';

const PORT = process.env.PORT ?? 3978;

// Bot Framework adapter
const adapter = new BotFrameworkAdapter({
  appId: process.env.BOT_ID,
  appPassword: process.env.BOT_PASSWORD,
});

adapter.onTurnError = async (context, error) => {
  console.error('[Bot] Unhandled error:', error);
  await context.sendActivity('Sorry, something went wrong. Please try again.');
};

const bot = new NudgeBot();

const app = express();
app.use(express.json());

// Bot Framework messages endpoint
app.post('/api/messages', async (req, res) => {
  await adapter.process(req, res, (context) => bot.run(context));
});

// API for the React tab to sync supervisee data to the bot
app.post('/api/sync/supervisees', (req, res) => {
  const { userId, supervisees } = req.body;
  if (!userId || !Array.isArray(supervisees)) {
    res.status(400).json({ error: 'userId and supervisees[] required' });
    return;
  }
  store.setSupervisees(userId, supervisees);
  res.json({ ok: true, count: supervisees.length });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Bot] Coach Nudge bot listening on port ${PORT}`);
  startScheduler(adapter, bot);
});
