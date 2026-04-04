const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const blizzardService = require('../utils/blizzardService');
const { generateSetGuide } = require('../utils/geminiService');
const { fetchAllItemSets, fetchSetDetails } = require('../utils/wowheadService');

const CACHE_FILE = path.join(__dirname, '../data/blizzard_transmogs_cache.json');
const GUIDES_FILE = path.join(__dirname, '../data/guides_cache.json');

// In-memory guide cache: { [setId]: { content, generatedAt } }
let guidesCache = {};

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
  if (id < 249000) return 'The War Within';
  return 'Midnight';
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
    console.log('🔄 Starting hydration (Wowhead + Blizzard)...');

    // ── Step 1: Get full set list from Wowhead (has expansion field!) ──
    let wowheadSets = [];
    try {
      wowheadSets = await fetchAllItemSets();
      console.log(`📋 Wowhead: ${wowheadSets.length} item sets`);
    } catch (err) {
      console.warn(`⚠️ Wowhead fetch failed, falling back to Blizzard index: ${err.message}`);
      // Fallback: use Blizzard index
      const index = await blizzardService.getItemSetsIndex();
      wowheadSets = index.item_sets.map(s => ({ id: s.id, name: s.name, expansion: 'Unknown', quality: 'Unknown', icon: null }));
      console.log(`📋 Blizzard fallback: ${wowheadSets.length} sets`);
    }

    // ── Step 2: Determine which sets need enrichment from Blizzard ──
    const setsToEnrich = wowheadSets.filter(wh => {
      const existing = cachedSets.find(c => c.id === wh.id);
      if (!existing) return true;
      // Re-enrich if items list is missing
      if (!existing.items || existing.items.length === 0) return true;
      return false;
    });

    console.log(`⚡ Need to enrich ${setsToEnrich.length} sets with Blizzard item data`);

    // Update expansion/quality on already-cached sets using Wowhead data
    let updatedFromWowhead = 0;
    for (const wh of wowheadSets) {
      const idx = cachedSets.findIndex(c => c.id === wh.id);
      if (idx >= 0 && wh.expansion !== 'Unknown') {
        cachedSets[idx].expansion = wh.expansion;
        cachedSets[idx].quality = wh.quality !== 'Unknown' ? wh.quality : cachedSets[idx].quality;
        updatedFromWowhead++;
      }
    }
    if (updatedFromWowhead > 0) {
      console.log(`✨ Updated expansion/quality for ${updatedFromWowhead} cached sets from Wowhead`);
      await saveCache();
    }

    // ── Step 3: Enrich new/incomplete sets with Blizzard API ──
    const BATCH_SIZE = 3;
    for (let i = 0; i < setsToEnrich.length; i += BATCH_SIZE) {
      const batch = setsToEnrich.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (wh) => {
        try {
          const details = await blizzardService.getItemSet(wh.id);

          let classes = [];
          let expansion = wh.expansion; // prefer Wowhead expansion
          let quality = wh.quality;

          if (details.items && details.items.length > 0) {
            try {
              const firstItem = await blizzardService.getItem(details.items[0].id);

              // Extract Classes
              if (firstItem.preview_item?.requirements?.playable_classes?.links) {
                classes = firstItem.preview_item.requirements.playable_classes.links.map(l => l.name);
              } else if (firstItem.item_subclass?.name) {
                classes = getClassesForArmorType(firstItem.item_subclass.name);
              }

              // Only use Blizzard expansion if Wowhead didn't give us one
              if (expansion === 'Unknown' && firstItem.id) {
                expansion = inferExpansion(firstItem.id);
              }

              if (quality === 'Unknown' && firstItem.quality) {
                quality = firstItem.quality.name;
              }
            } catch {
              // Keep defaults on item fetch error
            }
          }

          const transformedSet = {
            id: details.id,
            name: details.name || wh.name,
            classes: classes.length > 0 ? classes : ['All'],
            expansion,
            quality,
            items: details.items
              ? details.items.map(item => ({ id: item.id, name: item.name }))
              : [],
          };

          const existingIdx = cachedSets.findIndex(s => s.id === details.id);
          if (existingIdx >= 0) {
            cachedSets[existingIdx] = transformedSet;
          } else {
            cachedSets.push(transformedSet);
          }

        } catch (err) {
          // Blizzard failed — still add set with Wowhead data only
          console.warn(`⚠️ Blizzard enrichment failed for set ${wh.id}: ${err.message}`);
          const existingIdx = cachedSets.findIndex(s => s.id === wh.id);
          if (existingIdx < 0) {
            cachedSets.push({
              id: wh.id,
              name: wh.name,
              classes: ['All'],
              expansion: wh.expansion,
              quality: wh.quality,
              items: [],
            });
          }
        }
      }));

      if (i % 30 === 0 && i > 0) await saveCache();
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    await saveCache();
    console.log(`✅ Hydration complete! Total sets: ${cachedSets.length}`);

  } catch (error) {
    console.error('❌ Hydration failed:', error);
  } finally {
    isHydrating = false;
  }
}

// Load guides cache from disk
async function loadGuidesCache() {
  try {
    const data = await fs.readFile(GUIDES_FILE, 'utf-8');
    guidesCache = JSON.parse(data);
    console.log(`📖 Loaded ${Object.keys(guidesCache).length} guides from cache`);
  } catch {
    guidesCache = {};
  }
}

async function saveGuidesCache() {
  try {
    await fs.writeFile(GUIDES_FILE, JSON.stringify(guidesCache, null, 2));
  } catch (err) {
    console.error('❌ Error saving guides cache:', err);
  }
}

// Initialize
loadCache().then(() => {
  hydrateCache();
});
loadGuidesCache();

// Generate Wowhead model viewer preview URL for a transmog set
function getSetPreviewUrl(setId) {
  const bucket = setId % 256;
  return `https://wow.zamimg.com/modelviewer/live/webthumbs/transmog/1/1/${bucket}/${setId}.jpg`;
}

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
    'The War Within',
    'Midnight'
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
    return { ...set, iconUrl, previewUrl: getSetPreviewUrl(set.id) };
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
    return { ...set, iconUrl, previewUrl: getSetPreviewUrl(set.id) };
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
    previewUrl: getSetPreviewUrl(set.id),
    wowheadLink: `https://www.wowhead.com/item-set=${set.id}`
  });
});

// Guide generation endpoint
router.get('/:id/guide', async (req, res) => {
  const setId = parseInt(req.params.id);
  if (isNaN(setId)) return res.status(400).json({ error: 'Invalid set ID' });

  // Return cached guide if exists
  if (guidesCache[setId]) {
    return res.json({ guide: guidesCache[setId].content, cached: true });
  }

  // Find set in transmog cache
  const set = cachedSets.find(s => s.id === setId);
  if (!set) return res.status(404).json({ error: 'Set not found' });

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'Guide generation not configured' });
  }

  try {
    const content = await generateSetGuide(set);
    guidesCache[setId] = { content, generatedAt: new Date().toISOString() };
    await saveGuidesCache();
    res.json({ guide: content, cached: false });
  } catch (err) {
    console.error(`❌ Guide generation failed for set ${setId}:`, err.message);
    res.status(500).json({ error: 'Failed to generate guide' });
  }
});

module.exports = router;