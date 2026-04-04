const axios = require('axios');

// Wowhead uses numeric expansion IDs
const EXPANSION_NAMES = {
  0: 'Classic',
  1: 'Burning Crusade',
  2: 'Wrath of the Lich King',
  3: 'Cataclysm',
  4: 'Mists of Pandaria',
  5: 'Warlords of Draenor',
  6: 'Legion',
  7: 'Battle for Azeroth',
  8: 'Shadowlands',
  9: 'Dragonflight',
  10: 'The War Within',
  11: 'Midnight'
};

const QUALITY_NAMES = {
  0: 'Poor', 1: 'Common', 2: 'Uncommon',
  3: 'Rare', 4: 'Epic', 5: 'Legendary', 6: 'Artifact'
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

/**
 * Extract balanced array [ ... ] starting at position `from` in the string
 */
function extractBalancedArray(str, from) {
  let depth = 0;
  let i = from;
  while (i < str.length) {
    if (str[i] === '[') depth++;
    else if (str[i] === ']') {
      depth--;
      if (depth === 0) return str.substring(from, i + 1);
    }
    i++;
  }
  throw new Error('Unbalanced array in HTML');
}

/**
 * Parse Wowhead item-sets list page and extract all sets.
 * Returns array of { id, name, expansion, quality, icon }
 */
async function fetchAllItemSets() {
  console.log('🌐 Fetching item sets list from Wowhead...');
  const response = await axios.get('https://www.wowhead.com/item-sets', {
    headers: HEADERS,
    timeout: 30000,
  });

  const html = response.data;

  // Wowhead embeds: new Listview({..., id: 'lv-itemsets', ..., data: [...], ...})
  // Find 'lv-itemsets' anchor point
  const anchorIdx = html.indexOf('lv-itemsets');
  if (anchorIdx === -1) throw new Error('Could not find lv-itemsets in Wowhead page');

  // Find 'data:' after anchor (within 2000 chars)
  const searchWindow = html.substring(anchorIdx, anchorIdx + 3000);
  const dataKeyMatch = searchWindow.match(/[,{]\s*data\s*:/);
  if (!dataKeyMatch) throw new Error('Could not find data: key in Listview');

  const dataKeyPos = anchorIdx + dataKeyMatch.index + dataKeyMatch[0].length;

  // Skip whitespace to find '['
  let bracketPos = dataKeyPos;
  while (bracketPos < html.length && html[bracketPos] !== '[') bracketPos++;

  const rawArray = extractBalancedArray(html, bracketPos);
  const sets = JSON.parse(rawArray);

  console.log(`✅ Wowhead returned ${sets.length} item sets`);

  return sets.map(s => ({
    id: s.id,
    name: s.name,
    expansion: typeof s.expansion === 'number'
      ? (EXPANSION_NAMES[s.expansion] ?? 'Unknown')
      : 'Unknown',
    quality: typeof s.quality === 'number'
      ? (QUALITY_NAMES[s.quality] ?? 'Unknown')
      : (s.quality || 'Unknown'),
    icon: s.icon || null,
  }));
}

/**
 * Fetch details for a single set from Wowhead tooltip API.
 * Returns { id, name, expansion, quality, items: [{id, name}] } or null
 */
async function fetchSetDetails(setId) {
  try {
    const url = `https://nether.wowhead.com/tooltip/item-set/${setId}?dataEnv=4&locale=0`;
    const response = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    const data = response.data;

    if (!data || !data.name) return null;

    // Items are in data.set.items or data.items depending on version
    const items = (data.set?.items || data.items || []).map(item =>
      typeof item === 'object' ? { id: item.id, name: item.name } : { id: item, name: '' }
    );

    return {
      id: setId,
      name: data.name,
      expansion: typeof data.expansion === 'number'
        ? (EXPANSION_NAMES[data.expansion] ?? 'Unknown')
        : 'Unknown',
      quality: typeof data.quality === 'number'
        ? (QUALITY_NAMES[data.quality] ?? 'Unknown')
        : 'Unknown',
      items,
    };
  } catch {
    return null;
  }
}

module.exports = { fetchAllItemSets, fetchSetDetails, EXPANSION_NAMES };
