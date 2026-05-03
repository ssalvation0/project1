/**
 * Pure functions to classify a transmog set's expansion and source.
 *
 * Why these live in their own module:
 *   - Used by both the route hydration path AND the one-shot reclassify script
 *     (scripts/reclassifySets.js), so they can't sit inside routes/transmogs.js
 *   - Pure: no I/O, no global state — easy to test and re-run safely
 */

// ── Item-ID ranges (real Blizzard item IDs) ──────────────────────────────
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
  return null; // 190k+ unreliable
}

// ── Name-pattern matching ────────────────────────────────────────────────
// Order matters: most-recent first so "midnight" beats "shadowlands" etc.
function expansionFromSetName(name) {
  if (!name) return null;
  const n = name.toLowerCase();

  // Midnight (current expansion themes — Quel'Thalas, void, dark rangers)
  if (/moonlit burden|gleaming burden|darkened arathi|misplaced arathi|expeditionary arathi|dark ranger|bones of the bloodhunter|void.bound|nathreza|aldrachi blasphemer|sin.dorei|plate of the holy avenger|midnight|quel.thalas|dreadsquall|silks of the abyssal|scales of the gold hoarder|ela.lothen/i.test(n)) return 'Midnight';

  // The War Within
  if (/nerub.ar palace|liberation of undermine|undermine revolutionary|delver.s leather|delver.s plate|delver.s mail|delver.s cloth|hallowfall|earthen copper|earthen adventurer|forged aspirant|forged gladiator|plunderlord|plunderstorm|cerulean dredger|gilnean noble|dalaran defender|consecrated armor|everforged|glyph-etched|rune-branded|copper diver|thread-bearer|machine-warden|ymirjar|jotunheim|brunnhildar|drakkari stalker|steamwheedle bruiser|trapper.s fur|murloc romper|snugglefin|swashbuckling|happy green|tier 2 eternal/i.test(n)) return 'The War Within';

  // Dragonflight
  if (/vault of the incarnates|aberrus|amirdrassil|dragonflight|dracthyr|fyrakk|sarkareth|raszageth|primalist|dragonscale.*expedition|nokhud|algeth.ar|brackenhide|ruby life pools|halls of valor.*recolor|court of stars.*recolor|sanguine depths.*recolor|primal storms|crimson gladiator|obsidian gladiator|verdant gladiator|draconic gladiator|forgotten gladiator/i.test(n)) return 'Dragonflight';

  // Shadowlands (incl. all four covenants)
  if (/shadowlands|sinful gladiator|sinister.*sl|unchained gladiator|cosmic gladiator|vault gladiator|elite vault|castle nathria|sanctum of domination|sepulcher of the first ones|venthyr|kyrian|night fae|necrolord|covenant|maldraxxus|ardenweald|revendreth|bastion|nightfall|shattered ritual|korthia|zereth mortis|deathwalker|aspiring aspirant|foresworn aspirant/i.test(n)) return 'Shadowlands';

  // Battle for Azeroth (BfA) — must catch Eternal Palace, Kul Tiras, Zandalar
  if (/uldir|crucible of storms|eternal palace|ny.alotha|n.zoth|nzoth|kul tiras|kultiran|zandalar|zandalari|warfront|dread gladiator|dread aspirant|notorious gladiator|sinister aspirant|corrupted gladiator|mechagnome|vulpera|azerite|battle for azeroth|nazjatar|mechagon|shaohao/i.test(n)) return 'Battle for Azeroth';

  // Legion
  if (/\bantorus\b|tomb of sargeras|nighthold|emerald nightmare|trial of valor|\blegion\b|order hall|class hall|\bargus\b|mage tower|burning throne|illidari|felbat leather|dreadwyrm|felshroud|cruel gladiator|warmongering gladiator|vindictive gladiator|fearless gladiator|fierce gladiator|dominant gladiator|demonic gladiator|fearful gladiator|dauntless gladiator|primal gladiator/i.test(n)) return 'Legion';

  // Warlords of Draenor
  if (/\bdraenor\b|highmaul|blackrock foundry|hellfire citadel|tanaan|warlords of draenor|felblade armor|hurricane.s eye|deathrattle regalia|stone guard.*wod|brawler.s plate|combatant.*plate.*wod/i.test(n)) return 'Warlords of Draenor';

  // Mists of Pandaria
  if (/\bpandaria\b|siege of orgrimmar|throne of thunder|heart of fear|mogu.shan|terrace of endless spring|sha of fear|lei shen|\bgarrosh\b|jade forest|shado.pan|kor.kron|tian monastery|sun pearl|robes of quiet reflection|\bmantid\b|vestments of serenity|prideful gladiator|tyrannical gladiator|malevolent gladiator|grievous gladiator|crafted dreadful gladiator/i.test(n)) return 'Mists of Pandaria';

  // Cataclysm
  if (/\bfirelands\b|dragon soul|bastion of twilight|blackwing descent|throne of the four winds|deathwing|cho.gall|\bal.akir\b|cataclysmic gladiator|vicious gladiator|ruthless gladiator|bloodthirsty gladiator|cataclysm/i.test(n)) return 'Cataclysm';

  // Wrath of the Lich King
  if (/icecrown citadel|ulduar|trial of the crusader|\bnaxxramas\b|northrend|wrathful gladiator|relentless gladiator|furious gladiator|deadly gladiator|hateful gladiator|savage gladiator|titan.rune|valorous|conqueror.s|sanctified.*\b(scourgelord|lightsworn|frost witch|of the dragonfly|of the vanquished hero|onslaught|crimson acolyte|wayward conqueror)/i.test(n)) return 'Wrath of the Lich King';

  // Burning Crusade
  if (/sunwell|black temple|the eye|tempest keep|serpentshrine|karazhan|gruul.s|magtheridon|zul.aman|zul.gurub|outland|vindictive gladiator|brutal gladiator|vengeful gladiator|merciless gladiator|gladiator.s.*bc|tier (4|5|6)\b|corruptor raiment|destroyer armor|absolution regalia|thunderheart|gronnstalker|skyshatter|slayer.s sunwell|cataclysmic.*\b(gladiator|aspirant)/i.test(n)) return 'Burning Crusade';

  // Classic (vanilla raid sets, dungeon sets, basic regalia/vestments families)
  if (/molten core|onyxia|blackwing lair|temple of ahn.qiraj|naxxramas \(40|stratholme|scholomance|dire maul|\bzul.gurub\b|tier (1|2|3)\b|judgement|stormrage|nightslayer|lawbringer|wildheart|cenarion|earthfury|nemesis|dragonstalker|netherwind|arcanist|valor|magister|elements|battlegear of valor|battlegear of might|battlegear of wrath|prophecy raiment|garments of the moon|undead slayer/i.test(n)) return 'Classic';

  return null;
}

// ── Source-pattern matching ──────────────────────────────────────────────
// Source is a free-form tag — null means "we don't know, hide the badge".
// Order: most-specific first. PvP / Heritage / Trading Post / Raid / Dungeon
// / Crafted / Warfront / Covenant should not collide.
function sourceFromSetName(name) {
  if (!name) return null;
  const n = name.toLowerCase();

  if (/heritage armor/i.test(n)) return 'Heritage';

  // PvP — gladiator titles, aspirant, combatant
  if (/\bpvp\b|gladiator|aspirant|combatant|\brival\b|duelist|challenger|enforcer|honorary|aldor|scryer/i.test(n)) return 'PvP';

  // Trading Post — themed cosmetic packs + named TP-only set families
  if (/trading post|celebration|love witch|spring reveler|darkmoon|winter veil|hallow.?s end|harvest celebrant|murloc romper|snugglefin|buccaneer|swashbuckling|plunderlord|plunderstorm|tier 2 eternal|copper diver|sunny tropical|bloodsail|russet regalia|haliscan regalia|knitted regalia|woven regalia|twill vestments|crochet vestments|calico vestments|frayed vestments|canvas vestments|interlaced vestments|patchwork vestments/i.test(n)) return 'Trading Post';

  // Crafted (professions)
  if (/crafted|tailoring|leatherworking|blacksmithing|engineering|inscribed|embroidered|engraved|profession/i.test(n)) return 'Crafted';

  // Warfront
  if (/warfront/i.test(n)) return 'Warfront';

  // Covenant (Shadowlands)
  if (/covenant|order hall|class hall|kyrian|venthyr|night fae|necrolord/i.test(n)) return 'Covenant';

  // Raid: explicit difficulty tags or known raid names
  if (/\bmythic\b|\bheroic\b|\bnormal\b|\blfr\b|raid finder|looking for raid|raid set|raid leather|raid plate|raid mail|raid cloth/i.test(n)) return 'Raid';
  if (/vault of the incarnates|aberrus|amirdrassil|castle nathria|sanctum of domination|sepulcher|ny.alotha|eternal palace|uldir|antorus|tomb of sargeras|nighthold|emerald nightmare|hellfire citadel|highmaul|blackrock foundry|siege of orgrimmar|throne of thunder|heart of fear|mogu.shan vaults|terrace of endless spring|dragon soul|firelands|bastion of twilight|throne of the four winds|blackwing descent|icecrown citadel|ulduar|trial of the crusader|naxxramas|sunwell|black temple|tempest keep|serpentshrine|karazhan|gruul|magtheridon|molten core|onyxia|blackwing lair|temple of ahn.qiraj|nerub.ar palace|liberation of undermine/i.test(n)) return 'Raid';

  // Dungeon
  if (/dungeon|heroic dungeon|mythic dungeon/i.test(n)) return 'Dungeon';

  // Recolor/Lookalike sets are typically world drops or transmog farms
  if (/\brecolor\b|\blookalike\b/i.test(n)) return 'World Drop';

  // Tier sets (T1–T18 — all came from raids historically)
  if (/^(tier|t)\s*(1[0-9]|[1-9])\s/i.test(n) || /\b(tier|t)[\s-]?(1[0-9]|[1-9])\b/i.test(n)) return 'Raid';

  return null;
}

// ── Combined detection (uses both signals + min item ID) ─────────────────
/**
 * Decide a set's expansion using:
 *   1. Name pattern (most reliable when it matches)
 *   2. MIN item ID across the set (to avoid false BfA tags from lone reskinned items)
 *   3. Set ID range fallback for modern transmog-set IDs
 *   4. Set ID range fallback for old IDs
 *
 * Note on (2): the previous logic used items[0].id which fails on cosmetic
 * sets like "Buccaneer's Regalia" (id 14) that have a BfA-era reskin item
 * mixed in alongside Classic items. Using min(item IDs) picks the oldest
 * representative and mostly matches the visual era of the appearance.
 */
function detectExpansion(set) {
  const { id, name, items } = set;

  // Name first — most authoritative when it matches a known pattern
  const fromName = expansionFromSetName(name);
  if (fromName) return fromName;

  // Min item ID for old sets (id < 3000)
  if (id < 3000 && Array.isArray(items) && items.length > 0) {
    const itemIds = items.map(i => i?.id).filter(n => Number.isFinite(n) && n > 0 && n < 200000);
    if (itemIds.length > 0) {
      const minId = Math.min(...itemIds);
      const fromMinId = expansionFromItemId(minId);
      if (fromMinId) return fromMinId;
    }
  }

  // Modern transmog-set ID ranges (observed from Wowhead data)
  if (id >= 11500) {
    if (id < 12200) return 'Shadowlands';
    if (id < 12380) return 'Dragonflight';
    if (id < 12507) return 'The War Within';
    return 'The War Within';
  }

  // Legacy set-ID fallback
  if (id < 100)  return 'Classic';
  if (id < 500)  return 'Burning Crusade';
  if (id < 900)  return 'Wrath of the Lich King';
  if (id < 1300) return 'Cataclysm';
  if (id < 1800) return 'Mists of Pandaria';
  if (id < 2300) return 'Warlords of Draenor';
  if (id < 2700) return 'Legion';
  return 'Battle for Azeroth';
}

function detectSource(set) {
  return sourceFromSetName(set.name);
}

// ── Armor type from set name ─────────────────────────────────────────────
// Returns 'Cloth' | 'Leather' | 'Mail' | 'Plate' | null. Used at detail-page
// load time to filter out garbage items Wowhead occasionally returns in a
// set's `completionData` (gems, weapons, jewelry, items from unrelated sets).
//
// Order matters: most-distinctive patterns first, so "Battleplate" beats
// "Battle" (which could be anything).
function armorTypeFromSetName(name) {
  if (!name) return null;
  const n = name.toLowerCase();

  // Plate — strongest signal
  if (/\bbattleplate\b|\bplate armor\b|\bplate set\b|\bplate\b(?!\s*(of|with|a|an)\b)|sabatons|\bgreaves\b|\bgauntlets\b|\bbattleguards?\b|crusader|lightsworn|champion's\s+(plate|battle)|paladin|warrior(?!\s+armory)|death\s*knight/i.test(n)) return 'Plate';

  // Cloth
  if (/\brobes?\b|\bvestments?\b|\bregalia\b|\bcowl\b|\bsash\b|\bgarments?\b|\bsilks\b|magister|conjurer|sorcerer|warlock|priest(?:\b|ess)|\barchmage\b|\bmage\b\s*(set|armor|gear)/i.test(n)) return 'Cloth';

  // Leather
  if (/\bgarb\b|\btrappings\b|\bhide\b|\btunic\b|\bjerkin\b|stalker|\bdruid\b|\brogue\b|\bmonk\b|\bdemon\s*hunter\b|leatherworking|kodohide|wildhide|dragonhide/i.test(n)) return 'Leather';

  // Mail
  if (/\bmail\b|\bchain\b|chainmail|\bhauberk\b|\blinksaver\b|\bscale\b|hunter|shaman|\bevoker\b/i.test(n)) return 'Mail';

  return null;
}

/**
 * Resolve the expected armor type for a set.
 *   1. Name match (Battleplate → Plate, etc.) — strongest signal
 *   2. Set's `armorTypes` array if it has exactly one entry
 *   3. null — caller should accept any armor type as valid
 */
function expectedArmorType(set) {
  const fromName = armorTypeFromSetName(set.name);
  if (fromName) return fromName;
  if (Array.isArray(set.armorTypes) && set.armorTypes.length === 1) {
    return set.armorTypes[0];
  }
  return null;
}

// ── Armor types from classes ─────────────────────────────────────────────
// Reverse mapping: each class wears exactly one armor type.
const CLASS_TO_ARMOR = {
  'Mage':         'Cloth',
  'Priest':       'Cloth',
  'Warlock':      'Cloth',
  'Rogue':        'Leather',
  'Druid':        'Leather',
  'Monk':         'Leather',
  'Demon Hunter': 'Leather',
  'Hunter':       'Mail',
  'Shaman':       'Mail',
  'Evoker':       'Mail',
  'Warrior':      'Plate',
  'Paladin':      'Plate',
  'Death Knight': 'Plate',
};

/**
 * Derive armor types a set covers from its `classes` array.
 *
 * Returns array (sets can span multiple types when classes mix armor groups,
 * e.g. classes:['Druid','Hunter'] → ['Leather','Mail']).
 *
 * If classes contains 'All' it means the appearance is unrestricted — the
 * set is most likely a cosmetic that any class can wear; we return [] so
 * armor-type filters don't accidentally match it. Callers that want
 * inclusive matching can branch on classes.includes('All').
 */
function armorTypesFromClasses(classes) {
  if (!Array.isArray(classes) || classes.length === 0) return [];
  if (classes.includes('All')) return [];
  const types = new Set();
  for (const c of classes) {
    const t = CLASS_TO_ARMOR[c];
    if (t) types.add(t);
  }
  return Array.from(types).sort();
}

module.exports = {
  expansionFromItemId,
  expansionFromSetName,
  sourceFromSetName,
  detectExpansion,
  detectSource,
  armorTypesFromClasses,
  armorTypeFromSetName,
  expectedArmorType,
  CLASS_TO_ARMOR,
};
