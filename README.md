# ai-policy-kit

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Schema: Draft-07](https://img.shields.io/badge/Schema-Draft--07-brightgreen.svg)](schema/v0.1/ai-policy.schema.json)
[![Presets: Validated](https://img.shields.io/badge/Presets-Validated-success.svg)](presets/)
[![Empirical Coverage](https://img.shields.io/badge/Empirical_Coverage-100%25_(25_OSS_Projects)-purple.svg)](dataset/summary.json)
[![Tests: Passing](https://img.shields.io/badge/Tests-14%2F14_Passing-emerald.svg)](tests/)

> **Standardized, machine-readable schema, presets, and validation tooling to declare and enforce AI contribution policies in open-source repositories.**

---

## Overview

As generative AI coding assistants and autonomous agents become ubiquitous, open-source maintainers face an unprecedented surge of unverified, machine-generated pull requests ("AI slop") and hallucinated vulnerability reports. At the same time, many legitimate contributors use AI responsibly for boilerplate, typing, refactoring, or documentation.

Most projects attempt to communicate their AI stance through unstructured paragraphs in `CONTRIBUTING.md` or developer wikis. Such natural language guidelines cannot be verified in continuous integration (CI), checked by pre-commit hooks, or rendered consistently in developer tools.

**`ai-policy-kit` provides a deterministic, machine-actionable standard:**
* **Machine-Readable Standard (`ai-policy.yml`)**: Declare your repository's AI contribution rules with a formal JSON Schema Draft-07.
* **Empirically Grounded**: Designed from an in-depth survey of **25 major open-source ecosystems** (including Linux Kernel, Gentoo, Chromium, curl, Node.js, Scientific Python, Django, Home Assistant, and Apache).
* **Deterministic & Zero-LLM**: No flaky probabilistic AI content detectors that trigger false positives on human contributors. Enforcement relies on transparent PR disclosure checklists, commit trailers, and author comprehension sign-offs.
* **Ready-to-Use Presets**: Instant configuration with three battle-tested presets: `strict`, `balanced`, and `permissive`.
* **CI/CD Ready**: Easy integration with GitHub Actions, pre-commit linters, and IDE schema validation.

---

## The 3 Standard Presets

`ai-policy-kit` ships with three standard presets in [`presets/`](presets/) reflecting common governance postures across the open-source community:

| Preset | Stance | Typical Communities | Key Rules |
| :--- | :--- | :--- | :--- |
| **[`strict.yml`](presets/strict.yml)** | **Forbidden** | Gentoo, NetBSD, QEMU | • 100% ban on AI-generated code and unit tests.<br>• Allowed only for grammar/spelling corrections in documentation.<br>• Mandatory Git commit trailer (`AI-Assisted: ...`).<br>• Automated bot PRs and reviews strictly prohibited. |
| **[`balanced.yml`](presets/balanced.yml)** | **Restricted** (Human-in-the-loop) | Scientific Python, Home Assistant, Fedora | • AI allowed as an assistive tool for code, tests, and documentation.<br>• Contributor must understand every line of code and take full legal/technical responsibility.<br>• Automated review bots and autonomous PR generation banned. |
| **[`permissive.yml`](presets/permissive.yml)** | **Permissive** | Open edX, Immich | • AI tools freely permitted across all categories.<br>• Contributor remains legally and technically accountable.<br>• Transparent disclosure required via PR checklist or comment. |

---

## Quick Start

### 1. Adopt a Policy in Your Repository

Choose the preset that matches your project's governance model and copy it to your repository root as `ai-policy.yml`:

```bash
# Option A: Strict (Zero AI code)
curl -fsSL https://raw.githubusercontent.com/thanhtrieunguyen/ai-policy-kit/main/presets/strict.yml -o ai-policy.yml

# Option B: Balanced (Human-assisted, recommended for most projects)
curl -fsSL https://raw.githubusercontent.com/thanhtrieunguyen/ai-policy-kit/main/presets/balanced.yml -o ai-policy.yml

# Option C: Permissive (Free usage with disclosure)
curl -fsSL https://raw.githubusercontent.com/thanhtrieunguyen/ai-policy-kit/main/presets/permissive.yml -o ai-policy.yml
```

### 2. Example `ai-policy.yml`

Here is an example configuration based on the balanced preset:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/thanhtrieunguyen/ai-policy-kit/main/schema/v0.1/ai-policy.schema.json
schema_version: "0.1.0"
policy_name: "Balanced AI Contribution Policy"
policy_url: "https://github.com/your-org/your-repo/blob/main/CONTRIBUTING.md#ai-policy"
last_updated: "2026-11-14"

# Policy Level: forbidden | restricted | permissive
level: "restricted"

categories:
  code:
    allowed: true
    restrictions:
      - "AI may be used for autocomplete, boilerplate, and refactoring."
      - "Author must personally understand and verify every line of code."
  documentation:
    allowed: true
  tests:
    allowed: true
    restrictions:
      - "Generated tests must be verified against actual edge cases."
  reviews:
    allowed: false
    restrictions:
      - "Automated AI reviews on inbound PRs are forbidden."

disclosure:
  required: true
  methods:
    - "pr_checklist"
    - "pr_description"
  commit_trailer:
    required: false
    token: "AI-Assisted"

accountability:
  author_takes_responsibility: true
  author_understands_code: true
  dco_signoff: true

bots:
  automated_prs: "forbidden"
  automated_issues: "forbidden"
  automated_reviews: "forbidden"
```

---

## Validation & Testing

`ai-policy-kit` includes automated validation tools to ensure your policy conforms strictly to the schema.

### Validate Presets and Custom Policies

Run the built-in validation script:

```bash
# Validate all standard presets
python tests/validate_presets.py

# Run full test suite (14 test cases including adversarial mutations)
python -m unittest discover -s tests -v
```

### IDE Schema Autocomplete (VS Code)

Add this line at the top of your `ai-policy.yml` file to get instant autocompletion, field descriptions, and real-time schema validation in Visual Studio Code (via the YAML extension):

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/thanhtrieunguyen/ai-policy-kit/main/schema/v0.1/ai-policy.schema.json
```

---

## Continuous Integration (GitHub Actions)

Integrate policy checks into your GitHub pull request workflows. Check that inbound pull requests contain required disclosure tags or commit trailers:

```yaml
name: AI Contribution Policy Check

on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  check-policy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Validate ai-policy.yml against Schema
        uses: python/setup-python@v5
        with:
          python-version: "3.11"
      - run: |
          pip install jsonschema pyyaml
          python -c "
          import yaml, json, jsonschema
          schema = json.load(open('schema/v0.1/ai-policy.schema.json'))
          policy = yaml.safe_load(open('ai-policy.yml'))
          jsonschema.validate(instance=policy, schema=schema)
          print('ai-policy.yml is valid!')
          "
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

```
ai-policy-kit/
├── .github/                     # Issue templates & GitHub workflows
├── dataset/
│   ├── policies/                # 25 verbatim OSS policies (Gentoo, Chromium, curl, SciPy...)
│   └── summary.json             # Structured multi-dimensional metadata & attribute frequency
├── docs/
│   └── rfc-001-ai-policy-schema.md # Complete architectural RFC specification
├── presets/
│   ├── strict.yml               # Zero AI code preset
│   ├── balanced.yml             # Assistive AI with disclosure & accountability preset
│   └── permissive.yml           # Open adoption with attribution preset
├── schema/
│   └── v0.1/
│       └── ai-policy.schema.json # JSON Schema Draft-07 specification
├── tests/
│   ├── test_schema.py           # Unit tests & adversarial negative tests
│   └── validate_presets.py      # Preset validation runner
├── CONTRIBUTING.md              # Contributor guidelines
├── LICENSE                      # MIT License
├── README.md                    # Project documentation
└── SECURITY.md                  # Vulnerability disclosure policy
```

---

## Roadmap

- [x] **v0.1 Specification**: Empirical dataset of 25 projects, Draft-07 JSON Schema, 3 standard presets, and RFC-001.
- [ ] **v0.2 CLI Tooling**: Standalone `ai-policy` CLI (`init`, `check`, `lint-pr`).
- [ ] **v0.3 GitHub Action**: Plug-and-play official GitHub Action for PR triage comments and commit trailer enforcement.
- [ ] **v1.0 Ecosystem Launch**: Community integrations with pre-commit, MegaLinter, and repository governance dashboards.

---

## Contributing

We welcome contributions from open-source maintainers, contributors, and researchers! Please review our **[CONTRIBUTING.md](CONTRIBUTING.md)** and **[SECURITY.md](SECURITY.md)** before opening an issue or pull request.

---

## License

This project is licensed under the [MIT License](LICENSE).
Empirical policy excerpts in `dataset/policies/` are preserved for research, reference, and documentation purposes under their respective original open-source licenses.
