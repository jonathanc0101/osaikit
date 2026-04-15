/**
 * Leaderboard aggregator — fetches all five leaderboards in parallel
 * and provides model enrichment via fuzzy name matching.
 */

import { fetchHuggingFaceLeaderboard } from './huggingface.js';
import { fetchSWEBenchLeaderboard } from './swebench.js';
import { fetchAiderLeaderboard } from './aider.js';
import { fetchLiveCodeBenchLeaderboard } from './livecodebench.js';
import { fetchBigCodeBenchLeaderboard } from './bigcodebench.js';

export { fetchHuggingFaceLeaderboard } from './huggingface.js';
export { fetchSWEBenchLeaderboard } from './swebench.js';
export { fetchAiderLeaderboard } from './aider.js';
export { fetchLiveCodeBenchLeaderboard } from './livecodebench.js';
export { fetchBigCodeBenchLeaderboard } from './bigcodebench.js';

/**
 * Fetch all five leaderboards concurrently.
 * Uses Promise.allSettled so one failure does not block the others.
 *
 * @returns {Promise<{huggingface: Array|null, swebench: Array|null, aider: Array|null, livecodebench: Array|null, bigcodebench: Array|null, fetchedAt: string, errors: string[]}>}
 */
export async function fetchAllLeaderboards() {
  const errors = [];

  const [hfResult, sweResult, aiderResult, lcbResult, bcbResult] = await Promise.allSettled([
    fetchHuggingFaceLeaderboard(),
    fetchSWEBenchLeaderboard(),
    fetchAiderLeaderboard(),
    fetchLiveCodeBenchLeaderboard(),
    fetchBigCodeBenchLeaderboard(),
  ]);

  const extract = (result, label) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    errors.push(`${label}: ${result.reason?.message || 'Unknown error'}`);
    return null;
  };

  return {
    huggingface: extract(hfResult, 'HuggingFace'),
    swebench: extract(sweResult, 'SWE-bench'),
    aider: extract(aiderResult, 'Aider'),
    livecodebench: extract(lcbResult, 'LiveCodeBench'),
    bigcodebench: extract(bcbResult, 'BigCodeBench'),
    fetchedAt: new Date().toISOString(),
    errors,
  };
}

/**
 * Enrich a model object from the local DB with any matching leaderboard scores.
 *
 * @param {Object} model - A model from the local database. Expected to have at least a `name` or `id` field.
 * @param {Object} leaderboards - The result of fetchAllLeaderboards()
 * @returns {Object} The model with an added `leaderboard` property containing matched scores
 */
export function enrichModelWithLeaderboardData(model, leaderboards) {
  if (!model || !leaderboards) return model;

  const modelName = model.name || model.id || model.modelId || '';
  const enriched = { ...model, leaderboard: {} };

  // HuggingFace match
  if (leaderboards.huggingface) {
    const match = findBestMatch(modelName, leaderboards.huggingface, entry => entry.modelId);
    if (match) {
      enriched.leaderboard.huggingface = {
        modelId: match.modelId,
        likes: match.likes,
        downloads: match.downloads,
        averageScore: match.averageScore,
        scores: match.scores,
      };
    }
  }

  // SWE-bench match
  if (leaderboards.swebench) {
    const match = findBestMatch(modelName, leaderboards.swebench, entry => entry.model);
    if (match) {
      enriched.leaderboard.swebench = {
        model: match.model,
        resolvedRate: match.resolvedRate,
        totalInstances: match.totalInstances,
        agent: match.agent,
      };
    }
  }

  // Aider match
  if (leaderboards.aider) {
    const match = findBestMatch(modelName, leaderboards.aider, entry => entry.model);
    if (match) {
      enriched.leaderboard.aider = {
        model: match.model,
        passRate: match.passRate,
        editFormat: match.editFormat,
      };
    }
  }

  // LiveCodeBench match
  if (leaderboards.livecodebench) {
    const match = findBestMatch(modelName, leaderboards.livecodebench, entry => entry.model);
    if (match) {
      enriched.leaderboard.livecodebench = {
        model: match.model,
        passRate: match.passRate,
        category: match.category,
      };
    }
  }

  // BigCodeBench match
  if (leaderboards.bigcodebench) {
    const match = findBestMatch(modelName, leaderboards.bigcodebench, entry => entry.model);
    if (match) {
      enriched.leaderboard.bigcodebench = {
        model: match.model,
        passRate: match.passRate,
        variant: match.variant,
      };
    }
  }

  return enriched;
}

// ---------------------------------------------------------------------------
// Fuzzy matching
// ---------------------------------------------------------------------------

/**
 * Find the best fuzzy match for `query` in `entries`, using `getKey` to
 * extract the comparable name from each entry.
 *
 * Matching strategy (ordered by priority):
 *  1. Exact match (case-insensitive)
 *  2. One name contains the other
 *  3. Normalized token overlap (Jaccard-like) above threshold
 *
 * @param {string} query
 * @param {Array} entries
 * @param {Function} getKey - Extracts the name string from an entry
 * @returns {Object|null}
 */
function findBestMatch(query, entries, getKey) {
  if (!query || !entries || entries.length === 0) return null;

  const normQuery = normalize(query);
  const queryTokens = tokenize(normQuery);

  let bestMatch = null;
  let bestScore = 0;

  for (const entry of entries) {
    const key = getKey(entry);
    if (!key) continue;

    const normKey = normalize(key);

    // Exact match
    if (normQuery === normKey) return entry;

    // Containment check
    if (normQuery.includes(normKey) || normKey.includes(normQuery)) {
      const score = 0.9;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
      continue;
    }

    // Token overlap (Jaccard similarity)
    const keyTokens = tokenize(normKey);
    const intersection = queryTokens.filter(t => keyTokens.includes(t));
    const union = new Set([...queryTokens, ...keyTokens]);

    if (union.size === 0) continue;

    const score = intersection.length / union.size;
    if (score > bestScore && score >= 0.3) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch;
}

/**
 * Normalize a model name for comparison.
 * Strips org prefixes, version suffixes, and common noise.
 */
function normalize(name) {
  return name
    .toLowerCase()
    // Remove org prefix (e.g., "meta-llama/")
    .replace(/^[a-z0-9_-]+\//, '')
    // Collapse separators
    .replace(/[-_.]+/g, '-')
    // Remove common suffixes that don't affect identity
    .replace(/-instruct$/, '')
    .replace(/-chat$/, '')
    .replace(/-hf$/, '')
    .trim();
}

/**
 * Split a normalized name into meaningful tokens.
 */
function tokenize(name) {
  return name
    .split(/[-_./\s]+/)
    .filter(t => t.length > 0);
}
