/**
 * Validate AI-generated guides against the set's tagged expansion.
 *
 * For each guide:
 *   1. Look up the set's expansion.
 *   2. Scan guide text for known WoW content keywords (raids, dungeons,
 *      currencies, zones, distinctive boss names).
 *   3. If keywords belong to a DIFFERENT expansion than the set's tag,
 *      flag the guide as suspicious.
 *
 * Usage:
 *   node scripts/validateGuides.js                # full report (top 50)
 *   node scripts/validateGuides.js --all          # write full JSON report
 *   node scripts/validateGuides.js --id 200       # validate one set
 *   node scripts/validateGuides.js --bad-only     # only failures
 */
const fs = require('fs');
const path = require('path');
const { expansionsMentioned } = require('../utils/wowContent');

const GUIDES = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/guides_cache.json'), 'utf-8'));
const SETS = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/blizzard_transmogs_cache.json'), 'utf-8'));

const args = process.argv.slice(2);
const onlyId = args.includes('--id') ? Number(args[args.indexOf('--id') + 1]) : null;
const writeFull = args.includes('--all');
const badOnly = args.includes('--bad-only');
const purge = args.includes('--purge');

const setById = new Map(SETS.map(s => [s.id, s]));

const results = [];
let analyzed = 0;
let suspicious = 0;
let confident = 0;
let noSignal = 0;

for (const [idStr, guide] of Object.entries(GUIDES)) {
  const id = Number(idStr);
  if (onlyId && id !== onlyId) continue;
  const set = setById.get(id);
  if (!set) continue;

  const content = guide.content || '';
  const mentioned = expansionsMentioned(content);
  analyzed++;

  if (mentioned.length === 0) {
    noSignal++;
    if (writeFull) {
      results.push({ id, name: set.name, setExpansion: set.expansion, status: 'no-signal' });
    }
    continue;
  }

  const setExp = set.expansion;
  const matchesSet = mentioned.some(m => m.expansion === setExp);
  const allOff = !matchesSet;

  if (allOff) {
    suspicious++;
    results.push({
      id, name: set.name, setExpansion: setExp,
      status: 'mismatch',
      mentioned: mentioned.map(m => `${m.expansion} (${m.keywords.slice(0,3).join(', ')})`),
    });
  } else if (mentioned.length > 1) {
    // Mentions set's expansion AND another — could be a recolor/lookalike
    // mention; mark as low-confidence
    confident++;
    if (writeFull || onlyId) {
      results.push({
        id, name: set.name, setExpansion: setExp,
        status: 'mixed',
        mentioned: mentioned.map(m => `${m.expansion} (${m.keywords.slice(0,3).join(', ')})`),
      });
    }
  } else {
    confident++;
    if (writeFull || onlyId) {
      results.push({
        id, name: set.name, setExpansion: setExp,
        status: 'ok',
        mentioned: mentioned.map(m => `${m.expansion} (${m.keywords.slice(0,3).join(', ')})`),
      });
    }
  }
}

console.log(`Guides analyzed:  ${analyzed}`);
console.log(`Confident match:  ${confident}`);
console.log(`No content signal: ${noSignal}`);
console.log(`Mismatches (suspicious): ${suspicious}\n`);

const toShow = badOnly ? results.filter(r => r.status === 'mismatch') : results;
const sliced = onlyId || writeFull ? toShow : toShow.slice(0, 50);

if (sliced.length === 0) {
  console.log('Nothing to show. Use --all or --bad-only to expand.');
} else {
  for (const r of sliced) {
    console.log(`[${r.id}] "${r.name}"`);
    console.log(`  set tagged:  ${r.setExpansion}`);
    console.log(`  mentioned:   ${r.mentioned ? r.mentioned.join(' + ') : '(none)'}`);
    console.log(`  → ${r.status}\n`);
  }
}

if (writeFull) {
  const out = path.join(__dirname, '../data/guide-validation-report.json');
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  console.log(`\nFull report written: ${out}`);
}

if (purge) {
  // Drop guides flagged as 'mismatch' from cache. The frontend already has a
  // "Guide coming soon" UI for missing guides — that's a better outcome than
  // showing a confidently-wrong hallucinated guide. Sets keep their cards;
  // only the per-set guide entry is removed from guides_cache.json.
  const toDelete = results.filter(r => r.status === 'mismatch').map(r => String(r.id));
  for (const id of toDelete) delete GUIDES[id];
  const guidesPath = path.join(__dirname, '../data/guides_cache.json');
  fs.writeFileSync(guidesPath, JSON.stringify(GUIDES, null, 2));
  console.log(`\n🗑  Purged ${toDelete.length} mismatched guides. Cache size now: ${Object.keys(GUIDES).length}`);
}

const missingGuides = SETS.filter(s => !GUIDES[s.id]);
console.log(`\nSets without any guide: ${missingGuides.length}`);
