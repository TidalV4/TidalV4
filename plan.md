# Implementation Plan - TidalWatch

Build a premium anime streaming interface called **TidalWatch** with automated server fallback and a "Tidal Wave" (Geometry Dash) inspired aesthetic.

## 1. Design & Aesthetic
- **Theme**: Cosmic Ocean / Tidal Wave.
- **Color Palette**:
    - `--bg-dark`: `#000b14` (Deep ocean)
    - `--bg-card`: `#001624` (Subtle blue-black)
    - `--accent-cyan`: `#00ffff` (Tidal Wave glow)
    - `--accent-blue`: `#0088ff` (Water flow)
    - `--text-main`: `#ffffff`
    - `--text-dim`: `#a0c0d0`
- **Typography**: `Outfit` or `Inter`.
- **Aesthetics**: Glassmorphism, cyan neon glows, smooth transitions. No generic AI-slop look.

## 2. Core Features
- **Anime Search & Browser**: Fetching list from HiAnime/Anikai.
- **Source Aggregator**:
    - Priority 1: HiAnime (Megacloud/Cloud/VidSrc).
    - Priority 2 (Fallback): Anikai.
- **Video Player**:
    - Toggle between servers.
    - Sub/Dub selection.
    - Hard/Soft sub options (where available).
- **Status API**: Mini-service to check if `hianime.to` or `anikai.to` (or their source servers) are responsive.

## 3. Technology Stack
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+).
- **Backend (Scraper API)**: Node.js with Express.
    - `axios`: For requests.
    - `cheerio`: For HTML parsing.
    - `crypto-js`: For potential decryption of video sources (some use AES).

## 4. Execution Steps
1.  **Project Setup**: Initialize directory and create base files.
2.  **CSS Foundation**: Define variables and global styles.
3.  **Backend API**:
    - Implement search scraper.
    - Implement source scraper (extracting `.m3u8` or source URLs).
    - Implement fallback logic.
4.  **Frontend Implementation**:
    - Header/Navigation.
    - Hero section.
    - Anime grid.
    - Watch page with video player and server selector.
5.  **Polishing**: Add animations and finalize the "Tidal Wave" look.
