const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const blizzardService = require('../utils/blizzardService');

const CACHE_FILE = path.join(__dirname, '../data/blizzard_transmogs_cache.json');

// In-memory storage
let cachedSets = [];
let isHydrating = false;

// Helper: Infer expansion from Item ID (More reliable than level due to squish)
function inferExpansion(itemId) {
  if (!itemId) return 'Unknown';
  const id = parseInt(itemId);

  if (id < 25000) return 'Classic';
  if (id < 35000) return 'Burning Crusade';
  if (id < 55000) return 'Wrath of the Lich King';
  if (id < 75000) return 'Cataclysm';
  if (id < 100000) return 'Mists of Pandaria';
  if (id < 130000) return 'Warlords of Draenor';
  if (id < 150000) return 'Legion';
  if (id < 180000) return 'Battle for Azeroth';
  if (id < 190000) return 'Shadowlands';
  if (id < 210000) return 'Dragonflight';
  return 'The War Within';
}

// Helper: Map armor type to classes
function getClassesForArmorType(subclass) {
  const map = {
    'Cloth': ['Mage', 'Priest', 'Warlock'],
    'Leather': ['Rogue', 'Druid', 'Monk', 'Demon Hunter'],
    'Mail': ['Hunter', 'Shaman', 'Evoker'],
    'Plate': ['Warrior', 'Paladin', 'Death Knight']
  };
  return map[subclass] || ['All'];
}

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
    // OR sets that have "Unknown" expansion/classes (re-fetch them to improve data)
    const setsToProcess = allSets.filter(s => {
      const existing = cachedSets.find(c => c.id === s.id);
      if (!existing) return true;
      // If we have it but it's incomplete, re-fetch
      if (existing.expansion === 'Unknown' || existing.classes.length === 0 || existing.classes[0] === 'All') return true;
      return false;
    });

    console.log(`⚡ Need to process ${setsToProcess.length} sets`);

    // Shuffle array to get a mix of expansions immediately
    for (let i = setsToProcess.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [setsToProcess[i], setsToProcess[j]] = [setsToProcess[j], setsToProcess[i]];
    }

    // 3. Fetch details in batches
    const BATCH_SIZE = 3;
    for (let i = 0; i < setsToProcess.length; i += BATCH_SIZE) {
      const batch = setsToProcess.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (setMeta) => {
        try {
          // Fetch Set Details
          const details = await blizzardService.getItemSet(setMeta.id);

          let classes = [];
          let expansion = 'Unknown';
          let quality = 'Unknown';

          // Fetch First Item Details to extract metadata
          if (details.items && details.items.length > 0) {
            try {
              const firstItem = await blizzardService.getItem(details.items[0].id);

              // 1. Extract Classes
              // Check explicit requirements first (Tier Sets)
              if (firstItem.preview_item?.requirements?.playable_classes?.links) {
                classes = firstItem.preview_item.requirements.playable_classes.links.map(l => l.name);
              }
              // Fallback to Armor Type (Generic Sets)
              else if (firstItem.item_subclass?.name) {
                classes = getClassesForArmorType(firstItem.item_subclass.name);
              }

              // 2. Extract Expansion from Item ID
              if (firstItem.id) {
                expansion = inferExpansion(firstItem.id);
              }

              // 3. Extract Quality
              if (firstItem.quality) {
                quality = firstItem.quality.name;
              }

            } catch (itemErr) {
              // Ignore item fetch error, keep defaults
            }
          }

          // Transform to our format
          const transformedSet = {
            id: details.id,
            name: details.name,
            classes: classes.length > 0 ? classes : ['All'],
            expansion: expansion,
            quality: quality,
            items: details.items ? details.items.map(item => ({
              id: item.id,
              name: item.name
            })) : []
          };

          // Update or Add to Cache
          const existingIndex = cachedSets.findIndex(s => s.id === details.id);
          if (existingIndex >= 0) {
            cachedSets[existingIndex] = transformedSet;
          } else {
            cachedSets.push(transformedSet);
          }

        } catch (err) {
          console.error(`⚠️ Failed to fetch set ${setMeta.id}:`, err.message);
        }
      }));

      // Save periodically
      if (i % 10 === 0) await saveCache();

      // Rate limiting pause
      await new Promise(resolve => setTimeout(resolve, 1000));
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

router.get('/filters', (req, res) => {
  // Extract unique values from cache
  const classes = new Set(['All']);
  const expansions = new Set(['All']);
  const qualities = new Set(['All']);

  cachedSets.forEach(set => {
    if (set.classes) set.classes.forEach(c => classes.add(c));
    if (set.expansion) expansions.add(set.expansion);
    if (set.quality) qualities.add(set.quality);
  });

  // Chronological order for expansions
  const expansionOrder = [
    'All',
    'Classic',
    'Burning Crusade',
    'Wrath of the Lich King',
    'Cataclysm',
    'Mists of Pandaria',
    'Warlords of Draenor',
    'Legion',
    'Battle for Azeroth',
    'Shadowlands',
    'Dragonflight',
    'The War Within'
  ];

  const sortedExpansions = Array.from(expansions).sort((a, b) => {
    const indexA = expansionOrder.indexOf(a);
    const indexB = expansionOrder.indexOf(b);
    // If not found in order list, put at the end
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  res.json({
    classes: Array.from(classes).sort(),
    expansions: sortedExpansions,
    qualities: Array.from(qualities).sort()
  });
});

// Batch fetch transmogs by IDs
router.get('/batch', async (req, res) => {
  const ids = (req.query.ids || '').split(',').map(id => parseInt(id)).filter(id => !isNaN(id));

  if (ids.length === 0) {
    return res.json([]);
  }

  const results = cachedSets.filter(s => ids.includes(s.id));

  // Enrich with icons
  const enriched = await Promise.all(results.map(async set => {
    let iconUrl = null;
    if (set.items && set.items.length > 0) {
      iconUrl = await blizzardService.getItemMedia(set.items[0].id);
    }
    return { ...set, iconUrl };
  }));

  // Cache for 1 hour
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(enriched);
});

router.get('/', async (req, res) => {
  const {
    page = 0,
    limit = 20,
    search,
    class: classFilter,
    expansion,
    quality
  } = req.query;

  let results = cachedSets;

  // Filtering
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(s => s.name.toLowerCase().includes(q));
  }

  if (classFilter && classFilter !== 'all') {
    results = results.filter(s =>
      s.classes.includes('All') ||
      s.classes.some(c => c.toLowerCase() === classFilter.toLowerCase())
    );
  }

  if (expansion && expansion !== 'all') {
    results = results.filter(s => s.expansion === expansion);
  }

  if (quality && quality !== 'all') {
    results = results.filter(s => s.quality === quality);
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

  // Cache for 5 minutes (list changes slowly)
  res.setHeader('Cache-Control', 'public, max-age=300');
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

  // Cache for 24 hours (details are static)
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.json({
    ...set,
    items: itemsWithIcons,
    wowheadLink: `https://www.wowhead.com/item-set=${set.id}`
  });
});

module.exports = router;