/**
 * Pre-generates AI guides for all transmog sets and saves to guides_cache.json.
 * Run from the backend/ directory: node scripts/generateAllGuides.js
 *
 * - Skips already-generated guides (safe to re-run / resume after interruption)
 * - Saves checkpoint every 20 guides
 * - Ctrl+C saves progress and exits cleanly
 */

require('dotenv').config();

const fs   = require('fs').promises;
const path = require('path');
const { generateSetGuide } = require('../utils/geminiService');

const SETS_FILE     = path.join(__dirname, '../data/blizzard_transmogs_cache.json');
const GUIDES_FILE   = path.join(__dirname, '../data/guides_cache.json');
const RATE_LIMIT_MS = 1500; // 40 RPM — paid tier supports up to 150+ RPM, this is safe
const SAVE_EVERY    = 25;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function loadJSON(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

async function main() {
  // ── Load data ──────────────────────────────────────────────────────
  const allSets = await loadJSON(SETS_FILE, []);
  const cache   = await loadJSON(GUIDES_FILE, {});

  if (allSets.length === 0) {
    console.error('ERROR: No sets found in blizzard_transmogs_cache.json');
    console.error('Start the server first to let hydration run, then re-run this script.');
    process.exit(1);
  }

  const done      = new Set(Object.keys(cache).map(Number));
  const remaining = allSets.filter(s => !done.has(s.id));
  let   completed = done.size;
  let   errors    = 0;
  const total     = allSets.length;

  console.log(`Total sets: ${total}`);
  console.log(`Already cached: ${completed}`);
  console.log(`To generate: ${remaining.length}`);

  if (remaining.length === 0) {
    console.log('\nAll guides already generated!');
    return;
  }

  const etaMin = Math.ceil((remaining.length * RATE_LIMIT_MS) / 60000);
  console.log(`ETA: ~${etaMin} min at ${Math.round(60000/RATE_LIMIT_MS)} RPM (gemini-2.5-pro)\n`);

  // ── Graceful shutdown ──────────────────────────────────────────────
  let shuttingDown = false;
  const save = () => fs.writeFile(GUIDES_FILE, JSON.stringify(cache, null, 2));

  process.on('SIGINT', async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\nInterrupt received — saving progress...');
    await save();
    console.log(`Saved ${Object.keys(cache).length}/${total} guides. Run again to resume.`);
    process.exit(0);
  });

  // ── Main loop ──────────────────────────────────────────────────────
  for (let i = 0; i < remaining.length; i++) {
    if (shuttingDown) break;

    const set = remaining[i];

    try {
      const content = await generateSetGuide(set);
      cache[set.id] = { content, generatedAt: new Date().toISOString() };
      completed++;

      const pct = ((completed / total) * 100).toFixed(1);
      console.log(`[${completed}/${total} ${pct}%] ${set.name} (${set.expansion})`);

      if (completed % SAVE_EVERY === 0) {
        await save();
        console.log(`  > checkpoint — ${completed} saved`);
      }
    } catch (err) {
      errors++;
      console.error(`[ERROR ${completed + 1}/${total}] ${set.name}: ${err.message}`);
    }

    if (i < remaining.length - 1 && !shuttingDown) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  // ── Final save ─────────────────────────────────────────────────────
  await save();
  console.log(`\n✅ Done. ${completed}/${total} guides cached. ${errors} errors skipped.`);
  if (errors > 0) {
    console.log('Re-run the script to retry failed sets.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
