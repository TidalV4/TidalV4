// ── SECURITY UTILS ────────────────────────────────────────────────────────────
// XSS prevention - never use innerHTML with user content directly
const escape = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Safe attribute setter - prevents attribute injection
const safeAttr = (val) => {
  if (!val) return '';
  return String(val).replace(/['"<>&]/g, '');
};

// Validate anime IDs - only allow alphanumeric + hyphens
const validateId = (id) => {
  if (!id) return null;
  const clean = String(id).replace(/[^a-zA-Z0-9\-]/g, '');
  return clean.length > 0 && clean.length < 200 ? clean : null;
};

// Sanitize URL params to prevent open redirect / injection
const sanitizeParam = (val) => {
  if (!val) return '';
  return String(val).replace(/[<>"'&;]/g, '').slice(0, 200);
};

// ── CONFIG ────────────────────────────────────────────────────────────────────
const CONFIG = {
  API_BASE: window.location.origin,
  MAL_CLIENT_ID: '4ae1c521026203f4c8508b62c3b11b0f',
  MAL_REDIRECT: `${window.location.origin}/mal-callback`,
  MAL_AUTH_URL: 'https://myanimelist.net/v1/oauth2/authorize',
  MAL_API: '/api/mal', // proxied through backend to keep secret safe
};

// ── STATE ─────────────────────────────────────────────────────────────────────
const state = {
  currentPage: null,
  malUser: null,
  watchlist: {},
  searchDebounce: null,
};

// Load persisted state
try {
  const saved = localStorage.getItem('tw_mal_user');
  if (saved) state.malUser = JSON.parse(saved);
  const wl = localStorage.getItem('tw_watchlist');
  if (wl) state.watchlist = JSON.parse(wl);
} catch (_) {}

// ── API CLIENT ────────────────────────────────────────────────────────────────
const api = {
  async get(path, params = {}) {
    const url = new URL(`${CONFIG.API_BASE}${path}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined) url.searchParams.set(sanitizeParam(k), sanitizeParam(v));
    });
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },

  async mal(path, params = {}) {
    const url = new URL(`${CONFIG.API_BASE}/api/mal${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const headers = {};
    if (state.malUser?.access_token) {
      headers['Authorization'] = `Bearer ${state.malUser.access_token}`;
    }
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) throw new Error(`MAL API error ${res.status}`);
    return res.json();
  }
};

// ── ROUTER ────────────────────────────────────────────────────────────────────
const routes = {
  '/': renderHome,
  '/home': renderHome,
  '/search': renderSearch,
  '/anime/:slug': renderAnimeDetail,
  '/watch/:slug': renderWatch,
  '/schedule': renderSchedule,
  '/browse': renderBrowse,
  '/profile': renderProfile,
  '/mal-callback': handleMalCallback,
};

function matchRoute(path) {
  for (const [pattern, handler] of Object.entries(routes)) {
    const regex = new RegExp('^' + pattern.replace(/:([^/]+)/g, '([^/]+)') + '(\\?.*)?$');
    const match = path.match(regex);
    if (match) {
      const keys = [...pattern.matchAll(/:([^/]+)/g)].map(m => m[1]);
      const params = {};
      keys.forEach((k, i) => { params[k] = validateId(match[i + 1]); });
      return { handler, params };
    }
  }
  return null;
}

async function navigate(path, pushState = true) {
  if (pushState) history.pushState({}, '', path);

  const main = document.getElementById('main-view');
  main.innerHTML = '<div class="loading-spinner"></div>';

  const matched = matchRoute(path.split('?')[0]);
  if (!matched) {
    main.innerHTML = `<div class="empty-state"><p>Page not found.</p></div>`;
    return;
  }

  const query = Object.fromEntries(new URLSearchParams(window.location.search));
  try {
    await matched.handler(matched.params, query, main);
  } catch (err) {
    console.error(err);
    main.innerHTML = `<div class="empty-state"><p>Something went wrong. Please try again.</p></div>`;
  }

  updateSidebarActive(path);
}

window.addEventListener('popstate', () => navigate(window.location.pathname + window.location.search, false));

function link(path) {
  return (e) => {
    e.preventDefault();
    navigate(path);
  };
}

// Intercept all anchor clicks within the app
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-nav]');
  if (a) {
    e.preventDefault();
    navigate(a.getAttribute('href'));
  }
});

// ── TOAST ─────────────────────────────────────────────────────────────────────
function toast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── RENDER SHELL ──────────────────────────────────────────────────────────────
function renderShell() {
  document.body.innerHTML = `
    <div class="ocean-bg">
      <div class="wave-layer wave-layer-1">
        <svg viewBox="0 0 1440 180" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="#e8f4fd" d="M0,80 C180,120 360,40 540,80 C720,120 900,40 1080,80 C1260,120 1350,60 1440,80 L1440,180 L0,180 Z"/>
        </svg>
      </div>
      <div class="wave-layer wave-layer-2">
        <svg viewBox="0 0 1440 180" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="#e8f4fd" d="M0,100 C200,60 400,140 600,100 C800,60 1000,140 1200,100 C1320,80 1380,110 1440,100 L1440,180 L0,180 Z"/>
        </svg>
      </div>
      <div class="wave-layer wave-layer-3">
        <svg viewBox="0 0 1440 180" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="#e8f4fd" d="M0,120 C240,80 480,160 720,120 C960,80 1200,160 1440,120 L1440,180 L0,180 Z"/>
        </svg>
      </div>
    </div>

    <div id="app">
      <nav id="navbar">
        <a href="/home" data-nav class="nav-logo">
          <svg class="logo-mark" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 20 C8 12 12 8 16 10 C20 12 22 8 28 10" stroke="#4ab3e8" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            <path d="M2 24 C6 16 10 12 16 14 C22 16 24 12 30 14" stroke="#e8f4fd" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>
            <path d="M6 28 C10 22 14 18 16 20 C18 22 22 16 26 18" stroke="#4ab3e8" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.7"/>
          </svg>
          <span class="logo-text">Tidal<span>Watch</span></span>
        </a>

        <div class="nav-search">
          <input type="text" id="nav-search-input" placeholder="Search anime..." autocomplete="off" spellcheck="false">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <div class="search-dropdown" id="search-dropdown"></div>
        </div>

        <div class="nav-actions">
          <button class="btn-mal-login" id="mal-auth-btn" onclick="handleMalAuth()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span id="mal-auth-label">Connect MAL</span>
          </button>
        </div>
      </nav>

      <div class="layout">
        <aside id="sidebar">
          <div class="sidebar-section">
            <div class="sidebar-label">Menu</div>
            <a href="/home" data-nav class="sidebar-link" data-path="/home">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Home
            </a>
            <a href="/schedule" data-nav class="sidebar-link" data-path="/schedule">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Schedule
            </a>
            <a href="/browse" data-nav class="sidebar-link" data-path="/browse">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Browse
            </a>
            <a href="/profile" data-nav class="sidebar-link" data-path="/profile">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              My List
            </a>
          </div>

          <div class="sidebar-section">
            <div class="sidebar-label">Categories</div>
            <a href="/browse?category=top-airing" data-nav class="sidebar-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Top Airing
            </a>
            <a href="/browse?category=most-popular" data-nav class="sidebar-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Most Popular
            </a>
            <a href="/browse?category=movie" data-nav class="sidebar-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>
              Movies
            </a>
          </div>

          <div class="sidebar-section">
            <div class="sidebar-label">Genres</div>
            <div class="sidebar-genres">
              ${['Action','Adventure','Comedy','Drama','Fantasy','Horror','Isekai','Mecha','Mystery','Romance','Sci-Fi','Slice of Life','Sports','Supernatural','Thriller'].map(g =>
                `<a href="/browse?genre=${g.toLowerCase().replace(/ /g,'-')}" data-nav class="genre-chip">${escape(g)}</a>`
              ).join('')}
            </div>
          </div>
        </aside>

        <main class="main-content" id="main-view">
          <div class="loading-spinner"></div>
        </main>
      </div>
    </div>

    <div id="toast-container"></div>
  `;
}

function updateSidebarActive(path) {
  document.querySelectorAll('.sidebar-link[data-path]').forEach(l => {
    l.classList.toggle('active', l.getAttribute('data-path') === path.split('?')[0]);
  });
}

// ── SEARCH AUTOCOMPLETE ───────────────────────────────────────────────────────
function initSearch() {
  const input = document.getElementById('nav-search-input');
  const dropdown = document.getElementById('search-dropdown');

  input.addEventListener('input', () => {
    clearTimeout(state.searchDebounce);
    const q = input.value.trim();
    if (!q || q.length < 2) { dropdown.classList.remove('open'); return; }

    state.searchDebounce = setTimeout(async () => {
      try {
        const data = await api.get('/api/search/suggest', { q: sanitizeParam(q) });
        if (!data.data?.results?.length) { dropdown.classList.remove('open'); return; }

        dropdown.innerHTML = data.data.results.slice(0, 8).map(r => `
          <a href="/anime/${safeAttr(r.href?.replace('/', ''))}" data-nav class="search-item">
            <img src="${safeAttr(r.img)}" alt="" onerror="this.style.display='none'">
            <div class="si-info">
              <div class="si-title">${escape(r.title)}</div>
              <div class="si-meta">${escape(r.type)} ${r.duration ? '· ' + escape(r.duration) : ''}</div>
            </div>
          </a>
        `).join('');
        dropdown.classList.add('open');
      } catch (_) {}
    }, 280);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      dropdown.classList.remove('open');
      navigate(`/search?q=${encodeURIComponent(sanitizeParam(input.value.trim()))}`);
    }
    if (e.key === 'Escape') dropdown.classList.remove('open');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-search')) dropdown.classList.remove('open');
  });
}

// ── MAL AUTH ──────────────────────────────────────────────────────────────────
function generatePKCE() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '').slice(0, 43);
  sessionStorage.setItem('tw_pkce_verifier', verifier);
  return verifier;
}

function handleMalAuth() {
  if (state.malUser) {
    navigate('/profile');
    return;
  }
  const verifier = generatePKCE();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CONFIG.MAL_CLIENT_ID,
    redirect_uri: CONFIG.MAL_REDIRECT,
    code_challenge: verifier,
    code_challenge_method: 'plain',
    state: crypto.randomUUID(),
  });
  window.location.href = `${CONFIG.MAL_AUTH_URL}?${params}`;
}

async function handleMalCallback(params, query, container) {
  const code = sanitizeParam(query.code || '');
  if (!code) { navigate('/home'); return; }

  container.innerHTML = `<div class="loading-spinner"></div><p style="text-align:center;color:var(--text-muted);margin-top:16px">Connecting to MyAnimeList...</p>`;

  try {
    const verifier = sessionStorage.getItem('tw_pkce_verifier') || '';
    const res = await fetch('/api/mal/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, verifier, redirect_uri: CONFIG.MAL_REDIRECT }),
    });
    const data = await res.json();
    if (data.access_token) {
      state.malUser = data;
      localStorage.setItem('tw_mal_user', JSON.stringify(data));
      updateMalBtn();
      toast('Connected to MyAnimeList', 'success');
      navigate('/profile');
    } else {
      throw new Error('No token');
    }
  } catch (_) {
    toast('MAL authentication failed', 'error');
    navigate('/home');
  }
}

function updateMalBtn() {
  const btn = document.getElementById('mal-auth-btn');
  const label = document.getElementById('mal-auth-label');
  if (!btn) return;
  if (state.malUser) {
    label.textContent = state.malUser.username || 'My Profile';
  } else {
    label.textContent = 'Connect MAL';
  }
}

// ── CARD TEMPLATES ────────────────────────────────────────────────────────────
function animeCard(anime) {
  const href = anime.href || (anime.animeId ? `/${anime.animeId}` : '#');
  const slug = href.startsWith('/') ? href.slice(1) : href;
  const sub = anime.episodes?.sub;
  const dub = anime.episodes?.dub;
  return `
    <a href="/anime/${safeAttr(slug)}" data-nav class="anime-card">
      <div class="card-poster">
        <img class="card-img" src="${safeAttr(anime.img)}" alt="${safeAttr(anime.title)}" loading="lazy" onerror="this.src='/public/img/placeholder.svg'">
        <div class="card-overlay"><div class="card-play-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></div>
        <div class="card-badges">
          ${sub ? `<span class="badge badge-sub">${escape(String(sub))}</span>` : ''}
          ${dub ? `<span class="badge badge-dub">DUB</span>` : ''}
        </div>
      </div>
      <div class="card-info">
        <div class="card-title">${escape(anime.title)}</div>
        <div class="card-meta">${escape(anime.type || '')} ${anime.duration ? '· ' + escape(anime.duration) : ''}</div>
      </div>
    </a>
  `;
}

// ── PAGE: HOME ────────────────────────────────────────────────────────────────
async function renderHome(params, query, container) {
  const { data } = await api.get('/api/home');

  let html = '';

  // Spotlight
  if (data.spotlight?.length) {
    html += `<div class="spotlight" id="spotlight">
      <div class="spotlight-slides">
        ${data.spotlight.slice(0, 9).map((s, i) => `
          <div class="spotlight-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
            <div class="spotlight-bg" style="background-image:url('${safeAttr(s.img)}')"></div>
            <div class="spotlight-overlay"></div>
            <div class="spotlight-overlay-bottom"></div>
            <div class="spotlight-content">
              <div class="spotlight-rank">Spotlight #${escape(String(s.rank))}</div>
              <div class="spotlight-title">${escape(s.title)}</div>
              <div class="spotlight-meta">
                <span class="spotlight-badge">${escape(s.type || 'TV')}</span>
                <span>${escape(s.duration || '')}</span>
                <span>${escape(s.aired || '')}</span>
                ${s.episodes?.sub ? `<span class="badge badge-sub">SUB ${escape(String(s.episodes.sub))}</span>` : ''}
                ${s.episodes?.dub ? `<span class="badge badge-dub">DUB ${escape(String(s.episodes.dub))}</span>` : ''}
              </div>
              <div class="spotlight-desc">${escape(s.desc)}</div>
              <div class="spotlight-actions">
                <a href="/watch/${safeAttr(s.watchUrl?.replace('/', ''))}" data-nav class="btn-primary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Watch Now
                </a>
                <a href="/anime/${safeAttr(s.detailUrl?.replace('/', ''))}" data-nav class="btn-secondary">
                  Details
                </a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="spotlight-nav">
        ${data.spotlight.slice(0, 9).map((_, i) => `<div class="spotlight-dot ${i === 0 ? 'active' : ''}" data-dot="${i}"></div>`).join('')}
      </div>
      <div class="spotlight-arrows">
        <button class="spotlight-arrow" id="spot-prev">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <button class="spotlight-arrow" id="spot-next">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
    </div>`;
  }

  // Trending
  if (data.trending?.length) {
    html += `<div class="section-header"><h2 class="section-title">Trending</h2><div class="section-line"></div><a href="/browse?category=top-airing" data-nav class="view-all">View all</a></div>
    <div class="trending-row">
      ${data.trending.slice(0, 10).map(t => `
        <a href="/anime/${safeAttr(t.href?.replace('/', ''))}" data-nav class="trending-item">
          <span class="trending-num">${String(t.rank).padStart(2, '0')}</span>
          <img class="trending-poster" src="${safeAttr(t.img)}" alt="${safeAttr(t.title)}" loading="lazy">
          <div class="trending-info">
            <div class="trending-title">${escape(t.title)}</div>
          </div>
        </a>
      `).join('')}
    </div>`;
  }

  // Featured 4-col blocks
  if (data.featured) {
    const blocks = Object.entries(data.featured);
    if (blocks.length) {
      html += `<div class="section-header"><h2 class="section-title">Featured</h2><div class="section-line"></div></div>
      <div class="featured-grid">
        ${blocks.slice(0, 4).map(([title, items]) => `
          <div class="featured-block">
            <div class="featured-block-header">${escape(title)}</div>
            <div class="featured-list">
              ${items.slice(0, 5).map(item => `
                <a href="/anime/${safeAttr(item.href?.replace('/', ''))}" data-nav class="featured-item">
                  <img class="featured-poster" src="${safeAttr(item.img)}" alt="${safeAttr(item.title)}" loading="lazy">
                  <div>
                    <div class="featured-title">${escape(item.title)}</div>
                    <div class="featured-sub">${item.episodes?.sub ? 'SUB ' + escape(String(item.episodes.sub)) : ''} ${item.episodes?.dub ? 'DUB ' + escape(String(item.episodes.dub)) : ''}</div>
                  </div>
                </a>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>`;
    }
  }

  // Latest Episodes
  if (data.latestEpisodes?.length) {
    html += `<div class="section-header"><h2 class="section-title">Latest Episodes</h2><div class="section-line"></div><a href="/browse?category=recently-updated" data-nav class="view-all">View all</a></div>
    <div class="card-grid" style="margin-bottom:48px">
      ${data.latestEpisodes.slice(0, 12).map(animeCard).join('')}
    </div>`;
  }

  // Top 10
  if (data.top10) {
    html += `<div class="section-header"><h2 class="section-title">Top 10</h2><div class="section-line"></div></div>
    <div class="top10-tabs">
      <button class="top10-tab active" data-period="today">Today</button>
      <button class="top10-tab" data-period="week">This Week</button>
      <button class="top10-tab" data-period="month">This Month</button>
    </div>
    <div class="top10-list" id="top10-list">
      ${renderTop10List(data.top10.today || [])}
    </div>`;
  }

  // New on TidalWatch
  if (data.newOnAniwatch?.length) {
    html += `<div class="section-header" style="margin-top:48px"><h2 class="section-title">New on TidalWatch</h2><div class="section-line"></div><a href="/browse?category=recently-added" data-nav class="view-all">View all</a></div>
    <div class="card-grid" style="margin-bottom:48px">
      ${data.newOnAniwatch.slice(0, 12).map(animeCard).join('')}
    </div>`;
  }

  container.innerHTML = html;

  // Spotlight logic
  initSpotlight(data.spotlight?.length || 0);

  // Top 10 tabs
  const top10Data = data.top10 || {};
  container.querySelectorAll('.top10-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.top10-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const list = container.querySelector('#top10-list');
      if (list) list.innerHTML = renderTop10List(top10Data[tab.dataset.period] || []);
    });
  });
}

function renderTop10List(items) {
  return items.slice(0, 10).map(item => `
    <a href="/anime/${safeAttr(item.href?.replace('/', ''))}" data-nav class="top10-item">
      <span class="top10-rank">${String(item.rank).padStart(2, '0')}</span>
      <img class="top10-poster" src="${safeAttr(item.img)}" alt="${safeAttr(item.title)}" loading="lazy">
      <div class="top10-info">
        <div class="top10-title">${escape(item.title)}</div>
        <div class="top10-eps">${item.episodes?.sub ? 'SUB ' + escape(String(item.episodes.sub)) : ''} ${item.episodes?.dub ? '· DUB ' + escape(String(item.episodes.dub)) : ''}</div>
      </div>
    </a>
  `).join('');
}

function initSpotlight(total) {
  let current = 0;
  let timer = setInterval(() => advance(1), 5500);

  function advance(dir) {
    current = (current + dir + total) % total;
    updateSpotlight();
  }

  function updateSpotlight() {
    document.querySelectorAll('.spotlight-slide').forEach((s, i) => s.classList.toggle('active', i === current));
    document.querySelectorAll('.spotlight-dot').forEach((d, i) => d.classList.toggle('active', i === current));
  }

  document.getElementById('spot-next')?.addEventListener('click', () => { clearInterval(timer); advance(1); timer = setInterval(() => advance(1), 5500); });
  document.getElementById('spot-prev')?.addEventListener('click', () => { clearInterval(timer); advance(-1); timer = setInterval(() => advance(1), 5500); });
  document.querySelectorAll('.spotlight-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      clearInterval(timer);
      current = parseInt(dot.dataset.dot);
      updateSpotlight();
      timer = setInterval(() => advance(1), 5500);
    });
  });
}

// ── PAGE: SEARCH ──────────────────────────────────────────────────────────────
async function renderSearch(params, query, container) {
  const q = sanitizeParam(query.q || '');
  const page = Math.max(1, parseInt(query.page || '1'));

  container.innerHTML = `
    <div class="search-header">
      <div class="search-query">Results for <span>"${escape(q)}"</span></div>
      <div class="search-meta">Loading...</div>
    </div>
    <div class="loading-spinner"></div>
  `;

  const { data } = await api.get('/api/search', { q, page });

  const filterBar = `
    <div class="filter-bar">
      <select class="filter-select" id="filter-type" onchange="applyFilters()">
        <option value="">All Types</option>
        <option value="TV">TV</option>
        <option value="Movie">Movie</option>
        <option value="OVA">OVA</option>
        <option value="ONA">ONA</option>
        <option value="Special">Special</option>
      </select>
    </div>
  `;

  const results = data.results || [];

  container.innerHTML = `
    <div class="search-header">
      <div class="search-query">Results for <span>"${escape(q)}"</span></div>
      <div class="search-meta">${results.length} results found — Page ${page} of ${data.totalPages || 1}</div>
    </div>
    ${filterBar}
    <div class="card-grid" id="results-grid">
      ${results.length ? results.map(animeCard).join('') : '<div class="empty-state"><p>No results found.</p></div>'}
    </div>
    ${renderPagination(page, data.totalPages || 1, (p) => `/search?q=${encodeURIComponent(q)}&page=${p}`)}
  `;
}

// ── PAGE: ANIME DETAIL ────────────────────────────────────────────────────────
async function renderAnimeDetail(params, query, container) {
  const slug = params.slug;
  if (!slug) { container.innerHTML = '<div class="empty-state"><p>Invalid anime.</p></div>'; return; }

  const { data } = await api.get(`/api/anime/${slug}`);

  // Fetch MAL data if we have user
  let malData = null;
  try {
    if (data.title) {
      const malRes = await api.get('/api/mal/search', { q: sanitizeParam(data.title), limit: 1 });
      malData = malRes.data?.data?.[0]?.node;
    }
  } catch (_) {}

  const inWatchlist = state.watchlist[data.animeId];

  let html = `
    <div class="detail-hero">
      <div class="detail-hero-bg" style="background-image:url('${safeAttr(data.img)}')"></div>
      <div class="detail-hero-overlay"></div>
    </div>

    <div class="detail-body">
      <div class="detail-poster">
        <img src="${safeAttr(data.img)}" alt="${safeAttr(data.title)}">
      </div>
      <div class="detail-info">
        <h1 class="detail-title">${escape(data.title)}</h1>
        ${data.jname ? `<div class="detail-jname">${escape(data.jname)}</div>` : ''}

        <div class="detail-stats">
          ${malData?.mean ? `<div class="stat-pill mal"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${escape(String(malData.mean))} MAL Score</div>` : ''}
          ${data.info?.status ? `<div class="stat-pill">${escape(data.info.status)}</div>` : ''}
          ${data.info?.type || data.rating ? `<div class="stat-pill">${escape(data.info?.type || data.rating || '')}</div>` : ''}
        </div>

        ${data.genres?.length ? `<div class="detail-genres">${data.genres.slice(0, 8).map(g => `<a href="/browse?genre=${safeAttr(g.name?.toLowerCase().replace(/ /g,'-'))}" data-nav class="genre-chip">${escape(g.name)}</a>`).join('')}</div>` : ''}

        <p class="detail-desc">${escape(data.desc || malData?.synopsis || '')}</p>

        <div class="detail-actions">
          <a href="/watch/${safeAttr(slug)}" data-nav class="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Watch Now
          </a>
          <button class="btn-secondary" onclick="toggleWatchlist('${safeAttr(data.animeId)}', '${safeAttr(data.title)}', '${safeAttr(data.img)}')" id="wl-btn">
            ${inWatchlist
              ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polyline points="20 6 9 17 4 12"/></svg> In Watchlist`
              : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add to List`}
          </button>
        </div>
      </div>
    </div>
  `;

  // Meta grid
  const metaEntries = Object.entries(data.info || {}).filter(([k]) => !['description','desc'].includes(k));
  if (metaEntries.length) {
    html += `<div class="detail-meta-grid">
      ${metaEntries.slice(0, 10).map(([k, v]) => `
        <div class="meta-item">
          <div class="meta-label">${escape(k)}</div>
          <div class="meta-value">${escape(String(v))}</div>
        </div>
      `).join('')}
      ${malData ? `
        <div class="meta-item">
          <div class="meta-label">MAL ID</div>
          <div class="meta-value"><a href="https://myanimelist.net/anime/${safeAttr(String(malData.id))}" target="_blank" rel="noopener noreferrer" style="color:var(--current)">${escape(String(malData.id))}</a></div>
        </div>
      ` : ''}
    </div>`;
  }

  // Seasons
  if (data.seasons?.length > 1) {
    html += `<div class="section-header"><h2 class="section-title">Seasons</h2><div class="section-line"></div></div>
    <div class="seasons-row" style="margin-bottom:32px">
      ${data.seasons.map(s => `
        <a href="/anime/${safeAttr(s.href?.replace('/', ''))}" data-nav class="season-card ${s.active ? 'active' : ''}">
          ${s.img ? `<img src="${safeAttr(s.img)}" alt="${safeAttr(s.title)}">` : ''}
          <span class="season-title">${escape(s.title)}</span>
        </a>
      `).join('')}
    </div>`;
  }

  // Episodes section
  html += `<div class="section-header"><h2 class="section-title">Episodes</h2><div class="section-line"></div></div>
  <div id="episode-section"><div class="loading-spinner"></div></div>`;

  container.innerHTML = html;

  // Load episodes async
  try {
    const epsData = await api.get(`/api/episodes/${data.animeId}`);
    const eps = epsData.data?.episodes || [];
    const epSection = container.querySelector('#episode-section');
    if (epSection) {
      epSection.innerHTML = `
        <div class="eps-header">
          <span class="eps-count">${eps.length} Episodes</span>
          <input class="eps-search" type="text" placeholder="Go to episode..." id="ep-jump" oninput="jumpToEp(this.value, '${safeAttr(slug)}', '${safeAttr(data.animeId)}')">
        </div>
        <div class="eps-grid">
          ${eps.map(ep => `
            <a href="/watch/${safeAttr(slug)}?ep=${safeAttr(ep.episodeId)}" data-nav class="ep-btn ${ep.isFiller ? 'filler' : ''}" title="Episode ${ep.number}${ep.title ? ': ' + ep.title : ''}">
              ${escape(String(ep.number))}
            </a>
          `).join('')}
        </div>
      `;
    }
  } catch (_) {
    const epSection = container.querySelector('#episode-section');
    if (epSection) epSection.innerHTML = `<div class="empty-state"><p>Could not load episodes.</p></div>`;
  }
}

// ── PAGE: WATCH ───────────────────────────────────────────────────────────────
async function renderWatch(params, query, container) {
  const slug = params.slug;
  const episodeId = sanitizeParam(query.ep || '');
  if (!slug) { container.innerHTML = '<div class="empty-state"><p>Invalid watch URL.</p></div>'; return; }

  // Load anime detail + episodes in parallel
  const [detailRes, epsRes] = await Promise.all([
    api.get(`/api/anime/${slug}`),
    api.get(`/api/episodes/${slug.split('-').pop()}`),
  ]);

  const anime = detailRes.data;
  const eps = epsRes.data?.episodes || [];
  const firstEp = eps.find(e => e.episodeId === episodeId) || eps[0];

  let serverHtml = '<div class="loading-spinner"></div>';
  let sourceUrl = '';

  container.innerHTML = `
    <div class="watch-layout">
      <div class="player-section">
        <div class="player-container" id="player-container">
          <div class="loading-spinner"></div>
        </div>
        <div class="player-info">
          <div class="player-title">${escape(anime.title)}</div>
          <div class="player-ep-title" id="player-ep-title">${firstEp ? `Episode ${firstEp.number}${firstEp.title ? ': ' + escape(firstEp.title) : ''}` : ''}</div>
          <div class="cat-tabs" id="cat-tabs">
            <button class="cat-tab active" data-cat="sub">Sub</button>
            <button class="cat-tab" data-cat="dub">Dub</button>
          </div>
          <div class="server-label">Servers</div>
          <div class="server-tabs" id="server-tabs">${serverHtml}</div>
        </div>
      </div>
      <div class="watch-sidebar">
        <div class="watch-eps-list">
          <div class="wl-header">Episodes <span style="color:var(--text-muted);font-weight:400;font-size:12px">(${eps.length})</span></div>
          <div class="wl-body">
            ${eps.map(ep => `
              <a href="/watch/${safeAttr(slug)}?ep=${safeAttr(ep.episodeId)}" data-nav class="wl-item ${ep.episodeId === (firstEp?.episodeId || '') ? 'active' : ''}">
                <span class="wl-num">${ep.number}</span>
                <span class="wl-title">${ep.title ? escape(ep.title) : `Episode ${ep.number}`}</span>
                ${ep.isFiller ? '<span class="wl-filler">filler</span>' : ''}
              </a>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Load servers for first episode
  if (firstEp?.episodeId) {
    loadServers(firstEp.episodeId, 'sub', container);
  }

  // Scroll active episode into view
  setTimeout(() => {
    const active = container.querySelector('.wl-item.active');
    active?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 100);

  // Cat tab switching
  container.querySelectorAll('.cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (firstEp?.episodeId) loadServers(firstEp.episodeId, tab.dataset.cat, container);
    });
  });
}

async function loadServers(episodeId, category, container) {
  const serverTabs = container.querySelector('#server-tabs');
  if (!serverTabs) return;
  serverTabs.innerHTML = '<div class="loading-spinner" style="margin:10px auto;width:20px;height:20px"></div>';

  try {
    const { data } = await api.get(`/api/servers/${episodeId}`);
    const servers = data[category] || [];

    if (!servers.length) {
      serverTabs.innerHTML = `<span style="color:var(--text-muted);font-size:13px">No ${escape(category)} servers available.</span>`;
      return;
    }

    serverTabs.innerHTML = servers.map((s, i) => `
      <button class="server-btn ${i === 0 ? 'active' : ''}" data-server-id="${safeAttr(s.serverId)}" data-category="${safeAttr(category)}">
        ${escape(s.serverName)}
      </button>
    `).join('');

    serverTabs.querySelectorAll('.server-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        serverTabs.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadPlayer(episodeId, btn.dataset.serverId, btn.dataset.category, container);
      });
    });

    // Auto-load first server
    loadPlayer(episodeId, servers[0].serverId, category, container);
  } catch (_) {
    serverTabs.innerHTML = `<span style="color:var(--danger);font-size:13px">Failed to load servers.</span>`;
  }
}

async function loadPlayer(episodeId, serverId, category, container) {
  const playerContainer = container.querySelector('#player-container');
  if (!playerContainer) return;
  playerContainer.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const { data } = await api.get(`/api/sources/${episodeId}`, { server: serverId, category });
    if (data?.link) {
      playerContainer.innerHTML = `<iframe src="${safeAttr(data.link)}" allowfullscreen allow="autoplay; fullscreen"></iframe>`;
    } else if (data?.sources?.[0]?.url) {
      // HLS source — use native or fallback
      const src = safeAttr(data.sources[0].url);
      playerContainer.innerHTML = `
        <video controls autoplay style="width:100%;height:100%;background:#000">
          <source src="${src}" type="application/x-mpegURL">
          Your browser doesn't support HLS playback.
        </video>
      `;
    } else {
      playerContainer.innerHTML = `<div class="empty-state" style="padding:40px"><p>Stream unavailable.</p></div>`;
    }
  } catch (_) {
    playerContainer.innerHTML = `<div class="empty-state" style="padding:40px"><p>Failed to load stream.</p></div>`;
  }
}

// ── PAGE: SCHEDULE ────────────────────────────────────────────────────────────
async function renderSchedule(params, query, container) {
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i - 3);
    return d.toISOString().split('T')[0];
  });

  const activeDate = sanitizeParam(query.date || dates[3]);

  let html = `
    <div class="section-header"><h2 class="section-title">Schedule</h2><div class="section-line"></div></div>
    <div class="schedule-wrapper">
      <div class="schedule-date-nav">
        ${dates.map(d => {
          const label = d === today.toISOString().split('T')[0] ? 'Today' : new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
          return `<button class="schedule-date-btn ${d === activeDate ? 'active' : ''}" data-date="${safeAttr(d)}">${escape(label)}</button>`;
        }).join('')}
      </div>
      <div class="schedule-list" id="schedule-list"><div class="loading-spinner"></div></div>
    </div>
  `;

  container.innerHTML = html;

  async function loadSchedule(date) {
    const list = container.querySelector('#schedule-list');
    if (!list) return;
    list.innerHTML = '<div class="loading-spinner"></div>';
    try {
      const { data } = await api.get('/api/schedule', { date: sanitizeParam(date) });
      const items = data.schedule || [];
      list.innerHTML = items.length
        ? items.map(item => `
            <a href="/anime/${safeAttr(item.href?.replace('/', ''))}" data-nav class="schedule-item">
              <span class="schedule-time">${escape(item.time)}</span>
              <span class="schedule-title">${escape(item.title)}</span>
              <span class="schedule-ep">${escape(item.episode)}</span>
            </a>
          `).join('')
        : '<div class="empty-state"><p>No schedule for this date.</p></div>';
    } catch (_) {
      list.innerHTML = '<div class="empty-state"><p>Failed to load schedule.</p></div>';
    }
  }

  loadSchedule(activeDate);

  container.querySelectorAll('.schedule-date-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.schedule-date-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadSchedule(btn.dataset.date);
    });
  });
}

// ── PAGE: BROWSE ──────────────────────────────────────────────────────────────
async function renderBrowse(params, query, container) {
  const category = sanitizeParam(query.category || 'top-airing');
  const genre = sanitizeParam(query.genre || '');
  const page = Math.max(1, parseInt(query.page || '1'));

  const categories = [
    { id: 'top-airing', label: 'Top Airing' },
    { id: 'most-popular', label: 'Most Popular' },
    { id: 'most-favorite', label: 'Most Favorite' },
    { id: 'recently-updated', label: 'Recently Updated' },
    { id: 'recently-added', label: 'Recently Added' },
    { id: 'top-upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
    { id: 'movie', label: 'Movies' },
    { id: 'tv', label: 'TV Series' },
    { id: 'ova', label: 'OVA' },
    { id: 'ona', label: 'ONA' },
    { id: 'special', label: 'Specials' },
  ];

  const title = genre
    ? genre.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : categories.find(c => c.id === category)?.label || 'Browse';

  let html = `
    <div class="browse-header">
      <h1 class="browse-title">${escape(title)}</h1>
    </div>
    <div class="browse-category-tabs">
      ${categories.map(c => `
        <a href="/browse?category=${safeAttr(c.id)}" data-nav class="cat-pill ${c.id === category && !genre ? 'active' : ''}">${escape(c.label)}</a>
      `).join('')}
    </div>
    <div id="browse-grid"><div class="loading-spinner"></div></div>
  `;

  container.innerHTML = html;

  try {
    const endpoint = genre ? `/api/genre/${genre}` : `/api/category/${category}`;
    const { data } = await api.get(endpoint, { page });
    const items = data.results || [];
    const grid = container.querySelector('#browse-grid');
    if (grid) {
      grid.innerHTML = items.length
        ? `<div class="card-grid">${items.map(animeCard).join('')}</div>${renderPagination(page, data.totalPages || 1, (p) => `/browse?${genre ? 'genre=' + encodeURIComponent(genre) : 'category=' + encodeURIComponent(category)}&page=${p}`)}`
        : '<div class="empty-state"><p>Nothing found.</p></div>';
    }
  } catch (_) {
    const grid = container.querySelector('#browse-grid');
    if (grid) grid.innerHTML = '<div class="empty-state"><p>Failed to load.</p></div>';
  }
}

// ── PAGE: PROFILE ─────────────────────────────────────────────────────────────
async function renderProfile(params, query, container) {
  if (!state.malUser) {
    container.innerHTML = `
      <div class="empty-state" style="padding:80px">
        <p style="font-size:18px;margin-bottom:20px;color:var(--text-secondary)">Connect your MyAnimeList account to sync your watchlist.</p>
        <button class="btn-primary" onclick="handleMalAuth()">Connect MAL Account</button>
      </div>
    `;
    return;
  }

  let malProfile = null;
  try {
    const r = await api.mal('/users/@me', { fields: 'anime_statistics' });
    malProfile = r;
  } catch (_) {}

  const watchlistItems = Object.values(state.watchlist);

  const tabs = ['Watching', 'Plan to Watch', 'Completed', 'On Hold', 'Dropped'];

  container.innerHTML = `
    <div class="profile-hero">
      <img class="profile-avatar-lg" src="${safeAttr(malProfile?.picture || '')}" alt="${safeAttr(state.malUser?.username || 'User')}" onerror="this.src=''">
      <div>
        <div class="profile-name">${escape(malProfile?.name || state.malUser?.username || 'Anime Fan')}</div>
        <div class="profile-handle">Connected via MyAnimeList</div>
        <div class="profile-stats">
          <div class="profile-stat"><div class="label">Watching</div><div class="value">${escape(String(malProfile?.anime_statistics?.num_watching || 0))}</div></div>
          <div class="profile-stat"><div class="label">Completed</div><div class="value">${escape(String(malProfile?.anime_statistics?.num_completed || 0))}</div></div>
          <div class="profile-stat"><div class="label">Plan to Watch</div><div class="value">${escape(String(malProfile?.anime_statistics?.num_plan_to_watch || 0))}</div></div>
          <div class="profile-stat"><div class="label">Days Watched</div><div class="value">${escape(String(parseFloat(malProfile?.anime_statistics?.num_days_watched || 0).toFixed(1)))}</div></div>
        </div>
      </div>
      <div style="margin-left:auto">
        <button class="btn-secondary" onclick="logoutMal()">Disconnect MAL</button>
      </div>
    </div>

    <div class="watchlist-tabs">
      <button class="wt-tab active" data-tab="local">Local Watchlist (${watchlistItems.length})</button>
      <button class="wt-tab" data-tab="mal">MAL List</button>
    </div>

    <div id="profile-content">
      ${watchlistItems.length
        ? `<div class="watchlist-grid">${watchlistItems.map(item => animeCard(item)).join('')}</div>`
        : '<div class="empty-state"><p>No anime in your local list yet.</p></div>'}
    </div>
  `;

  container.querySelectorAll('.wt-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      container.querySelectorAll('.wt-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const content = container.querySelector('#profile-content');
      if (tab.dataset.tab === 'local') {
        const items = Object.values(state.watchlist);
        content.innerHTML = items.length
          ? `<div class="watchlist-grid">${items.map(animeCard).join('')}</div>`
          : '<div class="empty-state"><p>No anime in your local list yet.</p></div>';
      } else {
        content.innerHTML = '<div class="loading-spinner"></div>';
        try {
          const r = await api.mal('/users/@me/animelist', { status: 'watching', limit: 100, fields: 'list_status,main_picture,num_episodes' });
          const malItems = r.data || [];
          content.innerHTML = malItems.length
            ? `<div class="watchlist-grid">${malItems.map(entry => `
                <a href="/anime/${safeAttr(String(entry.node.id))}" data-nav class="anime-card">
                  <div class="card-poster">
                    <img class="card-img" src="${safeAttr(entry.node.main_picture?.medium || '')}" alt="${safeAttr(entry.node.title)}" loading="lazy">
                    <div class="card-overlay"><div class="card-play-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></div>
                  </div>
                  <div class="card-info">
                    <div class="card-title">${escape(entry.node.title)}</div>
                    <div class="card-meta">${escape(entry.list_status?.status?.replace(/_/g,' ') || '')}</div>
                  </div>
                </a>
              `).join('')}</div>`
            : '<div class="empty-state"><p>No anime in your MAL list.</p></div>';
        } catch (_) {
          content.innerHTML = '<div class="empty-state"><p>Could not load MAL list.</p></div>';
        }
      }
    });
  });
}

// ── WATCHLIST ─────────────────────────────────────────────────────────────────
window.toggleWatchlist = function(id, title, img) {
  if (!id) return;
  if (state.watchlist[id]) {
    delete state.watchlist[id];
    toast('Removed from watchlist');
  } else {
    state.watchlist[id] = { animeId: id, title, img, href: `/${id}`, episodes: {} };
    toast('Added to watchlist', 'success');
  }
  try { localStorage.setItem('tw_watchlist', JSON.stringify(state.watchlist)); } catch (_) {}
  const btn = document.getElementById('wl-btn');
  if (btn) {
    const inList = !!state.watchlist[id];
    btn.innerHTML = inList
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polyline points="20 6 9 17 4 12"/></svg> In Watchlist`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add to List`;
  }
};

window.logoutMal = function() {
  state.malUser = null;
  localStorage.removeItem('tw_mal_user');
  updateMalBtn();
  toast('Disconnected from MAL');
  navigate('/home');
};

window.handleMalAuth = handleMalAuth;

// ── PAGINATION ────────────────────────────────────────────────────────────────
function renderPagination(current, total, hrefFn) {
  if (total <= 1) return '';
  const pages = [];
  const range = 2;
  for (let i = Math.max(1, current - range); i <= Math.min(total, current + range); i++) pages.push(i);

  return `<div class="pagination">
    <button class="page-btn" ${current <= 1 ? 'disabled' : ''} onclick="navigate('${hrefFn(current - 1)}')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    ${current > 3 ? `<button class="page-btn" onclick="navigate('${hrefFn(1)}')">1</button><span style="color:var(--text-muted);padding:0 6px">...</span>` : ''}
    ${pages.map(p => `<button class="page-btn ${p === current ? 'active' : ''}" onclick="navigate('${hrefFn(p)}')">${p}</button>`).join('')}
    ${current < total - 2 ? `<span style="color:var(--text-muted);padding:0 6px">...</span><button class="page-btn" onclick="navigate('${hrefFn(total)}')">${total}</button>` : ''}
    <button class="page-btn" ${current >= total ? 'disabled' : ''} onclick="navigate('${hrefFn(current + 1)}')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  </div>`;
}

window.navigate = navigate;

// ── INIT ──────────────────────────────────────────────────────────────────────
renderShell();
updateMalBtn();
initSearch();
navigate(window.location.pathname + window.location.search, false);
