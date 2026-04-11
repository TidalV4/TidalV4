import * as cheerio from 'cheerio';
import { client, pageClient } from './client.js';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function parseAnimeCard($, el) {
  const $el = $(el);
  const href = $el.find('a.film-poster-ahref').attr('href') || $el.find('a').first().attr('href') || '';
  const id = href.split('-').pop();
  const title = $el.find('.film-name a').text().trim() || $el.find('.dynamic-name').text().trim();
  const jname = $el.find('.dynamic-name').attr('data-jname') || '';
  const img = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
  const type = $el.find('.fdi-item').first().text().trim();
  const duration = $el.find('.fdi-duration').text().trim();

  const sub = parseInt($el.find('.tick-sub').text().replace(/\D/g, '')) || 0;
  const dub = parseInt($el.find('.tick-dub').text().replace(/\D/g, '')) || 0;
  const eps = parseInt($el.find('.tick-eps').text().replace(/\D/g, '')) || 0;

  return { id, title, jname, href, img, type, duration, episodes: { sub, dub, total: eps } };
}

// ─── HOME PAGE ──────────────────────────────────────────────────────────────

export async function getHome() {
  const { data } = await pageClient.get('/home');
  const $ = cheerio.load(data);

  // Spotlight slider
  const spotlight = [];
  $('.swiper-slide .deslide-item').each((i, el) => {
    const $el = $(el);
    const rank = $el.find('.desi-sub-text').text().replace('#', '').replace('Spotlight', '').trim();
    const title = $el.find('.desi-head-title').text().trim();
    const jname = $el.find('.desi-head-title').attr('data-jname') || '';
    const img = $el.find('.deslide-cover-img img').attr('data-src') || '';
    const desc = $el.find('.desi-description').text().trim();
    const watchUrl = $el.find('a.btn-primary').attr('href') || '';
    const detailUrl = $el.find('a.btn-secondary').attr('href') || '';
    const type = $el.find('.scd-item').eq(0).text().trim();
    const duration = $el.find('.scd-item').eq(1).text().trim();
    const aired = $el.find('.scd-item.m-hide').text().trim();
    const sub = parseInt($el.find('.tick-sub').text().replace(/\D/g, '')) || 0;
    const dub = parseInt($el.find('.tick-dub').text().replace(/\D/g, '')) || 0;
    spotlight.push({ rank: parseInt(rank), title, jname, img, desc, watchUrl, detailUrl, type, duration, aired, episodes: { sub, dub } });
  });

  // Trending
  const trending = [];
  $('#trending-home .swiper-slide').each((i, el) => {
    const $el = $(el);
    const num = $el.find('.number span').text().trim();
    const title = $el.find('.film-title').text().trim();
    const jname = $el.find('.film-title').attr('data-jname') || '';
    const href = $el.find('a.film-poster').attr('href') || '';
    const id = href.split('-').pop();
    const img = $el.find('img').attr('data-src') || '';
    trending.push({ rank: parseInt(num), id, title, jname, href, img });
  });

  // Latest Episodes
  const latestEpisodes = [];
  $('#main-content .block_area_home').first().find('.flw-item').each((i, el) => {
    latestEpisodes.push(parseAnimeCard($, el));
  });

  // New on AniWatch
  const newOnAniwatch = [];
  $('#main-content .block_area_home').eq(1).find('.flw-item').each((i, el) => {
    newOnAniwatch.push(parseAnimeCard($, el));
  });

  // Top Upcoming
  const topUpcoming = [];
  $('#main-content .block_area_home').eq(2).find('.flw-item').each((i, el) => {
    const $el = $(el);
    const title = $el.find('.film-name a').text().trim();
    const href = $el.find('a').first().attr('href') || '';
    const id = href.split('-').pop();
    const img = $el.find('img').attr('data-src') || '';
    const type = $el.find('.fdi-item').first().text().trim();
    const date = $el.find('.fdi-duration').text().trim();
    topUpcoming.push({ id, title, href, img, type, airDate: date });
  });

  // Featured sections (Top Airing, Most Popular, Most Favorite, Latest Completed)
  const featured = {};
  $('#anime-featured .anif-block').each((i, el) => {
    const $el = $(el);
    const section = $el.find('.anif-block-header').text().trim();
    const items = [];
    $el.find('li').each((j, li) => {
      const $li = $(li);
      const title = $li.find('.film-name a').text().trim();
      const href = $li.find('a').first().attr('href') || '';
      const id = href.split('-').pop();
      const img = $li.find('img').attr('data-src') || '';
      const sub = parseInt($li.find('.tick-sub').text().replace(/\D/g, '')) || 0;
      const dub = parseInt($li.find('.tick-dub').text().replace(/\D/g, '')) || 0;
      items.push({ id, title, href, img, episodes: { sub, dub } });
    });
    featured[section] = items;
  });

  // Top 10
  const top10 = { today: [], week: [], month: [] };
  ['#top-viewed-day', '#top-viewed-week', '#top-viewed-month'].forEach((sel, idx) => {
    const key = ['today', 'week', 'month'][idx];
    $(sel).find('li').each((i, el) => {
      const $el = $(el);
      const rank = $el.find('.film-number span').text().trim();
      const title = $el.find('.film-name a').text().trim();
      const href = $el.find('.film-name a').attr('href') || '';
      const id = href.split('-').pop();
      const img = $el.find('img').attr('data-src') || '';
      const sub = parseInt($el.find('.tick-sub').text().replace(/\D/g, '')) || 0;
      const dub = parseInt($el.find('.tick-dub').text().replace(/\D/g, '')) || 0;
      top10[key].push({ rank: parseInt(rank), id, title, href, img, episodes: { sub, dub } });
    });
  });

  return { spotlight, trending, latestEpisodes, newOnAniwatch, topUpcoming, featured, top10 };
}

// ─── SEARCH ─────────────────────────────────────────────────────────────────

export async function search(keyword, page = 1) {
  const { data } = await pageClient.get(`/search`, { params: { keyword, page } });
  const $ = cheerio.load(data);

  const results = [];
  $('.flw-item').each((i, el) => results.push(parseAnimeCard($, el)));

  const totalItems = parseInt($('.pre-pagination').find('[data-page]').last().attr('data-page')) || 1;

  return { keyword, page, totalPages: totalItems, results };
}

// Search suggest (autocomplete)
export async function searchSuggest(keyword) {
  const { data } = await client.get('/ajax/search/suggest', { params: { keyword } });
  const $ = cheerio.load(data.html || '');

  const results = [];
  $('.nav-item').each((i, el) => {
    const $el = $(el);
    const href = $el.find('a').attr('href') || '';
    const id = href.split('-').pop();
    const title = $el.find('.film-name').text().trim();
    const img = $el.find('img').attr('src') || '';
    const type = $el.find('.film-infor span').first().text().trim();
    const duration = $el.find('.film-infor span').last().text().trim();
    results.push({ id, title, href, img, type, duration });
  });

  return { keyword, results };
}

// ─── ANIME DETAIL ───────────────────────────────────────────────────────────

export async function getAnimeDetail(slug) {
  const { data } = await pageClient.get(`/${slug}`);
  const $ = cheerio.load(data);

  const title = $('.anisc-detail .film-name').text().trim();
  const jname = $('.anisc-detail .film-name').attr('data-jname') || '';
  const img = $('.film-poster img').attr('src') || '';
  const desc = $('.film-description .text').text().trim();
  const rating = $('.film-stats .tick-pg').text().trim();

  const info = {};
  $('.anisc-info .item').each((i, el) => {
    const $el = $(el);
    const key = $el.find('.item-head').text().trim().replace(':', '').toLowerCase();
    const val = $el.find('.name, a').map((j, a) => $(a).text().trim()).get().join(', ')
      || $el.find('.item-title').text().trim();
    if (key) info[key] = val;
  });

  const genres = [];
  $('.anisc-info .item').filter((i, el) => $(el).find('.item-head').text().includes('Genres')).find('a').each((i, el) => {
    genres.push({ name: $(el).text().trim(), href: $(el).attr('href') });
  });

  const seasons = [];
  $('.os-list a').each((i, el) => {
    const $el = $(el);
    seasons.push({
      title: $el.find('.title').text().trim(),
      href: $el.attr('href'),
      img: $el.find('img').attr('data-src') || '',
      active: $el.hasClass('active'),
    });
  });

  const related = [];
  $('.block_area-realtime .film-poster').each((i, el) => {
    const href = $(el).find('a').attr('href') || '';
    related.push({ id: href.split('-').pop(), href, img: $(el).find('img').attr('data-src') || '' });
  });

  // Extract anime ID from watch link
  const watchHref = $('.btn-play').attr('href') || '';
  const animeId = watchHref ? watchHref.split('-').pop() : slug.split('-').pop();

  return { animeId, slug, title, jname, img, desc, rating, info, genres, seasons, related };
}

// ─── EPISODE LIST ────────────────────────────────────────────────────────────

export async function getEpisodeList(animeId) {
  const { data } = await client.get(`/ajax/v2/episode/list/${animeId}`);
  const $ = cheerio.load(data.html || '');

  const episodes = [];
  $('.ssl-item.ep-item').each((i, el) => {
    const $el = $(el);
    episodes.push({
      episodeId: $el.attr('data-id'),
      number: parseInt($el.attr('data-number')),
      title: $el.attr('title') || $el.find('.ep-name').text().trim(),
      href: $el.attr('href'),
      isFiller: $el.hasClass('ssl-item-filler'),
    });
  });

  return { animeId, totalEpisodes: episodes.length, episodes };
}

// ─── EPISODE SERVERS ─────────────────────────────────────────────────────────

export async function getEpisodeServers(episodeId) {
  const { data } = await client.get(`/ajax/v2/episode/servers`, { params: { episodeId } });
  const $ = cheerio.load(data.html || '');

  const sub = [], dub = [], raw = [];

  $('.ps_-block.ps_-block-sub .server-item').each((i, el) => {
    const $el = $(el);
    sub.push({ serverId: $el.attr('data-server-id'), serverName: $el.find('a').text().trim() });
  });

  $('.ps_-block.ps_-block-dub .server-item').each((i, el) => {
    const $el = $(el);
    dub.push({ serverId: $el.attr('data-server-id'), serverName: $el.find('a').text().trim() });
  });

  $('.ps_-block.ps_-block-raw .server-item').each((i, el) => {
    const $el = $(el);
    raw.push({ serverId: $el.attr('data-server-id'), serverName: $el.find('a').text().trim() });
  });

  return { episodeId, sub, dub, raw };
}

// ─── EPISODE SOURCES (stream URL) ────────────────────────────────────────────

export async function getEpisodeSources(episodeId, serverId = 1, category = 'sub') {
  const id = `${episodeId}?server=${serverId}&category=${category}`;
  const { data } = await client.get(`/ajax/v2/episode/sources`, { params: { id } });
  // Response contains { type, link, sources, tracks, intro, outro }
  return data;
}

// ─── SCHEDULE ────────────────────────────────────────────────────────────────

export async function getSchedule(date) {
  const tzOffset = new Date().getTimezoneOffset() * -1;
  const { data } = await client.get('/ajax/schedule/list', { params: { tzOffset, date } });
  const $ = cheerio.load(data.html || '');

  const schedule = [];
  $('li').each((i, el) => {
    const $el = $(el);
    const time = $el.find('.time').text().trim();
    const title = $el.find('.film-name').text().trim();
    const jname = $el.find('.film-name').attr('data-jname') || '';
    const href = $el.find('a').attr('href') || '';
    const id = href.split('-').pop();
    const episode = $el.find('.btn-play').text().trim();
    schedule.push({ id, title, jname, href, time, episode });
  });

  return { date, schedule };
}

// ─── GENRE ───────────────────────────────────────────────────────────────────

export async function getGenre(genre, page = 1) {
  const { data } = await pageClient.get(`/genre/${genre}`, { params: { page } });
  const $ = cheerio.load(data);

  const results = [];
  $('.flw-item').each((i, el) => results.push(parseAnimeCard($, el)));

  return { genre, page, results };
}

// ─── CATEGORY PAGES ──────────────────────────────────────────────────────────

export async function getCategory(category, page = 1) {
  // category: top-airing, most-popular, most-favorite, completed, recently-updated, recently-added, top-upcoming, movie, tv, ova, ona, special
  const { data } = await pageClient.get(`/${category}`, { params: { page } });
  const $ = cheerio.load(data);

  const results = [];
  $('.flw-item').each((i, el) => results.push(parseAnimeCard($, el)));

  return { category, page, results };
}
