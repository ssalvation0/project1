# TransmogVault

A catalog and farming companion for World of Warcraft transmog sets. Browse thousands of appearances pulled live from Wowhead, save favorites, build collections, rate sets, and read pre-generated farming guides for every piece in the game.

---

## Features

- **3,800+ transmog sets** scraped directly from Wowhead, with class restrictions and item details enriched via the Blizzard API
- **Detailed farming guides** for every set — sources, lockouts, token sharing, soloing notes
- **Filters** by class, armor type, source, expansion, quality, and full-text search
- **User accounts** via Supabase — favorites, collections, ratings, and comments
- **Recently viewed** history and patch notes on the home page

## Tech Stack

| Layer       | Used                                                            |
|-------------|-----------------------------------------------------------------|
| Frontend    | React (CRA), TanStack Query, React Router v6, react-markdown    |
| Backend     | Node.js, Express                                                |
| Auth & DB   | Supabase (Postgres + Auth)                                      |
| AI          | Google Gemini (`gemini-2.5-pro`)                                |
| Data source | Wowhead (scraping via Puppeteer) + Blizzard Game Data API       |
| Storage     | Local JSON cache files (no relational DB on the backend)        |

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### 1. Clone and install

```bash
git clone https://github.com/ssalvation0/TransmogVault.git
cd TransmogVault

cd backend && npm install
cd ../frontend && npm install
```

### 2. Run

```bash
# Backend — http://localhost:5001
cd backend && npm run dev

# Frontend — http://localhost:3000
cd frontend && npm start
```

The frontend proxies `/api` requests to the backend automatically.

On first start, the backend hydrates its cache from Wowhead in the background (one-time, takes a few minutes). Once that finishes, you can pre-generate the AI farming guides:

```bash
cd backend && npm run guides
```

This runs at ~40 RPM and takes around 90 minutes for all 3,800 sets. The script is resumable — kill it any time and re-run to continue where it left off.

## Project Structure

```
backend/
  routes/           Express routes (transmogs, comments, ratings, collections)
  utils/            Wowhead scraper, Blizzard client, Gemini service
  scripts/          One-off scripts (guide pre-generation)
  data/             JSON cache (transmog sets + guides)
frontend/
  src/
    pages/          Route-level components (Home, Catalog, TransmogDetail, ...)
    components/     Reusable UI (cards, modals, header, footer)
    contexts/       Auth and Favorites providers
    styles/         Page-specific CSS
```

## API

| Method | Endpoint                       | Description                              |
|--------|--------------------------------|------------------------------------------|
| `GET`  | `/api/transmogs`               | Paginated list with filters and search   |
| `GET`  | `/api/transmogs/filters`       | Distinct values for filter dropdowns     |
| `GET`  | `/api/transmogs/batch?ids=...` | Fetch multiple sets by ID                |
| `GET`  | `/api/transmogs/:id`           | Set details with item icons              |
| `GET`  | `/api/transmogs/:id/guide`     | Farming guide (cached or generated)      |

## Useful Commands

```bash
# Reset the cache and re-hydrate from Wowhead
echo '[]' > backend/data/blizzard_transmogs_cache.json
echo '{}' > backend/data/guides_cache.json

# Inspect cache size
node -e "console.log(require('./backend/data/blizzard_transmogs_cache.json').length)"
node -e "console.log(Object.keys(require('./backend/data/guides_cache.json')).length)"
```

## Notes

- World of Warcraft, transmog set names, and all related imagery are property of Blizzard Entertainment. This project is fan-made and not affiliated with Blizzard.
- Wowhead is the source of the set listings; please be respectful of their servers — the scraper rate-limits itself and only runs on cold cache.
