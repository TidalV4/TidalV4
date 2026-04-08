document.addEventListener('DOMContentLoaded', () => {
    const mainGrid = document.getElementById('main-grid');
    const recentGrid = document.getElementById('recent-grid');
    const playerOverlay = document.getElementById('player-overlay');
    const closePlayer = document.getElementById('close-player');
    const playerRoot = document.getElementById('player-root');
    const serverSwitcher = document.getElementById('server-switcher');
    const searchInput = document.getElementById('anime-query');

    // --- Loading Logic ---

    const renderCard = (anime) => {
        const card = document.createElement('div');
        card.className = 'anime-card';
        card.innerHTML = `
            <div class="poster-wrap">
                <img src="${anime.poster}" alt="${anime.title}">
                <div class="ep-tag">EP ${anime.eps}</div>
            </div>
            <div class="card-info">
                <div class="card-title">${anime.title}</div>
                <div class="card-meta">TV • Sub/Dub</div>
            </div>
        `;
        card.onclick = () => openPlayer(anime);
        return card;
    };

    const loadInitialData = async () => {
        const trending = await TidalWatch.getTrending();
        mainGrid.innerHTML = '';
        trending.forEach(a => mainGrid.appendChild(renderCard(a)));

        // Status Check
        const status = await TidalWatch.getStatus();
        const statusEl = document.getElementById('api-status');
        if (status.hianime.status === 'down') {
            statusEl.innerHTML = `<span class="dot offline"></span> <span>HiAnime: Down (Auto-Failover Active)</span>`;
        }
    };

    // --- Player Logic ---

    const openPlayer = async (anime) => {
        document.getElementById('current-anime-title').innerText = anime.title;
        playerOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Load Servers
        const servers = await TidalWatch.getServers(anime.id);
        renderServers(servers);

        // Auto-load first server
        if (servers.length > 0) {
            loadSource(servers[0].id);
        }
    };

    const renderServers = (servers) => {
        serverSwitcher.innerHTML = '';
        servers.forEach((srv, index) => {
            const btn = document.createElement('button');
            btn.className = `srv-btn ${index === 0 ? 'active' : ''}`;
            btn.innerText = srv.name;
            btn.onclick = () => {
                document.querySelectorAll('.srv-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadSource(srv.id);
            };
            serverSwitcher.appendChild(btn);
        });
    };

    const loadSource = async (serverId) => {
        playerRoot.innerHTML = '<div style="color: #666; padding: 2rem;">Resolving source...</div>';
        const source = await TidalWatch.getSource(serverId);
        if (source.type === 'iframe') {
            playerRoot.innerHTML = `<iframe src="${source.url}" allowfullscreen scrolling="no"></iframe>`;
        } else {
            playerRoot.innerHTML = `<div style="color: #ff4444; padding: 2rem;">Error loading source. Try another server.</div>`;
        }
    };

    closePlayer.onclick = () => {
        playerOverlay.style.display = 'none';
        playerRoot.innerHTML = '';
        document.body.style.overflow = 'auto';
    };

    // --- Search Logic ---

    let searchTimeout;
    searchInput.oninput = (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const query = e.target.value;
            if (query.length < 2) {
                loadInitialData();
                return;
            }
            const results = await TidalWatch.search(query);
            mainGrid.innerHTML = '';
            results.forEach(a => mainGrid.appendChild(renderCard(a)));
        }, 500);
    };

    loadInitialData();
});
