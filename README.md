# ai-policy-kit

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Schema: Draft-07](https://img.shields.io/badge/Schema-Draft--07-brightgreen.svg)](schema/v0.1/ai-policy.schema.json)
[![Presets: Validated](https://img.shields.io/badge/Presets-Validated-success.svg)](presets/)
[![Empirical Coverage](https://img.shields.io/badge/Empirical_Coverage-100%25_(25_OSS_Projects)-purple.svg)](dataset/summary.json)
[![Tests: Passing](https://img.shields.io/badge/Tests-368%20Passing%20(100%25)-emerald.svg)](tests/)
[![Security: Least Privilege](https://img.shields.io/badge/Security-Least--Privilege-blueviolet.svg)](docs/THREAT_MODEL.md)

> **Standardized, machine-readable schema, presets, and validation tooling to declare and enforce AI contribution policies in open-source repositories.**

---

## The Problem

As generative AI coding assistants and autonomous agents become ubiquitous, open-source maintainers face an unprecedented surge of unverified, machine-generated pull requests ("AI slop") and hallucinated vulnerability reports. At the same time, many legitimate contributors use AI responsibly for boilerplate, typing, refactoring, or documentation.

Most projects attempt to communicate their AI stance through unstructured paragraphs in `CONTRIBUTING.md` or developer wikis. Such natural language guidelines **cannot be verified in continuous integration (CI)**, checked by pre-commit hooks, or rendered consistently in developer tools. Maintainers are left with manual nagging, subjective arguments, and burnout.

**`ai-policy-kit` provides a deterministic, machine-actionable standard:**
* **Machine-Readable Standard (`ai-policy.yml`)**: Declare your repository's AI contribution rules with a formal JSON Schema Draft-07.
* **Empirically Grounded**: Designed from an in-depth survey of **25 major open-source ecosystems** (including Linux Kernel, Gentoo, Chromium, curl, Node.js, Scientific Python, Django, Home Assistant, and Apache).
* **Deterministic & Zero-LLM**: No flaky probabilistic AI content detectors that trigger false positives on human contributors. Enforcement relies on transparent PR disclosure checklists, commit trailers, and author comprehension sign-offs.
* **Ready-to-Use Presets**: Instant configuration with three battle-tested presets: `strict`, `balanced`, and `permissive`.
* **CI/CD Ready**: Easy integration with GitHub Actions, pre-commit linters, and IDE schema validation.

---

## 3 Instant Quickstart Commands

Scaffold, validate, and lint pull requests with zero configuration:

```bash
# 1. Scaffold policy configuration and human-readable docs
npx ai-policy init --preset balanced --docs

# 2. Validate policy configuration against JSON Schema Draft-07
npx ai-policy check

# 3. Validate PR commit trailers, checklists, and detect workspace leaks
npx ai-policy lint-pr --base main --head HEAD
```

---

## 10-Minute Quickstart Walkthrough

Follow this step-by-step guide to protect your repository in under 10 minutes:

### Step 1: Scaffold Policy Configuration & Documentation

Run `ai-policy init` with your preferred preset (`strict`, `balanced`, or `permissive`). Adding `--docs` generates human-readable policy documentation and templates automatically:

```bash
npx ai-policy init --preset balanced --docs
```

This creates four essential files in your repository:
* `.github/ai-policy.yml`: The machine-readable configuration conforming to JSON Schema Draft-07.
* `AI_POLICY.md`: Standardized human-readable policy documentation for contributors.
* `AGENTS.md`: Directives and constraints for AI coding agents.
* `.github/PULL_REQUEST_TEMPLATE.md`: Interactive disclosure checklist for inbound PRs.

### Step 2: Validate Policy Syntax

Verify that your policy file conforms to the schema specification:

```bash
npx ai-policy check
```

Output:
```text
✓ Policy valid and compliant: .github/ai-policy.yml

ai-policy is a deterministic policy compliance validator, NOT an AI text/code detector.
```

### Step 3: Test Local Commits & Workspace Leaks

Test your local feature branch before opening a pull request to ensure all commits contain required trailers and no accidental AI IDE directories (`.cursor/`, `.claude/`, etc.) are staged:

```bash
npx ai-policy lint-pr --base main --head HEAD
```

Output:
```text
✓ Compliance check passed: PR satisfies AI contribution policy
  Commits evaluated: 1
  Policy configuration: .github/ai-policy.yml

ai-policy is a deterministic policy compliance validator, NOT an AI text/code detector.
```

### Step 4: Automate in GitHub Actions CI

Add the official GitHub Action workflow to `.github/workflows/ai-policy.yml`:

```yaml
name: AI Policy Compliance

on:
  pull_request:
    branches: [ main ]

permissions:
  contents: read
  pull-requests: read

jobs:
  validate-ai-policy:
    name: Verify AI Contribution Policy
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full git history required for commit trailer validation

      - name: Run AI Policy Action
        uses: thanhtrieunguyen/ai-policy-kit@v0.1.0
        with:
          policy-path: '.github/ai-policy.yml'
          base-ref: ${{ github.base_ref }}
          head-ref: ${{ github.head_ref }}
          pr-body: ${{ github.event.pull_request.body }}
          fail-on-leak: 'true'
```

### Step 5: Link Policy in `CONTRIBUTING.md`

Add a short notice pointing to `AI_POLICY.md`:

```markdown
## AI Contribution Guidelines
This project adheres to the [AI Contribution Policy](AI_POLICY.md).
All inbound pull requests are automatically validated for policy compliance in CI.
```

---

## The 3 Standard Presets

`ai-policy-kit` ships with three standard presets in [`presets/`](presets/) reflecting common governance postures across the open-source community:

| Preset | Stance | Typical Communities | Key Rules |
| :--- | :--- | :--- | :--- |
| **[`strict.yml`](presets/strict.yml)** | **Forbidden** | Gentoo, NetBSD, QEMU | • 100% ban on AI-generated code and unit tests.<br>• Allowed only for grammar/spelling corrections in documentation.<br>• Mandatory Git commit trailer (`AI-Assisted: ...`).<br>• Automated bot PRs and reviews strictly prohibited. |
| **[`balanced.yml`](presets/balanced.yml)** | **Restricted** (Human-in-the-loop) | Scientific Python, Home Assistant, Fedora | • AI allowed as an assistive tool for code, tests, and documentation.<br>• Contributor must understand every line of code and take full legal/technical responsibility.<br>• Automated review bots and autonomous PR generation banned. |
| **[`permissive.yml`](presets/permissive.yml)** | **Permissive** | Open edX, Immich | • AI tools freely permitted across all categories.<br>• Contributor remains legally and technically accountable.<br>• Transparent disclosure required via PR checklist or comment. |

---

## Complete End-to-End Example

Here is a complete, real-world example demonstrating how configuration, commit messages, PR descriptions, and CI enforcement connect.

### 1. Configuration File (`.github/ai-policy.yml`)

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/thanhtrieunguyen/ai-policy-kit/main/schema/v0.1/ai-policy.schema.json
version: "0.1"
level: "restricted"
policy_url: "https://github.com/your-org/your-repo/blob/main/AI_POLICY.md"
policy_path: "AI_POLICY.md"

categories:
  code: "restricted"
  docs: "permissive"
  tests: "restricted"
  reviews: "forbidden"
  issues: "restricted"

disclosure:
  required: true
  methods:
    - "commit_trailer"
    - "pr_checklist"
    - "pr_description"
  commit_trailer:
    key: "AI-Assisted"
    required: false
    pattern: "^(None|[a-zA-Z0-9_-]+( [0-9.]+)?.*)$"
  tool_name_required: true
  prompt_disclosure: "optional"

accountability:
  author_understands_code: true
  author_takes_responsibility: true
  dco_signoff: true

bots:
  automated_prs: "restricted"
  automated_reviews: "forbidden"
  automated_issues: "forbidden"
  bot_allowlist:
    - "dependabot[bot]"
    - "renovate[bot]"
```

### 2. Sample Commit Message with RFC 5322 Trailer

When authoring a commit with AI assistance, include standard Git trailers at the end of the commit body:

```text
feat(auth): add refresh token rotation

Implements single-use refresh token rotation to mitigate replay attacks.

Signed-off-by: Jane Contributor <jane@example.org>
AI-Assisted: Claude 3.5 Sonnet (scaffolded unit tests and type annotations)
```

### 3. Pull Request Description Checklist

In `.github/PULL_REQUEST_TEMPLATE.md`, contributors disclose tool usage and warrant comprehension:

```markdown
### AI Contribution Disclosure
- [x] Generative AI tools were used in this contribution.
- [x] Tool name / model: Claude 3.5 Sonnet
- [x] I personally reviewed and understand every line of code submitted.
- [x] I take full technical and legal responsibility for this contribution.
```

### 4. Sample CLI Output

When running `ai-policy lint-pr`:

```bash
$ npx ai-policy lint-pr --base main --head HEAD
✓ Compliance check passed: PR satisfies AI contribution policy
  Commits evaluated: 2
  Policy configuration: .github/ai-policy.yml

ai-policy is a deterministic policy compliance validator, NOT an AI text/code detector.
```

If a policy violation or accidental workspace leak is detected:

```bash
$ npx ai-policy lint-pr --base main --head HEAD
✗ Compliance check failed with 1 policy violation:
  [ERROR] Commit a1b2c3d missing required commit trailer "AI-Assisted"
  [ERROR] Accidental AI assistant workspace leak detected: .cursor/rules.json

ai-policy is a deterministic policy compliance validator, NOT an AI text/code detector.
```

---

## Summary FAQ & Known Limitations

> For detailed analysis, see **[docs/faq.md](docs/faq.md)** and **[docs/limitations.md](docs/limitations.md)**.

* **Deterministic, Zero-LLM Architecture**: `ai-policy-kit` does NOT guess code origin using statistical or neural AI detectors. Heuristic detectors suffer from high false-positive rates (20–40% on idiomatic code) and bias against non-native English writers. `ai-policy-kit` checks **explicit, auditable developer signals** (commit trailers, PR checklists, author attestations, and workspace leaks).
* **Declarative Compliance**: Verifies declared transparency; cannot detect undisclosed AI code if an author intentionally omits all trailers and checkboxes. Open-source governance has historically relied on human legal attestations (Linux DCO, Apache CLA), not surveillance.
* **Commit History in CI**: Git commit trailer inspection requires full commit history (`fetch-depth: 0` in `actions/checkout@v4`).
* **Zero External Dependencies**: Operates 100% offline without external AI detection APIs, network calls, or recurring subscription costs.

---

## Objective Ecosystem Comparison

> For detailed qualitative analysis, see **[docs/comparison.md](docs/comparison.md)**.

| Evaluation Dimension | `ai-policy-kit` | `tessl good-oss-citizen` | `Scientific Python (SPE 008)` | `GitHub Native Controls` | `Probabilistic AI Detectors` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Primary Mechanism** | Deterministic JSON Schema + CLI + Action | Prompt-based LLM skill | Static prose guideline template | Platform branch protection & rulesets | Statistical / Neural classifiers |
| **Machine Actionable** | **Yes** (`ai-policy.yml`) | Partial (prompts) | No (human reading only) | **Yes** (ruleset UI/API) | No (score 0–100%) |
| **Zero-LLM / Deterministic** | **Yes** (100% reproducible) | No (probabilistic LLM) | N/A (prose) | **Yes** (platform rules) | No (probabilistic) |
| **Git Trailer Enforcement** | **Yes** (`lint-pr`) | No | Recommended in prose | No | No |
| **Workspace Leak Guard** | **Yes** (`.cursor/`, `.claude/`) | No | No | Partial (Secret Scanning) | No |
| **False Positive Rate** | **0%** (deterministic rules) | Variable (model drift) | N/A | 0% | **High** (20–40% on code) |
| **Offline / Local CLI** | **Yes** (`ai-policy`) | No (requires LLM API) | N/A | No (GitHub cloud only) | No (Cloud API only) |
| **Open Standard** | **JSON Schema Draft-07 (MIT)** | Vendor skill | Community guideline | Proprietary | Commercial SaaS |

---

## Schema Reference & IDE Autocomplete

For exhaustive technical reference on all 8 root schema fields and sub-objects, consult **[docs/schema-reference.md](docs/schema-reference.md)**.

Add this line to the top of your `ai-policy.yml` file to enable real-time autocompletion, field descriptions, and schema validation in Visual Studio Code (via the Red Hat YAML extension):

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/thanhtrieunguyen/ai-policy-kit/main/schema/v0.1/ai-policy.schema.json
```

---

## Empirical Research Foundation

The architecture of `ai-policy-kit` is built upon empirical evidence rather than theoretical assumptions. We conducted an in-depth survey of **25 major open-source projects and foundations**:

* **Operating Systems & Infrastructure**: Linux Kernel, Gentoo, NetBSD, FreeBSD, Debian, Fedora, QEMU, OpenSSL, curl, Kubernetes, Apache Software Foundation, Eclipse Foundation, CPython.
* **Web Runtimes & Frameworks**: Chromium, Mozilla, Node.js, Django, Home Assistant, Immich, Open edX.
* **Scientific Computing & ML**: Scientific Python (SciPy/NumPy/SymPy - SPE 008), PyTorch.

### Key Empirical Findings

* **100% Consensus on Human Accountability**: All 25 surveyed projects require human authors to take complete legal and technical responsibility for submitted code.
* **100% Consensus on Bot Restrictions**: Autonomous PR spam and unverified automated AI reviews are rejected across all surveyed ecosystems.
* **88% Disclosure Requirement**: 22 out of 25 projects expect explicit disclosure when generative AI tools are used.
* **100% Schema Coverage**: All 25 surveyed policies can be expressed accurately with `ai-policy.schema.json` v0.1 without semantic loss.

Full survey transcripts and classification details:
* 📄 **[RFC-001 Architecture Specification](docs/rfc-001-ai-policy-schema.md)**
* 📊 **[Metadata Summary & Statistics](dataset/summary.json)**
* 📁 **[Verbatim Policy Transcripts](dataset/policies/)**

---

## Repository Structure

```text
ai-policy-kit/
├── .github/
│   ├── workflows/               # CI and AI policy compliance workflows
│   └── PULL_REQUEST_TEMPLATE.md # PR disclosure checklist template
├── dataset/
│   ├── policies/                # 25 verbatim OSS policies (Gentoo, Chromium, curl, SciPy...)
│   └── summary.json             # Structured multi-dimensional metadata & statistics
├── docs/
│   ├── comparison.md            # Objective ecosystem comparison table & analysis
│   ├── faq.md                   # Frequently Asked Questions
│   ├── limitations.md           # Known technical boundaries & architectural scope
│   ├── rfc-001-ai-policy-schema.md # Complete architectural RFC specification
│   ├── schema-reference.md      # Exhaustive v0.1 schema field reference
│   └── THREAT_MODEL.md          # Security threat model & least-privilege analysis
├── presets/
│   ├── strict.yml               # Zero AI code preset
│   ├── balanced.yml             # Assistive AI with disclosure & accountability preset
│   └── permissive.yml           # Open adoption with attribution preset
├── schema/
│   └── v0.1/
│       └── ai-policy.schema.json # JSON Schema Draft-07 specification
├── src/                         # TypeScript core library, CLI, and GitHub Action
├── tests/                       # Unit, integration, and E2E test suites (368 tests)
├── action.yml                   # Official GitHub Action metadata
├── LICENSE                      # MIT License
├── package.json                 # Package manifest
└── README.md                    # Project documentation
```

---

## Contributing

We welcome contributions from open-source maintainers, contributors, and researchers! Please review our **[CONTRIBUTING.md](CONTRIBUTING.md)** and **[SECURITY.md](SECURITY.md)** before opening an issue or pull request.

---

## License

This project is licensed under the [MIT License](LICENSE).
Empirical policy excerpts in `dataset/policies/` are preserved for research, reference, and documentation purposes under their respective original open-source licenses.
