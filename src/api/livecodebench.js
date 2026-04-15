/**
 * LiveCodeBench leaderboard integration.
 * Fetches coding benchmark results from LiveCodeBench — a contamination-free
 * coding benchmark with regularly refreshed problems.
 * Falls back to cached JSON data, then to built-in hardcoded results.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TIMEOUT_MS = 10_000;

const LIVECODEBENCH_URL =
  'https://raw.githubusercontent.com/LiveCodeBench/LiveCodeBench/main/data/release_latest.json';

let cache = { data: null, fetchedAt: null };

/**
 * Built-in fallback from publicly known LiveCodeBench results.
 * Used when both live fetch and cache file fail.
 */
const BUILTIN_FALLBACK = [
  { model: 'claude-opus-4', passRate: 58.2, category: 'code-generation', dateEvaluated: '2025-06' },
  { model: 'gemini-2.5-pro', passRate: 55.8, category: 'code-generation', dateEvaluated: '2025-06' },
  { model: 'o3', passRate: 54.6, category: 'code-generation', dateEvaluated: '2025-06' },
  { model: 'deepseek-v3-0324', passRate: 46.2, category: 'code-generation', dateEvaluated: '2025-04' },
  { model: 'claude-3-7-sonnet', passRate: 44.8, category: 'code-generation', dateEvaluated: '2025-03' },
  { model: 'deepseek-r1', passRate: 42.5, category: 'code-generation', dateEvaluated: '2025-02' },
  { model: 'qwen3-235b-a22b', passRate: 40.1, category: 'code-generation', dateEvaluated: '2025-05' },
  { model: 'gpt-4o-2024-08-06', passRate: 38.4, category: 'code-generation', dateEvaluated: '2025-03' },
  { model: 'qwen2.5-coder-32b', passRate: 32.8, category: 'code-generation', dateEvaluated: '2025-01' },
  { model: 'phi-4-reasoning', passRate: 30.2, category: 'code-generation', dateEvaluated: '2025-05' },
  { model: 'llama-3.1-405b', passRate: 28.6, category: 'code-generation', dateEvaluated: '2025-01' },
  { model: 'gemma-3-27b', passRate: 26.4, category: 'code-generation', dateEvaluated: '2025-04' },
];

function loadFallback() {
  try {
    const raw = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'leaderboard-cache.json'), 'utf-8'));
    if (raw.livecodebench && Array.isArray(raw.livecodebench) && raw.livecodebench.length > 0) return raw.livecodebench;
    return BUILTIN_FALLBACK;
  } catch {
    return BUILTIN_FALLBACK;
  }
}

/**
 * Fetches the LiveCodeBench leaderboard.
 * @param {number} limit
 * @returns {Promise<Array>} Normalized results sorted by passRate descending
 */
export async function fetchLiveCodeBenchLeaderboard(limit = 20) {
  if (cache.data) {
    return cache.data.slice(0, limit);
  }

  const liveData = await fetchLive();

  if (liveData && liveData.length > 0) {
    cache.data = liveData;
    cache.fetchedAt = new Date().toISOString();
    return liveData.slice(0, limit);
  }

  const sorted = [...loadFallback()].sort((a, b) => b.passRate - a.passRate);
  cache.data = sorted;
  cache.fetchedAt = new Date().toISOString();
  return sorted.slice(0, limit);
}

async function fetchLive() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response;
    try {
      response = await fetch(LIVECODEBENCH_URL, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`LiveCodeBench returned ${response.status}`);
    }

    const raw = await response.json();
    return normalizeResults(raw);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[livecodebench] Request timed out after', TIMEOUT_MS, 'ms');
    } else {
      console.error('[livecodebench] Live fetch failed:', err.message, '— using fallback data');
    }
    return null;
  }
}

function normalizeResults(raw) {
  try {
    if (Array.isArray(raw)) {
      return raw
        .map(entry => ({
          model: entry.model || entry.model_name || entry.name || 'Unknown',
          passRate: parseFloat(entry.pass_rate ?? entry.pass_at_1 ?? entry.score ?? 0),
          category: entry.category || entry.task_type || 'code-generation',
          dateEvaluated: entry.date || entry.evaluated_at || null,
        }))
        .filter(e => e.passRate > 0)
        .sort((a, b) => b.passRate - a.passRate);
    }

    if (typeof raw === 'object' && raw !== null) {
      return Object.entries(raw)
        .map(([key, value]) => ({
          model: value.model || key,
          passRate: parseFloat(value.pass_rate ?? value.pass_at_1 ?? value.score ?? 0),
          category: value.category || 'code-generation',
          dateEvaluated: value.date || null,
        }))
        .filter(e => e.passRate > 0)
        .sort((a, b) => b.passRate - a.passRate);
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
  };
}
