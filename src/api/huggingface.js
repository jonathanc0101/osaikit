/**
 * HuggingFace Open LLM Leaderboard API integration.
 * Fetches top text-generation models sorted by likes from the HF API.
 * Uses only Node.js built-in fetch — no external dependencies.
 */

let cache = { data: null, fetchedAt: null };

const HF_MODELS_API = 'https://huggingface.co/api/models';
const TIMEOUT_MS = 10_000;

/**
 * Fetches a page of text-generation models from the HuggingFace API.
 * @param {number} limit - Max results to return
 * @returns {Promise<Array|null>} Normalized leaderboard entries, or null on failure
 */
export async function fetchHuggingFaceLeaderboard(limit = 20) {
  // Return cached data if available this session
  if (cache.data) {
    return cache.data.slice(0, limit);
  }

  try {
    const url = new URL(HF_MODELS_API);
    url.searchParams.set('sort', 'likes');
    url.searchParams.set('direction', '-1');
    url.searchParams.set('limit', String(Math.max(limit, 50)));
    url.searchParams.set('filter', 'text-generation');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response;
    try {
      response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`HuggingFace API returned ${response.status}: ${response.statusText}`);
    }

    const raw = await response.json();

    if (!Array.isArray(raw)) {
      throw new Error('Unexpected response shape — expected an array of models');
    }

    const results = raw.map(normalizeModel).filter(Boolean);

    cache.data = results;
    cache.fetchedAt = new Date().toISOString();

    return results.slice(0, limit);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[huggingface] Request timed out after', TIMEOUT_MS, 'ms');
    } else {
      console.error('[huggingface] Fetch failed:', err.message);
    }
    return null;
  }
}

/**
 * Normalize a raw HF model object into the standard leaderboard shape.
 * The public /api/models endpoint does not include benchmark scores directly,
 * so those fields are set to null. The primary value here is the model catalog
 * with popularity signals (likes, downloads).
 *
 * Benchmark fields reflect the Open LLM Leaderboard v2 suite
 * (v1 benchmarks — ARC, HellaSwag, MMLU, TruthfulQA, Winogrande, GSM8K — were retired).
 */
function normalizeModel(raw) {
  if (!raw || !raw.modelId && !raw.id) return null;

  return {
    modelId: raw.modelId || raw.id,
    averageScore: null, // Not available from /api/models
    scores: {
      ifeval: null,
      bbh: null,
      math: null,
      gpqa: null,
      musr: null,
      mmluPro: null,
    },
    likes: raw.likes ?? 0,
    downloads: raw.downloads ?? 0,
  };
}

/**
 * Clears the in-memory cache (useful for testing or forced refresh).
 */
export function clearCache() {
  cache = { data: null, fetchedAt: null };
}

/**
 * Returns cache metadata without the full payload.
 */
export function getCacheInfo() {
  return {
    cached: cache.data !== null,
    count: cache.data?.length ?? 0,
    fetchedAt: cache.fetchedAt,
  };
}
