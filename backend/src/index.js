const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3088;
const DB_PATH = path.join('/app/data', 'links.db');

// Middleware
app.use(cors());
app.use(express.json());

// Init DB
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  targetUrl TEXT NOT NULL,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  clicks INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_link_slug ON links(slug);

CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  linkId INTEGER REFERENCES links(id),
  referrer TEXT DEFAULT '',
  userAgent TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  clickedAt TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_click_link ON clicks(linkId);
CREATE INDEX IF NOT EXISTS idx_click_time ON clicks(clickedAt);
`);

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ── Redirect ─────────────────────────────────────────────────────────────────
app.get('/r/:slug', (req, res) => {
  const link = db.prepare('SELECT * FROM links WHERE slug = ? AND active = 1').get(req.params.slug);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  // Track click
  db.prepare(`INSERT INTO clicks (linkId, referrer, userAgent, ip) VALUES (?, ?, ?, ?)`).run(
    link.id,
    req.get('referer') || '',
    req.get('user-agent') || '',
    req.ip || ''
  );
  db.prepare(`UPDATE links SET clicks = clicks + 1, updatedAt = datetime('now','localtime') WHERE id = ?`).run(link.id);

  res.redirect(302, link.targetUrl);
});

// ── Links CRUD ────────────────────────────────────────────────────────────────
app.post('/api/links', (req, res) => {
  const { slug, targetUrl, title = '', description = '', category = 'general' } = req.body;
  if (!slug || !targetUrl) return res.status(400).json({ error: 'slug and targetUrl required' });

  try {
    const result = db.prepare(`
      INSERT INTO links (slug, targetUrl, title, description, category)
      VALUES (?, ?, ?, ?, ?)
    `).run(slug.toLowerCase().trim(), targetUrl, title, description, category);
    const link = db.prepare('SELECT * FROM links WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(link);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/links', (req, res) => {
  const links = db.prepare('SELECT * FROM links ORDER BY createdAt DESC').all();
  res.json(links);
});

app.get('/api/links/:id', (req, res) => {
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id);
  if (!link) return res.status(404).json({ error: 'Not found' });
  const history = db.prepare('SELECT * FROM clicks WHERE linkId = ? ORDER BY clickedAt DESC LIMIT 100').all(link.id);
  res.json({ ...link, history });
});

app.patch('/api/links/:id', (req, res) => {
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id);
  if (!link) return res.status(404).json({ error: 'Not found' });

  const { slug, targetUrl, title, description, category, active } = req.body;
  const updated = {
    slug: slug !== undefined ? slug.toLowerCase().trim() : link.slug,
    targetUrl: targetUrl !== undefined ? targetUrl : link.targetUrl,
    title: title !== undefined ? title : link.title,
    description: description !== undefined ? description : link.description,
    category: category !== undefined ? category : link.category,
    active: active !== undefined ? (active ? 1 : 0) : link.active,
  };

  try {
    db.prepare(`
      UPDATE links SET slug=?, targetUrl=?, title=?, description=?, category=?, active=?,
      updatedAt=datetime('now','localtime') WHERE id=?
    `).run(updated.slug, updated.targetUrl, updated.title, updated.description, updated.category, updated.active, req.params.id);
    res.json(db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id));
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/links/:id', (req, res) => {
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id);
  if (!link) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM clicks WHERE linkId = ?').run(req.params.id);
  db.prepare('DELETE FROM links WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── QR Code ───────────────────────────────────────────────────────────────────
app.get('/api/links/:slug/qr', async (req, res) => {
  const link = db.prepare('SELECT * FROM links WHERE slug = ?').get(req.params.slug);
  if (!link) return res.status(404).json({ error: 'Not found' });

  const url = `http://192.168.1.166:3088/r/${link.slug}`;
  try {
    const png = await QRCode.toBuffer(url, {
      type: 'png',
      width: 300,
      margin: 2,
      color: { dark: '#ffffff', light: '#00000000' },
    });
    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const totalLinks = db.prepare('SELECT COUNT(*) as count FROM links').get().count;
  const totalClicks = db.prepare('SELECT SUM(clicks) as total FROM links').get().total || 0;
  const topLinks = db.prepare('SELECT id, slug, title, clicks, category FROM links ORDER BY clicks DESC LIMIT 10').all();
  const clicksByCategory = db.prepare(`
    SELECT category, SUM(clicks) as total FROM links GROUP BY category ORDER BY total DESC
  `).all();

  res.json({ totalLinks, totalClicks, topLinks, clicksByCategory });
});

app.get('/api/stats/clicks', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const trend = db.prepare(`
    SELECT DATE(clickedAt) as date, COUNT(*) as count
    FROM clicks
    WHERE clickedAt >= datetime('now', '-${days} days', 'localtime')
    GROUP BY DATE(clickedAt)
    ORDER BY date ASC
  `).all();
  res.json(trend);
});

app.listen(PORT, () => {
  console.log(`LinkHub backend running on port ${PORT}`);
});
