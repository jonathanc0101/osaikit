import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recommend, PROMPT_TEMPLATES, WEIGHTS } from './rules.js';

// Helper to build inputs with sensible defaults
function makeInputs(overrides = {}) {
  return {
    role: 'webdev',
    languages: ['javascript', 'typescript'],
    frameworks: ['react'],
    runtime: 'node',
    platform: 'browser',
    constraints: {
      maxMemory: '32GB',
      budget: 'medium',
      deployment: 'cloud',
      privacy: 'relaxed',
    },
    useCases: ['codegen'],
    license: 'any',
    contextNeeds: 'medium',
    existingProject: false,
    ...overrides,
  };
}

describe('recommend()', () => {
  it('returns a result with all expected fields', () => {
    const result = recommend(makeInputs());
    assert.ok(result.primary, 'missing primary');
    assert.ok(result.primary.model, 'missing primary.model');
    assert.ok(result.primary.reason, 'missing primary.reason');
    assert.ok(result.primary.config, 'missing primary.config');
    assert.ok(result.primary.deploymentOption, 'missing primary.deploymentOption');
    assert.ok(result.primary.promptTemplate, 'missing primary.promptTemplate');
    assert.ok(result.primary.scoreBreakdown, 'missing primary.scoreBreakdown');
    assert.ok(typeof result.primary.scoreBreakdown.finalScore === 'number');
    assert.ok(result.costEstimate);
    assert.ok(result.latencyEstimate);
    assert.ok(typeof result.ragRecommended === 'boolean');
    assert.ok(Array.isArray(result.warnings));
  });

  it('returns a fallback model different from primary', () => {
    const result = recommend(makeInputs());
    if (result.fallback) {
      assert.notEqual(result.fallback.model.id, result.primary.model.id);
    }
  });

  it('prefers permissive-licensed models when license=permissive', () => {
    const result = recommend(makeInputs({ license: 'permissive' }));
    assert.equal(result.primary.model.license, 'permissive',
      `Expected permissive, got ${result.primary.model.license} (${result.primary.model.name})`);
  });

  it('recommends on-device model when deployment=local', () => {
    const result = recommend(makeInputs({
      constraints: { maxMemory: '16GB', budget: 'free', deployment: 'local', privacy: 'strict' },
    }));
    assert.ok(result.primary || result.onDevice, 'No model recommended for local deployment');
    if (result.onDevice) {
      assert.ok(result.onDevice.model.onDevice, 'on-device pick is not actually on-device');
    }
  });

  it('recommends RAG for huge context needs with small-window model', () => {
    const result = recommend(makeInputs({ contextNeeds: 'huge' }));
    // Not all models will trigger RAG, but if primary has <32k window, it should
    if (result.primary && result.primary.model.contextWindow < 32768) {
      assert.ok(result.ragRecommended, 'Should recommend RAG for huge context + small window');
    }
  });

  it('filters models by memory constraint', () => {
    const result = recommend(makeInputs({
      constraints: { maxMemory: '8GB', budget: 'free', deployment: 'local', privacy: 'strict' },
    }));
    if (result.primary) {
      const ramGB = parseInt(result.primary.model.minRAM);
      assert.ok(ramGB <= 8, `Recommended model needs ${result.primary.model.minRAM} but max is 8GB`);
    }
  });

  it('handles no matching models gracefully', () => {
    // Impossible constraints: 1GB memory, local, permissive
    // includeLegacy ensures all models are considered for hard constraint filtering
    const result = recommend(makeInputs({
      constraints: { maxMemory: '1GB', budget: 'free', deployment: 'local', privacy: 'strict' },
      license: 'copyleft',
      includeLegacy: true,
    }));
    // Should either return null primary or have warnings
    assert.ok(
      result.primary === null || result.warnings.length > 0,
      'Should handle impossible constraints gracefully'
    );
  });

  it('includes score breakdown with dimensions', () => {
    const result = recommend(makeInputs());
    const breakdown = result.primary.scoreBreakdown;
    assert.ok(breakdown.dimensions, 'Missing dimensions');
    assert.ok(Object.keys(breakdown.dimensions).length > 0, 'Empty dimensions');
    for (const [key, dim] of Object.entries(breakdown.dimensions)) {
      assert.ok(typeof dim.score === 'number', `Bad score in ${key}`);
      assert.ok(typeof dim.weight === 'number', `Bad weight in ${key}`);
      assert.ok(typeof dim.weighted === 'number', `Bad weighted in ${key}`);
    }
  });

  it('selects codegen prompt template for codegen use case', () => {
    const result = recommend(makeInputs({ useCases: ['codegen'] }));
    assert.ok(result.primary.promptTemplate);
    assert.ok(result.primary.promptTemplate.template.includes('Generate'),
      'Codegen template should mention generating code');
  });

  it('selects debug prompt template for debug use case', () => {
    const result = recommend(makeInputs({ useCases: ['debug'] }));
    assert.ok(result.primary.promptTemplate);
    assert.ok(
      result.primary.promptTemplate.template.toLowerCase().includes('debug') ||
      result.primary.promptTemplate.template.toLowerCase().includes('bug'),
      'Debug template should mention debugging'
    );
  });
});

describe('role-specific recommendations', () => {
  it('backend role recommends models with multi-language strengths', () => {
    const result = recommend(makeInputs({
      role: 'backend',
      languages: ['python', 'go'],
      runtime: 'python',
      platform: 'server',
    }));
    assert.ok(result.primary, 'Should recommend a model for backend');
  });

  it('mobile role prefers smaller models', () => {
    const result = recommend(makeInputs({
      role: 'mobile',
      languages: ['swift', 'kotlin'],
      runtime: 'node',
      platform: 'ios',
      constraints: { maxMemory: '8GB', budget: 'free', deployment: 'local', privacy: 'strict' },
    }));
    if (result.primary) {
      const model = result.primary.model;
      const minRAM = parseFloat(model.minRAM);
      // MoE models can have large total params but small active params and RAM;
      // check RAM requirement rather than raw param count for mobile suitability
      assert.ok(minRAM <= 8, `Mobile should prefer low-RAM models, got ${model.minRAM} for ${model.name}`);
      assert.ok(model.onDevice, `Mobile model should be on-device capable: ${model.name}`);
    }
  });

  it('games role produces a valid recommendation', () => {
    const result = recommend(makeInputs({
      role: 'games',
      languages: ['cpp', 'csharp'],
      frameworks: ['unreal'],
      runtime: 'node',
      platform: 'pc',
    }));
    assert.ok(result.primary, 'Should recommend a model for games dev');
  });
});

describe('PROMPT_TEMPLATES', () => {
  it('has all expected template keys', () => {
    const expected = ['codegen', 'debug', 'architecture', 'code-review', 'docs', 'testing'];
    for (const key of expected) {
      assert.ok(key in PROMPT_TEMPLATES || key.replace('-', '_') in PROMPT_TEMPLATES,
        `Missing prompt template: ${key}`);
    }
  });

  it('templates contain placeholder variables', () => {
    for (const [key, tmpl] of Object.entries(PROMPT_TEMPLATES)) {
      assert.ok(tmpl.template.includes('{{'), `Template "${key}" has no placeholders`);
      assert.ok(typeof tmpl.label === 'string', `Template "${key}" missing label`);
    }
  });
});

describe('WEIGHTS', () => {
  it('exports scoring weights', () => {
    assert.ok(WEIGHTS, 'Missing WEIGHTS export');
    assert.ok(typeof WEIGHTS === 'object');
  });
});
