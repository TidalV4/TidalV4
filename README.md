# TidalWatch

Anime streaming site. Tidal Wave (Geometry Dash) themed — deep ocean blue, white foam, Syne + DM Sans typography.

Powered by: AniWatch scraper + MyAnimeList API.

## Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JS SPA (no framework, no build step)
- **Scraper**: Cheerio + Axios
- **Auth**: MAL OAuth2 with PKCE

## Setup

```bash
npm install
npm start
```

Runs at `http://localhost:4000`

## Pages

| Page | Route |
|------|-------|
| Home | `/home` |
| Search | `/search?q=naruto` |
| Anime Detail | `/anime/one-piece-100` |
| Watch | `/watch/one-piece-100?ep={episodeId}` |
| Schedule | `/schedule` |
| Browse | `/browse?category=top-airing` |
| Browse Genre | `/browse?genre=action` |
| Profile / Watchlist | `/profile` |
| MAL Callback | `/mal-callback` |

## MAL Integration

- Uses PKCE (no client secret exposed to browser)
- Client secret proxied through backend only
- Token stored in localStorage
- Syncs watchlist status, profile stats

### MAL App Setup

1. Go to https://myanimelist.net/apiconfig
2. Set redirect URL to: `http://localhost:4000/mal-callback`
3. Client ID is already set in code

## Security

- All user inputs sanitized before use (XSS prevention)
- No innerHTML with unsanitized content
- Path traversal blocked in API routes
- Input whitelisted for types, categories, dates
- Rate limiting: 120 req/min per IP
- CSP headers set
- MAL client secret never sent to browser

## Environment Variables (optional)

```
MAL_CLIENT_ID=4ae1c521026203f4c8508b62c3b11b0f
MAL_CLIENT_SECRET=733cd9cd33f715217cf53f4dca492c54c675a30851cd8105ee1c9c3413e175a1
PORT=4000
```

## Notes on Episode Sources

The `/api/sources/:episodeId` endpoint depends on AniWatch's stream infrastructure. If it returns:
- `link` — an embed URL (use in iframe)
- `sources[].url` — a `.m3u8` HLS URL (use with HLS.js for best compatibility)

For full HLS support add HLS.js:
```html
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
```

Then in `loadPlayer()` replace the `<video>` block with:
```js
const video = document.createElement('video');
const hls = new Hls();
hls.loadSource(src);
hls.attachMedia(video);
```

## Deployment

Works on Vercel, Railway, Render, or any Node host.
Set env vars for MAL credentials in production.
