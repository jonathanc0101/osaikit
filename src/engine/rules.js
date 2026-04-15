import { MODELS, parseMemGB } from "./models.js";
import { generateQuickStart } from "./quickstart.js";
import { generateLicenseGuidance } from "./licensing.js";
import { generateIntegrationSnippet } from "./integration.js";
import { generateComplianceReport } from "./compliance.js";
import { getModelCard } from "./modelcards.js";
import { generateSafetyRecommendation } from "./safety.js";

// ── Prompt Templates ─────────────────────────────────────────────────

const PROMPT_TEMPLATES = {
  codegen: {
    label: "Code Generation",
    template: `You are an expert {{ROLE}} developer working with {{LANGUAGES}}.
Generate clean, production-ready code following best practices for {{FRAMEWORKS}}.
Include proper error handling and types where applicable.

Task: {{TASK}}

Requirements:
- Follow {{FRAMEWORKS}} conventions and idioms
- Include inline comments for non-obvious logic
- Handle edge cases and errors gracefully
- Optimize for readability and maintainability`,
  },

  debug: {
    label: "Debugging",
    template: `You are a senior {{ROLE}} developer debugging a {{RUNTIME}} application.
The codebase uses {{LANGUAGES}} with {{FRAMEWORKS}}.

Bug description: {{TASK}}

Approach:
1. Analyze the symptoms and identify likely root causes
2. Trace the execution path that leads to the bug
3. Propose a minimal fix with explanation
4. Suggest how to prevent similar bugs (tests, types, assertions)

Show the exact code changes needed.`,
  },

  architecture: {
    label: "Architecture & Design",
    template: `You are a system architect designing a {{PLATFORM}} solution.
Technology stack: {{LANGUAGES}}, {{FRAMEWORKS}}, {{RUNTIME}} runtime.

Design request: {{TASK}}

Provide:
1. High-level architecture with component responsibilities
2. Data flow between components
3. Key interfaces and contracts
4. Trade-offs considered and decisions made
5. Scalability and extensibility notes

Use clear diagrams (ASCII/Mermaid) where helpful.`,
  },

  "code-review": {
    label: "Code Review",
    template: `You are a principal engineer reviewing {{LANGUAGES}} code in a {{FRAMEWORKS}} project.
Focus areas: correctness, performance, security, readability, maintainability.

Code to review:
{{TASK}}

For each issue found, provide:
- Severity: critical / warning / suggestion / nitpick
- Location and description
- Recommended fix with code example
- Rationale (why it matters)

End with an overall assessment and top 3 priorities.`,
  },

  docs: {
    label: "Documentation",
    template: `You are a technical writer documenting a {{ROLE}} project built with {{LANGUAGES}} and {{FRAMEWORKS}}.

Documentation request: {{TASK}}

Write clear, developer-friendly documentation that includes:
- Purpose and quick-start overview
- API reference with parameters, return types, and examples
- Common use cases and patterns
- Error handling and troubleshooting
- Configuration options

Target audience: intermediate {{ROLE}} developers.`,
  },

  testing: {
    label: "Testing",
    template: `You are a QA engineer writing tests for a {{RUNTIME}} application using {{LANGUAGES}} and {{FRAMEWORKS}}.

Testing request: {{TASK}}

Write comprehensive tests that cover:
- Happy path / expected behavior
- Edge cases and boundary conditions
- Error scenarios and failure modes
- Integration points between components

Use the testing conventions standard for {{FRAMEWORKS}}.
Include descriptive test names that explain intent.`,
  },
};

// ── Scoring Weights ──────────────────────────────────────────────────

const WEIGHTS = {
  capabilityFit: 3.0,
  contextMatch: 2.0,
  benchmarkScores: 2.0,
  computeFootprint: 1.5,
  ecosystemRichness: 1.0,
  fineTuningSupport: 0.5,
  enterpriseReadiness: 0.75,
};

// ── Memory Parsing ───────────────────────────────────────────────────

const MEMORY_TIERS = {
  "8GB": 8,
  "16GB": 16,
  "32GB": 32,
  "64GB": 64,
  unlimited: Infinity,
};

function parseMaxMemory(constraint) {
  if (!constraint) return Infinity;
  return MEMORY_TIERS[constraint] ?? Infinity;
}

// ── Context Window Requirements ──────────────────────────────────────

const CONTEXT_THRESHOLDS = {
  small: 8_192,
  medium: 32_768,
  large: 65_536,
  huge: 128_000,
};

// ── Role-Specific Strength Boosters ──────────────────────────────────

const ROLE_BOOSTS = {
  webdev: {
    strengths: ["codegen", "instruction-following", "multilingual"],
    description: "Boosted for web development (JS/TS focus, instruction-following)",
  },
  backend: {
    strengths: ["codegen", "reasoning", "multilingual", "architecture"],
    description: "Boosted for backend dev (multi-language, architecture reasoning)",
  },
  mobile: {
    strengths: ["on-device", "low-latency", "codegen"],
    description: "Boosted for mobile (small footprint, on-device capable)",
  },
  games: {
    strengths: ["reasoning", "codegen", "math"],
    description: "Boosted for game dev (performance reasoning, math, C++ patterns)",
  },
};

// ── Use-Case Boosts ──────────────────────────────────────────────────

const USE_CASE_BOOSTS = {
  codegen: { benchmarkField: "humaneval", strengthMatch: ["codegen", "fill-in-middle"] },
  debug: { benchmarkField: "swebench", strengthMatch: ["reasoning", "instruction-following"] },
  architecture: { benchmarkField: null, strengthMatch: ["architecture", "reasoning"] },
  "code-review": { benchmarkField: "aiderPolyglot", strengthMatch: ["reasoning", "instruction-following"] },
  docs: { benchmarkField: null, strengthMatch: ["instruction-following", "multilingual"] },
  testing: { benchmarkField: "humaneval", strengthMatch: ["instruction-following", "codegen"] },
};

// ── Hard Constraint Filters ──────────────────────────────────────────

function passesHardConstraints(model, inputs) {
  const reasons = [];

  // License filter
  if (inputs.license === "permissive" && model.license !== "permissive") {
    reasons.push(`License "${model.license}" does not meet "permissive" requirement`);
  }
  if (inputs.license === "copyleft" && model.license === "restricted") {
    reasons.push(`License "${model.license}" is restricted`);
  }

  // Memory filter
  const maxMem = parseMaxMemory(inputs.constraints?.maxMemory);
  const modelMem = parseMemGB(model.minRAM);
  if (modelMem > maxMem) {
    reasons.push(`Requires ${model.minRAM} RAM but max is ${inputs.constraints.maxMemory}`);
  }

  // Privacy filter — strict privacy requires local deployment capability
  if (inputs.constraints?.privacy === "strict") {
    if (!model.deploymentOptions.includes("local")) {
      reasons.push("Strict privacy requires local deployment, which this model does not support");
    }
  }

  // Budget filter — free means only local-capable models
  if (inputs.constraints?.budget === "free") {
    if (!model.deploymentOptions.includes("local")) {
      reasons.push("Free budget requires local deployment capability");
    }
  }

  // Deployment filter
  if (inputs.constraints?.deployment === "local" && !model.deploymentOptions.includes("local")) {
    reasons.push("Local deployment required but not supported");
  }

  return { passes: reasons.length === 0, reasons };
}

// ── Scoring Functions ────────────────────────────────────────────────

function scoreCapabilityFit(model, inputs) {
  let score = 0;
  let maxScore = 0;
  const details = [];

  // Match strengths to use cases
  const desiredStrengths = new Set();
  for (const uc of inputs.useCases) {
    const boosts = USE_CASE_BOOSTS[uc];
    if (boosts) {
      boosts.strengthMatch.forEach((s) => desiredStrengths.add(s));
    }
  }

  // Role-based desired strengths
  const roleBoost = ROLE_BOOSTS[inputs.role];
  if (roleBoost) {
    roleBoost.strengths.forEach((s) => desiredStrengths.add(s));
  }

  maxScore = desiredStrengths.size;
  for (const s of desiredStrengths) {
    if (model.strengths.includes(s)) {
      score += 1;
      details.push(`+1 has "${s}"`);
    }
  }

  // Penalty for weaknesses that overlap with desired strengths
  for (const w of model.weaknesses) {
    if (desiredStrengths.has(w)) {
      score -= 0.5;
      details.push(`-0.5 weakness in "${w}"`);
    }
  }

  const normalized = maxScore > 0 ? Math.max(0, score / maxScore) : 0;
  return { score: normalized, details, weight: WEIGHTS.capabilityFit };
}

function scoreContextMatch(model, inputs) {
  const needed = CONTEXT_THRESHOLDS[inputs.contextNeeds] || 32_768;
  const details = [];
  let score;

  if (model.contextWindow >= needed) {
    score = 1.0;
    details.push(`Context ${model.contextWindow.toLocaleString()} >= needed ${needed.toLocaleString()}`);
  } else {
    score = model.contextWindow / needed;
    details.push(
      `Context ${model.contextWindow.toLocaleString()} < needed ${needed.toLocaleString()} (${(score * 100).toFixed(0)}% coverage)`
    );
  }

  return { score, details, weight: WEIGHTS.contextMatch };
}

function scoreBenchmarks(model, inputs) {
  const details = [];
  const scores = [];

  // Overall HumanEval as baseline code quality
  if (model.benchmarks.humaneval != null) {
    const normalized = model.benchmarks.humaneval / 100;
    scores.push(normalized);
    details.push(`HumanEval: ${model.benchmarks.humaneval}%`);
  }

  // Use-case-specific benchmark boosting
  for (const uc of inputs.useCases) {
    const boosts = USE_CASE_BOOSTS[uc];
    if (!boosts?.benchmarkField) continue;
    const val = model.benchmarks[boosts.benchmarkField];
    if (val != null) {
      // Normalize: humaneval out of 100, swebench out of 50, aiderPolyglot out of 60
      const maxVals = { humaneval: 100, swebench: 50, aiderPolyglot: 60 };
      const normalized = val / (maxVals[boosts.benchmarkField] || 100);
      scores.push(normalized);
      details.push(`${boosts.benchmarkField}: ${val} (for "${uc}" use case)`);
    }
  }

  // Boost from live leaderboard data if available
  if (model._liveScores) {
    if (model._liveScores.swebench != null) {
      const normalized = model._liveScores.swebench / 70; // top SOTA ~70%
      scores.push(normalized);
      details.push(`SWE-bench live: ${model._liveScores.swebench}%`);
    }
    if (model._liveScores.aider != null) {
      const normalized = model._liveScores.aider / 85; // top SOTA ~85%
      scores.push(normalized);
      details.push(`Aider live: ${model._liveScores.aider}%`);
    }
  }

  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  return { score: avgScore, details, weight: WEIGHTS.benchmarkScores };
}

function scoreComputeFootprint(model, inputs) {
  const details = [];
  let score;

  // Prefer lower latency
  const latencyScores = { low: 1.0, medium: 0.6, high: 0.3 };
  score = latencyScores[model.typicalLatency] || 0.5;
  details.push(`Latency: ${model.typicalLatency} (${score})`);

  // Boost on-device models for local deployment
  if (inputs.constraints?.deployment === "local" && model.onDevice) {
    score = Math.min(1.0, score + 0.2);
    details.push("+0.2 on-device viable for local deployment");
  }

  // Boost smaller models for mobile role
  if (inputs.role === "mobile" && model.onDevice) {
    score = Math.min(1.0, score + 0.2);
    details.push("+0.2 on-device viable for mobile");
  }

  // Budget considerations
  if (inputs.constraints?.budget === "free" || inputs.constraints?.budget === "low") {
    if (model.onDevice) {
      score = Math.min(1.0, score + 0.15);
      details.push("+0.15 on-device saves cost");
    }
  }

  return { score, details, weight: WEIGHTS.computeFootprint };
}

function scoreEcosystem(model, _inputs) {
  const maxTools = 5; // ollama, llama.cpp, vllm, huggingface, lm-studio
  const score = model.ecosystem.length / maxTools;
  const details = [`${model.ecosystem.length}/${maxTools} supported tools (${model.ecosystem.join(", ")})`];
  return { score, details, weight: WEIGHTS.ecosystemRichness };
}

function scoreFineTuning(model, inputs) {
  let score = 0;
  const details = [];

  if (model.fineTunable) {
    score += 0.5;
    details.push("+0.5 fine-tunable");
  }
  if (model.adapterSupport) {
    score += 0.5;
    details.push("+0.5 adapter support (LoRA etc.)");
  }

  // Extra value for existing projects that might need customization
  if (inputs.existingProject && model.fineTunable) {
    score = Math.min(1.0, score + 0.2);
    details.push("+0.2 existing project benefits from fine-tuning");
  }

  return { score, details, weight: WEIGHTS.fineTuningSupport };
}

function scoreEnterpriseReadiness(model, _inputs) {
  const details = [];

  if (!model.enterprise) {
    return { score: 0, details: ["No enterprise data available"], weight: WEIGHTS.enterpriseReadiness };
  }

  const ent = model.enterprise;

  const hostingScore = Math.min(ent.managedHosting.length / 5, 1.0);
  const sdkScore = ent.sdkQuality / 5;
  const communityScore = ent.communitySize / 5;
  const slaScore = ent.slaAvailable ? 1.0 : 0.0;
  const vpcScore = ent.vpcSupport ? 1.0 : 0.0;
  const docsScore = ent.documentationQuality / 5;

  const score =
    hostingScore * 0.25 +
    sdkScore * 0.2 +
    communityScore * 0.2 +
    slaScore * 0.15 +
    vpcScore * 0.1 +
    docsScore * 0.1;

  details.push(`Managed hosting: ${ent.managedHosting.length} providers (${(hostingScore * 100).toFixed(0)}%)`);
  details.push(`SDK quality: ${ent.sdkQuality}/5`);
  details.push(`Community size: ${ent.communitySize}/5`);
  details.push(`SLA available: ${ent.slaAvailable}`);
  details.push(`VPC support: ${ent.vpcSupport}`);
  details.push(`Documentation quality: ${ent.documentationQuality}/5`);

  return { score, details, weight: WEIGHTS.enterpriseReadiness };
}

// ── Master Scoring ───────────────────────────────────────────────────

function scoreModel(model, inputs) {
  const dimensions = {
    capabilityFit: scoreCapabilityFit(model, inputs),
    contextMatch: scoreContextMatch(model, inputs),
    benchmarkScores: scoreBenchmarks(model, inputs),
    computeFootprint: scoreComputeFootprint(model, inputs),
    ecosystemRichness: scoreEcosystem(model, inputs),
    fineTuningSupport: scoreFineTuning(model, inputs),
    enterpriseReadiness: scoreEnterpriseReadiness(model, inputs),
  };

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const dim of Object.values(dimensions)) {
    totalWeightedScore += dim.score * dim.weight;
    totalWeight += dim.weight;
  }

  const finalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

  return {
    model,
    finalScore,
    dimensions,
    totalWeightedScore,
    totalWeight,
  };
}

// ── Deployment Option Selection ──────────────────────────────────────

function selectDeployment(model, inputs) {
  const pref = inputs.constraints?.deployment;
  if (pref && model.deploymentOptions.includes(pref)) return pref;
  if (inputs.constraints?.privacy === "strict" && model.deploymentOptions.includes("local")) return "local";
  if (inputs.constraints?.budget === "free" && model.deploymentOptions.includes("local")) return "local";
  // Default: prefer local if available, else cloud
  if (model.deploymentOptions.includes("local")) return "local";
  if (model.deploymentOptions.includes("hybrid")) return "hybrid";
  return "cloud";
}

// ── Config Adjustment ────────────────────────────────────────────────

function adjustConfig(model, inputs) {
  const config = { ...model.defaultConfig };

  // Codegen benefits from lower temperature
  if (inputs.useCases.includes("codegen")) {
    config.temperature = Math.min(config.temperature, 0.1);
  }

  // Architecture / creative tasks can use slightly higher temp
  if (inputs.useCases.includes("architecture") && !inputs.useCases.includes("codegen")) {
    config.temperature = Math.max(config.temperature, 0.3);
  }

  // Large context needs → increase maxTokens
  if (inputs.contextNeeds === "large" || inputs.contextNeeds === "huge") {
    config.maxTokens = Math.min(model.contextWindow, Math.max(config.maxTokens, 8192));
  }

  return config;
}

// ── Prompt Template Selection ────────────────────────────────────────

function selectPromptTemplate(inputs) {
  const primaryUseCase = inputs.useCases[0] || "codegen";
  const tmpl = PROMPT_TEMPLATES[primaryUseCase] || PROMPT_TEMPLATES.codegen;

  const filled = tmpl.template
    .replace(/\{\{ROLE\}\}/g, inputs.role || "software")
    .replace(/\{\{LANGUAGES\}\}/g, (inputs.languages || []).join(", ") || "the project languages")
    .replace(/\{\{FRAMEWORKS\}\}/g, (inputs.frameworks || []).join(", ") || "the project frameworks")
    .replace(/\{\{RUNTIME\}\}/g, inputs.runtime || "the target runtime")
    .replace(/\{\{PLATFORM\}\}/g, inputs.platform || "the target platform")
    .replace(/\{\{TASK\}\}/g, "[describe your task here]");

  return { useCase: primaryUseCase, label: tmpl.label, template: filled };
}

// ── Cost & Latency Estimates ─────────────────────────────────────────

function estimateCosts(model) {
  const memGB = parseMemGB(model.minRAM);

  // Local cost: electricity + hardware amortization
  let localCost;
  if (memGB <= 8) localCost = "$0/mo (runs on consumer hardware)";
  else if (memGB <= 16) localCost = "~$5-10/mo electricity (consumer GPU)";
  else if (memGB <= 32) localCost = "~$10-20/mo electricity (workstation GPU)";
  else if (memGB <= 64) localCost = "~$30-80/mo electricity (multi-GPU or cloud instance)";
  else localCost = "~$200-800/mo (multi-GPU server or cloud)";

  // Cloud cost: rough estimates based on model size
  let cloudCost;
  if (memGB <= 8) cloudCost = "~$0.10-0.20/hr (T4/L4 instance)";
  else if (memGB <= 16) cloudCost = "~$0.30-0.70/hr (A10G instance)";
  else if (memGB <= 32) cloudCost = "~$0.70-1.50/hr (A100 40GB)";
  else if (memGB <= 64) cloudCost = "~$1.50-3.00/hr (A100 80GB)";
  else if (memGB <= 128) cloudCost = "~$3.00-6.00/hr (multi-A100)";
  else cloudCost = "~$8.00-15.00/hr (8xA100 / H100 cluster)";

  return { local: localCost, cloud: cloudCost };
}

function estimateLatency(model) {
  const map = {
    low: { local: "50-200ms/token", cloud: "100-400ms first token" },
    medium: { local: "200-500ms/token", cloud: "300-800ms first token" },
    high: { local: "500ms-2s/token (if feasible)", cloud: "500ms-1.5s first token" },
  };
  return map[model.typicalLatency] || map.medium;
}

// ── RAG Recommendation ───────────────────────────────────────────────

function evaluateRAG(primaryModel, inputs) {
  if (inputs.contextNeeds === "huge" && primaryModel.contextWindow < 32_768) {
    return {
      ragRecommended: true,
      ragReason: `Your codebase context needs ("huge") exceeds this model's ${primaryModel.contextWindow.toLocaleString()}-token window. Use RAG (retrieval-augmented generation) to chunk and retrieve relevant code sections. Tools: LlamaIndex, LangChain, or custom embeddings with FAISS/Chroma.`,
    };
  }

  if (inputs.contextNeeds === "large" && primaryModel.contextWindow < 16_384) {
    return {
      ragRecommended: true,
      ragReason: `Your context needs ("large") exceed this model's ${primaryModel.contextWindow.toLocaleString()}-token window. RAG will help retrieve only the relevant code context. Consider chunking by file or function.`,
    };
  }

  if (inputs.existingProject && inputs.contextNeeds !== "small") {
    return {
      ragRecommended: true,
      ragReason: `For existing projects with substantial codebases, RAG helps the model understand your specific patterns and conventions by retrieving relevant code snippets on demand.`,
    };
  }

  return { ragRecommended: false, ragReason: null };
}

// ── Warnings Generator ───────────────────────────────────────────────

function generateWarnings(primary, _fallback, _onDevice, inputs) {
  const warnings = [];

  if (primary.model.license !== "permissive") {
    warnings.push(
      `Primary model "${primary.model.name}" has a "${primary.model.license}" license. Verify compliance for your use case.`
    );
  }

  if (!primary.model.commercialUse && inputs.constraints?.budget !== "free") {
    warnings.push(
      `"${primary.model.name}" may not permit commercial use. Check the license before deploying in production.`
    );
  }

  if (primary.model.typicalLatency === "high" && inputs.useCases.includes("codegen")) {
    warnings.push(
      `"${primary.model.name}" has high latency which may impact interactive code generation. The fallback model may be faster for real-time use.`
    );
  }

  const memGB = parseMemGB(primary.model.minRAM);
  const maxMem = parseMaxMemory(inputs.constraints?.maxMemory);
  if (maxMem !== Infinity && memGB >= maxMem * 0.8) {
    warnings.push(
      `"${primary.model.name}" requires ${primary.model.minRAM} RAM, close to your ${inputs.constraints.maxMemory} limit. Performance may degrade. Quantized versions (Q4/Q5) can reduce memory by 50-60%.`
    );
  }

  if (primary.model.contextWindow < 16_384 && inputs.contextNeeds !== "small") {
    warnings.push(
      `"${primary.model.name}" has a ${primary.model.contextWindow.toLocaleString()}-token context window. For larger codebases, RAG or file chunking is essential.`
    );
  }

  const releaseDate = new Date(primary.model.releaseDate);
  const monthsOld = (Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsOld > 12) {
    warnings.push(
      `"${primary.model.name}" was released ${Math.floor(monthsOld)} months ago. Newer models in the same family may offer better performance.`
    );
  }

  return warnings;
}

// ── Main Recommendation Engine ───────────────────────────────────────

export function recommend(inputs, leaderboards = null) {
  // 1. Filter by hard constraints
  const candidates = [];
  const filtered = [];

  for (const model of MODELS) {
    // Skip legacy models unless explicitly included
    if (model.legacy && !inputs.includeLegacy) {
      filtered.push({ model: model.name, reasons: ['Legacy model — superseded by newer generation'] });
      continue;
    }
    const check = passesHardConstraints(model, inputs);
    if (check.passes) {
      candidates.push(model);
    } else {
      filtered.push({ model: model.name, reasons: check.reasons });
    }
  }

  if (candidates.length === 0) {
    return {
      primary: null,
      fallback: null,
      onDevice: null,
      costEstimate: { local: "N/A", cloud: "N/A" },
      latencyEstimate: { local: "N/A", cloud: "N/A" },
      ragRecommended: false,
      ragReason: "No models matched your constraints.",
      warnings: [
        "No models passed the hard constraint filters. Try relaxing memory, license, or deployment constraints.",
        ...filtered.map((f) => `${f.model}: ${f.reasons.join("; ")}`),
      ],
    };
  }

  // 2. Optionally enrich with live leaderboard data
  const enrichedCandidates = candidates.map(model => {
    if (!leaderboards) return model;
    const enriched = { ...model, _liveScores: {} };

    // Try SWE-bench match
    if (leaderboards.swebench) {
      const match = leaderboards.swebench.find(e =>
        model.name.toLowerCase().includes(e.model?.toLowerCase()?.split(' ')[0]) ||
        e.model?.toLowerCase().includes(model.family?.toLowerCase())
      );
      if (match) enriched._liveScores.swebench = match.resolvedRate;
    }

    // Try Aider match
    if (leaderboards.aider) {
      const match = leaderboards.aider.find(e =>
        model.name.toLowerCase().includes(e.model?.toLowerCase()?.split('-')[0]) ||
        e.model?.toLowerCase().includes(model.id?.toLowerCase())
      );
      if (match) enriched._liveScores.aider = match.passRate;
    }

    return enriched;
  });

  // 3. Score all candidates
  const scored = enrichedCandidates.map((m) => scoreModel(m, inputs));
  scored.sort((a, b) => b.finalScore - a.finalScore);

  // 4. Pick primary (highest score)
  const primaryScored = scored[0];
  const primaryDeployment = selectDeployment(primaryScored.model, inputs);
  const promptTemplate = selectPromptTemplate(inputs);

  // 5. Pick fallback (second highest, different family preferred)
  let fallbackScored = scored.find(
    (s) => s.model.family !== primaryScored.model.family
  );
  if (!fallbackScored && scored.length > 1) {
    fallbackScored = scored[1];
  }

  // 6. Pick on-device option (highest-scoring on-device model)
  const onDeviceScored = scored.find((s) => s.model.onDevice);

  // 7. RAG evaluation
  const { ragRecommended, ragReason } = evaluateRAG(primaryScored.model, inputs);

  // 8. Build result
  const formatScored = (s, deployment) => ({
    model: s.model,
    reason: buildReason(s, inputs),
    config: adjustConfig(s.model, inputs),
    deploymentOption: deployment || selectDeployment(s.model, inputs),
    scoreBreakdown: {
      finalScore: Math.round(s.finalScore * 1000) / 1000,
      dimensions: Object.fromEntries(
        Object.entries(s.dimensions).map(([key, dim]) => [
          key,
          {
            score: Math.round(dim.score * 1000) / 1000,
            weight: dim.weight,
            weighted: Math.round(dim.score * dim.weight * 1000) / 1000,
            details: dim.details,
          },
        ])
      ),
    },
  });

  const primary = {
    ...formatScored(primaryScored, primaryDeployment),
    promptTemplate,
    quickStart: generateQuickStart(primaryScored.model, primaryDeployment),
    licenseGuidance: generateLicenseGuidance(primaryScored.model),
    integrationSnippet: (inputs.frameworks && inputs.frameworks.length > 0) ? generateIntegrationSnippet(primaryScored.model, inputs) : null,
    complianceReport: generateComplianceReport(primaryScored.model, inputs),
    modelCard: getModelCard(primaryScored.model),
    safetyRecommendation: generateSafetyRecommendation(primaryScored.model, inputs),
  };

  const fallback = fallbackScored
    ? {
        ...formatScored(fallbackScored),
        quickStart: generateQuickStart(fallbackScored.model, selectDeployment(fallbackScored.model, inputs)),
        licenseGuidance: generateLicenseGuidance(fallbackScored.model),
      }
    : null;

  const onDevice = onDeviceScored
    ? {
        model: onDeviceScored.model,
        reason: buildReason(onDeviceScored, inputs),
        config: adjustConfig(onDeviceScored.model, inputs),
        scoreBreakdown: {
          finalScore: Math.round(onDeviceScored.finalScore * 1000) / 1000,
        },
      }
    : null;

  // Avoid duplicating primary in on-device slot
  if (onDevice && onDevice.model.id === primary.model.id) {
    // Find next best on-device that isn't the primary
    const altOnDevice = scored.find(
      (s) => s.model.onDevice && s.model.id !== primary.model.id
    );
    if (altOnDevice) {
      onDevice.model = altOnDevice.model;
      onDevice.reason = buildReason(altOnDevice, inputs);
      onDevice.config = adjustConfig(altOnDevice.model, inputs);
      onDevice.scoreBreakdown = {
        finalScore: Math.round(altOnDevice.finalScore * 1000) / 1000,
      };
    }
  }

  const warnings = generateWarnings(primaryScored, fallbackScored, onDeviceScored, inputs);

  return {
    primary,
    fallback,
    onDevice,
    costEstimate: estimateCosts(primaryScored.model),
    latencyEstimate: estimateLatency(primaryScored.model),
    ragRecommended,
    ragReason,
    warnings,
    _meta: {
      totalModels: MODELS.length,
      candidatesAfterFilter: candidates.length,
      filteredOut: filtered.length,
      filteredModels: filtered,
    },
  };
}

// ── Reason Builder ───────────────────────────────────────────────────

function buildReason(scored, inputs) {
  const m = scored.model;
  const parts = [];

  // Lead with the top scoring dimension
  const dims = Object.entries(scored.dimensions);
  dims.sort((a, b) => b[1].score * b[1].weight - a[1].score * a[1].weight);
  const topDim = dims[0];

  const dimLabels = {
    capabilityFit: "capability match",
    contextMatch: "context window fit",
    benchmarkScores: "benchmark performance",
    computeFootprint: "compute efficiency",
    ecosystemRichness: "tooling ecosystem",
    fineTuningSupport: "fine-tuning options",
  };

  parts.push(
    `${m.name} scores highest overall (${(scored.finalScore * 100).toFixed(1)}%), led by strong ${dimLabels[topDim[0]] || topDim[0]}`
  );

  // Mention key strengths relevant to use cases
  const relevantStrengths = m.strengths.filter((s) =>
    inputs.useCases.some((uc) => USE_CASE_BOOSTS[uc]?.strengthMatch.includes(s))
  );
  if (relevantStrengths.length > 0) {
    parts.push(`Key strengths for your use cases: ${relevantStrengths.join(", ")}`);
  }

  // Context window note
  if (m.contextWindow >= 64_000) {
    parts.push(`${(m.contextWindow / 1000).toFixed(0)}K context window handles large codebases`);
  }

  // Ecosystem note
  if (m.ecosystem.length >= 4) {
    parts.push(`Broad tooling support (${m.ecosystem.join(", ")})`);
  }

  return parts.join(". ") + ".";
}

// ── Exported Helpers ─────────────────────────────────────────────────

export { PROMPT_TEMPLATES, WEIGHTS };
