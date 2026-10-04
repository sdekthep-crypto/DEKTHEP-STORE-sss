const express = require('express');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const FALLBACK_FILE = path.join(ROOT, 'data', 'settings.json');

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

let pool = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  });
}

const defaultSettings = {
  storeName: 'DECK THE STORE',
  logoUrl: 'assets/x2-logo.svg',
  themePrimary: '#0066ff',
  themeAccent: '#00d2ff'
};

async function ensureDb() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS demoxshop_settings (
    id INTEGER PRIMARY KEY,
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

async function readSettings() {
  if (pool) {
    await ensureDb();
    const { rows } = await pool.query('SELECT settings FROM demoxshop_settings WHERE id = 1');
    return rows[0] ? rows[0].settings : null;
  }
  try {
    return JSON.parse(await fs.promises.readFile(FALLBACK_FILE, 'utf8'));
  } catch (_) {
    return null;
  }
}

async function writeSettings(settings) {
  if (pool) {
    await ensureDb();
    await pool.query(
      `INSERT INTO demoxshop_settings (id, settings, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()`,
      [JSON.stringify(settings)]
    );
    return;
  }
  await fs.promises.mkdir(path.dirname(FALLBACK_FILE), { recursive: true });
  await fs.promises.writeFile(FALLBACK_FILE, JSON.stringify(settings, null, 2), 'utf8');
}

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await readSettings();
    if (!settings) return res.status(404).json({ error: 'settings_not_initialized' });
    res.set('Cache-Control', 'no-store');
    res.json(settings);
  } catch (err) {
    console.error('GET /api/settings', err);
    res.status(500).json({ error: 'settings_read_failed' });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'invalid_settings' });
    }
    await writeSettings(req.body);
    res.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('PUT /api/settings', err);
    res.status(500).json({ error: 'settings_write_failed' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));
app.use(express.static(ROOT, { index: 'index.html', extensions: ['html'] }));

app.listen(PORT, () => {
  console.log(`DEMOxSHOP server listening on port ${PORT}`);
  console.log(pool ? 'Settings storage: PostgreSQL' : 'Settings storage: local JSON fallback');
});
