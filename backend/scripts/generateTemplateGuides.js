/**
 * Generate factual, template-based guides from a set's structured metadata.
 *
 * Why this exists:
 *   - AI-generated guides hallucinate raids/bosses/currencies (validateGuides
 *     found ~1100 mismatches in our cache).
 *   - Most sets don't need 600-word essays; they need a 5-line factual block
 *     telling you where to look.
 *   - Templates are deterministic, can never lie, and cost nothing to (re)run.
 *
 * Output: writes `backend/data/templates_cache.json` with the same shape as
 *   guides_cache.json: { [setId]: { content, generatedAt } }.
 *
 * The `/guide` endpoint should fall back to this file when the AI-guide
 * cache has no entry for a set — so users always see useful info instead of
 * a "Guide coming soon" placeholder.
 *
 * Usage:
 *   node scripts/generateTemplateGuides.js
 */
const fs = require('fs');
const path = require('path');

const SETS_FILE      = path.join(__dirname, '../data/blizzard_transmogs_cache.json');
const TEMPLATES_FILE = path.join(__dirname, '../data/templates_cache.json');

const sets = JSON.parse(fs.readFileSync(SETS_FILE, 'utf-8'));

// ── Helpers ──────────────────────────────────────────────────────────────

// Expansion-specific PvP currency (rough mapping for the user-visible blurb).
const PVP_CURRENCY_BY_EXP = {
  'Burning Crusade':            'Arena Points and Honor',
  'Wrath of the Lich King':     'Arena Points and Honor',
  'Cataclysm':                  'Conquest Points and Honor',
  'Mists of Pandaria':          'Conquest Points and Honor',
  'Warlords of Draenor':        'Conquest and Honor',
  'Legion':                     'Marks of Honor and seasonal Conquest',
  'Battle for Azeroth':         'Conquest and Marks of Honor',
  'Shadowlands':                'Conquest, purchased from Zo\'sorg in Oribos',
  'Dragonflight':               'Conquest, purchased from Aspirant\'s Quartermaster in Valdrakken',
  'The War Within':             'Conquest, purchased from the PvP vendor in Dornogal',
};

const COVENANT_BY_NAME = {
  'kyrian':     { name: 'Kyrian',     zone: 'Bastion' },
  'venthyr':    { name: 'Venthyr',    zone: 'Revendreth' },
  'night fae':  { name: 'Night Fae',  zone: 'Ardenweald' },
  'necrolord':  { name: 'Necrolord',  zone: 'Maldraxxus' },
};

// Plain-language armor type for the closing sentence.
function armorClassesLine(set) {
  const types = set.armorTypes || [];
  if (types.length === 0) return 'Wearable by any class — appearance is shared across all armor types.';
  const armorTypeText = types.join(', ');
  const classes = (set.classes || []).filter(c => c !== 'All');
  if (classes.length === 0) return `${armorTypeText} armor.`;
  return `${armorTypeText} armor, available to ${classes.join(', ')}.`;
}

function detectRaidName(name) {
  // A handful of common patterns we can extract from the set name.
  const m = name.match(/(Aberrus|Amirdrassil|Vault of the Incarnates|Nerub-ar Palace|Liberation of Undermine|Castle Nathria|Sanctum of Domination|Sepulcher of the First Ones|Ny'alotha|Eternal Palace|Uldir|Crucible of Storms|Battle of Dazar'alor|Antorus|Tomb of Sargeras|Nighthold|Emerald Nightmare|Trial of Valor|Hellfire Citadel|Highmaul|Blackrock Foundry|Siege of Orgrimmar|Throne of Thunder|Heart of Fear|Mogu'shan Vaults|Terrace of Endless Spring|Dragon Soul|Firelands|Bastion of Twilight|Throne of the Four Winds|Blackwing Descent|Icecrown Citadel|Ulduar|Trial of the Crusader|Naxxramas|Sunwell|Black Temple|Tempest Keep|Serpentshrine|Karazhan|Molten Core|Blackwing Lair|Temple of Ahn'Qiraj)/i);
  return m ? m[1] : null;
}

function detectDifficulty(name) {
  if (/\bmythic\b/i.test(name)) return 'Mythic';
  if (/\bheroic\b/i.test(name)) return 'Heroic';
  if (/\bnormal\b/i.test(name)) return 'Normal';
  if (/\blfr\b|raid finder|looking for raid/i.test(name)) return 'LFR';
  return null;
}

function detectCovenant(name) {
  const lower = name.toLowerCase();
  for (const key of Object.keys(COVENANT_BY_NAME)) {
    if (lower.includes(key)) return COVENANT_BY_NAME[key];
  }
  return null;
}

function detectRace(name) {
  const races = [
    'Dark Iron', 'Mag\'har Orc', 'Mag\'har', 'Kul Tiran', 'Zandalari', 'Mechagnome',
    'Vulpera', 'Highmountain', 'Lightforged', 'Void Elf', 'Nightborne', 'Pandaren',
    'Worgen', 'Goblin', 'Human', 'Night Elf', 'Dwarf', 'Gnome', 'Draenei',
    'Orc', 'Tauren', 'Troll', 'Blood Elf', 'Undead', 'Sin\'dorei',
    'Dracthyr', 'Earthen',
  ];
  for (const race of races) {
    if (new RegExp(`\\b${race.replace(/'/g, "['']?")}\\b`, 'i').test(name)) return race;
  }
  return null;
}

function detectProfession(name) {
  if (/blacksmith/i.test(name)) return 'Blacksmithing';
  if (/leatherwork/i.test(name)) return 'Leatherworking';
  if (/tailor/i.test(name)) return 'Tailoring';
  if (/engineer/i.test(name)) return 'Engineering';
  if (/embroider|silk|weaver/i.test(name)) return 'Tailoring';
  if (/everforged|forged/i.test(name)) return 'Blacksmithing';
  return null;
}

// ── Per-source templates ─────────────────────────────────────────────────

function templateRaid(set) {
  const raid = detectRaidName(set.name) || `a ${set.expansion}-era raid`;
  const diff = detectDifficulty(set.name);
  const diffSection = diff
    ? `This is the ${diff} difficulty version of the appearance. Other difficulties (LFR / Normal / Heroic / Mythic) use separate tints and are tracked as separate sets.`
    : 'Raid bosses have a chance to drop set pieces on each clear; difficulties (LFR / Normal / Heroic / Mythic) share the same items but render with different color tints.';

  return `### How to Obtain
Drops from bosses inside **${raid}** (${set.expansion}). Each main armor slot (Head, Shoulders, Chest, Hands, Legs, Feet, Waist, Wrists) drops from a specific boss in the raid — open the set on Wowhead via the link below for the exact boss-to-slot mapping.

### Farming Logistics
Standard raid weekly lockout — the full instance resets every Tuesday. ${diffSection} At current max level the raid is usually soloable or trivially small-group, so you can collect missing pieces 1–2 weeks at a time.

### Farming Tips
${armorClassesLine(set)} Use the Great Vault and any bonus-roll currency from this expansion to maximize attempts per week. If a piece keeps not dropping, target-farm the specific boss and skip the rest.`;
}

function templatePvP(set) {
  const currency = PVP_CURRENCY_BY_EXP[set.expansion] || 'Honor and Conquest';
  const isElite = /elite/i.test(set.name);
  const eliteNote = isElite
    ? 'This is the Elite recolor variant — it requires a higher Rated PvP threshold (typically Duelist 2100+ or Gladiator 2400+) to purchase, earned during the original season.'
    : 'The base appearance is available at low rating tiers (Combatant / Rival, around 1400 rating).';

  return `### How to Obtain
PvP appearance from ${set.expansion}. Earned through Rated PvP (Arenas, Rated Battlegrounds, or Solo Shuffle) during the active season by spending **${currency}** at the seasonal PvP quartermaster.

### Farming Logistics
PvP appearances are tied to the season they were released in. ${eliteNote} If the original season is over, the appearance is no longer purchasable through normal means — check the **Black Market Auction House** (currently in Valdrakken) which occasionally lists legacy PvP pieces.

### Farming Tips
${armorClassesLine(set)} If you collected the set during its active season it is permanently unlocked in your Wardrobe even if the vendor no longer sells it. Check your Wardrobe before grinding — appearances persist across characters on the same account.`;
}

function templateDungeon(set) {
  return `### How to Obtain
Drops from dungeon bosses in ${set.expansion}-era dungeons. Set pieces are spread across multiple dungeons in the expansion — open the Wowhead link below to see the exact dungeon and boss for each slot.

### Farming Logistics
Dungeons have a per-character daily reset rather than a weekly lockout, so you can rerun the same dungeon repeatedly for missing pieces. At current max level the content is fully soloable in 5–10 minutes per run. Drop rates per relevant boss are typically 15–25 %.

### Farming Tips
${armorClassesLine(set)} Mythic+ does not change the appearance — running on Normal is the fastest way to farm. Pick a class with strong AoE for speed; alts with the same armor type can funnel duplicate drops.`;
}

function templateCrafted(set) {
  const profession = detectProfession(set.name) || 'a crafting profession';
  return `### How to Obtain
Crafted by **${profession}** in ${set.expansion}. Patterns are obtained from profession trainers, world drops, or rare recipes from the expansion's content. Each piece requires expansion-tier materials that you can either farm yourself or buy from the Auction House.

### Farming Logistics
No lockout — craft as many pieces as you have materials for. Profession Crafting Orders (introduced in Dragonflight) let you commission a crafter via the public order board without leveling the profession yourself, so a non-crafter alt can still obtain the appearance.

### Farming Tips
${armorClassesLine(set)} Check the Auction House before crafting — many crafted appearances are bind-on-equip and other players list them directly. If you need to power-level the profession to craft this set, prioritize gathering professions for materials first.`;
}

function templateTradingPost(set) {
  return `### How to Obtain
Available from the **Trading Post**, located in Orgrimmar (Valley of Strength) or Stormwind (Trade District). Purchased with **Trader's Tender**, the currency earned by completing monthly Traveler's Log activities (about 500 Tender per month plus bonus activities).

### Farming Logistics
Trading Post inventory rotates **monthly** — if this set is not in the current month's catalog, it will eventually return in a future rotation. Tender carries over indefinitely between months, so you can save up for higher-priced items. No lockout once purchased.

### Farming Tips
${armorClassesLine(set)} Complete every Traveler's Log activity each month to maximize Tender — they cover all content (dungeons, raids, PvP, world quests, professions). Set bundles typically cost 500–750 Tender; individual pieces cost less.`;
}

function templateCovenant(set) {
  const cov = detectCovenant(set.name);
  if (!cov) {
    return `### How to Obtain
Shadowlands Covenant cosmetic set. Earned by joining the relevant covenant and progressing the **Renown** track in Shadowlands. Specific pieces unlock at fixed Renown levels along the covenant campaign chapters.

### Farming Logistics
Renown was originally capped at 3 per week from Covenant Callings, but catch-up was added in later Shadowlands patches — returning players can accelerate Renown gain significantly. No raid or dungeon lockouts apply.

### Farming Tips
${armorClassesLine(set)} You must be pledged to the specific covenant to earn the set; switching covenants resets some progress. Most Shadowlands covenants now have catch-up mechanics making the grind ~few hours rather than weeks.`;
  }

  return `### How to Obtain
**${cov.name} Covenant** cosmetic set from Shadowlands, earned in **${cov.zone}**. Pieces unlock as part of the covenant campaign through Renown levels — pledge to ${cov.name} and progress the campaign chapters.

### Farming Logistics
Renown progresses via Covenant Callings (3 world quests per day in your covenant's zone), the campaign chapter quests, and Anima-spending activities. Returning players benefit from catch-up — full Renown can be earned in a few sessions rather than weeks.

### Farming Tips
${armorClassesLine(set)} You must be pledged to ${cov.name} specifically; the set is not available cross-covenant. The ${cov.zone} zone is also the source of mounts, pets, and other ${cov.name}-themed cosmetics worth picking up at the same time.`;
}

function templateWarfront(set) {
  const side = /alliance/i.test(set.name) ? 'Alliance' : (/horde/i.test(set.name) ? 'Horde' : 'your faction');
  return `### How to Obtain
**${set.expansion}** Warfront cosmetic. Earned through Warfront content (Battle for Stromgarde or Battle for Darkshore) — pieces drop from the final Warfront boss and from quest reward caches when ${side} controls the contested zone.

### Farming Logistics
Warfronts run on a rotating schedule between Alliance and Horde control, with each cycle lasting about a week. You can only queue when your faction is in the attacking phase. Pieces are eligible from any Warfront completion during the active phase.

### Farming Tips
${armorClassesLine(set)} Check the Warfront calendar on Wowhead before logging in — running during an inactive phase wastes time. The Arathi Highlands and Darkshore Warfronts each have their own loot pool.`;
}

function templateHeritage(set) {
  const race = detectRace(set.name);
  if (!race) {
    return `### How to Obtain
Heritage Armor — earned by leveling a character of the relevant allied or core race to max level and completing that race's Heritage Armor questline.

### Farming Logistics
One-time per character: complete the full Heritage Armor quest chain, available from the racial leader once your character of the correct race hits max level. No lockout, but it does require playing the full character to cap.

### Farming Tips
${armorClassesLine(set)} Heritage Armor is faction-locked to the race that earns it. Use Recruit-a-Friend boosts or experience buffs to speed up the level grind if needed.`;
  }

  return `### How to Obtain
**${race} Heritage Armor** — earned by leveling a ${race} character to max level and completing the ${race} Heritage Armor questline, which unlocks from the racial leader once you hit cap.

### Farming Logistics
One-time per ${race} character. The questline is short (15–30 minutes) but requires the level cap, so the real time investment is leveling. Heritage Armor cannot be earned via Boosts and requires a "from-scratch" leveling experience on some races.

### Farming Tips
${armorClassesLine(set)} Heritage Armor is locked to the ${race} race specifically. The appearance is account-wide once unlocked — you can transmog it on any character of any class that race can play.`;
}

function templateWorldDrop(set) {
  const isRecolor = /recolor|lookalike/i.test(set.name);
  const recolorNote = isRecolor
    ? 'This is a recolor / lookalike variant — the items may share appearances with a base set from a different expansion, so they can drop in zones outside the listed expansion range.'
    : 'World drop sets pool from many sources, so pieces may come from a wider zone range than the tagged expansion suggests.';

  return `### How to Obtain
World-drop appearance from **${set.expansion}** content. Pieces drop from outdoor mobs, rare elites, and treasure chests across the expansion's zones. ${recolorNote}

### Farming Logistics
No lockout — farm continuously. Individual drop rates from any specific mob are low, so most collectors check the **Auction House** first (these pieces are bind-on-equip and often listed). Rare-elite hunts on Time-walking weeks or Cross-Realm group routes massively speed up the search.

### Farming Tips
${armorClassesLine(set)} Install Handynotes plus the relevant expansion's "Rares + Treasures" plugin to map every spawn. AoE classes (Frost Mage, Havoc DH, Outlaw Rogue) clear contested zones faster than single-target builds.`;
}

function templateGeneric(set) {
  return `### How to Obtain
${set.name} is a ${set.expansion} appearance set. The exact source isn't categorized in our database — open the Wowhead link below for the canonical piece list and drop locations.

### Farming Logistics
${armorClassesLine(set)} Most legacy sets at current max level are soloable; modern current-expansion sets may require active content engagement. Check the Wowhead set page for difficulty and source details.

### Farming Tips
If pieces are bind-on-equip, check the Auction House on your realm before farming directly. The Wardrobe automatically learns appearances on first loot pickup, so it's safe to roll Need even if you'll vendor the item later.`;
}

// ── Dispatcher ───────────────────────────────────────────────────────────

function generateTemplate(set) {
  switch (set.source) {
    case 'Raid':         return templateRaid(set);
    case 'PvP':          return templatePvP(set);
    case 'Dungeon':      return templateDungeon(set);
    case 'Crafted':      return templateCrafted(set);
    case 'Trading Post': return templateTradingPost(set);
    case 'Covenant':     return templateCovenant(set);
    case 'Warfront':     return templateWarfront(set);
    case 'Heritage':     return templateHeritage(set);
    case 'World Drop':   return templateWorldDrop(set);
    default:             return templateGeneric(set);
  }
}

// ── Run ──────────────────────────────────────────────────────────────────

const now = new Date().toISOString();
const out = {};
const stats = { total: 0, bySource: {} };

for (const set of sets) {
  out[set.id] = { content: generateTemplate(set), generatedAt: now };
  stats.total++;
  const key = set.source || '(generic)';
  stats.bySource[key] = (stats.bySource[key] || 0) + 1;
}

fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(out, null, 2));

console.log(`✅ Generated ${stats.total} template guides.`);
console.log(`   → ${TEMPLATES_FILE}`);
console.log('\nBreakdown by source:');
Object.entries(stats.bySource)
  .sort((a, b) => b[1] - a[1])
  .forEach(([src, n]) => console.log(`   ${n.toString().padStart(5)}  ${src}`));
