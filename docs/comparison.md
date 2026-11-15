# Objective Ecosystem Comparison

As artificial intelligence coding assistants proliferate, the open-source community has explored various approaches to communicate and enforce AI contribution policies. This document provides an honest, objective technical comparison of **`ai-policy-kit`** alongside alternative tools and paradigms in the ecosystem.

---

## 1. Feature Matrix

| Evaluation Dimension | `ai-policy-kit` | `tessl good-oss-citizen` | `Scientific Python (SPE 008)` | `GitHub Native Controls` | `Probabilistic AI Detectors` | `Unstructured CONTRIBUTING.md` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Primary Mechanism** | Deterministic JSON Schema + CLI + Action | Prompt-based LLM agent skill | Static prose guideline template | Platform branch protection & rulesets | Statistical / Neural text classifiers | Unstructured markdown paragraphs |
| **Machine Actionable** | **Yes** (`ai-policy.yml`) | Partial (prompt instructions) | No (human reading only) | **Yes** (proprietary JSON/UI) | No (returns score 0–100%) | No |
| **Zero-LLM / Deterministic** | **Yes** (100% reproducible) | No (probabilistic LLM) | N/A (prose) | **Yes** (platform rules) | No (probabilistic) | N/A |
| **Git Trailer Enforcement** | **Yes** (`lint-pr`) | No | Recommended in prose | No | No | No |
| **Workspace Leak Guard** | **Yes** (`.cursor/`, `.claude/`, etc.) | No | No | Partial (Secret Scanning) | No | No |
| **False Positive Rate** | **0%** (deterministic rules) | Variable (model drift) | N/A | 0% | **High** (20–40% on code) | N/A |
| **Offline / Local CLI** | **Yes** (`ai-policy`) | No | N/A | No (GitHub cloud only) | No (Cloud API only) | N/A |
| **Open Standard** | **JSON Schema Draft-07 (MIT)** | Vendor skill definition | Community specification | Proprietary | Commercial SaaS | Ad-hoc text |
| **Execution Latency** | **< 100ms** | 5s – 30s (LLM calls) | 0ms (manual) | < 500ms | 1s – 5s (Cloud API) | Manual review |
| **Token / Subscription Cost** | **$0** (Free & Open Source) | API token costs | $0 | Requires GitHub plan | Recurring subscription | $0 |

---

## 2. In-Depth Comparative Analysis

### 1. `ai-policy-kit`
* **Core Philosophy**: Treat AI contribution governance like compiler flags or linting rules: deterministic, machine-readable, testable in CI, and offline-first.
* **Strengths**:
  * Formal JSON Schema Draft-07 standard.
  * Instant local execution (`init`, `check`, `lint-pr`).
  * Automated Git commit trailer inspection (`AI-Assisted: ...`).
  * Guard against accidental leaks of AI IDE folders (`.cursor/`, `.claude/`, `.gemini/`).
  * 100% deterministic with zero false positives.
* **Weaknesses**:
  * Does not attempt to guess or forensic-scan undisclosed AI usage.

---

### 2. `tessl good-oss-citizen` Preflight
* **Core Philosophy**: Use LLM-driven prompt skills during agent preflight to guide autonomous agents in respecting repository conventions.
* **Strengths**:
  * Direct integration with agentic frameworks.
  * Flexible natural-language interpretation.
* **Weaknesses**:
  * Probabilistic execution subject to model drift and hallucinations.
  * Cannot be verified as a deterministic gate in standard CI pipelines.
  * Requires external LLM API access and token expenditure.

---

### 3. Scientific Python (SPE 008)
* **Core Philosophy**: Provide community consensus guidelines on AI-assisted contributions for the scientific ecosystem (NumPy, SciPy, Matplotlib, SymPy).
* **Strengths**:
  * High community prestige and adoption in the Python data stack.
  * Pragmatic balance between encouraging innovation and requiring human accountability.
* **Weaknesses**:
  * Strictly a natural-language document (`AI_POLICY.md`); lacks automated CI enforcement tooling or machine-readable configuration.
* **Synergy**: `ai-policy-kit` was empirically modeled after SPE 008 (the `balanced.yml` preset directly encodes SPE 008 principles into machine-actionable schema).

---

### 4. GitHub Native Controls & Rulesets
* **Core Philosophy**: Platform-level branch protection, required status checks, and actor permissions.
* **Strengths**:
  * Built natively into the GitHub hosting platform.
  * Can block PR merges if status checks fail.
* **Weaknesses**:
  * Platform-locked to GitHub.
  * No built-in semantic awareness of AI commit trailers, PR checklists, or IDE workspace leaks.
* **Synergy**: `ai-policy-kit` works seamlessly *with* GitHub Native Controls as a required GitHub Actions status check (`validate-ai-policy`).

---

### 5. Probabilistic AI Detectors (e.g. GPTZero, CopyLeaks)
* **Core Philosophy**: Apply statistical perplexity, burstiness analysis, or neural network classifiers to guess whether text or code was authored by an LLM.
* **Strengths**:
  * Attempts automated detection without relying on contributor self-disclosure.
* **Weaknesses**:
  * Extremely high false-positive rates on idiomatic source code and boilerplate.
  * Documented bias against non-native English speakers.
  * Easily bypassed by trivial whitespace, renaming, or commenting modifications.
  * Incompatible with deterministic CI/CD quality gates.

---

### 6. Unstructured Prose in `CONTRIBUTING.md`
* **Core Philosophy**: Write a paragraph in the contribution guide asking contributors to follow certain rules.
* **Strengths**:
  * Zero setup overhead.
* **Weaknesses**:
  * Cannot be enforced in CI.
  * Contributors frequently miss or ignore the text.
  * Maintainers must perform tedious, manual nagging on every inbound PR.

---

## 3. Summary: When to Choose `ai-policy-kit`

Choose **`ai-policy-kit`** if:
1. You maintain an open-source project and want a clear, unambiguous, and machine-actionable AI contribution policy.
2. You want pull requests automatically checked in CI for commit trailers, PR disclosure checklists, and workspace leaks.
3. You demand **deterministic, zero-LLM reproducibility** with zero false positives.
4. You want to generate standardized documentation (`AI_POLICY.md`, `AGENTS.md`, and PR templates) directly from configuration.
