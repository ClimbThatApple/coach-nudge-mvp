import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Response } from 'botbuilder';
import { adapter, bot } from './_lib/adapter.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // VercelResponse is functionally compatible with the Bot Framework's Response type
    await adapter.process(req, res as unknown as Response, (context) => bot.run(context));
  } catch (error) {
    console.error('[Bot] Error processing message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
