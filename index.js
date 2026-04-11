import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getHome, search, searchSuggest, getAnimeDetail,
  getEpisodeList, getEpisodeServers, getEpisodeSources,
  getSchedule, getGenre, getCategory,
} from './scrapers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

// ── SECURITY MIDDLEWARE ────────────────────────────────────────────────────────

// Rate limit store (in-memory, production should use Redis)
const rateLimitStore = new Map();

function rateLimit(maxReqs = 60, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    if (entry.count > maxReqs) {
      return res.status(429).json({ success: false, error: 'Too many requests' });
    }
    next();
  };
}

// Sanitize all query/param values - prevent injection
function sanitizeInput(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[<>"';&|`$]/g, '')
    .slice(0, 500);
}

function sanitizeId(val) {
  if (!val) return null;
  const clean = String(val).replace(/[^a-zA-Z0-9\-]/g, '');
  return clean.length > 0 && clean.length < 200 ? clean : null;
}

function sanitizeSlug(val) {
  if (!val) return null;
  // Allow alphanumeric, hyphens only - prevents path traversal
  const clean = String(val).replace(/[^a-zA-Z0-9\-]/g, '');
  return clean.length > 0 && clean.length < 300 ? clean : null;
}

function validatePage(val) {
  const n = parseInt(val || '1');
  return isNaN(n) || n < 1 ? 1 : Math.min(n, 1000);
}

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: http:; media-src 'self' https: http: blob:; frame-src 'self' https:; connect-src 'self' https://api.myanimelist.net https://myanimelist.net");
  next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50kb' }));

// Serve static files
app.use('/public', express.static(path.join(__dirname, '../public')));

// Apply rate limit to API routes
app.use('/api', rateLimit(120, 60000));

// ── RESPONSE WRAPPER ──────────────────────────────────────────────────────────
function wrap(fn) {
  return async (req, res) => {
    try {
      const data = await fn(req);
      res.json({ success: true, data });
    } catch (err) {
      console.error('[API Error]', err.message);
      const status = err.message?.includes('404') ? 404 : 500;
      res.status(status).json({ success: false, error: 'Request failed. Please try again.' });
    }
  };
}

// ── ANIWATCH API ROUTES ───────────────────────────────────────────────────────

app.get('/api/home', wrap(() => getHome()));

app.get('/api/search', wrap((req) => {
  const q = sanitizeInput(req.query.q);
  if (!q || q.length < 1) throw new Error('Missing query');
  return search(q, validatePage(req.query.page));
}));

app.get('/api/search/suggest', wrap((req) => {
  const q = sanitizeInput(req.query.q);
  if (!q || q.length < 1) throw new Error('Missing query');
  return searchSuggest(q);
}));

app.get('/api/anime/:slug', wrap((req) => {
  const slug = sanitizeSlug(req.params.slug);
  if (!slug) throw new Error('Invalid slug');
  return getAnimeDetail(slug);
}));

app.get('/api/episodes/:animeId', wrap((req) => {
  const id = sanitizeId(req.params.animeId);
  if (!id) throw new Error('Invalid anime ID');
  return getEpisodeList(id);
}));

app.get('/api/servers/:episodeId', wrap((req) => {
  const id = sanitizeId(req.params.episodeId);
  if (!id) throw new Error('Invalid episode ID');
  return getEpisodeServers(id);
}));

app.get('/api/sources/:episodeId', wrap((req) => {
  const id = sanitizeId(req.params.episodeId);
  if (!id) throw new Error('Invalid episode ID');
  const server = parseInt(req.query.server || '1');
  const category = ['sub','dub','raw'].includes(req.query.category) ? req.query.category : 'sub';
  return getEpisodeSources(id, server, category);
}));

app.get('/api/schedule', wrap((req) => {
  const date = sanitizeInput(req.query.date || new Date().toISOString().split('T')[0]);
  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date format');
  return getSchedule(date);
}));

app.get('/api/genre/:genre', wrap((req) => {
  const genre = sanitizeSlug(req.params.genre);
  if (!genre) throw new Error('Invalid genre');
  return getGenre(genre, validatePage(req.query.page));
}));

app.get('/api/category/:name', wrap((req) => {
  const allowed = ['top-airing','most-popular','most-favorite','completed','recently-updated','recently-added','top-upcoming','movie','tv','ova','ona','special'];
  const name = sanitizeSlug(req.params.name);
  if (!name || !allowed.includes(name)) throw new Error('Invalid category');
  return getCategory(name, validatePage(req.query.page));
}));

// ── MAL PROXY ─────────────────────────────────────────────────────────────────
// Proxy MAL requests to keep client secret on server-side only

const MAL_CLIENT_ID = process.env.MAL_CLIENT_ID || '4ae1c521026203f4c8508b62c3b11b0f';
const MAL_CLIENT_SECRET = process.env.MAL_CLIENT_SECRET || '733cd9cd33f715217cf53f4dca492c54c675a30851cd8105ee1c9c3413e175a1';
const MAL_API = 'https://api.myanimelist.net/v2';
const MAL_TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';

// Exchange auth code for tokens
app.post('/api/mal/token', async (req, res) => {
  try {
    const { code, verifier, redirect_uri } = req.body || {};
    if (!code || !verifier || !redirect_uri) {
      return res.status(400).json({ success: false, error: 'Missing params' });
    }

    // Sanitize
    const cleanCode = sanitizeInput(code);
    const cleanVerifier = sanitizeInput(verifier);
    const cleanRedirect = redirect_uri.startsWith('http') ? redirect_uri : '';
    if (!cleanCode || !cleanVerifier || !cleanRedirect) {
      return res.status(400).json({ success: false, error: 'Invalid params' });
    }

    const body = new URLSearchParams({
      client_id: MAL_CLIENT_ID,
      client_secret: MAL_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: cleanCode,
      code_verifier: cleanVerifier,
      redirect_uri: cleanRedirect,
    });

    const response = await fetch(MAL_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) throw new Error(`MAL token error ${response.status}`);
    const data = await response.json();

    // Fetch username too
    const userRes = await fetch(`${MAL_API}/users/@me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const userData = userRes.ok ? await userRes.json() : {};

    res.json({ ...data, username: userData.name });
  } catch (err) {
    console.error('[MAL Token]', err.message);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
});

// Proxy MAL API calls - requires Bearer token from client
app.all('/api/mal/*', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token' });
    }

    // Build MAL API path - strip /api/mal prefix, sanitize
    const malPath = req.path.replace('/api/mal', '').replace(/[^a-zA-Z0-9\/\-_@]/g, '');
    if (!malPath || malPath.includes('..')) {
      return res.status(400).json({ success: false, error: 'Invalid path' });
    }

    const url = new URL(`${MAL_API}${malPath}`);

    // Forward safe query params
    const allowedParams = ['fields','status','sort','limit','offset','q','nsfw'];
    Object.entries(req.query).forEach(([k, v]) => {
      if (allowedParams.includes(k)) url.searchParams.set(k, sanitizeInput(String(v)));
    });

    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('[MAL Proxy]', err.message);
    res.status(500).json({ success: false, error: 'MAL request failed' });
  }
});

// ── SPA FALLBACK ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  // Block path traversal attempts
  if (req.path.includes('..') || req.path.includes('%2e')) {
    return res.status(400).end();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`\nTidalWatch running at http://localhost:${PORT}\n`);
});
