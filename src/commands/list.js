/**
 * osaikit list — browse and filter the model database.
 */

import { MODELS } from '../engine/models.js';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

export async function runList(opts = {}) {
  let models = [...MODELS];

  // Filter legacy by default (unless --legacy flag)
  if (!opts.legacy) {
    models = models.filter(m => !m.legacy);
  }

  // Filter by family
  if (opts.family) {
    const fam = opts.family.toLowerCase();
    models = models.filter(m =>
      m.family.toLowerCase().includes(fam) || m.id.toLowerCase().includes(fam)
    );
  }

  // Filter on-device
  if (opts.onDevice) {
    models = models.filter(m => m.onDevice);
  }

  // JSON output
  if (opts.json) {
    console.log(JSON.stringify(models.map(m => ({
      id: m.id,
      name: m.name,
      family: m.family,
      params: m.params,
      context: m.contextWindow,
      license: m.license,
      onDevice: m.onDevice,
      minRAM: m.minRAM,
      provider: m.provider,
      releaseDate: m.releaseDate,
      legacy: m.legacy || false,
    })), null, 2));
    return;
  }

  // Table output
  console.log(`\n  ${GREEN}${BOLD}OSAI${RESET} ${DIM}— model database${RESET}\n`);

  if (models.length === 0) {
    console.log(`  No models match your filters.\n`);
    return;
  }

  // Header
  console.log(`  ${DIM}${'ID'.padEnd(30)} ${'PARAMS'.padEnd(8)} ${'CTX'.padEnd(8)} ${'RAM'.padEnd(6)} ${'LICENSE'.padEnd(12)} ${'PROVIDER'.padEnd(14)} RELEASED${RESET}`);
  console.log(`  ${DIM}${'─'.repeat(100)}${RESET}`);

  for (const m of models) {
    const legacy = m.legacy ? ` ${YELLOW}(legacy)${RESET}` : '';
    const onDevice = m.onDevice ? `${GREEN}●${RESET}` : `${DIM}○${RESET}`;
    const ctx = m.contextWindow >= 1_000_000
      ? `${(m.contextWindow / 1_000_000).toFixed(0)}M`
      : `${(m.contextWindow / 1_000).toFixed(0)}K`;

    console.log(
      `  ${onDevice} ${CYAN}${m.id.padEnd(28)}${RESET} ` +
      `${m.params.padEnd(8)} ` +
      `${ctx.padEnd(8)} ` +
      `${m.minRAM.padEnd(6)} ` +
      `${m.license.padEnd(12)} ` +
      `${m.provider.padEnd(14)} ` +
      `${m.releaseDate}${legacy}`
    );
  }

  const totalAll = MODELS.length;
  const totalLegacy = MODELS.filter(m => m.legacy).length;
  console.log(`\n  ${DIM}Showing ${models.length} models (${totalAll} total, ${totalLegacy} legacy — use --legacy to include)${RESET}\n`);
}
