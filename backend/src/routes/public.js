import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

/** POST /api/register
 * Body: { name, email, phone }
 * Stores a user row with UA + IP, then 200 OK.
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'Missing name or email' });
    const ua = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    await pool.query(
      'INSERT INTO users (name, email, phone, user_agent, ip) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || null, ua, ip]
    );
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to register' });
  }
});

/** POST /api/logout — for visitor session symmetry (no-op here) */
router.post('/logout', (_req, res) => res.sendStatus(200));

export default router;
