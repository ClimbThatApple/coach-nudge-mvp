import type { VercelRequest, VercelResponse } from '@vercel/node';
import { store } from '../_lib/store.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { userId, supervisees } = req.body;
  if (!userId || !Array.isArray(supervisees)) {
    res.status(400).json({ error: 'userId and supervisees[] required' });
    return;
  }

  store.setSupervisees(userId, supervisees);
  res.json({ ok: true, count: supervisees.length });
}
