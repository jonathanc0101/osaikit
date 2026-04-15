# OSAI - Open Source AI Kit

Find, recommend, and deploy the best open-source LLM for your stack. One command to go from repo analysis to a running local model — no API keys required.

```
  ___  ____    _    ___
 / _ \/ ___|  / \  |_ _|
| | | \___ \ / _ \  | |
| |_| |___) / ___ \ | |
 \___/|____/_/   \_\___|
```

## Quick start

```bash
# Recommend + install + serve the best model for your project
npx osaikit run local --repo .

# Just get recommendations (no install)
npx osaikit --repo .

# Refresh leaderboard data from 5 live sources
npx osaikit refresh

# Interactive wizard
npx osaikit
```

## `run local` — one command to a running model

Analyzes your repo, picks the best open-source LLM, installs it via [Ollama](https://ollama.com), and verifies the API is serving.

```bash
osaikit run local --repo .                    # auto-detect → deploy
osaikit run local --model qwen3-8b            # specific model
osaikit run local --model devstral-small-2    # SOTA coding model
osaikit run local                             # general-purpose defaults
```

What it does:
1. Scans your codebase (languages, frameworks, project size)
2. Scores 52 models across 7 dimensions and picks the best fit
3. Ensures Ollama is installed and running
4. Pulls the model
5. Verifies the API at `http://localhost:11434/v1`

Requires [Ollama](https://ollama.com/download) installed locally.

## Recommend mode

Scores 52 open-source models across seven weighted dimensions to find the best fit for your project. Two modes:

### `--repo <path>` — Auto-detect mode

Point at any local repo. The analyzer scans your codebase and auto-detects languages, frameworks, runtime, platform, and project size — then skips straight to recommendations.

```bash
osaikit --repo .
osaikit --repo ~/projects/my-api
```

### Interactive wizard

Answer six quick questions about your development environment:

1. **Role** — web, backend, mobile, or game development
2. **Tech stack** — languages, frameworks, runtime, platform
3. **Constraints** — memory limit, budget, deployment mode, privacy
4. **Use cases** — code generation, debugging, architecture, review, docs, testing
5. **License** — permissive, copyleft, or any
6. **Context** — codebase size and whether it's an existing project

### What you get

- **Primary recommendation** with score breakdown across 7 dimensions
- **Quick start commands** — copy-paste `ollama run`, vLLM Docker, llama.cpp, HuggingFace TGI, or LM Studio setup
- **License guidance** — commercial use, fine-tuning rights, output ownership, training data provenance, and action items
- **Integration snippet** — framework-specific code to wire the model into your stack (Express, FastAPI, Gin, Axum, etc.)
- **Fallback model** from a different family
- **On-device option** for local/offline use
- **Enterprise readiness score** — managed hosting providers, SLA availability, SDK quality, community size
- Tuned inference config (temperature, top-p, max tokens)
- Starter prompt template for your use case
- Cost and latency estimates (local vs. cloud)
- RAG recommendation when your context exceeds the model's window
- Warnings about license, age, memory, and latency tradeoffs

## Install

```bash
npx osaikit
```

Or install globally:

```bash
npm install -g osaikit
osaikit
```

## Development

```bash
git clone https://github.com/patio-coop/osaikit.git
cd osaikit
npm install
npm run dev    # build + run
npm test       # run tests
```

## How scoring works

Models are first filtered by hard constraints (license, RAM, privacy, budget, deployment). Remaining candidates are scored across seven dimensions:

| Dimension | Weight | What it measures |
|-----------|--------|------------------|
| Capability fit | 3.0x | Strength/weakness match to your role and use cases |
| Context match | 2.0x | Context window vs. your codebase size needs |
| Benchmarks | 2.0x | HumanEval, SWE-bench, Aider polyglot, LiveCodeBench, BigCodeBench |
| Compute footprint | 1.5x | Latency, on-device viability, budget fit |
| Ecosystem | 1.0x | Tooling support (Ollama, llama.cpp, vLLM, etc.) |
| Enterprise readiness | 0.75x | Managed hosting, SLA, VPC, SDK quality, community, docs |
| Fine-tuning | 0.5x | LoRA/adapter support, fine-tunability |

Live leaderboard data from five sources (HuggingFace, SWE-bench Verified, Aider Polyglot, LiveCodeBench, and BigCodeBench) is fetched in parallel to enrich results — but the tool works fully offline using its built-in model database. Run `osaikit refresh` to force-update leaderboard data.

## Architecture

```
src/
├── cli.js                 # Entry point, flag parsing, command dispatch
├── run.js                 # `run local` — ollama install + serve flow
├── app.js                 # State machine (welcome → wizard → loading → results)
├── theme.js               # OSAI design system tokens
├── analyzer/
│   └── repo.js            # Repository scanner (languages, frameworks, runtime)
├── components/
│   ├── wizard.js          # 6-step questionnaire flow
│   ├── steps.js           # Individual step components
│   ├── loading.js         # Loading screen with per-source status
│   └── results.js         # Recommendation display (12 sections)
├── engine/
│   ├── models.js          # Database of 52 open LLMs with enterprise metadata
│   ├── rules.js           # Scoring engine (7 dimensions), prompt templates, costs
│   ├── quickstart.js      # Copy-paste run commands per ecosystem tool
│   ├── modelcards.js      # Structured model cards (limitations, failure modes)
│   ├── licensing.js       # License guidance and risk assessment
│   ├── integration.js     # Framework-specific integration code snippets
│   ├── compliance.js      # Compliance report generation
│   └── safety.js          # Safety recommendations (Llama Guard, etc.)
└── api/
    ├── index.js           # Parallel fetcher + fuzzy model matching (5 sources)
    ├── huggingface.js     # HuggingFace model catalog (v2 leaderboard)
    ├── swebench.js        # SWE-bench Verified leaderboard
    ├── aider.js           # Aider Polyglot benchmark
    ├── livecodebench.js   # LiveCodeBench (contamination-free coding)
    └── bigcodebench.js    # BigCodeBench (function-level coding)
```

## Roadmap — from recommendation CLI to open-source AI distro

osaikit today recommends the right model and tells you how to set it up. The goal is to evolve it into an opinionated distribution of the open-source AI stack — one that provisions the full deployment, not just the model.

The open-source AI stack has all the components but none of the packaging. Models are competitive (3 months behind closed frontier, closing fast), ML frameworks are production-grade, and inference engines like vLLM are battle-tested. But everything around the model — compliance, observability, safety, developer experience — scores 2 out of 5 on enterprise readiness. The gap isn't capability. It's the wrapper.

osaikit closes that gap the way a Linux distro closes the gap between the kernel and a working desktop: opinionated defaults, everything wired together, profiles for different needs.

### What's built

| Layer | Status | What it does |
|---|---|---|
| Model recommendation | Done | Scores 52 models across 7 dimensions, auto-detects project needs |
| Local deployment | Done | `run local` provisions Ollama + model + verifies API |
| Leaderboard aggregation | Done | Live data from 5 sources (HuggingFace, SWE-bench, Aider, LiveCodeBench, BigCodeBench) |
| License guidance | Done | Risk assessment, commercial use flags, training data provenance |
| Compliance reporting | Done | ToS templates, acceptable use policies, regulatory flags (GDPR, SOC2, HIPAA, EU AI Act, CCPA, export controls) |
| Safety assessment | Done | Per-model safety profiles, guardrail recommendations, code-specific risk analysis |
| Model cards | Done | Structured limitations, failure modes, intended use, evaluation gaps |
| Output configuration | Done | Tuned inference defaults (temperature, top-p, max tokens) per model |
| System prompts | Done | Starter prompt templates per use case |

### What's next — the distro gap

The shift from "recommend" to "provision." Each row below has an open-source component that works — osaikit needs to wire it in.

| Layer | Enterprise readiness gap | Component to wire | Work |
|---|---|---|---|
| Observability | 2/5 | [Langfuse](https://langfuse.com) or [OpenLIT](https://openlit.io) | Auto-provision monitoring, token tracking, cost attribution |
| Content filtering | 2/5 | [Llama Guard](https://github.com/meta-llama/PurpleLlama), [NeMo Guardrails](https://github.com/NVIDIA/NeMo-Guardrails) | Auto-provision input/output safety rails |
| Code security | 2/5 | [Semgrep](https://semgrep.dev), [CodeShield](https://github.com/meta-llama/PurpleLlama) | Auto-scan generated code for vulnerabilities |
| Audit trail | 2/5 | Langfuse + structured logging | Auto-provision SOC2/GDPR-ready audit logging |
| UI/API | 2/5 | [Open WebUI](https://github.com/open-webui/open-webui), [LibreChat](https://github.com/danny-avila/LibreChat) | `osaikit ui` — provision a chat interface |
| Production deployment | 3/5 | [vLLM](https://github.com/vllm-project/vllm), Docker, OpenAI-compatible proxy | `osaikit run production` — deploy with monitoring + safety |
| Evaluation | 2/5 | [LM Eval Harness](https://github.com/EleutherAI/lm-evaluation-harness), [Inspect AI](https://github.com/UKGovernmentBEIS/inspect_ai) | `osaikit eval` — benchmark models on your own data |
| Agent scaffolding | 2/5 | [LangChain](https://github.com/langchain-ai/langchain), [LlamaIndex](https://github.com/run-llama/llama_index) | `osaikit agent` — scaffold agent projects on open models |
| Quantization | 2/5 | GGUF, AWQ, GPTQ via Ollama/llama.cpp | Auto-select quantization for available hardware |
| Federated inference | — | Mesh routing to community GPU nodes | Future: `osaikit run federated` as a backend option |

### Profiles

Different stacks for different needs, all provisioned with one command:

```bash
osaikit init --profile local-dev      # Ollama + model + basic safety
osaikit init --profile startup        # vLLM + monitoring + compliance report
osaikit init --profile enterprise     # Full stack: safety rails, audit logging,
                                      # content filtering, compliance docs
osaikit init --profile research       # Eval harness + fine-tuning tools
osaikit init --profile agent          # Agent framework + tool-calling config
```

### Context

This roadmap is informed by the [OSAI gap map](https://substack.com/home/post/p-193802654) — a scoring of 42 subcategories of the open-source AI stack against closed-source equivalents. The models aren't the problem. Enterprise readiness averages 2.3 out of 5. Terms of Service scored 1. The packaging gap is a "years" problem, and almost all the energy in the ecosystem is going to the part (models) that's already closest to parity.

osaikit focuses on the other part.

## Tech stack

- [Ink](https://github.com/vadimdemedes/ink) + React — terminal UI framework
- [esbuild](https://esbuild.github.io/) — bundler
- Node.js built-in `fetch` — zero HTTP dependencies

## License

MIT
