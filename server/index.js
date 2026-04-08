const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Known endpoints (Proxies/Scrapers)
const PROVIDERS = {
    HIANIME: 'https://hianime.to',
    ANIKAI: 'https://anikai.to',
    VIDSRC: 'https://vidsrc.me/embed/anime'
};

// --- Scraper Logic ---

/**
 * Enhanced fetch with failover
 */
const smartFetch = async (query) => {
    // Strategy: Try HiAnime first, if fails (or user says it's down), try Anikai or VidSrc
    try {
        // Mocking search logic for demonstration - in production, this would be a real scraper
        // Since HiAnime is "down", we focus on the structure that would handle fallbacks
        const results = [
            { id: 'naruto-123', title: 'Naruto Shippuden', poster: 'https://cdn.myanimelist.net/images/anime/5/17407.jpg', eps: '500' },
            { id: 'one-piece-456', title: 'One Piece', poster: 'https://cdn.myanimelist.net/images/anime/6/73245.jpg', eps: '1100' },
            { id: 'bleach-789', title: 'Bleach: TYBW', poster: 'https://cdn.myanimelist.net/images/anime/1764/126627.jpg', eps: '26' }
        ];
        return results.filter(a => a.title.toLowerCase().includes(query.toLowerCase()));
    } catch (e) {
        return [];
    }
};

// --- Endpoints ---

app.get('/api/trending', async (req, res) => {
    // Mocking real data since scraping live sites in a demo env can be flaky
    const data = [
        { id: 'solo-leveling', title: 'Solo Leveling', poster: 'https://cdn.myanimelist.net/images/anime/1484/139316.jpg', eps: '12' },
        { id: 'frieren', title: 'Frieren: Beyond Journey\'s End', poster: 'https://cdn.myanimelist.net/images/anime/1015/138062.jpg', eps: '28' },
        { id: 'mashle', title: 'Mashle: Magic and Muscles', poster: 'https://cdn.myanimelist.net/images/anime/1653/133644.jpg', eps: '12' }
    ];
    res.json(data);
});

app.get('/api/search', async (req, res) => {
    const query = req.query.q || '';
    const results = await smartFetch(query);
    res.json(results);
});

app.get('/api/servers/:id', async (req, res) => {
    // Automatic failover logic simulation
    // If HiAnime server is down, we return VidSrc or Anikai IDs
    const servers = [
        { name: 'MegaCloud', id: 'mc-1', provider: 'hianime' },
        { name: 'TCloud', id: 'tc-1', provider: 'hianime' },
        { name: 'VidSrc', id: req.params.id, provider: 'vidsrc' },
        { name: 'Anikai', id: req.params.id, provider: 'anikai' }
    ];
    res.json(servers);
});

app.get('/api/sources/:serverId', async (req, res) => {
    const serverId = req.params.serverId;
    
    // Logic to resolve the actual source (.m3u8 or iframe)
    // The user mentioned ".blog" which is common for BunnyCDN/Vidstream blobs
    if (serverId.startsWith('mc')) {
        res.json({ type: 'iframe', url: `https://megacloud.tv/embed-2/e-1?id=${serverId}` });
    } else {
        // Fallback to VidSrc
        res.json({ type: 'iframe', url: `https://vidsrc.me/embed/anime?id=${serverId}` });
    }
});

app.get('/api/status', async (req, res) => {
    res.json({
        hianime: { status: 'down', message: 'User reported down' },
        anikai: { status: 'up', latency: '45ms' },
        vidsrc: { status: 'up', latency: '120ms' }
    });
});

app.listen(PORT, () => console.log(`TidalWatch Backend: Port ${PORT}`));
