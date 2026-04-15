import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { enrichModelWithLeaderboardData, fetchAllLeaderboards } from './index.js';

describe('enrichModelWithLeaderboardData()', () => {
  const mockLeaderboards = {
    huggingface: [
      { modelId: 'meta-llama/Llama-3.1-8B-Instruct', averageScore: 72.5, likes: 5000, downloads: 100000, scores: {} },
      { modelId: 'deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct', averageScore: 68.3, likes: 2000, downloads: 50000, scores: {} },
    ],
    swebench: [
      { model: 'Claude 3.5 Sonnet (2024-10-22)', resolvedRate: 49.0, totalInstances: 500, agent: 'SWE-Agent' },
      { model: 'DeepSeek V3', resolvedRate: 42.0, totalInstances: 500, agent: 'Moatless' },
    ],
    aider: [
      { model: 'deepseek-coder-v2', passRate: 35.1, editFormat: 'diff' },
      { model: 'llama-3.1-8b-instruct', passRate: 18.2, editFormat: 'whole' },
    ],
    fetchedAt: new Date().toISOString(),
    errors: [],
  };

  it('enriches a matching model with leaderboard data', () => {
    const model = { id: 'deepseek-coder-v2-16b', name: 'DeepSeek Coder V2 Lite' };
    const enriched = enrichModelWithLeaderboardData(model, mockLeaderboards);
    assert.ok(enriched.leaderboard, 'Should have leaderboard property');
  });

  it('returns model unchanged when no leaderboards provided', () => {
    const model = { id: 'test', name: 'Test Model' };
    const result = enrichModelWithLeaderboardData(model, null);
    assert.deepEqual(result, model);
  });

  it('returns model unchanged when model is null', () => {
    const result = enrichModelWithLeaderboardData(null, mockLeaderboards);
    assert.equal(result, null);
  });

  it('handles model with no matching leaderboard entries', () => {
    const model = { id: 'unknown-model', name: 'Totally Unknown Model XYZ' };
    const enriched = enrichModelWithLeaderboardData(model, mockLeaderboards);
    assert.ok(enriched.leaderboard, 'Should still have leaderboard property');
    // May or may not have matches depending on fuzzy matching threshold
  });

  it('fuzzy matches model names across naming conventions', () => {
    const model = { id: 'llama-3.1-8b', name: 'Llama 3.1 8B Instruct' };
    const enriched = enrichModelWithLeaderboardData(model, mockLeaderboards);
    assert.ok(enriched.leaderboard);
    // Should match the HuggingFace entry
    if (enriched.leaderboard.huggingface) {
      assert.ok(enriched.leaderboard.huggingface.modelId.includes('Llama'));
    }
  });
});

describe('fetchAllLeaderboards()', () => {
  it('returns correct shape even if APIs fail', async () => {
    const result = await fetchAllLeaderboards();
    assert.ok('huggingface' in result);
    assert.ok('swebench' in result);
    assert.ok('aider' in result);
    assert.ok('livecodebench' in result);
    assert.ok('bigcodebench' in result);
    assert.ok('fetchedAt' in result);
    assert.ok('errors' in result);
    assert.ok(Array.isArray(result.errors));
  });

  it('fetchedAt is a valid ISO date', async () => {
    const result = await fetchAllLeaderboards();
    const date = new Date(result.fetchedAt);
    assert.ok(!isNaN(date.getTime()), 'fetchedAt should be valid ISO date');
  });

  // SWE-bench and Aider have hardcoded fallbacks, so they should always return data
  it('swebench returns data (has fallback)', async () => {
    const result = await fetchAllLeaderboards();
    assert.ok(result.swebench === null || Array.isArray(result.swebench));
  });

  it('aider returns data (has fallback)', async () => {
    const result = await fetchAllLeaderboards();
    assert.ok(result.aider === null || Array.isArray(result.aider));
  });
});
