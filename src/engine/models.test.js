import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS, parseMemGB, getModelFamilies, getModelById } from './models.js';

describe('MODELS database', () => {
  it('contains at least 30 models', () => {
    assert.ok(MODELS.length >= 45, `Expected 45+, got ${MODELS.length}`);
  });

  it('every model has all required fields', () => {
    const requiredFields = [
      'id', 'name', 'family', 'params', 'contextWindow',
      'quantizable', 'onDevice', 'license', 'commercialUse',
      'strengths', 'weaknesses', 'minRAM', 'typicalLatency',
      'fineTunable', 'adapterSupport', 'ecosystem', 'deploymentOptions',
      'benchmarks', 'defaultConfig', 'releaseDate', 'provider', 'url',
    ];
    for (const model of MODELS) {
      for (const field of requiredFields) {
        assert.ok(
          field in model,
          `Model "${model.id || model.name}" missing field "${field}"`
        );
      }
    }
  });

  it('every model ID is unique', () => {
    const ids = MODELS.map(m => m.id);
    const unique = new Set(ids);
    assert.equal(ids.length, unique.size, 'Duplicate model IDs found');
  });

  it('licenses are valid enum values', () => {
    const valid = new Set(['permissive', 'copyleft', 'restricted', 'research-only']);
    for (const model of MODELS) {
      assert.ok(valid.has(model.license), `Invalid license "${model.license}" on ${model.id}`);
    }
  });

  it('latency values are valid', () => {
    const valid = new Set(['low', 'medium', 'high']);
    for (const model of MODELS) {
      assert.ok(valid.has(model.typicalLatency), `Invalid latency "${model.typicalLatency}" on ${model.id}`);
    }
  });

  it('context windows are positive integers', () => {
    for (const model of MODELS) {
      assert.ok(Number.isInteger(model.contextWindow) && model.contextWindow > 0,
        `Invalid contextWindow on ${model.id}: ${model.contextWindow}`);
    }
  });

  it('benchmarks have humaneval, swebench, aiderPolyglot fields', () => {
    for (const model of MODELS) {
      assert.ok('humaneval' in model.benchmarks, `Missing humaneval on ${model.id}`);
      assert.ok('swebench' in model.benchmarks, `Missing swebench on ${model.id}`);
      assert.ok('aiderPolyglot' in model.benchmarks, `Missing aiderPolyglot on ${model.id}`);
    }
  });

  it('defaultConfig has temperature, topP, maxTokens', () => {
    for (const model of MODELS) {
      assert.ok(typeof model.defaultConfig.temperature === 'number', `Bad temp on ${model.id}`);
      assert.ok(typeof model.defaultConfig.topP === 'number', `Bad topP on ${model.id}`);
      assert.ok(typeof model.defaultConfig.maxTokens === 'number', `Bad maxTokens on ${model.id}`);
    }
  });

  it('covers expected model families', () => {
    const families = getModelFamilies();
    const expected = ['CodeLlama', 'StarCoder2', 'Llama 3.1', 'Mistral', 'Qwen2.5-Coder', 'Qwen3', 'Llama 4', 'Gemma 3', 'Phi-4', 'DeepSeek R1'];
    for (const name of expected) {
      assert.ok(
        families.some(f => f.includes(name) || name.includes(f)),
        `Missing family: ${name}. Have: ${families.join(', ')}`
      );
    }
  });
});

describe('parseMemGB', () => {
  it('parses "16GB" to 16', () => assert.equal(parseMemGB('16GB'), 16));
  it('parses "128GB" to 128', () => assert.equal(parseMemGB('128GB'), 128));
  it('returns Infinity for "unlimited"', () => assert.equal(parseMemGB('unlimited'), Infinity));
  it('returns Infinity for unrecognized input (permissive fallback)', () => {
    const val = parseMemGB('foo');
    assert.equal(val, Infinity, 'Unrecognized memory strings default to Infinity (no constraint)');
  });
});

describe('getModelById', () => {
  it('finds a known model', () => {
    const m = getModelById('deepseek-coder-v2-16b');
    assert.ok(m);
    assert.equal(m.name, 'DeepSeek Coder V2 Lite');
  });

  it('returns undefined for unknown ID', () => {
    assert.ok(getModelById('nonexistent-model') == null, 'Should return null or undefined');
  });
});
