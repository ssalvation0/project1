# TransmogVault — Project Overview for Claude

## What This Is
WoW transmog catalog site. Юзери можуть переглядати transmog sets з усіх доповнень WoW, зберігати в Favorites та Collections, залишати рейтинги й коментарі, читати AI-гайди по кожному сету.

## Stack
- **Frontend**: React (CRA), TanStack Query, React Router v6, Supabase JS, react-helmet-async, react-markdown, `@phosphor-icons/react`
- **Backend**: Node.js + Express, no database (JSON file cache)
- **Auth/DB**: Supabase (auth + postgres)
- **AI**: Google Gemini API (`gemini-2.5-pro`)
- **Data source**: Wowhead tooltip JSON endpoint (`nether.wowhead.com/tooltip/transmog-set/{id}`), Blizzard API (item details)

## Running the Project
```bash
# Backend (порт 5001)
cd backend && npm run dev

# Frontend (порт 3000, проксує /api → 5001)
cd frontend && npm start

# Pre-generate гайдів (запускати після гідрації кешу)
cd backend && npm run guides
```

## Key Architecture

### Data Flow
1. На старті сервера `hydrateCache()` в `backend/routes/transmogs.js` запускається фоново:
   - `fetchAllTransmogSets()` в `utils/wowheadService.js` пробігається по ID range 1..13500 через `https://nether.wowhead.com/tooltip/transmog-set/{id}` з concurrency 15
   - Tooltip endpoint віддає JSON з `name`, `icon`, `completionData` (slot → item IDs), `tooltip` HTML (звідки вичитуємо quality class `q1`..`q5`)
   - Для кожного сету збираються `pieces` (Blizzard item IDs) → enrichment через `fetchOneItem` (`nether.wowhead.com/tooltip/item/{id}`) для назв, armor subclass, class restrictions
   - **Expansion** виводиться з ID першого piece через `expansionFromItemId()` (item ID ranges)
   - Зберігається в `backend/data/blizzard_transmogs_cache.json` (~3800 сетів)
2. Гайди **НЕ генеруються on-demand** — тільки з кешу. Endpoint `/api/transmogs/:id/guide` повертає 404 якщо гайду немає в `guides_cache.json`. Pre-generation через `npm run guides` (~40 хв при 40 RPM на paid tier)

### Set IDs — Важливо!
Set IDs в нашій БД = **Wowhead transmog-set IDs** (НЕ Blizzard item-set IDs — це різні ID spaces!).
Wowhead transmog-set ID потрібен для CDN images:
```
https://wow.zamimg.com/modelviewer/live/webthumbs/transmog/1/1/{id%256}/{id}.jpg
```
Wowhead detail link: `https://www.wowhead.com/transmog-set={id}`

### Expansion derivation
Tooltip endpoint не повертає expansion. Виводимо з item ID першого piece (`expansionFromItemId()` в `routes/transmogs.js`) — наближений range-based mapping:
- <25k Classic, <35k TBC, <50k WotLK, <78k Cata, <105k MoP, <130k WoD,
- <152k Legion, <175k BfA, <190k SL, <210k DF, <213k TWW, ≥213k Midnight

Для IDs ≥200k (SL+) heuristic ненадійна — сети можуть показуватись як "Unknown".

### Scraping підхід — важливо
Старий підхід через Puppeteer + `wowhead.com/transmog-sets` листинг мав **500-set server-side cap**. Зараз парсимо через tooltip JSON endpoint — cap-у немає, отримуємо ~3800 сетів. Якщо потрібно додати нові — збільшити `MAX_ID` в `wowheadService.js`.

### API Endpoints (backend port 5001)
- `GET /api/transmogs` — список з пагінацією, фільтрами (search, class, expansion, quality)
- `GET /api/transmogs/filters` — унікальні значення для фільтрів
- `GET /api/transmogs/batch?ids=1,2,3` — кілька сетів по ID
- `GET /api/transmogs/:id` — деталі сету + icons
- `GET /api/transmogs/:id/guide` — AI-гайд **тільки з кешу**, 404 якщо немає

### Supabase Tables
- `profiles` — `{ id (uuid, FK auth.users), name, avatar_url }`
- `comments` — `{ id, set_id (int), user_id, content, created_at }` + RLS
- `ratings` — `{ id, set_id (int), user_id, rating (1-5), created_at }` + unique(set_id, user_id)
- `collections` — `{ id, user_id, name, set_ids (int[]), created_at }` + RLS

### Frontend Structure
```
src/
  pages/
    Home.js          — hero, featured sets, class cards, trending sets
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

### Icons
Використовуємо `@phosphor-icons/react` (не `react-icons/ph` — той несумісний з CRA webpack через exports field). Імпорт: `import { Sword, Heart } from '@phosphor-icons/react'` без префікса `Ph`. `PhLink` конфліктує з React Router `Link` → імпортувати як `Link as LinkIcon`. `PhCoat` в цьому пакеті називається `CoatHanger`.

## Environment Variables

### backend/.env
```
BLIZZARD_CLIENT_ID=...
BLIZZARD_CLIENT_SECRET=...
GEMINI_API_KEY=...        # потрібен тільки для `npm run guides`, не для роботи API
PORT=5001
```

### frontend/.env
```
# proxy в frontend/package.json → http://localhost:5001
```

## Important Notes
- **Deployment**: ще не деплоїться
- **MongoDB / Puppeteer**: видалено повністю, не використовується
- **Comparison feature**: видалено
- **Guide cache**: `guides_cache.json` — single source of truth. Закомічений в репо, друзі отримують через `git pull`. Для регенерації конкретного сету — видалити ключ з JSON і запустити `npm run guides` (скіпає існуючі)
- **On-demand генерація гайдів вимкнена**: Gemini API key потрібен тільки для pre-generation скрипта, backend на запити не ходить у Gemini
- **Tooltip scraping**: якщо Wowhead заблокує / поверне 403 — гідрація падає, сервер підіймається зі старим кешем
- **TransmogDetail CSS**: глобальне правило `p { max-width: 70ch }` в `App.css` впливає на параграфи — в `TransmogDetail.css` є scoped override `max-width: none`

## Common Commands
```bash
# Скинути кеш і перегідратувати
echo '[]' > backend/data/blizzard_transmogs_cache.json
echo '{}' > backend/data/guides_cache.json

# Pre-generate гайди (safe to re-run — скіпає існуючі, checkpoint кожні 25)
cd backend && npm run guides

# Скільки сетів в кеші
node -e "const d=require('./backend/data/blizzard_transmogs_cache.json'); console.log(d.length)"

# Скільки гайдів в кеші
node -e "const d=require('./backend/data/guides_cache.json'); console.log(Object.keys(d).length)"
```
