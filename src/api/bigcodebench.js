/**
 * BigCodeBench leaderboard integration.
 * Fetches coding benchmark results from BigCodeBench — a comprehensive
 * function-level coding benchmark covering diverse programming tasks.
 * Falls back to cached JSON data, then to built-in hardcoded results.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TIMEOUT_MS = 10_000;

const BIGCODEBENCH_URLS = [
  'https://raw.githubusercontent.com/bigcode-project/bigcodebench/main/data/leaderboard.json',
  'https://raw.githubusercontent.com/bigcode-project/bigcodebench/main/leaderboard.json',
];

let cache = { data: null, fetchedAt: null };

/**
 * Built-in fallback from publicly known BigCodeBench results.
 * Used when both live fetch and cache file fail.
 */
const BUILTIN_FALLBACK = [
  { model: 'claude-opus-4', passRate: 62.8, variant: 'complete', calibrated: true },
  { model: 'gemini-2.5-pro', passRate: 60.4, variant: 'complete', calibrated: true },
  { model: 'o3', passRate: 58.5, variant: 'complete', calibrated: true },
  { model: 'deepseek-v3-0324', passRate: 52.1, variant: 'complete', calibrated: true },
  { model: 'claude-3-7-sonnet', passRate: 50.2, variant: 'complete', calibrated: true },
  { model: 'deepseek-r1', passRate: 48.6, variant: 'complete', calibrated: true },
  { model: 'gpt-4o-2024-08-06', passRate: 45.8, variant: 'complete', calibrated: true },
  { model: 'qwen3-235b-a22b', passRate: 44.2, variant: 'complete', calibrated: true },
  { model: 'devstral-small-2', passRate: 42.2, variant: 'complete', calibrated: true },
  { model: 'qwen2.5-coder-32b', passRate: 40.5, variant: 'complete', calibrated: true },
  { model: 'llama-3.1-405b', passRate: 35.2, variant: 'complete', calibrated: true },
  { model: 'phi-4-reasoning', passRate: 34.6, variant: 'complete', calibrated: true },
  { model: 'gemma-3-27b', passRate: 32.8, variant: 'complete', calibrated: true },
  { model: 'mistral-small-3.1', passRate: 30.4, variant: 'complete', calibrated: true },
];

function loadFallback() {
  try {
    const raw = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'leaderboard-cache.json'), 'utf-8'));
    if (raw.bigcodebench && Array.isArray(raw.bigcodebench) && raw.bigcodebench.length > 0) return raw.bigcodebench;
    return BUILTIN_FALLBACK;
  } catch {
    return BUILTIN_FALLBACK;
  }
}

/**
 * Fetches the BigCodeBench leaderboard.
 * @param {number} limit
 * @returns {Promise<Array>} Normalized results sorted by passRate descending
 */
export async function fetchBigCodeBenchLeaderboard(limit = 20) {
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
  for (const url of BIGCODEBENCH_URLS) {
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
  return null;
}

function normalizeResults(raw) {
  try {
    if (Array.isArray(raw)) {
      return raw
        .map(entry => ({
          model: entry.model || entry.model_name || entry.name || 'Unknown',
          passRate: parseFloat(entry.pass_rate ?? entry.pass_at_1 ?? entry.score ?? entry.complete ?? 0),
          variant: entry.variant || entry.task || 'complete',
          calibrated: entry.calibrated ?? true,
        }))
        .filter(e => e.passRate > 0)
        .sort((a, b) => b.passRate - a.passRate);
    }

    if (typeof raw === 'object' && raw !== null) {
      return Object.entries(raw)
        .map(([key, value]) => ({
          model: value.model || key,
          passRate: parseFloat(value.pass_rate ?? value.pass_at_1 ?? value.score ?? value.complete ?? 0),
          variant: value.variant || 'complete',
          calibrated: value.calibrated ?? true,
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
