import bcrypt from 'bcrypt';
import { pool } from '../db.js';

export async function ensureBootstrapAdmin(username, password) {
  const [rows] = await pool.query('SELECT id FROM admins WHERE username = ?', [username]);
  if (rows.length === 0) {
    const hash = await bcrypt.hash(password, 12);
    await pool.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, hash]);
    console.log(`[BOOTSTRAP] Created admin user "${username}"`);
  }
}

export function requireAdmin(req, res, next) {
  if (req.session?.admin?.id) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}
