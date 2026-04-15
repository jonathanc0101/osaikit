/**
 * ToS / License Compliance Report Generator
 *
 * Generates a structured compliance report for a recommended model
 * based on the developer's deployment context. Covers license
 * compatibility, an acceptable-use policy draft, and regulatory flags.
 *
 * This is the layer the open-source AI ecosystem is missing — scoring
 * only 1.9/5 on Terms of Service in Krikorian's gap analysis.
 */

// ── Model-family knowledge base ──────────────────────────────────────
// Encodes license nuances that go beyond SPDX identifiers.

const FAMILY_KNOWLEDGE = {
  deepseek: {
    spdx: "MIT",
    origin: "China",
    provider: "DeepSeek",
    permissive: true,
    commercialOk: true,
    mauCap: null,
    attributionText: "Include MIT license notice in copies or substantial portions.",
    distillationRestriction: false,
    responsibleUseRestrictions: false,
    trainingDataNotes: "Training data composition not fully disclosed.",
    exportControlNote: "Developed by DeepSeek (China). Depending on jurisdiction, export control or sanctions review may apply.",
    ipIndemnification: false,
    derivativeRequiresOpenSource: false,
  },
  llama3: {
    spdx: "Llama-3-Community",
    origin: "US",
    provider: "Meta",
    permissive: false,
    commercialOk: true,
    mauCap: 700_000_000,
    attributionText: 'Must display "Built with Llama" in any derivative product or service.',
    distillationRestriction: true,
    responsibleUseRestrictions: true,
    trainingDataNotes: "Training data composition not fully disclosed by Meta.",
    exportControlNote: null,
    ipIndemnification: false,
    derivativeRequiresOpenSource: false,
  },
  llama2: {
    spdx: "Llama-2-Community",
    origin: "US",
    provider: "Meta",
    permissive: false,
    commercialOk: true,
    mauCap: 700_000_000,
    attributionText: "Include Llama 2 Community License notice in distribution.",
    distillationRestriction: true,
    responsibleUseRestrictions: true,
    trainingDataNotes: "Training data composition not fully disclosed by Meta.",
    exportControlNote: null,
    ipIndemnification: false,
    derivativeRequiresOpenSource: false,
  },
  codellama: {
    spdx: "Llama-2-Community",
    origin: "US",
    provider: "Meta",
    permissive: false,
    commercialOk: true,
    mauCap: 700_000_000,
    attributionText: "Include Llama 2 Community License notice in distribution.",
    distillationRestriction: true,
    responsibleUseRestrictions: true,
    trainingDataNotes: "Training data composition not fully disclosed by Meta.",
    exportControlNote: null,
    ipIndemnification: false,
    derivativeRequiresOpenSource: false,
  },
  mistral: {
    spdx: "Apache-2.0",
    origin: "France",
    provider: "Mistral AI",
    permissive: true,
    commercialOk: true,
    mauCap: null,
    attributionText: "Include Apache-2.0 license notice and NOTICE file in distributions.",
    distillationRestriction: false,
    responsibleUseRestrictions: false,
    trainingDataNotes: "Training data composition not fully disclosed. French/EU origin generally favorable for GDPR alignment.",
    exportControlNote: null,
    ipIndemnification: false,
    derivativeRequiresOpenSource: false,
  },
  mixtral: {
    spdx: "Apache-2.0",
    origin: "France",
    provider: "Mistral AI",
    permissive: true,
    commercialOk: true,
    mauCap: null,
    attributionText: "Include Apache-2.0 license notice and NOTICE file in distributions.",
    distillationRestriction: false,
    responsibleUseRestrictions: false,
    trainingDataNotes: "Training data composition not fully disclosed. French/EU origin generally favorable for GDPR alignment.",
    exportControlNote: null,
    ipIndemnification: false,
    derivativeRequiresOpenSource: false,
  },
  qwen: {
    spdx: "Apache-2.0",
    origin: "China",
    provider: "Alibaba Cloud",
    permissive: true,
    commercialOk: true,
    mauCap: null,
    attributionText: "Include Apache-2.0 license notice in distributions.",
    distillationRestriction: false,
    responsibleUseRestrictions: false,
    trainingDataNotes: "Training data composition not fully disclosed. Developed by Alibaba Cloud (China).",
    exportControlNote: "Developed by Alibaba Cloud (China). Depending on jurisdiction, export control or sanctions review may apply.",
    ipIndemnification: false,
    derivativeRequiresOpenSource: false,
  },
  codegemma: {
    spdx: "Gemma-Terms",
    origin: "US",
    provider: "Google",
    permissive: false,
    commercialOk: true,
    mauCap: null,
    attributionText: "No specific attribution requirement, but subject to Google's Gemma Terms of Use.",
    distillationRestriction: true,
    responsibleUseRestrictions: true,
    trainingDataNotes: "Training data composition not fully disclosed. Subject to Google Prohibited Use Policy.",
    exportControlNote: null,
    ipIndemnification: false,
    derivativeRequiresOpenSource: false,
  },
  phi: {
    spdx: "MIT",
    origin: "US",
    provider: "Microsoft",
    permissive: true,
    commercialOk: true,
    mauCap: null,
    attributionText: "Include MIT license notice in copies or substantial portions.",
    distillationRestriction: false,
    responsibleUseRestrictions: false,
    trainingDataNotes: "Training data includes synthetic data generated by GPT-4. Provenance of synthetic training data may warrant review.",
    exportControlNote: null,
    ipIndemnification: false,
    derivativeRequiresOpenSource: false,
  },
  starcoder: {
    spdx: "BigCode-OpenRAIL-M",
    origin: "International",
    provider: "BigCode",
    permissive: false,
    commercialOk: true,
    mauCap: null,
    attributionText: "Include OpenRAIL-M license notice. Comply with responsible-use restrictions.",
    distillationRestriction: false,
    responsibleUseRestrictions: true,
    trainingDataNotes: "Trained on The Stack v2 (open, with opt-out). Training data is documented and auditable.",
    exportControlNote: null,
    ipIndemnification: false,
    derivativeRequiresOpenSource: false,
  },
  wizardcoder: {
    spdx: "BigCode-OpenRAIL-M",
    origin: "International",
    provider: "WizardLM",
    permissive: false,
    commercialOk: false,
    mauCap: null,
    attributionText: "Include OpenRAIL-M license notice. Note: commercial use is disputed due to training data provenance.",
    distillationRestriction: false,
    responsibleUseRestrictions: true,
    trainingDataNotes: "Built on StarCoder + Evol-Instruct data generated by ChatGPT. OpenAI ToS may restrict commercial redistribution of ChatGPT-derived training data. Significant IP ambiguity.",
    exportControlNote: null,
    ipIndemnification: false,
    derivativeRequiresOpenSource: true,
  },
  granite: {
    spdx: "Apache-2.0",
    origin: "US",
    provider: "IBM",
    permissive: true,
    commercialOk: true,
    mauCap: null,
    attributionText: "Include Apache-2.0 license notice in distributions.",
    distillationRestriction: false,
    responsibleUseRestrictions: false,
    trainingDataNotes: "Training data is curated and documented by IBM. Enterprise-friendly provenance.",
    exportControlNote: null,
    ipIndemnification: true,
    derivativeRequiresOpenSource: false,
  },
};

// ── Family resolver ──────────────────────────────────────────────────
// Normalizes model family / provider strings to a knowledge-base key.

function resolveFamily(model) {
  const raw = (model.family || model.provider || model.id || "").toLowerCase();

  if (/deepseek/i.test(raw)) return "deepseek";
  if (/llama[\s-]*3/i.test(raw)) return "llama3";
  if (/codellama|code[\s-]*llama/i.test(raw)) return "codellama";
  if (/llama[\s-]*2/i.test(raw)) return "llama2";
  if (/llama/i.test(raw)) return "llama3"; // default newer Llama
  if (/mixtral/i.test(raw)) return "mixtral";
  if (/mistral/i.test(raw)) return "mistral";
  if (/qwen/i.test(raw)) return "qwen";
  if (/codegemma|gemma/i.test(raw)) return "codegemma";
  if (/phi/i.test(raw)) return "phi";
  if (/starcoder/i.test(raw)) return "starcoder";
  if (/wizardcoder|wizard/i.test(raw)) return "wizardcoder";
  if (/granite/i.test(raw)) return "granite";

  return null;
}

// ── License compatibility assessment ─────────────────────────────────

function assessLicenseCompatibility(model, inputs, knowledge) {
  const risks = [];
  const deployment = inputs.constraints?.deployment || "cloud";
  const privacy = inputs.constraints?.privacy || "moderate";
  const budget = inputs.constraints?.budget || "medium";
  const role = inputs.role || "";
  const useCases = inputs.useCases || [];

  // --- Commercial use ---
  if (!knowledge.commercialOk) {
    risks.push({
      level: "critical",
      area: "Commercial use",
      detail: `The ${knowledge.spdx} license for ${model.name} restricts or prohibits commercial use. ${knowledge.trainingDataNotes}`,
    });
  } else if (knowledge.mauCap && budget !== "free") {
    risks.push({
      level: "medium",
      area: "Commercial use",
      detail: `Commercial use is permitted, but ${model.provider || model.name} imposes a ${(knowledge.mauCap / 1_000_000).toFixed(0)}M monthly-active-user cap. Exceeding this threshold requires a separate license agreement.`,
    });
  }

  // --- Output liability (always flag for open models) ---
  risks.push({
    level: "medium",
    area: "Output liability",
    detail: `Open-weight models carry NO warranty. ${model.name} outputs may contain hallucinations, security vulnerabilities, or incorrect code. Your organization bears full liability for production use of generated outputs.`,
  });

  // --- Training data provenance ---
  if (knowledge.trainingDataNotes.toLowerCase().includes("chatgpt") ||
      knowledge.trainingDataNotes.toLowerCase().includes("gpt-4") ||
      knowledge.trainingDataNotes.toLowerCase().includes("synthetic")) {
    risks.push({
      level: "high",
      area: "Training data provenance",
      detail: knowledge.trainingDataNotes,
    });
  } else if (knowledge.trainingDataNotes.toLowerCase().includes("not fully disclosed")) {
    risks.push({
      level: "low",
      area: "Training data provenance",
      detail: knowledge.trainingDataNotes,
    });
  }

  // --- Data residency ---
  if (deployment === "cloud" && privacy === "strict") {
    risks.push({
      level: "high",
      area: "Data residency",
      detail: "Cloud deployment combined with strict privacy requirements may violate data residency obligations. Ensure the inference provider offers region-locked deployments and data processing agreements.",
    });
  } else if (deployment === "cloud" && privacy === "moderate") {
    risks.push({
      level: "low",
      area: "Data residency",
      detail: "Cloud deployment may process data outside your primary jurisdiction. Review your inference provider's data residency documentation.",
    });
  }

  // --- Regulated industry signals ---
  const regulatedSignals = privacy === "strict" &&
    (role.toLowerCase().includes("backend") ||
     role.toLowerCase().includes("api") ||
     useCases.some(u => /health|finance|bank|insurance|medical|legal|govern/i.test(u)));
  if (regulatedSignals) {
    risks.push({
      level: "high",
      area: "Regulated industry",
      detail: "Strict privacy requirements combined with your deployment context suggest a regulated environment. Implement a full audit trail for all model inputs, outputs, and decisions. Engage legal counsel.",
    });
  } else if (privacy === "strict") {
    risks.push({
      level: "medium",
      area: "Regulated industry",
      detail: "Strict privacy setting indicates potential regulatory obligations. Consider implementing audit logging for model interactions.",
    });
  }

  // --- Derivative works ---
  if (knowledge.derivativeRequiresOpenSource) {
    risks.push({
      level: "high",
      area: "Derivative works",
      detail: `The ${knowledge.spdx} license may require you to open-source derivative works. Fine-tuned models and adaptations could fall under this requirement.`,
    });
  } else if (knowledge.distillationRestriction) {
    risks.push({
      level: "medium",
      area: "Derivative works",
      detail: `${model.name} prohibits using its outputs to train competing foundation models. Fine-tuning for your own use is permitted, but distillation into a separate foundation model is restricted.`,
    });
  }

  // --- Attribution ---
  if (knowledge.attributionText) {
    const level = knowledge.mauCap ? "medium" : "low";
    risks.push({
      level,
      area: "Attribution",
      detail: knowledge.attributionText,
    });
  }

  // --- Export controls ---
  if (knowledge.exportControlNote) {
    risks.push({
      level: "medium",
      area: "Export controls",
      detail: knowledge.exportControlNote,
    });
  }

  // Determine overall compatibility
  const hasCritical = risks.some(r => r.level === "critical");
  const hasHigh = risks.some(r => r.level === "high");

  let compatible = !hasCritical;
  let summary;
  if (hasCritical) {
    summary = `${knowledge.spdx} is NOT compatible with your intended ${deployment} deployment for commercial use.`;
  } else if (hasHigh) {
    summary = `${knowledge.spdx} is conditionally compatible with ${deployment} deployment — high-severity risks require review.`;
  } else {
    summary = `${knowledge.spdx} is compatible with commercial ${deployment} deployment.`;
  }

  return { compatible, summary, risks };
}

// ── Acceptable-use policy generator ──────────────────────────────────

function generateAcceptableUsePolicy(model, inputs, knowledge) {
  const deployment = inputs.constraints?.deployment || "cloud";
  const privacy = inputs.constraints?.privacy || "moderate";
  const useCases = inputs.useCases || [];

  const sections = [];

  // Permitted Uses
  const useCaseList = useCases.length > 0
    ? useCases.map(u => `  - ${u}`).join("\n")
    : "  - Software development assistance\n  - Code generation and review";
  sections.push({
    heading: "Permitted Uses",
    content: `This AI model (${model.name}) may be used for the following purposes within your organization:\n${useCaseList}\n\nAll use must comply with the ${knowledge.spdx} license terms${knowledge.responsibleUseRestrictions ? " and the model provider's responsible-use policy" : ""}.`,
  });

  // Prohibited Uses
  const prohibitions = [
    "Generating malicious code, malware, or exploits.",
    "Producing content that violates applicable laws or regulations.",
    "Representing model outputs as human-authored without disclosure.",
  ];
  if (knowledge.responsibleUseRestrictions) {
    prohibitions.push(
      "Surveillance or mass monitoring of individuals.",
      "Autonomous decision-making in law enforcement or criminal justice.",
      "Medical diagnosis or treatment decisions without qualified human oversight.",
    );
  }
  if (knowledge.distillationRestriction) {
    prohibitions.push(
      `Using ${model.name} outputs to train, distill, or improve competing foundation models.`,
    );
  }
  sections.push({
    heading: "Prohibited Uses",
    content: `The following uses of ${model.name} are strictly prohibited:\n${prohibitions.map(p => `  - ${p}`).join("\n")}`,
  });

  // Output Disclaimer
  sections.push({
    heading: "Output Disclaimer",
    content: `${model.name} is an AI model that may produce incorrect, incomplete, or misleading outputs. All generated code, text, and artifacts MUST be reviewed by a qualified human before use in production systems. No warranty, express or implied, is provided regarding the accuracy, reliability, or fitness for purpose of any model output. Your organization assumes full responsibility for validating and deploying model-generated content.`,
  });

  // Data Handling
  let dataContent = "";
  if (deployment === "local") {
    dataContent = `When deployed locally, all data remains on-premises. No model inputs or outputs are transmitted to external services. Ensure local storage is encrypted at rest and access is restricted to authorized personnel.`;
  } else if (deployment === "cloud") {
    dataContent = `Cloud deployment transmits data to third-party inference providers. Ensure your provider offers:\n  - Encryption in transit (TLS 1.2+) and at rest\n  - A Data Processing Agreement (DPA) compliant with your regulatory requirements\n  - Region-specific deployment options if data residency applies\n  - Contractual guarantees that inputs are not used for model training`;
    if (privacy === "strict") {
      dataContent += `\n\nGiven your strict privacy requirements, implement:\n  - Automated PII detection and redaction before model input\n  - Data retention limits with automated deletion schedules\n  - Right-to-erasure mechanisms for stored model interactions\n  - Input/output logging with access controls for audit purposes`;
    }
  } else {
    dataContent = `Hybrid deployment processes some data locally and some via cloud inference. Apply cloud data-handling requirements to all data that leaves your network perimeter. Maintain a clear inventory of which data flows are local vs. cloud-routed.`;
  }
  sections.push({
    heading: "Data Handling",
    content: dataContent,
  });

  // Liability Limitations
  sections.push({
    heading: "Liability Limitations",
    content: `${model.name} is provided under the ${knowledge.spdx} license WITHOUT WARRANTY OF ANY KIND. The model provider (${knowledge.provider}) is not liable for any damages arising from the use of this model, including but not limited to: incorrect code generation, security vulnerabilities in generated code, data loss, or business interruption.${knowledge.ipIndemnification ? `\n\nNote: IP indemnification may be available through ${knowledge.provider}'s enterprise offerings. Contact ${knowledge.provider} for details.` : ""}\n\nYour organization must carry appropriate professional liability and errors-and-omissions insurance to cover risks arising from AI-assisted development.`,
  });

  // Attribution Requirements
  let attrContent;
  if (knowledge.mauCap) {
    attrContent = `${knowledge.attributionText}\n\nThis requirement applies to all public-facing products, services, documentation, and marketing materials that incorporate outputs from ${model.name}. Your organization must track monthly active users to ensure compliance with the ${(knowledge.mauCap / 1_000_000).toFixed(0)}M MAU threshold.`;
  } else if (knowledge.attributionText) {
    attrContent = `${knowledge.attributionText}\n\nInclude appropriate attribution in source distributions, documentation, and any derivative works as required by the ${knowledge.spdx} license.`;
  } else {
    attrContent = `No specific attribution is required by the ${knowledge.spdx} license. However, acknowledging the use of AI-generated code in your development process is recommended as a best practice.`;
  }
  sections.push({
    heading: "Attribution Requirements",
    content: attrContent,
  });

  return {
    title: `Acceptable Use Policy \u2014 ${model.name}`,
    sections,
  };
}

// ── Regulatory flags ─────────────────────────────────────────────────

function assessRegulatoryFlags(model, inputs, knowledge) {
  const deployment = inputs.constraints?.deployment || "cloud";
  const privacy = inputs.constraints?.privacy || "moderate";
  const budget = inputs.constraints?.budget || "medium";
  const role = inputs.role || "";
  const useCases = inputs.useCases || [];

  const joined = [role, ...useCases].join(" ").toLowerCase();
  const flags = [];

  // GDPR
  const gdprApplies = deployment !== "local" || privacy !== "strict";
  flags.push({
    regulation: "GDPR",
    applies: gdprApplies,
    reason: gdprApplies
      ? deployment === "local"
        ? "Even local deployments may process EU personal data requiring GDPR compliance."
        : "Cloud or hybrid deployment may process EU personal data via third-party infrastructure."
      : "Fully local deployment with strict privacy controls reduces GDPR exposure, but does not eliminate it if EU personal data is processed.",
    action: gdprApplies
      ? "Implement a Data Processing Agreement with your inference provider. Ensure right-to-erasure for model inputs containing personal data. Conduct a Data Protection Impact Assessment (DPIA) for AI processing."
      : "Document your local-only processing as part of your GDPR records of processing activities.",
  });

  // SOC 2
  const soc2Applies = (deployment === "cloud" || deployment === "hybrid") &&
    (budget === "medium" || budget === "high");
  flags.push({
    regulation: "SOC 2",
    applies: soc2Applies,
    reason: soc2Applies
      ? "Cloud/hybrid deployment at medium-to-high budget implies a SaaS or enterprise product requiring audit controls."
      : "Current deployment context does not strongly indicate SOC 2 requirements, but review if serving enterprise customers.",
    action: soc2Applies
      ? "Document model access controls, output logging, and change management procedures. Include AI model governance in your SOC 2 Trust Services Criteria (Security, Availability, Confidentiality)."
      : "Monitor whether your customers or market segment require SOC 2 compliance.",
  });

  // HIPAA
  const healthIndicators = /health|medical|patient|clinical|hipaa|pharma|hospital|diagnosis/i.test(joined);
  const hipaaApplies = privacy === "strict" && healthIndicators;
  flags.push({
    regulation: "HIPAA",
    applies: hipaaApplies,
    reason: hipaaApplies
      ? "Strict privacy requirements combined with healthcare-related use cases indicate potential HIPAA obligations."
      : "No strong healthcare indicators detected, but flag if any Protected Health Information (PHI) could enter model inputs.",
    action: hipaaApplies
      ? "Execute a Business Associate Agreement (BAA) with your inference provider. Implement PHI detection and redaction before model input. Maintain full audit logs of all model interactions involving potential PHI. Conduct a HIPAA Security Risk Assessment."
      : "Ensure PHI is never sent to the model without appropriate safeguards, even if HIPAA is not currently triggered.",
  });

  // EU AI Act
  flags.push({
    regulation: "EU AI Act",
    applies: true,
    reason: "The EU AI Act applies to all AI systems deployed in or affecting the EU market, regardless of where the provider is based.",
    action: "Classify your AI use case under the EU AI Act risk tiers (minimal, limited, high, unacceptable). For code-generation tools used internally, this is typically 'limited risk' requiring transparency obligations: disclose to users that they are interacting with AI-generated content. Maintain technical documentation of the model's capabilities and limitations.",
  });

  // CCPA
  const ccpaApplies = deployment === "cloud" || deployment === "hybrid";
  flags.push({
    regulation: "CCPA",
    applies: ccpaApplies,
    reason: ccpaApplies
      ? "Cloud deployment may process personal information of California residents, triggering CCPA obligations."
      : "Local-only deployment reduces CCPA exposure, but review if any California user data could be processed.",
    action: ccpaApplies
      ? "Implement opt-out mechanisms for data collection. Provide a 'Do Not Sell My Personal Information' mechanism if applicable. Maintain records of personal information categories processed through the model."
      : "Monitor whether California user data enters your processing pipeline.",
  });

  // Export controls
  const exportRisk = knowledge.origin === "China";
  flags.push({
    regulation: "Export Controls (EAR/OFAC)",
    applies: exportRisk,
    reason: exportRisk
      ? `${model.name} is developed by ${knowledge.provider} (${knowledge.origin} origin). Depending on your jurisdiction and the nature of your product, use of China-origin AI models may require export control review under EAR or be subject to OFAC sanctions screening.`
      : `${model.name} is developed by ${knowledge.provider} (${knowledge.origin} origin). No elevated export control concerns based on model origin.`,
    action: exportRisk
      ? "Consult with trade compliance counsel to determine whether use of this model triggers export control review. Screen against OFAC Specially Designated Nationals (SDN) list. Document your due diligence."
      : "Maintain standard export compliance procedures. No model-origin-specific action required.",
  });

  return { flags };
}

// ── Main export ──────────────────────────────────────────────────────

function generateComplianceReport(model, inputs) {
  const familyKey = resolveFamily(model);
  const knowledge = familyKey ? FAMILY_KNOWLEDGE[familyKey] : null;

  // Fallback for unknown models
  if (!knowledge) {
    return {
      licenseReport: {
        compatible: false,
        summary: `Unable to assess license compliance for "${model.name}" — model family not recognized. Manual legal review required.`,
        risks: [
          { level: "high", area: "Unknown license", detail: `No compliance data available for model family "${model.family || "unknown"}". Review the model's license terms directly before any deployment.` },
          { level: "medium", area: "Output liability", detail: "Open-weight models carry NO warranty. Your organization bears full liability for production use of generated outputs." },
        ],
      },
      acceptableUsePolicy: {
        title: `Acceptable Use Policy \u2014 ${model.name}`,
        sections: [
          { heading: "Notice", content: `Compliance data for ${model.name} is not available in the current knowledge base. This policy must be drafted manually after reviewing the model's license terms.` },
        ],
      },
      regulatoryFlags: assessRegulatoryFlags(model, inputs, {
        origin: "Unknown",
        provider: model.provider || "Unknown",
      }),
      disclaimer: "This report is for informational purposes only. Consult qualified legal counsel for compliance decisions.",
    };
  }

  const licenseReport = assessLicenseCompatibility(model, inputs, knowledge);
  const acceptableUsePolicy = generateAcceptableUsePolicy(model, inputs, knowledge);
  const regulatoryFlags = assessRegulatoryFlags(model, inputs, knowledge);

  return {
    licenseReport,
    acceptableUsePolicy,
    regulatoryFlags,
    disclaimer: "This report is for informational purposes only. Consult qualified legal counsel for compliance decisions.",
  };
}

export { generateComplianceReport };
