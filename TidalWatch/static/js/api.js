const API_BASE = 'http://localhost:3000/api';

const TidalWatch = {
    async getTrending() {
        const res = await fetch(`${API_BASE}/trending`);
        return res.json();
    },

    async search(query) {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        return res.json();
    },

    async getServers(animeId) {
        const res = await fetch(`${API_BASE}/servers/${animeId}`);
        return res.json();
    },

    async getSource(serverId) {
        const res = await fetch(`${API_BASE}/sources/${serverId}`);
        return res.json();
    },

    async getStatus() {
        const res = await fetch(`${API_BASE}/status`);
        return res.json();
    }
};
