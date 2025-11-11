import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import cors from "cors";

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://portfolio-yashjadhav.netlify.app/"
  ],
  credentials: true
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// ✅ MySQL Connection
// ======================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10
});

// ======================
// ✅ Ensure Tables
// ======================
async function initDB() {
  await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL,
    phone VARCHAR(40),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);

  await pool.query(`
  CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);

  const [rows] = await pool.query(`SELECT id FROM admins WHERE username=?`, ["admin"]);
  if (rows.length === 0) {
    const hash = await bcrypt.hash("admin123", 12);
    await pool.query(`INSERT INTO admins (username,password_hash) VALUES (?,?)`, ["admin", hash]);
    console.log("✅ Default admin created: admin / admin123");
  }
}
initDB();

// ======================
// ✅ Middleware
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'demo-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400000,
    sameSite: 'none',
    secure: true
  }
}));

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login.html');
  next();
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ======================
// ✅ Auth Routes
// ======================
app.post('/api/register', async (req, res) => {
  const { name, email, phone } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: 'Name and Email required' });

  const agent = req.get('user-agent') || '';
  await pool.query(`INSERT INTO users (name,email,phone,user_agent) VALUES (?,?,?,?)`, [name, email, phone || null, agent]);

  req.session.user = { name, email };
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  const [rows] = await pool.query(`SELECT * FROM admins WHERE username=?`, [username]);

  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

  const admin = rows[0];
  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.isAdmin = false;
  res.json({ ok: true });
});

// ======================
// ✅ Admin APIs
// ======================
app.get('/api/users', requireAdmin, async (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const [rows] = await pool.query(`SELECT * FROM users ORDER BY created_at DESC`);
  const filtered = q ? rows.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : rows;
  res.json(filtered);
});

app.get('/api/admin/stats/summary', requireAdmin, async (_req, res) => {
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM users`);
  const [[{ last7 }]] = await pool.query(`SELECT COUNT(*) last7 FROM users WHERE created_at >= (NOW() - INTERVAL 7 DAY)`);
  const [[{ last30 }]] = await pool.query(`SELECT COUNT(*) last30 FROM users WHERE created_at >= (NOW() - INTERVAL 30 DAY)`);
  res.json({ total, last7, last30 });
});

app.get('/api/admin/stats/daily', requireAdmin, async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT DATE(created_at) d, COUNT(*) c FROM users
    GROUP BY DATE(created_at) ORDER BY d ASC
  `);
  res.json(rows);
});

app.get('/api/admin/stats/agents', requireAdmin, async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT
      CASE
        WHEN user_agent LIKE '%Chrome%' AND user_agent NOT LIKE '%Edg%' THEN 'Chrome'
        WHEN user_agent LIKE '%Edg%' THEN 'Edge'
        WHEN user_agent LIKE '%Firefox%' THEN 'Firefox'
        WHEN user_agent LIKE '%Safari%' AND user_agent NOT LIKE '%Chrome%' THEN 'Safari'
        ELSE 'Other'
      END AS agent,
      COUNT(*) count
    FROM users
    GROUP BY agent ORDER BY count DESC
  `);
  res.json(rows);
});

// ======================
// ✅ Serve Pages (IMPORTANT ORDER)
// ======================

// Show login first always
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Protect index (portfolio)
app.get('/', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Serve static frontend AFTER routes
app.use(express.static(path.join(__dirname, '../frontend')));

// ======================
app.listen(PORT, () => console.log(`🚀 Server running → http://localhost:${PORT}`));
