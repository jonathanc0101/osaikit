/**
 * Safety guardrail and content moderation recommender.
 *
 * Open-source code models ship with no built-in guardrails — this module
 * closes that gap by recommending safety tools that pair well with any
 * recommended model, tuned to the user's deployment and privacy constraints.
 */

// ── Built-in safety profiles per model family ──────────────────────────

const SAFETY_PROFILES = {
  "Llama": {
    hasSafetyTraining: true,
    description: "RLHF + red-teaming, but no code-specific safety",
    limitations: [
      "May still produce harmful code if prompted creatively",
      "Safety training focused on chat, not code generation",
      "Jailbreak techniques can bypass alignment",
    ],
  },
  "Mistral": {
    hasSafetyTraining: true,
    description: "Basic safety alignment via instruction tuning",
    limitations: [
      "Minimal safety guardrails compared to larger labs",
      "No code-specific safety training",
      "Instruction-tuned variants only; base models are unaligned",
    ],
  },
  "Mixtral": {
    hasSafetyTraining: true,
    description: "Basic safety alignment via instruction tuning",
    limitations: [
      "Minimal safety guardrails compared to larger labs",
      "No code-specific safety training",
      "Instruction-tuned variants only; base models are unaligned",
    ],
  },
  "DeepSeek Coder": {
    hasSafetyTraining: true,
    description:
      "Instruction-tuned with some safety, but primarily optimized for helpfulness",
    limitations: [
      "Safety is secondary to code capability",
      "May produce insecure code patterns when asked",
      "Limited refusal behavior for dangerous requests",
    ],
  },
  "DeepSeek Coder V2": {
    hasSafetyTraining: true,
    description:
      "Instruction-tuned with some safety, but primarily optimized for helpfulness",
    limitations: [
      "Safety is secondary to code capability",
      "May produce insecure code patterns when asked",
      "Limited refusal behavior for dangerous requests",
    ],
  },
  "DeepSeek V3": {
    hasSafetyTraining: true,
    description:
      "Instruction-tuned with some safety, but primarily optimized for helpfulness",
    limitations: [
      "Safety is secondary to code capability",
      "May produce insecure code patterns when asked",
      "Limited refusal behavior for dangerous requests",
    ],
  },
  "Qwen2.5-Coder": {
    hasSafetyTraining: true,
    description: "Safety-aligned via instruction tuning",
    limitations: [
      "Instruction-tuned variants only",
      "No dedicated code safety layer",
      "May reproduce vulnerable patterns from training data",
    ],
  },
  "Phi": {
    hasSafetyTraining: true,
    description: "Microsoft safety alignment, trained on synthetic data",
    limitations: [
      "Smaller model size limits nuanced safety reasoning",
      "Synthetic training data may miss real-world attack patterns",
      "Less battle-tested than larger models",
    ],
  },
  "CodeLlama": {
    hasSafetyTraining: true,
    description: "Basic instruction-tuning safety (instruct variants only)",
    limitations: [
      "Base and Python variants have no safety training",
      "Code-specific safety is minimal",
      "Older safety alignment compared to Llama 3.x",
    ],
  },
  "StarCoder2": {
    hasSafetyTraining: false,
    description: "Base model with no safety training — completion only",
    limitations: [
      "Will complete any prompt without refusal",
      "No alignment or instruction following",
      "Cannot distinguish benign from malicious code requests",
    ],
  },
  "StarCoder": {
    hasSafetyTraining: false,
    description: "Base model with no safety training — completion only",
    limitations: [
      "Will complete any prompt without refusal",
      "No alignment or instruction following",
      "Cannot distinguish benign from malicious code requests",
    ],
  },
  "CodeGemma": {
    hasSafetyTraining: true,
    description: "Google safety training for instruct variant",
    limitations: [
      "Base variant has no safety training",
      "Instruct safety focused on general harms, not code-specific",
      "Smaller models have weaker safety behavior",
    ],
  },
  "WizardCoder": {
    hasSafetyTraining: false,
    description: "No systematic safety training",
    limitations: [
      "Evolved from base models via Evol-Instruct — no safety pass",
      "Will attempt any code request without refusal",
      "No guardrails for insecure or malicious code generation",
    ],
  },
  "Granite Code": {
    hasSafetyTraining: true,
    description: "IBM enterprise safety alignment",
    limitations: [
      "Enterprise-focused safety may be overly conservative",
      "Limited community testing compared to Meta/Google models",
      "Code safety relies on general alignment, not dedicated filters",
    ],
  },
};

// ── Guardrail catalog ──────────────────────────────────────────────────

function buildGuardrails(model) {
  const family = model.family || "";
  const isLlamaFamily =
    /llama/i.test(family) || /codellama/i.test(family);
  const eco = (model.ecosystem || []).map((s) => s.toLowerCase());
  const hasOllama = eco.includes("ollama");

  return [
    {
      name: "Llama Guard 3",
      type: "input-output-filter",
      compatibility: isLlamaFamily ? "high" : "medium",
      description:
        "Meta's safety classifier that filters harmful inputs and outputs",
      setup: hasOllama
        ? "ollama run llama-guard3:8b"
        : "pip install transformers && python -c \"from transformers import pipeline; p = pipeline('text-classification', model='meta-llama/Llama-Guard-3-8B')\"",
      note: "Runs as a separate model. Adds ~200ms latency per request.",
    },
    {
      name: "NeMo Guardrails",
      type: "programmable-rails",
      compatibility: "high",
      description:
        "NVIDIA's framework for programmable safety rails, topic control, and hallucination detection",
      setup: "pip install nemoguardrails",
      note: "Framework-agnostic. Define rails in YAML/Colang. Supports input/output/dialog rails.",
    },
    {
      name: "Guardrails AI",
      type: "output-validation",
      compatibility: "high",
      description:
        "Structured output validation with code-specific output checks and type enforcement",
      setup: "pip install guardrails-ai",
      note: "Validates model output against schemas. Supports custom validators for code quality.",
    },
    {
      name: "CodeShield",
      type: "code-security-filter",
      compatibility: "high",
      description:
        "Meta's tool for detecting insecure code patterns in model output",
      setup: "pip install codeshield",
      note: "Scans generated code for CWE patterns. Low latency, runs inline.",
    },
    {
      name: "Semgrep",
      type: "static-analysis",
      compatibility: "high",
      description:
        "Fast SAST scanner for generated code — catches vulnerabilities, anti-patterns, and secrets",
      setup: "pip install semgrep",
      note: "Run on model output before committing. Supports custom rules for your codebase.",
    },
  ];
}

// ── Code-specific risk assessment ──────────────────────────────────────

function assessCodeRisks(useCases) {
  const cases = new Set((useCases || []).map((c) => c.toLowerCase()));
  const hasCodegen = cases.has("codegen");
  const hasReview = cases.has("code-review");
  const hasArchitecture = cases.has("architecture");

  const risks = [];

  risks.push({
    risk: "Code injection",
    severity: hasCodegen ? "high" : hasReview ? "low" : "medium",
    mitigation:
      "Sandbox all generated code execution. Never run model output directly in production.",
  });

  risks.push({
    risk: "Dependency confusion",
    severity: hasCodegen ? "medium" : "low",
    mitigation:
      "Validate all package names against known registries before installing.",
  });

  risks.push({
    risk: "Outdated patterns",
    severity: "medium",
    mitigation:
      "Model training cutoff may produce deprecated/vulnerable API patterns. Review security-sensitive code.",
  });

  risks.push({
    risk: "License contamination",
    severity: hasCodegen ? "medium" : "low",
    mitigation:
      "Model may reproduce copyrighted code from training data. Use code scanning tools.",
  });

  if (hasArchitecture) {
    risks.push({
      risk: "Hallucinated APIs or patterns",
      severity: "high",
      mitigation:
        "Model may recommend nonexistent libraries, deprecated patterns, or fabricated APIs. Verify all architectural recommendations against official documentation.",
    });
  }

  return risks;
}

// ── Risk level determination ───────────────────────────────────────────

function determineRiskLevel(model, inputs) {
  const profile = lookupSafetyProfile(model);
  const deployment = inputs?.constraints?.deployment || "local";
  const privacy = inputs?.constraints?.privacy || "moderate";

  // High: no safety training, or cloud + relaxed privacy
  if (!profile.hasSafetyTraining) return "high";
  if (deployment === "cloud" && privacy === "relaxed") return "high";

  // Low: local + strict privacy + has safety training
  if (
    deployment === "local" &&
    privacy === "strict" &&
    profile.hasSafetyTraining
  ) {
    return "low";
  }

  // Everything else is medium
  return "medium";
}

function buildRiskSummary(riskLevel, profile) {
  if (riskLevel === "high") {
    return profile.hasSafetyTraining
      ? "Cloud deployment with relaxed privacy amplifies risk. Add multiple guardrail layers before production use."
      : "This model has no built-in safety training. Add guardrails for production use.";
  }
  if (riskLevel === "low") {
    return "Local deployment with strict privacy and safety-trained model. Minimal risk, but code-specific guardrails are still recommended.";
  }
  return "This model has basic safety alignment but no code-specific guardrails. Add at least an output filter for production use.";
}

// ── Recommended stack per deployment ───────────────────────────────────

function buildRecommendedStack(deployment) {
  if (deployment === "cloud") {
    return {
      inputFilter: {
        name: "NeMo Guardrails",
        setup: "pip install nemoguardrails",
      },
      outputFilter: {
        name: "Guardrails AI",
        setup: "pip install guardrails-ai",
      },
      codeSandbox: {
        name: "E2B Code Interpreter",
        setup: "pip install e2b-code-interpreter",
      },
      monitoring: {
        name: "Langfuse",
        setup: "pip install langfuse",
      },
    };
  }

  if (deployment === "hybrid") {
    return {
      inputFilter: {
        name: "NeMo Guardrails",
        setup: "pip install nemoguardrails",
      },
      outputFilter: {
        name: "Semgrep",
        setup: "pip install semgrep",
      },
      codeSandbox: {
        name: "Docker Sandbox",
        setup: "docker run --rm --network none --read-only <image>",
      },
      monitoring: {
        name: "Langfuse",
        setup: "pip install langfuse",
      },
    };
  }

  // Local (default)
  return {
    inputFilter: {
      name: "Llama Guard 3 (local)",
      setup: "ollama run llama-guard3:8b",
    },
    outputFilter: {
      name: "Semgrep",
      setup: "pip install semgrep",
    },
    codeSandbox: {
      name: "Docker Sandbox",
      setup: "docker run --rm --network none --read-only <image>",
    },
    monitoring: {
      name: "Langfuse (self-hosted)",
      setup: "docker compose up -d # see https://langfuse.com/docs/deployment/self-host",
    },
  };
}

// ── Production checklist ───────────────────────────────────────────────

const PRODUCTION_CHECKLIST = [
  "Add input validation and prompt injection detection",
  "Sandbox all code execution in isolated containers",
  "Log all model inputs/outputs for audit trail",
  "Implement rate limiting on model API endpoints",
  "Add output scanning for secrets, PII, and known vulnerable patterns",
  "Set up monitoring for model drift and anomalous outputs",
];

// ── Safety profile lookup ──────────────────────────────────────────────

function lookupSafetyProfile(model) {
  const family = model.family || "";

  // Try exact match first, then prefix match
  if (SAFETY_PROFILES[family]) return SAFETY_PROFILES[family];

  for (const [key, profile] of Object.entries(SAFETY_PROFILES)) {
    if (family.toLowerCase().includes(key.toLowerCase())) return profile;
  }

  // Unknown model — assume no safety training (conservative default)
  return {
    hasSafetyTraining: false,
    description: "Unknown model family — safety training status is unverified",
    limitations: [
      "Safety training status could not be determined",
      "Treat as unaligned and add full guardrail stack",
      "Verify model card for safety information before deploying",
    ],
  };
}

// ── Main export ────────────────────────────────────────────────────────

/**
 * Generate safety guardrail recommendations for a given model and user context.
 *
 * @param {object} model  - Model object with id, name, family, provider, ecosystem, params
 * @param {object} inputs - User inputs with constraints.privacy, constraints.deployment, useCases
 * @returns {object} Safety recommendation with risk level, guardrails, and production checklist
 */
function generateSafetyRecommendation(model, inputs) {
  const deployment = inputs?.constraints?.deployment || "local";
  const useCases = inputs?.useCases || [];

  const profile = lookupSafetyProfile(model);
  const riskLevel = determineRiskLevel(model, inputs);
  const riskSummary = buildRiskSummary(riskLevel, profile);
  const guardrails = buildGuardrails(model);
  const codeSpecificRisks = assessCodeRisks(useCases);
  const recommendedStack = buildRecommendedStack(deployment);

  return {
    riskLevel,
    riskSummary,
    guardrails,
    builtInSafety: {
      hasSafetyTraining: profile.hasSafetyTraining,
      description: profile.description,
      limitations: profile.limitations,
    },
    codeSpecificRisks,
    recommendedStack,
    productionChecklist: PRODUCTION_CHECKLIST,
  };
}

export { generateSafetyRecommendation };
