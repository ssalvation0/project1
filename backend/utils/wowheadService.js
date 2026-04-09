const axios = require('axios');

const QUALITY_NAMES = {
  0: 'Poor', 1: 'Common', 2: 'Uncommon',
  3: 'Rare', 4: 'Epic', 5: 'Legendary', 6: 'Artifact'
};

const ARMOR_TYPES = { 1: 'Cloth', 2: 'Leather', 3: 'Mail', 4: 'Plate' };

const CLASS_NAMES = {
  1: 'Warrior', 2: 'Paladin', 3: 'Hunter', 4: 'Rogue', 5: 'Priest',
  6: 'Death Knight', 7: 'Shaman', 8: 'Mage', 9: 'Warlock', 10: 'Monk',
  11: 'Druid', 12: 'Demon Hunter', 13: 'Evoker'
};

const SET_TOOLTIP_BASE  = 'https://nether.wowhead.com/tooltip/transmog-set';
const ITEM_TOOLTIP_BASE = 'https://nether.wowhead.com/tooltip/item';
const MAX_ID = 13500;
const CONCURRENCY = 15;
const REQUEST_DELAY_MS = 30; // tiny delay between launches to be polite

// Map item subclass IDs (item_class=4 Armor) to readable names
const ARMOR_SUBCLASS = { 1: 'Cloth', 2: 'Leather', 3: 'Mail', 4: 'Plate', 5: 'Cosmetic', 6: 'Shield' };

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Fetch a single transmog-set from Wowhead's JSON tooltip endpoint.
 * Returns null for non-existent IDs (404) or invalid responses.
 */
async function fetchOneSet(id) {
  try {
    const r = await axios.get(`${SET_TOOLTIP_BASE}/${id}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 TransmogVault/1.0' },
      validateStatus: s => s === 200 || s === 404,
      timeout: 15000,
    });
    if (r.status !== 200 || !r.data || !r.data.name) return null;

    const d = r.data;

    // Quality from tooltip HTML class: q1=poor … q5=legendary
    let qualityNum = 4; // default Epic
    const m = (d.tooltip || '').match(/class="q(\d)"/);
    if (m) qualityNum = parseInt(m[1], 10);

    // Pieces: completionData is { slot: [itemId, ...] }
    const pieces = [];
    if (d.completionData && typeof d.completionData === 'object') {
      for (const slotIds of Object.values(d.completionData)) {
        if (Array.isArray(slotIds)) {
          for (const itemId of slotIds) {
            if (typeof itemId === 'number' && !pieces.includes(itemId)) pieces.push(itemId);
          }
        }
      }
    }

    return {
      id,
      name: d.name,
      quality: QUALITY_NAMES[qualityNum] || 'Epic',
      armorType: null, // not in tooltip data — derived later from first piece
      classes: ['All'], // refined later from Blizzard item data
      pieces,
      icon: d.icon || null,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch a single item from Wowhead's JSON tooltip endpoint.
 * Returns { id, name, icon, quality, armorType, restrictedClasses } or null.
 */
async function fetchOneItem(id) {
  try {
    const r = await axios.get(`${ITEM_TOOLTIP_BASE}/${id}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 TransmogVault/1.0' },
      validateStatus: s => s === 200 || s === 404,
      timeout: 15000,
    });
    if (r.status !== 200 || !r.data) return null;
    const d = r.data;
    const tooltip = d.tooltip || '';

    // Armor subclass: <!--scstart4:N--> where 4=item_class Armor, N=subclass
    let armorType = null;
    const sc = tooltip.match(/<!--scstart4:(\d+)-->/);
    if (sc) armorType = ARMOR_SUBCLASS[parseInt(sc[1], 10)] || null;

    // Class restrictions: text "Classes: Priest, Mage" inside tooltip
    let restrictedClasses = null;
    const cls = tooltip.match(/Classes:\s*([^<]+)/);
    if (cls) {
      restrictedClasses = cls[1].split(',').map(s => s.trim()).filter(Boolean);
    }

    return {
      id,
      name: d.name || `Item ${id}`,
      icon: d.icon || null,
      quality: d.quality ?? null,
      armorType,
      restrictedClasses,
    };
  } catch {
    return null;
  }
}

/**
 * Iterate IDs 1..MAX_ID via the JSON tooltip endpoint with concurrency.
 * Returns all valid transmog sets found (~3000+ expected).
 */
async function fetchAllTransmogSets() {
  console.log(`🌐 Fetching transmog sets from Wowhead (IDs 1-${MAX_ID}, concurrency ${CONCURRENCY})...`);
  const t0 = Date.now();

  const results = [];
  let processed = 0;
  let found = 0;

  // Worker pool pattern
  let nextId = 1;
  async function worker() {
    while (true) {
      const id = nextId++;
      if (id > MAX_ID) return;
      const set = await fetchOneSet(id);
      processed++;
      if (set) {
        results.push(set);
        found++;
      }
      if (processed % 500 === 0) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
        console.log(`  …processed ${processed}/${MAX_ID} (${found} found, ${elapsed}s)`);
      }
      if (REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Sort by id for stable ordering
  results.sort((a, b) => a.id - b.id);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`✅ Wowhead total: ${results.length} transmog sets (${elapsed}s)`);
  return results;
}

module.exports = { fetchAllTransmogSets, fetchOneSet, fetchOneItem, QUALITY_NAMES, ARMOR_TYPES, CLASS_NAMES };
