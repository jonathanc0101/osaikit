/**
 * SWE-bench Verified leaderboard API integration.
 * Attempts live fetch from the SWE-bench experiments repo, falls back to
 * cached JSON data, then to built-in hardcoded results.
 * Uses only Node.js built-in fetch.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TIMEOUT_MS = 10_000;

// Try multiple known paths — the repo structure has changed over time
const RESULTS_URLS = [
  'https://raw.githubusercontent.com/swe-bench/experiments/main/evaluation/verified/results/results.json',
  'https://raw.githubusercontent.com/swe-bench/experiments/main/evaluation/verified/results.json',
  'https://raw.githubusercontent.com/swe-bench/experiments/main/results.json',
];

let cache = { data: null, fetchedAt: null };

/**
 * Built-in fallback data from publicly known SWE-bench Verified results
 * as of April 2026. Used when both live fetch and cache file fail.
 */
const BUILTIN_FALLBACK = [
  { model: 'Devstral Small 2', resolvedRate: 68.0, totalInstances: 500, agent: 'SWE-agent', dateSubmitted: '2025-12-15' },
  { model: 'Qwen3-Coder 480B-A35B', resolvedRate: 65.4, totalInstances: 500, agent: 'OpenHands CodeAct v2.1', dateSubmitted: '2025-07-22' },
  { model: 'Gemini 2.5 Pro', resolvedRate: 63.8, totalInstances: 500, agent: 'OpenHands CodeAct v2.1', dateSubmitted: '2025-04-01' },
  { model: 'DeepSeek R1-0528', resolvedRate: 57.6, totalInstances: 500, agent: 'OpenHands CodeAct v2.1', dateSubmitted: '2025-06-01' },
  { model: 'Claude 3.7 Sonnet', resolvedRate: 57.0, totalInstances: 500, agent: 'OpenHands CodeAct v2.1', dateSubmitted: '2025-03-15' },
  { model: 'GPT-4.1', resolvedRate: 54.6, totalInstances: 500, agent: 'OpenHands CodeAct v2.1', dateSubmitted: '2025-04-15' },
  { model: 'GPT-o3-mini', resolvedRate: 48.6, totalInstances: 500, agent: 'OpenHands CodeAct v2.1', dateSubmitted: '2025-03-01' },
  { model: 'DeepSeek R1', resolvedRate: 44.6, totalInstances: 500, agent: 'SWE-agent', dateSubmitted: '2025-01-20' },
  { model: 'DeepSeek-V3', resolvedRate: 42.0, totalInstances: 500, agent: 'Agentless', dateSubmitted: '2025-01-10' },
  { model: 'GPT-o1-preview', resolvedRate: 41.2, totalInstances: 500, agent: 'Agentless', dateSubmitted: '2024-10-01' },
  { model: 'Qwen3-235B-A22B', resolvedRate: 38.8, totalInstances: 500, agent: 'SWE-agent', dateSubmitted: '2025-05-01' },
  { model: 'GPT-4o (2024-08-06)', resolvedRate: 38.4, totalInstances: 500, agent: 'Agentless', dateSubmitted: '2024-09-15' },
  { model: 'Gemini 2.0 Flash', resolvedRate: 36.2, totalInstances: 500, agent: 'Agentless', dateSubmitted: '2025-02-15' },
  { model: 'Qwen2.5-72B-Instruct', resolvedRate: 27.0, totalInstances: 500, agent: 'SWE-agent', dateSubmitted: '2024-12-01' },
  { model: 'Llama 3.1 405B', resolvedRate: 23.0, totalInstances: 500, agent: 'SWE-agent', dateSubmitted: '2024-08-01' },
  { model: 'Mistral Large 2', resolvedRate: 22.4, totalInstances: 500, agent: 'SWE-agent', dateSubmitted: '2024-09-20' },
];

function loadFallback() {
  try {
    const raw = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'leaderboard-cache.json'), 'utf-8'));
    if (raw.swebench && Array.isArray(raw.swebench) && raw.swebench.length > 0) return raw.swebench;
    return BUILTIN_FALLBACK;
  } catch {
    return BUILTIN_FALLBACK;
  }
}

/**
 * Fetches the SWE-bench Verified leaderboard.
 * @param {number} limit
 * @returns {Promise<Array>} Normalized results sorted by resolvedRate descending
 */
export async function fetchSWEBenchLeaderboard(limit = 20) {
  if (cache.data) {
    return cache.data.slice(0, limit);
  }

  const liveData = await fetchLive();

  if (liveData && liveData.length > 0) {
    cache.data = liveData;
    cache.fetchedAt = new Date().toISOString();
    return liveData.slice(0, limit);
  }

  // Fallback to cached / built-in data
  const sorted = [...loadFallback()].sort((a, b) => b.resolvedRate - a.resolvedRate);
  cache.data = sorted;
  cache.fetchedAt = new Date().toISOString();
  return sorted.slice(0, limit);
}

/**
 * Attempt to fetch live results from GitHub — tries multiple known URLs.
 * @returns {Promise<Array|null>}
 */
async function fetchLive() {
  for (const url of RESULTS_URLS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let response;
      try {
        response = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) continue;

      const raw = await response.json();
      const results = normalizeResults(raw);
      if (results && results.length > 0) return results;
    } catch {
      // Try next URL
    }
  }
  console.error('[swebench] All live fetch URLs failed — using fallback data');
  return null;
}

/**
 * Normalize raw SWE-bench results JSON into a consistent shape.
 * The repo format can vary — this handles both object-keyed and array formats.
 */
function normalizeResults(raw) {
  try {
    // If it's an array of result objects
    if (Array.isArray(raw)) {
      return raw
        .map(entry => ({
          model: entry.model || entry.name || entry.model_name || 'Unknown',
          resolvedRate: parseFloat(entry.resolved_rate ?? entry.resolve_rate ?? entry.resolved ?? 0),
          totalInstances: parseInt(entry.total_instances ?? entry.total ?? 500, 10),
          agent: entry.agent || entry.framework || 'Unknown',
          dateSubmitted: entry.date || entry.date_submitted || null,
        }))
        .sort((a, b) => b.resolvedRate - a.resolvedRate);
    }

    // If it's an object keyed by model/submission name
    if (typeof raw === 'object' && raw !== null) {
      return Object.entries(raw)
        .map(([key, value]) => ({
          model: value.model || key,
          resolvedRate: parseFloat(value.resolved_rate ?? value.resolve_rate ?? value.resolved ?? 0),
          totalInstances: parseInt(value.total_instances ?? value.total ?? 500, 10),
          agent: value.agent || value.framework || 'Unknown',
          dateSubmitted: value.date || value.date_submitted || null,
        }))
        .sort((a, b) => b.resolvedRate - a.resolvedRate);
    }

    return null;
  } catch {
    return null;
  }
}

export function clearCache() {
  cache = { data: null, fetchedAt: null };
}

export function getCacheInfo() {
  return {
    cached: cache.data !== null,
    count: cache.data?.length ?? 0,
    fetchedAt: cache.fetchedAt,
    isFallback: cache.data === BUILTIN_FALLBACK,
  };
}
