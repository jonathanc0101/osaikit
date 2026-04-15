// Structured model card data: limitations, failure modes, intended use,
// and capability boundaries for each model family in the database.

// ── Helpers ─────────────────────────────────────────────────────────────

/** Parse a params string like "16B" or "671B" into a number. */
function parseParams(params) {
  if (!params) return 0;
  const s = String(params).toUpperCase();
  const n = parseFloat(s);
  if (s.endsWith("B")) return n;
  if (s.endsWith("M")) return n / 1000;
  return n;
}

/** Return a size tier for the model based on parameter count. */
function sizeTier(params) {
  const b = parseParams(params);
  if (b < 7) return "small";
  if (b <= 14) return "medium";
  if (b <= 100) return "large";
  return "xlarge";
}

// ── Per-Family Card Data ────────────────────────────────────────────────

const FAMILY_CARDS = {
  "DeepSeek Coder V2": {
    intendedUse: {
      primary:
        "Code generation, mathematical reasoning, and multi-language programming",
      bestFor: [
        "Code completion and generation",
        "Debugging assistance",
        "Mathematical problem solving",
        "Instruction following for development tasks",
      ],
      notRecommendedFor: [
        "Creative writing",
        "Medical or legal advice",
        "Safety-critical systems without human oversight",
      ],
    },
    limitations: [
      {
        category: "hallucination",
        severity: "medium",
        description:
          "May hallucinate API details for niche or less-popular libraries",
      },
      {
        category: "knowledge-cutoff",
        severity: "medium",
        description:
          "Training data cutoff means no knowledge of very recent frameworks or API changes",
      },
    ],
    knownFailureModes: [
      "Can produce syntactically valid but logically incorrect code for complex algorithms",
      "May over-rely on common patterns instead of context-specific solutions",
      "MoE routing can occasionally drop quality on highly specialized sub-tasks",
    ],
    evaluationGaps: [
      "No public evaluation on security vulnerability detection",
      "Limited testing on non-English programming contexts",
      "No published evaluation for long-context (>64K) code understanding",
    ],
    trainingDataNotes:
      "Trained on code and natural language data. Cutoff approximately mid-2024. Training data composition not fully disclosed.",
    modelCardExists: true,
    sizeOverrides: {
      large: [
        {
          category: "compute",
          severity: "high",
          description:
            "236B MoE model requires significant GPU memory and compute for inference",
        },
      ],
    },
  },

  "DeepSeek V3": {
    intendedUse: {
      primary:
        "General-purpose reasoning, code generation, and mathematical problem solving at scale",
      bestFor: [
        "Complex code generation and architecture",
        "Mathematical and scientific reasoning",
        "Multi-step instruction following",
        "Long-context document understanding",
      ],
      notRecommendedFor: [
        "On-device deployment",
        "Medical or legal advice",
        "Safety-critical systems without human oversight",
      ],
    },
    limitations: [
      {
        category: "hallucination",
        severity: "medium",
        description:
          "May hallucinate plausible but incorrect API calls for less common libraries",
      },
      {
        category: "compute",
        severity: "high",
        description:
          "671B MoE model requires cloud-scale infrastructure for deployment",
      },
      {
        category: "knowledge-cutoff",
        severity: "medium",
        description:
          "Training data cutoff means no knowledge of very recent frameworks",
      },
    ],
    knownFailureModes: [
      "Can produce syntactically valid but logically incorrect code for complex algorithms",
      "May over-rely on common patterns instead of context-specific solutions",
      "Extremely resource-intensive; not practical for most self-hosted scenarios",
    ],
    evaluationGaps: [
      "Limited independent evaluation outside of provider-published benchmarks",
      "No public evaluation on adversarial code injection",
      "Long-context reliability beyond 64K tokens not extensively tested",
    ],
    trainingDataNotes:
      "Trained on code and natural language data. Cutoff approximately mid-2024. Training data composition not fully disclosed.",
    modelCardExists: true,
  },

  CodeLlama: {
    intendedUse: {
      primary: "Code generation and infilling with fill-in-middle capability",
      bestFor: [
        "Code completion and infilling",
        "Fill-in-middle tasks",
        "Python-heavy projects",
        "Single-file code generation",
      ],
      notRecommendedFor: [
        "General chat and conversation",
        "Non-code tasks",
        "Safety-critical systems without human review",
        "Projects requiring large context windows",
      ],
    },
    limitations: [
      {
        category: "context",
        severity: "high",
        description:
          "Limited context window (16K) constrains large codebase understanding and multi-file tasks",
      },
      {
        category: "knowledge-cutoff",
        severity: "medium",
        description:
          "Based on 2023 training data; lacks knowledge of recent library and framework updates",
      },
    ],
    knownFailureModes: [
      "Struggles with programming languages outside the top-10 by popularity",
      "May generate deprecated patterns and API usage",
      "Fill-in-middle can produce inconsistent results across file boundaries",
      "Quality drops significantly for architectural and design tasks",
    ],
    evaluationGaps: [
      "Limited evaluation on fill-in-middle quality at scale",
      "No published testing on security-sensitive code patterns",
      "Evaluation skewed toward Python; other languages less tested",
    ],
    trainingDataNotes:
      "Fine-tuned from Llama 2 on code data. Cutoff 2023. Based on publicly available code.",
    modelCardExists: true,
    sizeOverrides: {
      small: [
        {
          category: "capability",
          severity: "high",
          description:
            "7B variant has significant quality limitations for anything beyond simple completions",
        },
      ],
    },
  },

  StarCoder2: {
    intendedUse: {
      primary: "Multi-language code completion and generation",
      bestFor: [
        "Code completion across many languages",
        "Multi-language projects",
        "Fill-in-middle tasks",
        "Projects requiring transparent training data provenance",
      ],
      notRecommendedFor: [
        "Instruction following and chat",
        "Reasoning-heavy tasks",
        "Non-code use cases",
        "Tasks requiring long context understanding",
      ],
    },
    limitations: [
      {
        category: "capability",
        severity: "high",
        description:
          "Not instruction-tuned — works best for completion, not conversational interaction",
      },
      {
        category: "context",
        severity: "medium",
        description:
          "Limited context window (16K) constrains understanding of larger codebases",
      },
      {
        category: "reasoning",
        severity: "high",
        description:
          "Weaker at reasoning and software architecture tasks compared to instruction-tuned models",
      },
    ],
    knownFailureModes: [
      "Base model requires specific prompt formatting; generic prompts yield poor results",
      "Poor at following complex multi-step instructions",
      "May produce code from training data verbatim, raising license concerns",
      "Quality degrades sharply outside common language/framework combinations",
    ],
    evaluationGaps: [
      "Limited evaluation on instruction-following despite widespread use in chat wrappers",
      "No public testing on adversarial or malicious prompt handling",
      "License compliance of generated code not systematically evaluated",
    ],
    trainingDataNotes:
      "Trained on The Stack v2 — curated, with developer opt-out available. Covers 619 programming languages. Transparent data governance.",
    modelCardExists: true,
    sizeOverrides: {
      small: [
        {
          category: "capability",
          severity: "high",
          description:
            "3B variant is very limited and best suited for simple single-line completions only",
        },
      ],
    },
  },

  "Llama 3.1": {
    intendedUse: {
      primary:
        "General-purpose instruction following with strong code and reasoning capabilities",
      bestFor: [
        "Instruction following",
        "Multi-language tasks",
        "Reasoning and analysis",
        "Code generation and review",
      ],
      notRecommendedFor: [
        "Tasks requiring knowledge after training cutoff",
        "Safety-critical systems without guardrails",
        "Use without content moderation layer",
      ],
    },
    limitations: [
      {
        category: "hallucination",
        severity: "medium",
        description:
          "May hallucinate facts confidently, especially for less common topics",
      },
      {
        category: "safety",
        severity: "medium",
        description:
          "May generate harmful content without appropriate guardrails in place",
      },
    ],
    knownFailureModes: [
      "May hallucinate facts with high apparent confidence",
      "Training cutoff limits knowledge of recent events and APIs",
      "Smaller variants struggle with multi-step reasoning chains",
      "Can produce subtly wrong code that passes superficial review",
    ],
    evaluationGaps: [
      "Safety evaluations conducted primarily in English",
      "Limited evaluation on code security and vulnerability patterns",
      "Long-context performance not extensively benchmarked for code tasks",
    ],
    trainingDataNotes:
      "Trained on 15T+ tokens. Composition not fully disclosed. Includes web data, code, and curated sources.",
    modelCardExists: true,
    sizeOverrides: {
      xlarge: [
        {
          category: "compute",
          severity: "high",
          description:
            "405B model requires cloud-scale infrastructure; not viable for self-hosted deployment",
        },
      ],
    },
  },

  "Llama 3.2": {
    intendedUse: {
      primary:
        "Lightweight instruction following for resource-constrained and on-device scenarios",
      bestFor: [
        "On-device inference",
        "Simple instruction following",
        "Resource-constrained environments",
        "Edge deployment",
      ],
      notRecommendedFor: [
        "Complex reasoning tasks",
        "Large codebase understanding",
        "Tasks requiring knowledge after training cutoff",
        "Safety-critical systems without guardrails",
      ],
    },
    limitations: [
      {
        category: "capability",
        severity: "high",
        description:
          "1B and 3B variants have severe capability limitations for code tasks requiring reasoning",
      },
      {
        category: "hallucination",
        severity: "medium",
        description:
          "May hallucinate facts confidently; higher risk with smaller parameter counts",
      },
      {
        category: "safety",
        severity: "medium",
        description:
          "May generate harmful content without appropriate guardrails",
      },
    ],
    knownFailureModes: [
      "Small variants struggle significantly with multi-step reasoning",
      "Very limited capacity for understanding project-level context",
      "May produce incomplete or truncated code for complex functions",
      "Training cutoff limits knowledge of recent frameworks and APIs",
    ],
    evaluationGaps: [
      "On-device performance not extensively benchmarked across hardware",
      "Limited evaluation on code generation quality for small variants",
      "Safety evaluations conducted primarily in English",
    ],
    trainingDataNotes:
      "Trained on 15T+ tokens. Composition not fully disclosed. Includes web data, code, and curated sources.",
    modelCardExists: true,
  },

  Mistral: {
    intendedUse: {
      primary: "General-purpose instruction following and reasoning",
      bestFor: [
        "Instruction following",
        "Reasoning tasks",
        "Multilingual text processing",
        "Code generation",
      ],
      notRecommendedFor: [
        "Tasks requiring the latest knowledge",
        "Safety-critical systems without guardrails",
      ],
    },
    limitations: [
      {
        category: "knowledge-cutoff",
        severity: "medium",
        description:
          "Older training data limits knowledge of recent frameworks and libraries",
      },
      {
        category: "transparency",
        severity: "medium",
        description:
          "Training data composition and filtering criteria not publicly disclosed",
      },
    ],
    knownFailureModes: [
      "May produce inconsistent outputs across languages",
      "Quality can vary on highly domain-specific code tasks",
      "Can be overconfident in incorrect answers",
    ],
    evaluationGaps: [
      "Training data composition unknown; hard to assess bias",
      "Limited independent safety evaluations published",
      "Code-specific benchmarks less comprehensive than dedicated code models",
    ],
    trainingDataNotes:
      "Training data not disclosed. French company, EU-friendly licensing.",
    modelCardExists: true,
  },

  Mixtral: {
    intendedUse: {
      primary:
        "General-purpose instruction following with efficient MoE architecture",
      bestFor: [
        "Instruction following",
        "Reasoning and analysis",
        "Multilingual tasks",
        "Code generation with efficient inference",
      ],
      notRecommendedFor: [
        "Tasks requiring the latest knowledge",
        "Safety-critical systems without guardrails",
        "Memory-constrained on-device deployment despite MoE efficiency",
      ],
    },
    limitations: [
      {
        category: "compute",
        severity: "medium",
        description:
          "MoE architecture requires high memory despite efficient inference; full model weights must be loaded",
      },
      {
        category: "knowledge-cutoff",
        severity: "medium",
        description:
          "Older training data limits knowledge of recent frameworks and libraries",
      },
      {
        category: "transparency",
        severity: "medium",
        description:
          "Training data composition not publicly disclosed",
      },
    ],
    knownFailureModes: [
      "May produce inconsistent outputs across languages",
      "MoE routing can sometimes produce lower-quality outputs for highly specialized tasks",
      "Expert selection may not always activate the optimal subset for code tasks",
    ],
    evaluationGaps: [
      "MoE expert activation patterns not publicly analyzed for code tasks",
      "Training data composition unknown; bias assessment difficult",
      "Limited independent safety evaluations",
    ],
    trainingDataNotes:
      "Training data not disclosed. French company, EU-friendly licensing.",
    modelCardExists: true,
  },

  CodeGemma: {
    intendedUse: {
      primary: "Code completion and generation with small model footprint",
      bestFor: [
        "Code completion",
        "Fill-in-middle tasks",
        "On-device code assistance",
        "Lightweight code generation",
      ],
      notRecommendedFor: [
        "Complex reasoning and architecture design",
        "Non-code tasks",
        "Large-scale codebase understanding",
      ],
    },
    limitations: [
      {
        category: "context",
        severity: "high",
        description:
          "Small context window (8K) severely limits codebase understanding and multi-file tasks",
      },
      {
        category: "licensing",
        severity: "medium",
        description:
          "Gemma license prohibits distillation; limits some deployment and training workflows",
      },
    ],
    knownFailureModes: [
      "Struggles with anything beyond single-function scope",
      "Poor at understanding project-level context and cross-file dependencies",
      "2B variant may produce incomplete or truncated code for non-trivial functions",
      "Quality drops significantly for less common programming languages",
    ],
    evaluationGaps: [
      "Limited evaluation beyond Google-published benchmarks",
      "No public testing on adversarial code generation",
      "Fill-in-middle quality not independently benchmarked at scale",
    ],
    trainingDataNotes:
      "Trained by Google on undisclosed code corpus. Based on Gemma architecture.",
    modelCardExists: true,
    sizeOverrides: {
      small: [
        {
          category: "capability",
          severity: "high",
          description:
            "2B variant is very limited in capability; suitable only for simple completions",
        },
      ],
    },
  },

  "Qwen2.5-Coder": {
    intendedUse: {
      primary:
        "State-of-the-art code generation across 40+ programming languages",
      bestFor: [
        "Code generation across many languages",
        "Multi-language projects",
        "Instruction following for code tasks",
        "Mathematical and algorithmic problem solving",
      ],
      notRecommendedFor: [
        "Safety-critical systems without human review",
        "Creative and non-technical writing",
      ],
    },
    limitations: [
      {
        category: "maturity",
        severity: "low",
        description:
          "Relatively new model family — less battle-tested in production than Llama or Mistral",
      },
      {
        category: "knowledge-cutoff",
        severity: "medium",
        description:
          "Training data cutoff limits knowledge of the newest frameworks and APIs",
      },
    ],
    knownFailureModes: [
      "May generate overly verbose code where concise solutions exist",
      "Can struggle with highly domain-specific APIs not well-represented in training data",
      "Smaller variants have notable quality drops on complex multi-file tasks",
    ],
    evaluationGaps: [
      "Limited independent evaluation outside of Alibaba-published benchmarks",
      "Security-focused code evaluation not publicly available",
      "Long-context code understanding not extensively tested",
    ],
    trainingDataNotes:
      "Trained on 5.5T tokens of code data. Covers 40+ languages. From Alibaba Cloud.",
    modelCardExists: true,
    sizeOverrides: {
      small: [
        {
          category: "capability",
          severity: "medium",
          description:
            "1.5B variant is limited for complex tasks; best for simple completions",
        },
      ],
      large: [
        {
          category: "compute",
          severity: "medium",
          description:
            "32B variant requires significant RAM for local deployment",
        },
      ],
    },
  },

  "Phi-3": {
    intendedUse: {
      primary: "Compact yet capable reasoning and code generation",
      bestFor: [
        "Reasoning and logical tasks",
        "Mathematical problem solving",
        "Code generation in resource-constrained environments",
        "On-device and edge deployment",
      ],
      notRecommendedFor: [
        "Tasks requiring broad real-world knowledge",
        "Multilingual tasks (mini variants)",
        "Creative and open-ended writing",
      ],
    },
    limitations: [
      {
        category: "training-data",
        severity: "medium",
        description:
          "Trained heavily on synthetic data generated by GPT-4; may exhibit systematic biases from that process",
      },
      {
        category: "knowledge",
        severity: "medium",
        description:
          "Smaller knowledge base than larger models; gaps on niche and specialized topics",
      },
    ],
    knownFailureModes: [
      "May exhibit GPT-4-like patterns and blind spots due to synthetic training data",
      "Can struggle with niche topics outside the synthetic training distribution",
      "Smaller variants may produce shallow or formulaic reasoning chains",
      "Limited factual grounding for questions requiring broad world knowledge",
    ],
    evaluationGaps: [
      "Extent of synthetic data influence on output patterns not fully characterized",
      "Limited evaluation on adversarial and out-of-distribution prompts",
      "Code security evaluation not publicly available",
    ],
    trainingDataNotes:
      "Trained on mix of web data and synthetic data generated by GPT-4. From Microsoft Research.",
    modelCardExists: true,
  },

  WizardCoder: {
    intendedUse: {
      primary: "Code generation via Evol-Instruct methodology",
      bestFor: [
        "Code generation",
        "Instruction following for code tasks",
      ],
      notRecommendedFor: [
        "Commercial products without thorough legal review",
        "Non-code tasks",
        "Production deployment without IP assessment",
      ],
    },
    limitations: [
      {
        category: "licensing",
        severity: "critical",
        description:
          "Training data includes ChatGPT outputs, creating intellectual property and license ambiguity",
      },
      {
        category: "maintenance",
        severity: "high",
        description:
          "Project appears less actively maintained; risk of falling behind on fixes and improvements",
      },
      {
        category: "foundation",
        severity: "medium",
        description:
          "Based on older StarCoder and CodeLlama foundations; inherits their limitations",
      },
    ],
    knownFailureModes: [
      "May reproduce patterns from ChatGPT training data verbatim",
      "Limited to code tasks; quality degrades significantly outside that domain",
      "Quality degrades significantly outside the code training distribution",
      "May generate outputs that are derivative of OpenAI model outputs",
    ],
    evaluationGaps: [
      "No independent assessment of IP contamination from ChatGPT-derived training data",
      "License compliance of generated code not systematically evaluated",
      "Limited evaluation on anything beyond code generation benchmarks",
    ],
    trainingDataNotes:
      "Fine-tuned using Evol-Instruct — synthetic instructions generated by ChatGPT. Mixed provenance creates legal risk.",
    modelCardExists: false,
  },

  "Granite Code": {
    intendedUse: {
      primary: "Enterprise code generation with transparent training data",
      bestFor: [
        "Enterprise code generation",
        "Regulated industries requiring data provenance",
        "IP-clean deployment scenarios",
        "IBM watsonx platform integration",
      ],
      notRecommendedFor: [
        "Tasks requiring large context windows",
        "Cutting-edge benchmark performance",
        "Scenarios needing large community ecosystem support",
      ],
    },
    limitations: [
      {
        category: "context",
        severity: "high",
        description:
          "Small context window (8K) severely limits codebase understanding and multi-file tasks",
      },
      {
        category: "performance",
        severity: "medium",
        description:
          "Benchmark performance lags behind top models in the same size class",
      },
      {
        category: "community",
        severity: "low",
        description:
          "Smaller open-source community compared to Llama or Mistral ecosystems",
      },
    ],
    knownFailureModes: [
      "May struggle with modern framework patterns not present in the curated training data",
      "Limited by small context window for any multi-file task",
      "Enterprise focus may mean less coverage of cutting-edge or experimental patterns",
    ],
    evaluationGaps: [
      "Evaluation largely conducted by IBM; limited independent benchmarks",
      "No public evaluation on adversarial prompt handling",
      "Security-focused code generation not independently tested",
    ],
    trainingDataNotes:
      "Trained on curated, IBM-vetted code corpus. Transparent data governance. IP indemnification available via IBM watsonx.",
    modelCardExists: true,
  },
};

// ── Size-based limitation augmentations ─────────────────────────────────

const SIZE_LIMITATIONS = {
  small: {
    category: "capability",
    severity: "high",
    description:
      "Very limited reasoning capability due to small parameter count (<7B); unsuitable for complex tasks",
  },
  large: {
    category: "compute",
    severity: "medium",
    description:
      "Large model (>30B parameters) requires significant compute resources for inference",
  },
  xlarge: {
    category: "compute",
    severity: "high",
    description:
      "Extra-large model (>100B parameters); cloud-only deployment is realistic for most users",
  },
};

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Build a structured model card for the given model object.
 *
 * @param {object} model - A model record from the MODELS database.
 *   Expected fields: id, name, family, params, provider, contextWindow,
 *   strengths, weaknesses, and optionally url.
 * @returns {object} A model card with intendedUse, limitations,
 *   knownFailureModes, evaluationGaps, trainingDataNotes, modelCardUrl,
 *   and modelCardExists.
 */
function getModelCard(model) {
  if (!model || !model.family) {
    return {
      intendedUse: {
        primary: "Unknown",
        bestFor: [],
        notRecommendedFor: [],
      },
      limitations: [],
      knownFailureModes: [],
      evaluationGaps: [
        "No model card data available for this model family",
      ],
      trainingDataNotes: "No training data information available.",
      modelCardUrl: null,
      modelCardExists: false,
    };
  }

  const familyCard = FAMILY_CARDS[model.family];

  if (!familyCard) {
    return {
      intendedUse: {
        primary: "Unknown — model family not in database",
        bestFor: [],
        notRecommendedFor: [],
      },
      limitations: [],
      knownFailureModes: [],
      evaluationGaps: [
        `No model card data available for the "${model.family}" family`,
      ],
      trainingDataNotes: "No training data information available.",
      modelCardUrl: model.url || null,
      modelCardExists: false,
    };
  }

  // Deep-clone the family card so mutations don't affect the template.
  const card = JSON.parse(JSON.stringify(familyCard));

  // --- Size-based limitation augmentation ---
  const tier = sizeTier(model.params);

  // Add family-specific size overrides first.
  if (card.sizeOverrides && card.sizeOverrides[tier]) {
    card.limitations.push(...card.sizeOverrides[tier]);
  }

  // Add generic size limitations (small, large, xlarge) if not already
  // covered by a family-specific override in the same category.
  const sizeLimit = SIZE_LIMITATIONS[tier];
  if (sizeLimit) {
    const alreadyCovered = card.limitations.some(
      (l) => l.category === sizeLimit.category && l.severity === sizeLimit.severity,
    );
    if (!alreadyCovered) {
      card.limitations.push({ ...sizeLimit });
    }
  }

  // Clean up internal-only fields.
  delete card.sizeOverrides;

  // --- Resolve model card URL ---
  card.modelCardUrl = model.url || null;

  return card;
}

export { getModelCard };
