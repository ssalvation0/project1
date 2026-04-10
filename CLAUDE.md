# TransmogVault — Project Overview for Claude

## What This Is
WoW transmog catalog site. Юзери можуть переглядати transmog sets з усіх доповнень WoW, зберігати в Favorites та Collections, залишати рейтинги й коментарі, читати AI-гайди по кожному сету.

## Stack
- **Frontend**: React (CRA), TanStack Query, React Router v6, Supabase JS, react-helmet-async, react-markdown
- **Backend**: Node.js + Express, no database (JSON file cache)
- **Auth/DB**: Supabase (auth + postgres)
- **AI**: Google Gemini API (`gemini-2.5-pro`)
- **Data source**: Wowhead transmog-sets (scraping), Blizzard API (item details)

## Running the Project
```bash
# Backend (порт 5001)
cd backend && npm run dev

# Frontend (порт 3000, проксує /api → 5001)
cd frontend && npm start

# Генерація гайдів (запускати після гідрації кешу)
cd backend && npm run guides
```

## Key Architecture

### Data Flow
1. На старті сервера `hydrateCache()` в `backend/routes/transmogs.js` запускається фоново:
   - Через **Puppeteer** скрейпить `https://www.wowhead.com/transmog-sets` (Cloudflare blocks axios)
   - Читає `window.g_listviews` (runtime global) — Wowhead віддає **топ 500 popular sets** (server-side cap, no pagination, URL filters не працюють)
   - Кожен сет містить `pieces` (Blizzard item IDs) → enrichment через Blizzard `getItem(pieceId)` для назв предметів і class restrictions
   - **Expansion** виводиться з ID першого piece через `expansionFromItemId()` heuristic (item ID ranges)
   - Зберігає в `backend/data/blizzard_transmogs_cache.json`
2. Гайди генеруються Gemini (`gemini-2.5-pro`) на запит та кешуються в `backend/data/guides_cache.json`
3. Pre-generation всіх гайдів: `npm run guides` (~42 хв при 12 RPM)

### Set IDs — Важливо!
Set IDs в нашій БД = **Wowhead transmog-set IDs** (НЕ Blizzard item-set IDs — це різні ID spaces!).
Wowhead transmog-set ID потрібен для CDN images:
```
https://wow.zamimg.com/modelviewer/live/webthumbs/transmog/1/1/{id%256}/{id}.jpg
```
Wowhead detail link також: `https://www.wowhead.com/transmog-set={id}`

### Expansion derivation
Wowhead listview не повертає expansion. Виводимо з item ID першого piece (`expansionFromItemId()` в `routes/transmogs.js`) — наближений діапазон-based mapping:
- <25k Classic, <35k TBC, <50k WotLK, <78k Cata, <105k MoP, <130k WoD,
- <152k Legion, <175k BfA, <190k SL, <210k DF, <213k TWW, ≥213k Midnight

### Wowhead 500-set cap
Wowhead transmog-sets listview має server-side cap на 500 entries (top popular). Pagination не існує, URL filters (`?filter=ex=N`, `?filter=qu=N`) **не працюють** — фільтри клієнт-сайд. Це означає що в нашому каталозі ~500 найпопулярніших сетів, не всі ~3800.

### API Endpoints (backend port 5001)
- `GET /api/transmogs` — список з пагінацією, фільтрами (search, class, expansion, quality)
- `GET /api/transmogs/filters` — унікальні значення для фільтрів
- `GET /api/transmogs/batch?ids=1,2,3` — кілька сетів по ID
- `GET /api/transmogs/:id` — деталі сету + icons
- `GET /api/transmogs/:id/guide` — AI-гайд (з кешу або генерує)

### Supabase Tables
- `profiles` — `{ id (uuid, FK auth.users), name, avatar_url }`
- `patch_notes` — `{ id, title, content, published_at }`
- `comments` — `{ id, set_id (int), user_id, content, created_at }` + RLS
- `ratings` — `{ id, set_id (int), user_id, rating (1-5), created_at }` + unique(set_id, user_id)
- `collections` — `{ id, user_id, name, set_ids (int[]), created_at }` + RLS

### Frontend Structure
```
src/
  pages/
    Home.js          — hero + patch notes + recently viewed
    Catalog.js       — grid з фільтрами та infinite scroll
    TransmogDetail.js — деталі сету, AI гайд, рейтинг, коментарі
    Favorites.js     — saved favorites (localStorage)
    Collections.js   — список колекцій юзера
    CollectionDetail.js — конкретна колекція з сетами
    Profile.js       — профіль юзера
    Settings.js      — налаштування акаунту
  components/
    AddToCollectionModal.js — модалка збереження в колекцію
    CommentsSection.js      — коментарі під сетом
    RatingWidget.js         — 5-зірковий рейтинг
    TransmogCard.js         — картка сету в каталозі
    Header.js / Footer.js
  contexts/
    AuthContext.js     — Supabase auth + profile
    FavoritesContext.js — favorites в localStorage
```

## Environment Variables

### backend/.env
```
BLIZZARD_CLIENT_ID=...
BLIZZARD_CLIENT_SECRET=...
GEMINI_API_KEY=...
PORT=5001
```

### frontend/.env (або package.json proxy)
```
# proxy в frontend/package.json → http://localhost:5001
```

## Important Notes
- **Deployment**: ще не деплоїться, спочатку треба закінчити всі фічі
- **MongoDB**: видалено повністю, не використовується
- **Comparison feature**: видалено (було, але прибрали як непотрібне)
- **Guide cache**: `guides_cache.json` генерується один раз, кешується назавжди. Для регенерації — очистити файл і перезапустити скрипт
- **Wowhead scraping**: якщо Wowhead заблокує — гідрація падає, сервер підіймається зі старим кешем

## Common Commands
```bash
# Скинути кеш і перегідратувати
echo '[]' > backend/data/blizzard_transmogs_cache.json
echo '{}' > backend/data/guides_cache.json

# Pre-generate гайди (після того як кеш наповнився)
cd backend && npm run guides

# Подивитись скільки сетів в кеші
node -e "const d=require('./backend/data/blizzard_transmogs_cache.json'); console.log(d.length)"

# Подивитись скільки гайдів в кеші
node -e "const d=require('./backend/data/guides_cache.json'); console.log(Object.keys(d).length)"
```
