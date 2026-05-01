# TransmogVault

A catalog and farming companion for World of Warcraft transmog sets. Browse thousands of appearances pulled from Wowhead, save favorites, build collections, rate sets, and read pre-generated farming guides for every piece in the game.

---

## Features

- **3,800+ transmog sets** pulled from Wowhead's tooltip API, with class restrictions and item details enriched via the Blizzard Game Data API
- **AI-generated farming guides** for every cached set — sources, lockouts, token sharing, soloing notes
- **Filters** by class, armor type, source, expansion, quality, and full-text search
- **User accounts** via Supabase — favorites, collections, ratings, and comments
- **Recently viewed** history on the home page

## Tech Stack

| Layer       | Used                                                                |
|-------------|---------------------------------------------------------------------|
| Frontend    | React (CRA), TanStack Query, React Router v6, react-markdown        |
| Backend     | Node.js, Express                                                    |
| Auth & DB   | Supabase (Postgres + Auth + Storage)                                |
| AI          | Google Gemini (`gemini-2.5-pro`) — pre-generation script only       |
| Data source | Wowhead tooltip JSON endpoint + Blizzard Game Data API              |
| Storage     | Local JSON cache files — no relational DB on the backend            |

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Blizzard API client (`client_id` + `client_secret`) from <https://develop.battle.net>
- A Supabase project (for auth + user data)
- _(Optional)_ A Google Gemini API key — only needed if you want to re-generate AI guides

### 1. Clone and install

```bash
git clone https://github.com/ssalvation0/TransmogVault.git
cd TransmogVault

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables

**`backend/.env`**

```env
BLIZZARD_CLIENT_ID=your_blizzard_client_id
BLIZZARD_CLIENT_SECRET=your_blizzard_client_secret
GEMINI_API_KEY=your_gemini_api_key   # only required for `npm run guides`
PORT=5001
```

**`frontend/.env`**

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

`frontend/package.json` already proxies `/api` to `http://localhost:5001`, so no backend URL is needed at build time.

### 3. Run

```bash
# Backend — http://localhost:5001
cd backend && npm run dev

# Frontend — http://localhost:3000
cd frontend && npm start
```

On first start the backend hydrates its transmog cache from Wowhead in the background (one-time, a few minutes). Guides are served **from the cache only** — the API returns `404` for any set that hasn't been pre-generated. To populate guides:

```bash
cd backend && npm run guides
```

At 40 RPM on the paid Gemini tier the full pass over all 3,800 sets takes roughly 40 minutes. The script is resumable and checkpoints every 25 sets — kill it at any time and rerun; already-cached sets are skipped.

## Project Structure

```
backend/
  routes/
    transmogs.js        Single Express router (list/detail/batch/filters/guide)
  utils/
    wowheadService.js   Tooltip-endpoint scraper (no Puppeteer — range 1..13500)
    blizzardService.js  Blizzard Game Data API client (item enrichment)
    geminiService.js    Gemini prompt + call (used by the guides script only)
  scripts/
    generateAllGuides.js  Pre-generation runner (concurrency + checkpointing)
  data/
    blizzard_transmogs_cache.json   ~3,800 sets
    guides_cache.json               AI guides, keyed by set ID

frontend/
  src/
    pages/          Route-level (Home, Catalog, TransmogDetail, Collections, ...)
    components/     Reusable UI (cards, modals, header, footer, widgets)
    contexts/       Auth + Favorites providers
    services/       Supabase client and fetch helpers
    styles/         Page-scoped CSS
```

Comments, ratings, and collections are written directly from the frontend to Supabase (with RLS) — there is no backend route for them.

## API

All endpoints are `GET`.

| Endpoint                       | Description                                                    |
|--------------------------------|----------------------------------------------------------------|
| `/api/transmogs`               | Paginated list with filters (`class`, `expansion`, `quality`, `search`) |
| `/api/transmogs/filters`       | Distinct values for filter dropdowns                           |
| `/api/transmogs/batch?ids=...` | Fetch multiple sets by comma-separated IDs                     |
| `/api/transmogs/:id`           | Set details with item icons                                    |
| `/api/transmogs/:id/guide`     | Farming guide **from cache only** — `404` if not pre-generated |

## Supabase Setup

The frontend expects these tables (with Row Level Security enabled):

- `profiles` — `{ id uuid FK auth.users, name text, avatar_url text, class_preferences text[], style_preferences text[] }`
- `comments` — `{ id, set_id int, user_id uuid, content text, created_at }`
- `ratings` — `{ id, set_id int, user_id uuid, score int, created_at }` with `unique(set_id, user_id)`
- `collections` — `{ id, user_id uuid, name text, set_ids int[], created_at }`

And a Storage bucket named **`avatars`** (public read, authenticated write) — the first path segment on upload is the user's UUID, so a typical INSERT/UPDATE policy is:

```sql
(bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = auth.uid()::text)
```

## Useful Commands

```bash
# Reset caches and re-hydrate from Wowhead / re-run guide generation
echo '[]' > backend/data/blizzard_transmogs_cache.json
echo '{}' > backend/data/guides_cache.json

# Inspect cache sizes
node -e "console.log(require('./backend/data/blizzard_transmogs_cache.json').length, 'sets')"
node -e "console.log(Object.keys(require('./backend/data/guides_cache.json')).length, 'guides')"
```

## Notes

- World of Warcraft, transmog set names, and all related imagery are property of Blizzard Entertainment. This project is fan-made and not affiliated with Blizzard.
- Wowhead is the source of the set listings — the tooltip scraper runs with capped concurrency and only on a cold cache. Please be respectful of their servers.
