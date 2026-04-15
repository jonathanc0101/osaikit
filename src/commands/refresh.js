/**
 * osaikit refresh — fetch live leaderboard data and update local cache.
 * The cache file ships with npm publish so users get reasonably fresh fallback data.
 */

import { fetchAllLeaderboards } from '../api/index.js';
import { clearCache as clearHF } from '../api/huggingface.js';
import { clearCache as clearSWE } from '../api/swebench.js';
import { clearCache as clearAider } from '../api/aider.js';
import { clearCache as clearLCB } from '../api/livecodebench.js';
import { clearCache as clearBCB } from '../api/bigcodebench.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CACHE_PATH = join(process.cwd(), 'src', 'data', 'leaderboard-cache.json');

export async function runRefresh() {
  console.log('\n  Refreshing leaderboard data...\n');

  clearHF();
  clearSWE();
  clearAider();
  clearLCB();
  clearBCB();

  const results = await fetchAllLeaderboards();

  const sources = [
    ['HuggingFace', results.huggingface],
    ['SWE-bench Verified', results.swebench],
    ['Aider Polyglot', results.aider],
    ['LiveCodeBench', results.livecodebench],
    ['BigCodeBench', results.bigcodebench],
  ];

  for (const [name, data] of sources) {
    if (data) {
      console.log(`  \x1b[32m✓\x1b[0m ${name}: ${data.length} entries`);
    } else {
      console.log(`  \x1b[33m⚠\x1b[0m ${name}: live fetch failed`);
    }
  }

  if (results.errors.length > 0) {
    console.log(`\n  Errors: ${results.errors.join(', ')}`);
  }

  // Write cache file for npm publish
  const cache = {
    swebench: results.swebench,
    aider: results.aider,
    livecodebench: results.livecodebench,
    bigcodebench: results.bigcodebench,
    fetchedAt: results.fetchedAt,
  };

  try {
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n');
    console.log(`\n  \x1b[32m✓\x1b[0m Cache written to src/data/leaderboard-cache.json`);
  } catch (err) {
    console.log(`\n  \x1b[33m⚠\x1b[0m Could not write cache: ${err.message}`);
  }

  console.log(`  Fetched at: ${results.fetchedAt}\n`);
}
