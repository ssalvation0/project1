/**
 * One-shot script: re-runs detectExpansion + detectSource on every cached
 * transmog set, prints a diff summary, and rewrites the cache.
 *
 * Run from the backend/ directory:
 *   node scripts/reclassifySets.js          # dry-run, prints changes only
 *   node scripts/reclassifySets.js --apply  # writes back to cache
 *
 * Safe to re-run — only touches `expansion` and `source` fields, never
 * scrapes Wowhead, never touches guides_cache.json.
 */
const fs = require('fs');
const path = require('path');
const { detectExpansion, detectSource, armorTypesFromClasses, armorTypeFromSetName, CLASS_TO_ARMOR } = require('../utils/setClassify');

// Reverse map: armor type → list of classes that wear it.
// Used when the set name signals one armor type but cached classes disagree
// (Wowhead occasionally derives classes from a corrupted first item).
const ARMOR_TO_CLASSES = {};
for (const [cls, ar] of Object.entries(CLASS_TO_ARMOR)) {
  if (!ARMOR_TO_CLASSES[ar]) ARMOR_TO_CLASSES[ar] = [];
  ARMOR_TO_CLASSES[ar].push(cls);
}

const CACHE_FILE = path.join(__dirname, '../data/blizzard_transmogs_cache.json');
const APPLY = process.argv.includes('--apply');

const sets = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));

let expChanged = 0;
let srcChanged = 0;
let srcFilled  = 0;
let armorAdded = 0;
let classesFixed = 0;
const expExamples = [];
const srcExamples = [];
const classExamples = [];

for (const s of sets) {
  // Step 0 — if the set name unambiguously names an armor type (Battleplate
  // → Plate, Vestments → Cloth, etc.) and the cached classes belong to a
  // different armor group, the cached classes were derived from corrupt
  // first-item data. Override classes to match the name's armor type.
  const fromName = armorTypeFromSetName(s.name);
  if (fromName && Array.isArray(s.classes) && !s.classes.includes('All')) {
    const currentArmors = new Set(armorTypesFromClasses(s.classes));
    if (currentArmors.size > 0 && !currentArmors.has(fromName)) {
      const corrected = ARMOR_TO_CLASSES[fromName] || ['All'];
      if (classExamples.length < 8) {
        classExamples.push(`  [${s.id}] "${s.name}"  ${s.classes.join(', ')} → ${corrected.join(', ')}  (name says ${fromName})`);
      }
      s.classes = corrected;
      classesFixed++;
    }
  }

  const newExp = detectExpansion(s);
  const newSrc = detectSource(s);
  const newArmor = armorTypesFromClasses(s.classes);

  if (newExp && newExp !== s.expansion) {
    expChanged++;
    if (expExamples.length < 15) {
      expExamples.push(`  [${s.id}] "${s.name}"  ${s.expansion} → ${newExp}`);
    }
    s.expansion = newExp;
  }

  if (newSrc !== s.source) {
    if (s.source == null && newSrc != null) {
      srcFilled++;
    } else if (s.source != null && newSrc !== s.source) {
      srcChanged++;
      if (srcExamples.length < 10) {
        srcExamples.push(`  [${s.id}] "${s.name}"  ${s.source} → ${newSrc}`);
      }
    }
    s.source = newSrc;
  }

  // Always add armorTypes (was never persisted before — feature, not a fix)
  const before = JSON.stringify(s.armorTypes || null);
  if (before !== JSON.stringify(newArmor)) armorAdded++;
  s.armorTypes = newArmor;
}

console.log(`Total sets:               ${sets.length}`);
console.log(`Expansion changes:        ${expChanged}`);
console.log(`Source changes:           ${srcChanged}`);
console.log(`Source filled (was null): ${srcFilled}`);
console.log(`armorTypes set/updated:   ${armorAdded}`);
console.log(`Classes overridden by name: ${classesFixed}`);

if (classExamples.length > 0) {
  console.log('\nClass override examples:');
  classExamples.forEach(e => console.log(e));
}

if (expExamples.length > 0) {
  console.log('\nExpansion change examples:');
  expExamples.forEach(e => console.log(e));
}

if (srcExamples.length > 0) {
  console.log('\nSource change examples (was set, changed):');
  srcExamples.forEach(e => console.log(e));
}

if (APPLY) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(sets, null, 2));
  console.log(`\n✅ Wrote ${sets.length} sets back to cache.`);
} else {
  console.log('\n(Dry run — pass --apply to write changes.)');
}
