const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const blizzardService = require('../utils/blizzardService');

const CACHE_FILE = path.join(__dirname, '../data/blizzard_transmogs_cache.json');

// In-memory storage
let cachedSets = [];
let isHydrating = false;

// Load cache from disk
async function loadCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    cachedSets = JSON.parse(data);
    console.log(`📦 Loaded ${cachedSets.length} sets from Blizzard cache`);
  } catch (error) {
    console.log('📦 No Blizzard cache found, starting fresh');
    cachedSets = [];
  }
}

// Save cache to disk
async function saveCache() {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cachedSets, null, 2));
    console.log(`💾 Saved ${cachedSets.length} sets to disk`);
  } catch (error) {
    console.error('❌ Error saving cache:', error);
  }
}

// Background process to fetch all set details
async function hydrateCache() {
  if (isHydrating) return;
  isHydrating = true;

  try {
    console.log('🔄 Starting Blizzard data hydration...');

    // 1. Get Index
    const index = await blizzardService.getItemSetsIndex();
    const allSets = index.item_sets;
    console.log(`📋 Found ${allSets.length} sets in Blizzard index`);

    // 2. Filter out sets we already have details for
    const existingIds = new Set(cachedSets.map(s => s.id));
    const newSets = allSets.filter(s => !existingIds.has(s.id));

    console.log(`⚡ Need to fetch details for ${newSets.length} new sets`);

    // 3. Fetch details in batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < newSets.length; i += BATCH_SIZE) {
      const batch = newSets.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (setMeta) => {
        try {
          const details = await blizzardService.getItemSet(setMeta.id);

          // Transform to our format
          const transformedSet = {
            id: details.id,
            name: details.name,
            classes: [], // Will need to extract from items or effects
            expansion: 'Unknown', // Blizzard API doesn't always give this directly
            quality: 'Unknown',
            items: details.items ? details.items.map(item => ({
              id: item.id,
              name: item.name
            })) : []
          };

          // Try to infer class from effects or description if possible
          // For now, we'll leave it generic or try to fetch more info later

          cachedSets.push(transformedSet);
        } catch (err) {
          console.error(`⚠️ Failed to fetch set ${setMeta.id}:`, err.message);
        }
      }));

      // Save periodically
      if (i % 20 === 0) await saveCache();

      // Rate limiting pause
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await saveCache();
    console.log('✅ Blizzard hydration complete!');

  } catch (error) {
    console.error('❌ Hydration failed:', error);
  } finally {
    isHydrating = false;
  }
}

// Initialize
loadCache().then(() => {
  hydrateCache();
});

// --- Routes ---

router.get('/', async (req, res) => {
  const { page = 0, limit = 20, search } = req.query;

  let results = cachedSets;

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(s => s.name.toLowerCase().includes(q));
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const start = pageNum * limitNum;
  const paginated = results.slice(start, start + limitNum);

  // Enrich with icons (lazy load)
  const enriched = await Promise.all(paginated.map(async set => {
    let iconUrl = null;
    if (set.items && set.items.length > 0) {
      // Try to get icon for first item
      iconUrl = await blizzardService.getItemMedia(set.items[0].id);
    }
    return { ...set, iconUrl };
  }));

  res.json({
    transmogs: enriched,
    pagination: {
      currentPage: pageNum,
      totalItems: results.length,
      totalPages: Math.ceil(results.length / limitNum)
    }
  });
});

router.get('/:id', async (req, res) => {
  const set = cachedSets.find(s => s.id == req.params.id);
  if (!set) return res.status(404).json({ error: 'Set not found' });

  // Fetch icons for all items
  const itemsWithIcons = await Promise.all((set.items || []).map(async item => {
    const icon = await blizzardService.getItemMedia(item.id);
    return { ...item, iconUrl: icon };
  }));

  res.json({
    ...set,
    items: itemsWithIcons,
    wowheadLink: `https://www.wowhead.com/item-set=${set.id}`
  });
});

router.get('/filters', (req, res) => {
  // Since we don't have good class/expansion data yet from raw API, return basics
  res.json({
    classes: ['All'],
    expansions: ['All'],
    qualities: ['All']
  });
});

router.get('/stats', (req, res) => {
  res.json({
    totalSets: cachedSets.length,
    isHydrating
  });
});

module.exports = router;