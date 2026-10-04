const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const FALLBACK_FILE = path.join(ROOT, 'data', 'settings.json');

app.use(compression({ threshold: 1024 }));
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
  logoUrl: '',
  themePrimary: '#0066ff',
  themeAccent: '#00d2ff'
};

async function ensureDb() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS deck-the-store_settings (
    id INTEGER PRIMARY KEY,
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

async function readSettings() {
  if (pool) {
    await ensureDb();
    const { rows } = await pool.query('SELECT settings FROM deck-the-store_settings WHERE id = 1');
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
      `INSERT INTO deck-the-store_settings (id, settings, updated_at)
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


const STORE_DATA_KEYS = new Set(['products','categories','coupons','orders','payments']);
const STORE_DATA_FILE = path.join(ROOT, 'data', 'store-data.json');

async function readStoreData(key) {
  if (!STORE_DATA_KEYS.has(key)) throw new Error('invalid_store_data_key');
  if (pool) {
    await ensureDb();
    await pool.query(`CREATE TABLE IF NOT EXISTS deck-the-store_store_data (
      data_key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const { rows } = await pool.query('SELECT data FROM deck-the-store_store_data WHERE data_key = $1', [key]);
    return rows[0] ? rows[0].data : null;
  }
  try {
    const all = JSON.parse(await fs.promises.readFile(STORE_DATA_FILE, 'utf8'));
    return all[key] ?? null;
  } catch (_) { return null; }
}

async function writeStoreData(key, data) {
  if (!STORE_DATA_KEYS.has(key)) throw new Error('invalid_store_data_key');
  if (pool) {
    await ensureDb();
    await pool.query(`CREATE TABLE IF NOT EXISTS deck-the-store_store_data (
      data_key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await pool.query(`INSERT INTO deck-the-store_store_data (data_key, data, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (data_key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [key, JSON.stringify(data)]);
    return;
  }
  await fs.promises.mkdir(path.dirname(STORE_DATA_FILE), { recursive: true });
  let all = {};
  try { all = JSON.parse(await fs.promises.readFile(STORE_DATA_FILE, 'utf8')); } catch (_) {}
  all[key] = data;
  await fs.promises.writeFile(STORE_DATA_FILE, JSON.stringify(all, null, 2), 'utf8');
}

app.get('/api/store-data/:key', async (req, res) => {
  try {
    const key = req.params.key;
    if (!STORE_DATA_KEYS.has(key)) return res.status(400).json({ error: 'invalid_store_data_key' });
    const data = await readStoreData(key);
    if (data === null || data === undefined) return res.status(404).json({ error: 'data_not_initialized' });
    res.set('Cache-Control', 'no-store');
    res.json(data);
  } catch (err) {
    console.error('GET /api/store-data', err);
    res.status(500).json({ error: 'store_data_read_failed' });
  }
});

app.put('/api/store-data/:key', async (req, res) => {
  try {
    const key = req.params.key;
    if (!STORE_DATA_KEYS.has(key)) return res.status(400).json({ error: 'invalid_store_data_key' });
    if (req.body === undefined) return res.status(400).json({ error: 'invalid_store_data' });
    await writeStoreData(key, req.body);
    res.json({ ok: true, key, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('PUT /api/store-data', err);
    res.status(500).json({ error: 'store_data_write_failed' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));
app.use(express.static(ROOT, {
  index: 'index.html',
  extensions: ['html'],
  setHeaders(res, filePath) {
    if (/\.(?:css|js|woff2|png|jpg|jpeg|webp|svg|gif|ico)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    } else if (/\.html?$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.listen(PORT, () => {
  console.log(`DECK THE STORE server listening on port ${PORT}`);
  console.log(pool ? 'Settings storage: PostgreSQL' : 'Settings storage: local JSON fallback');
});
