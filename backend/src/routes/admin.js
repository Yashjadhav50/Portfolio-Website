import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { requireAdmin } from '../utils/auth.js';

const router = Router();

/** POST /api/admin/login { username, password } */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

    const [rows] = await pool.query('SELECT id, username, password_hash FROM admins WHERE username=?', [username]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.admin = { id: admin.id, username: admin.username };
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

/** POST /api/admin/logout */
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.sendStatus(200));
});

/** GET /api/users?q=...  */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    let sql = 'SELECT id, name, email, phone, user_agent, created_at FROM users';
    let params = [];
    if (q) {
      sql += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
      params = [`%${q}%`, `%${q}%`, `%${q}%`];
    }
    sql += ' ORDER BY created_at DESC LIMIT 500';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

/** Stats: summary counts */
router.get('/stats/summary', requireAdmin, async (_req, res) => {
  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM users');
    const [[{ last7 }]]  = await pool.query('SELECT COUNT(*) AS last7 FROM users WHERE created_at >= (NOW() - INTERVAL 7 DAY)');
    const [[{ last30 }]] = await pool.query('SELECT COUNT(*) AS last30 FROM users WHERE created_at >= (NOW() - INTERVAL 30 DAY)');
    res.json({ total, last7, last30 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

/** Stats: daily counts (default 30 days) */
router.get('/stats/daily', requireAdmin, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days || '30', 10), 180);
    const [rows] = await pool.query(
      `SELECT DATE(created_at) AS d, COUNT(*) AS c
       FROM users
       WHERE created_at >= (CURDATE() - INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY d ASC`, [days]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load daily stats' });
  }
});

/** Stats: by user agent family (very rough categorization) */
router.get('/stats/agents', requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         CASE
           WHEN user_agent LIKE '%Chrome%' AND user_agent NOT LIKE '%Edg%' THEN 'Chrome'
           WHEN user_agent LIKE '%Edg%' THEN 'Edge'
           WHEN user_agent LIKE '%Firefox%' THEN 'Firefox'
           WHEN user_agent LIKE '%Safari%' AND user_agent NOT LIKE '%Chrome%' THEN 'Safari'
           ELSE 'Other'
         END AS agent,
         COUNT(*) AS count
       FROM users
       GROUP BY agent
       ORDER BY count DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load agent stats' });
  }
});

export default router;
