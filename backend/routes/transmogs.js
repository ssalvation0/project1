const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const blizzardService = require('../utils/blizzardService');
const { generateSetGuide } = require('../utils/geminiService');
const { fetchAllTransmogSets, fetchOneItem } = require('../utils/wowheadService');

const CACHE_FILE = path.join(__dirname, '../data/blizzard_transmogs_cache.json');
const GUIDES_FILE = path.join(__dirname, '../data/guides_cache.json');

// In-memory guide cache: { [setId]: { content, generatedAt } }
let guidesCache = {};

// In-memory storage
let cachedSets = [];
let isHydrating = false;

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

// Derive expansion from gear item ID ranges (only valid for IDs < ~200k, i.e. pre-SL gear)
function expansionFromItemId(itemId) {
  if (!itemId || isNaN(itemId)) return null;
  if (itemId < 25000)  return 'Classic';
  if (itemId < 35000)  return 'Burning Crusade';
  if (itemId < 50000)  return 'Wrath of the Lich King';
  if (itemId < 78000)  return 'Cataclysm';
  if (itemId < 105000) return 'Mists of Pandaria';
  if (itemId < 130000) return 'Warlords of Draenor';
  if (itemId < 152000) return 'Legion';
  if (itemId < 175000) return 'Battle for Azeroth';
  if (itemId < 190000) return 'Shadowlands';
  return null; // Modern IDs (190k+) are unreliable — use name matching instead
}

// Detect expansion from set name — handles modern sets where item IDs aren't reliable
function expansionFromSetName(name) {
  const n = name.toLowerCase();
  // Midnight — current expansion (Quel'Thalas, Arathi, Dark Rangers, Void themes)
  if (/moonlit burden|gleaming burden|darkened arathi|misplaced arathi|expeditionary arathi|dark ranger general|dark ranger'?s attire|bones of the bloodhunter|void-bound|void bound|nathreza|aldrachi blasphemer|sin.dorei magister|plate of the holy avenger|midnight|quel.thalas|webbed saronite death knight|unnamed cult priest|alluring call warlock|possessed watcher monk|ashamane.s rebirth druid|ragged harvest golem|dreadsquall|silks of the abyssal|scales of the gold hoarder|ela.lothen/i.test(n)) return 'Midnight';

  // The War Within
  if (/nerub-ar palace|nerub.ar palace|liberation of undermine|undermine revolutionary|delver.s leather|delver.s plate|delver.s mail|delver.s cloth|hallowfall|earthen copper|earthen adventurer|forged aspirant|forged gladiator|plunderlord|plunderstorm|cerulean dredger|harvest golem|tww dungeon|gilnean noble|dalaran defender|consecrated armor|everforged|glyph-etched|rune-branded|chitinoid world|sedimentary world|alighted world|lockstitch world|ironstrike.s lamplighter|cleansing flame.s lamplighter|flamestonge.s lamplighter|warstone.s lamplighter|myconic shell|aegis of hidden stars|chains of the stygian|copper diver suit|thread-bearer.s carapace|machine-warden.s|finery of the assembly|honorary councilmember|earthen adventurer.s copper|voven artisan|spring reveler.s (lavender|cornsilk)|helarjar berserker|vestment of the honored valarjar|battlewraps of the honored valarjar|slumbering caldera|vestments of the nightmare|dashing buccaneer|trapper.s fur|glorious dragonrider/i.test(n)) return 'The War Within';

  // Dragonflight
  if (/vault of the incarnates|aberrus|amirdrassil|the dream.*hope|evoker.*tier|tier.*evoker|dracthyr|fyrakk|sarkareth|raszageth|primalist|dragonscale.*expedition|winter ascent|spring reveler.*(collection|dress|suit)|harvest celebrant|autumnal|blue dragon|ruby life pools|nokhud offensive|algeth.ar academy|brackenhide|halls of valor.*recolor|court of stars.*recolor|sanguine depths.*recolor/i.test(n)) return 'Dragonflight';

  // Shadowlands
  if (/shadowlands|sinful|sinister.*sl|ominous gladiator|cosmic gladiator|vault gladiator|castle nathria|sanctum of domination|sepulcher of the first ones|sepulcher.*first ones|venthyr covenant|kyrian covenant|night fae covenant|necrolord covenant|covenant.*armor|primus|maldraxxi|ardenweald|revendreth|nightfall|shattered ritual|korthia|zereth mortis|deathwalker/i.test(n)) return 'Shadowlands';

  // Battle for Azeroth
  if (/uldir|crucible of storms|eternal palace|ny.alotha|nzoth|kul tiras|zandalar|warfronts|warfront|dread gladiator|dread aspirant|notorious gladiator|sinister aspirant|corrupted gladiator|mechagnome|vulpera|zandalari.*set|kultiran.*set|azerite/i.test(n)) return 'Battle for Azeroth';

  // Legion
  if (/\bantorus\b|tomb of sargeras|nighthold|emerald nightmare|trial of valor|\blegion\b|order hall|\bargus\b|mage tower|burning throne|class hall|illidari|felbat leather|whisperwind|wavemender|sunbreaker|sunguard|dreadwyrm|felshroud/i.test(n)) return 'Legion';

  // Warlords of Draenor
  if (/\bdraenor\b|highmaul|blackrock foundry|hellfire citadel|tanaan|primal gladiator|warmongering|warlords of draenor|felblade armor|hurricane.s eye|deathrattle regalia|stone guard.*wod|battlewrap.*hurricane/i.test(n)) return 'Warlords of Draenor';

  // Mists of Pandaria
  if (/\bpandaria\b|siege of orgrimmar|throne of thunder|heart of fear|mogu.shan|terrace of endless spring|sha of fear|lei shen|\bgarrosh\b|jade forest|shado-pan|kor.kron|tian monastery|sun pearl|robes of quiet reflection|\bmantid\b|\bmogul\b|vestments of serenity|prideful gladiator|tyrannical gladiator|malevolent gladiator|grievous gladiator/i.test(n)) return 'Mists of Pandaria';

  // Cataclysm
  if (/\bfirelands\b|dragon soul|bastion of twilight|blackwing descent|throne of the four winds|deathwing|cho.gall|\bal.akir\b|cataclysmic gladiator|vicious gladiator|ruthless gladiator|cataclysm.*set|fire.*cataclysm/i.test(n)) return 'Cataclysm';

  // Wrath of the Lich King
  if (/icecrown citadel|ulduar|trial of the crusader|\bnaxxramas\b|northrend frozen|thassarian|liadrin.s plate|turalyon.s plate|malfurion.s battlegear|runetotem.s|wrathful gladiator|relentless gladiator|furious gladiator|deadly gladiator|hateful gladiator|savage gladiator|titan.rune|glory of the ulduar|iron council/i.test(n)) return 'Wrath of the Lich King';

  // Burning Crusade
  if (/sunwell|black temple|the eye|tempest keep|serpentshrine|karazhan|gruul|magtheridon|zul.aman|outland|gladiator.s silk.*bc|vindictive gladiator|brutal gladiator|vengeful gladiator|merciless gladiator|tier (4|5|6)\b|corruptor raiment|destroyer armor|absolution regalia|thunderheart|malefic sunwell|gronnstalker|skyshatter sunwell|slayer.s sunwell/i.test(n)) return 'Burning Crusade';

  return null;
}

// Derive source from set name patterns
function sourceFromSetName(name) {
  const n = name.toLowerCase();
  if (/heritage armor/i.test(n)) return 'Heritage';
  if (/\bpvp\b|gladiator|aspirant|combatant|rival|duelist|challenger|enforcer/i.test(n)) return 'PvP';
  if (/trading post|celebration|love witch|spring reveler|darkmoon|winter veil|hallow.?s end|harvest celebrant|murloc romper|snugglefin|buccaneer|swashbuckling|plunderlord|plunderstorm/i.test(n)) return 'Trading Post';
  if (/\bmythic\b|\blheroic\b|\bnormal\b|\blfr\b|raid finder|looking for raid/i.test(n)) return 'Raid';
  if (/dungeon|heroic dungeon/i.test(n)) return 'Dungeon';
  if (/crafted|tailoring|leatherworking|blacksmithing|engineering/i.test(n)) return 'Crafted';
  if (/warfront|warfronts/i.test(n)) return 'Warfront';
  if (/covenant|order hall|class hall/i.test(n)) return 'Covenant';
  // Raid tier sets often have raid name in their name
  if (/vault of the incarnates|aberrus|amirdrassil|castle nathria|sanctum|sepulcher|ny.alotha|eternal palace|uldir|antorus|tomb of sargeras|nighthold|emerald nightmare|hellfire citadel|highmaul|blackrock foundry|siege of orgrimmar|throne of thunder|dragon soul|firelands|icecrown|ulduar|naxxramas|sunwell|black temple|serpentshrine|karazhan|nerub-ar palace|liberation of undermine/i.test(n)) return 'Raid';
  if (/\brecolor\b|\blookalike\b/i.test(n)) return 'World Drop';
  return null;
}

// Detect expansion for a set using all available signals
function detectExpansion(set) {
  const { id, name, items } = set;

  // For pre-Shadowlands sets (IDs 0-2999), items[0].id is a real gear item ID
  if (id < 3000 && items?.length) {
    const firstItemId = items[0]?.id;
    if (firstItemId && firstItemId < 200000) {
      const fromItem = expansionFromItemId(firstItemId);
      if (fromItem) return fromItem;
    }
  }

  // Name-based matching (accurate for all named content)
  const fromName = expansionFromSetName(name);
  if (fromName) return fromName;

  // Transmog-set ID range fallback for modern sets (IDs 11500+)
  // These ranges map to content patches based on observed data
  if (id >= 11500) {
    if (id < 12200) return 'Shadowlands';
    if (id < 12380) return 'Dragonflight';
    if (id < 12507) return 'The War Within';
    // 12507+ is mixed TWW/Midnight — lean towards TWW (still active)
    return 'The War Within';
  }

  // Fallback for old IDs where item-based detection didn't resolve
  if (id < 100)  return 'Classic';
  if (id < 500)  return 'Burning Crusade';
  if (id < 900)  return 'Wrath of the Lich King';
  if (id < 1300) return 'Cataclysm';
  if (id < 1800) return 'Mists of Pandaria';
  if (id < 2300) return 'Warlords of Draenor';
  return 'Battle for Azeroth';
}

// Detect class names mentioned in a set name (e.g. "...Priest Set")
const CLASS_LIST = ['Warrior','Paladin','Hunter','Rogue','Priest','Death Knight','Shaman','Mage','Warlock','Monk','Druid','Demon Hunter','Evoker'];
function classesFromSetName(name) {
  const matches = CLASS_LIST.filter(c => new RegExp(`\\b${c}\\b`, 'i').test(name));
  return matches.length > 0 ? matches : null;
}

// Background hydration: scan all Wowhead transmog-set IDs, enrich via item tooltips
async function hydrateCache() {
  if (isHydrating) return;
  isHydrating = true;

  try {
    console.log('🔄 Starting full hydration from Wowhead...');

    // ── Step 1: Fetch all transmog sets from Wowhead ──
    let wowheadSets = [];
    try {
      wowheadSets = await fetchAllTransmogSets();
    } catch (err) {
      console.error(`❌ Wowhead fetch failed: ${err.message}`);
      return;
    }
    if (wowheadSets.length === 0) {
      console.warn('⚠️ Wowhead returned 0 sets — skipping hydration');
      return;
    }

    // ── Step 2: Enrich all sets (re-run to apply new expansion/source logic) ──
    const existingById = new Map(cachedSets.map(s => [s.id, s]));
    // Only skip sets that already have items AND a valid expansion AND a source field
    const setsToEnrich = wowheadSets.filter(wh => {
      const existing = existingById.get(wh.id);
      return !existing
        || !existing.expansion
        || existing.expansion === 'Unknown'
        || existing.expansion === 'Midnight' // likely misclassified, re-check
        || existing.source === undefined;     // new field — re-enrich if missing
    });

    console.log(`⚡ Enriching ${setsToEnrich.length}/${wowheadSets.length} sets via Wowhead item tooltips...`);

    const enrichedById = new Map();
    const CONCURRENCY = 12;
    let cursor = 0;
    let processed = 0;

    async function worker() {
      while (true) {
        const i = cursor++;
        if (i >= setsToEnrich.length) return;
        const wh = setsToEnrich[i];

        let classes = ['All'];
        let armorType = null;
        let expansion = 'Unknown';

        // Fetch first piece tooltip (only valid for old-era sets with real item IDs)
        // For modern sets (id 11500+), pieces are appearance source IDs — skip item fetch
        if (wh.pieces && wh.pieces.length > 0 && wh.id < 3000) {
          const firstItem = await fetchOneItem(wh.pieces[0]);
          if (firstItem) {
            armorType = firstItem.armorType;
            if (firstItem.restrictedClasses && firstItem.restrictedClasses.length) {
              classes = firstItem.restrictedClasses;
            }
          }
        }

        // Class fallback chain: name match → armor-type map → All
        if (classes[0] === 'All') {
          const fromName = classesFromSetName(wh.name);
          if (fromName) {
            classes = fromName;
          } else if (armorType && ['Cloth','Leather','Mail','Plate'].includes(armorType)) {
            classes = getClassesForArmorType(armorType);
          } else if (wh.armorType && ['Cloth','Leather','Mail','Plate'].includes(wh.armorType)) {
            classes = getClassesForArmorType(wh.armorType);
          }
        }

        const partialSet = {
          id: wh.id,
          name: wh.name,
          classes,
          expansion: 'TMP', // placeholder — computed below after items are set
          quality: wh.quality,
          source: sourceFromSetName(wh.name),
          icon: wh.icon || null,
          // Items: real item IDs for old sets, stubs for modern (appearance source IDs)
          items: (wh.pieces || []).map(pid => ({ id: pid, name: null })),
        };
        // expansion depends on items being set
        partialSet.expansion = detectExpansion(partialSet);
        enrichedById.set(wh.id, partialSet);

        processed++;
        if (processed % 200 === 0) {
          console.log(`  …enriched ${processed}/${setsToEnrich.length}`);
          // Periodic save for resilience
          const partial = wowheadSets
            .map(w => enrichedById.get(w.id) || existingById.get(w.id))
            .filter(Boolean);
          cachedSets = partial;
          await saveCache();
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    // ── Step 3: Build final cache in stable id order ──
    const newCache = [];
    for (const wh of wowheadSets) {
      const enriched = enrichedById.get(wh.id);
      if (enriched) {
        newCache.push(enriched);
      } else {
        const existing = existingById.get(wh.id);
        if (existing) newCache.push(existing);
      }
    }

    cachedSets = newCache;
    await saveCache();
    console.log(`✅ Hydration complete! ${cachedSets.length} transmog sets cached`);

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
  // SKIP_HYDRATE=true — start instantly using only the on-disk cache. Used in
  // dev preview when Wowhead scraping would otherwise burn 30+ s and risk
  // crashing the server on a transient network failure.
  if (process.env.SKIP_HYDRATE === 'true') {
    console.log('⏭  SKIP_HYDRATE=true — serving from cache only, no Wowhead refresh');
    return;
  }
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

  const enriched = results.map(set => ({
    ...set,
    iconUrl: set.icon ? `https://wow.zamimg.com/images/wow/icons/large/${set.icon}.jpg` : null,
    previewUrl: getSetPreviewUrl(set.id),
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
    quality,
    armor,
    source
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

  if (armor && armor !== 'all') {
    results = results.filter(s => s.armorType === armor);
  }

  if (source && source !== 'all') {
    results = results.filter(s => s.source === source);
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const start = pageNum * limitNum;
  const paginated = results.slice(start, start + limitNum);

  const enriched = paginated.map(set => ({
    ...set,
    iconUrl: set.icon ? `https://wow.zamimg.com/images/wow/icons/large/${set.icon}.jpg` : null,
    previewUrl: getSetPreviewUrl(set.id),
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

  // Lazy-load names + icons for all items via Wowhead item tooltip (fast, no Blizzard rate limit)
  const itemsWithIcons = await Promise.all((set.items || []).map(async item => {
    if (item.name && item.iconUrl) return item;
    const tooltipItem = await fetchOneItem(item.id);
    return {
      id: item.id,
      name: tooltipItem?.name || item.name || `Item ${item.id}`,
      iconUrl: tooltipItem?.icon
        ? `https://wow.zamimg.com/images/wow/icons/large/${tooltipItem.icon}.jpg`
        : null,
    };
  }));

  // Cache for 24 hours (details are static)
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.json({
    ...set,
    items: itemsWithIcons,
    previewUrl: getSetPreviewUrl(set.id),
    wowheadLink: `https://www.wowhead.com/transmog-set=${set.id}`
  });
});

// Guide endpoint — cache-only. All guides are pre-generated via
// `npm run guides`. On-the-fly generation is intentionally disabled so
// clients never see minute-long hangs waiting for Gemini.
router.get('/:id/guide', (req, res) => {
  const setId = parseInt(req.params.id);
  if (isNaN(setId)) return res.status(400).json({ error: 'Invalid set ID' });

  if (guidesCache[setId]) {
    return res.json({ guide: guidesCache[setId].content, cached: true });
  }

  return res.status(404).json({ error: 'Guide not available' });
});

module.exports = router;