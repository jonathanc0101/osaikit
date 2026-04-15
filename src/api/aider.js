/**
 * Aider polyglot coding leaderboard API integration.
 * Attempts to fetch live data from the Aider GitHub repo, falls back
 * to hardcoded recent results. Uses only Node.js built-in fetch.
 */

const TIMEOUT_MS = 10_000;

// Aider publishes leaderboard data in their repo. Try multiple known paths.
const AIDER_DATA_URLS = [
  'https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml',
  'https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/leaderboard.yml',
  'https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/edit_leaderboard.yml',
];

let cache = { data: null, fetchedAt: null };

/**
 * Hardcoded fallback from publicly known Aider polyglot benchmark results.
 * Updated April 2026 from https://aider.chat/docs/leaderboards/
 */
const FALLBACK_RESULTS = [
  { model: 'gemini-2.5-pro-preview-06-05', passRate: 83.1, editFormat: 'diff-fenced', percentCorrect: 83.1 },
  { model: 'o3', passRate: 76.9, editFormat: 'diff', percentCorrect: 76.9 },
  { model: 'DeepSeek-V3.2-Exp', passRate: 74.2, editFormat: 'diff', percentCorrect: 74.2 },
  { model: 'gemini-2.5-pro-exp-03-25', passRate: 72.9, editFormat: 'diff-fenced', percentCorrect: 72.9 },
  { model: 'claude-opus-4', passRate: 72.0, editFormat: 'diff', percentCorrect: 72.0 },
  { model: 'o4-mini', passRate: 72.0, editFormat: 'diff', percentCorrect: 72.0 },
  { model: 'deepseek-r1-0528', passRate: 71.4, editFormat: 'diff', percentCorrect: 71.4 },
  { model: 'claude-3-7-sonnet', passRate: 64.9, editFormat: 'diff', percentCorrect: 64.9 },
  { model: 'claude-sonnet-4', passRate: 61.3, editFormat: 'diff', percentCorrect: 61.3 },
  { model: 'o3-mini', passRate: 60.4, editFormat: 'diff', percentCorrect: 60.4 },
  { model: 'deepseek-chat-v3-0324', passRate: 60.2, editFormat: 'diff', percentCorrect: 60.2 },
  { model: 'qwen3-235b-a22b', passRate: 59.6, editFormat: 'diff', percentCorrect: 59.6 },
  { model: 'deepseek-r1', passRate: 56.9, editFormat: 'diff', percentCorrect: 56.9 },
  { model: 'gpt-4o-2024-08-06', passRate: 56.4, editFormat: 'diff', percentCorrect: 56.4 },
  { model: 'claude-3-5-sonnet-20241022', passRate: 53.8, editFormat: 'diff', percentCorrect: 53.8 },
  { model: 'gemini-2.0-flash', passRate: 50.8, editFormat: 'diff-fenced', percentCorrect: 50.8 },
  { model: 'gpt-4-turbo-2024-04-09', passRate: 50.0, editFormat: 'diff', percentCorrect: 50.0 },
  { model: 'llama-3.1-405b-instruct', passRate: 36.1, editFormat: 'diff', percentCorrect: 36.1 },
];

/**
 * Fetches the Aider polyglot coding leaderboard.
 * @param {number} limit
 * @returns {Promise<Array>} Normalized results sorted by passRate descending
 */
export async function fetchAiderLeaderboard(limit = 20) {
  if (cache.data) {
    return cache.data.slice(0, limit);
  }

  const liveData = await fetchLive();

  if (liveData && liveData.length > 0) {
    cache.data = liveData;
    cache.fetchedAt = new Date().toISOString();
    return liveData.slice(0, limit);
  }

  // Fallback
  const sorted = [...FALLBACK_RESULTS].sort((a, b) => b.passRate - a.passRate);
  cache.data = sorted;
  cache.fetchedAt = new Date().toISOString();
  return sorted.slice(0, limit);
}

/**
 * Try each known URL until one succeeds.
 * @returns {Promise<Array|null>}
 */
async function fetchLive() {
  for (const url of AIDER_DATA_URLS) {
    try {
      const result = await fetchAndParseYaml(url);
      if (result && result.length > 0) return result;
    } catch {
      // Try next URL
    }
  }
  return null;
}

/**
 * Fetch a YAML file and do a best-effort parse into leaderboard entries.
 * Since we cannot use external YAML parsers, we do a simple line-based parse
 * that handles the common Aider leaderboard YAML structure.
 */
async function fetchAndParseYaml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'text/plain' },
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Aider data returned ${response.status}`);
  }

  const text = await response.text();
  return parseSimpleYaml(text);
}

/**
 * Best-effort YAML parser for Aider leaderboard format.
 * Handles the typical structure:
 *   - model: gpt-4
 *     pass_rate_2: 73.7
 *     edit_format: diff
 *     percent_cases_well_formed: 97.5
 */
function parseSimpleYaml(text) {
  const entries = [];
  let current = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd();

    // New entry starts with "- "
    if (line.match(/^-\s+\w/)) {
      if (current) entries.push(current);
      current = {};
      const kv = parseYamlKV(line.replace(/^-\s*/, ''));
      if (kv) current[kv.key] = kv.value;
    } else if (current && line.match(/^\s+\w/)) {
      const kv = parseYamlKV(line.trim());
      if (kv) current[kv.key] = kv.value;
    }
  }
  if (current) entries.push(current);

  if (entries.length === 0) return null;

  return entries
    .map(entry => {
      const model = entry.model || entry.name || null;
      if (!model) return null;

      const passRate = parseFloat(
        entry.pass_rate_2 ?? entry.pass_rate ?? entry.percent_correct ?? entry.score ?? 0
      );

      return {
        model,
        passRate,
        editFormat: entry.edit_format || entry.editFormat || 'unknown',
        percentCorrect: passRate,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.passRate - a.passRate);
}

/**
 * Parse a single "key: value" YAML line.
 */
function parseYamlKV(line) {
  const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)/);
  if (!match) return null;

  let value = match[2].trim();
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  // Try to parse as number
  const num = Number(value);
  if (!isNaN(num) && value !== '') {
    value = num;
  }

  return { key: match[1], value };
}

export function clearCache() {
  cache = { data: null, fetchedAt: null };
}

export function getCacheInfo() {
  return {
    cached: cache.data !== null,
    count: cache.data?.length ?? 0,
    fetchedAt: cache.fetchedAt,
  };
}
