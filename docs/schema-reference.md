# AI Policy Schema Reference (v0.1)

This document provides a comprehensive technical reference for the `ai-policy.yml` configuration schema defined by **`ai-policy-kit`**.

The canonical JSON Schema Draft-07 specification is located at [`schema/v0.1/ai-policy.schema.json`](../schema/v0.1/ai-policy.schema.json).

---

## Specification Metadata

| Property | Value |
| :--- | :--- |
| **JSON Schema Dialect** | [JSON Schema Draft-07](http://json-schema.org/draft-07/schema#) |
| **Schema URI (`$id`)** | `https://raw.githubusercontent.com/thanhtrieunguyen/ai-policy-kit/main/schema/v0.1/ai-policy.schema.json` |
| **Version Identifier** | `0.1` |
| **File Formats Supported** | YAML (`.yml`, `.yaml`) or JSON (`.json`) |
| **Standard File Locations** | 1. `.github/ai-policy.yml` *(preferred)*<br>2. `ai-policy.yml` *(repository root)* |
| **Strict Extensibility Rule** | `additionalProperties: false` (strictly enforced at root and all sub-objects) |

---

## Editor Autocompletion & Validation

To enable real-time linting, autocompletion, and hover documentation in IDEs (such as VS Code with the Red Hat YAML extension), add the schema directive at the top of your policy file:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/thanhtrieunguyen/ai-policy-kit/main/schema/v0.1/ai-policy.schema.json
```

---

## Root Fields Overview

The schema mandates **6 required top-level fields** and provides **2 optional navigation fields**:

| Field | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| [`version`](#1-version) | `string` | **Yes** | — | Schema specification version. Must match `^0\.1(\.[0-9]+)?$`. |
| [`level`](#2-level) | `string` | **Yes** | — | Overall repository policy posture: `forbidden`, `restricted`, or `permissive`. |
| [`policy_url`](#3-policy_url-and-policy_path) | `string` (URI) | No | — | Canonical web URL pointing to human-readable policy documentation. |
| [`policy_path`](#3-policy_url-and-policy_path) | `string` | No | — | Repository-relative path to policy file (e.g. `AI_POLICY.md`). |
| [`categories`](#4-categories) | `object` | **Yes** | — | Granular permissions across contribution domains (`code`, `docs`, `tests`, etc.). |
| [`disclosure`](#5-disclosure) | `object` | **Yes** | — | Mandated disclosure methods, Git commit trailers, and prompt rules. |
| [`accountability`](#6-accountability) | `object` | **Yes** | — | Contributor comprehension, liability attestation, and DCO sign-off. |
| [`bots`](#7-bots) | `object` | **Yes** | — | Rules governing automated PR bots, automated issue filers, and review bots. |

---

## Detailed Field Specifications

### 1. `version`

* **Type**: `string`
* **Requirement**: Mandatory
* **Pattern**: `^0\.1(\.[0-9]+)?$`
* **Description**: Specifies the policy schema version used by the configuration. For all v0.1 configurations, this must be `"0.1"` or a minor patch (e.g. `"0.1.0"`).

```yaml
version: "0.1"
```

---

### 2. `level`

* **Type**: `string`
* **Requirement**: Mandatory
* **Allowed Values**: `["forbidden", "restricted", "permissive"]`
* **Description**: Summarizes the repository's overall stance regarding AI-assisted and AI-generated contributions.
  * `forbidden`: Strict ban on AI-generated code.
  * `restricted`: Human-in-the-loop posture; AI tools are permitted under human review, understanding, and accountability.
  * `permissive`: Open adoption posture; AI tools are allowed with basic disclosure or author responsibility.

```yaml
level: "restricted"
```

---

### 3. `policy_url` and `policy_path`

* **`policy_url`**:
  * **Type**: `string` (format: `uri`)
  * **Requirement**: Optional
  * **Description**: Canonical web URL to human-readable policy guidelines (e.g. web page or foundation guideline).
* **`policy_path`**:
  * **Type**: `string`
  * **Requirement**: Optional
  * **Description**: Relative path from repository root to the human-readable policy file.

```yaml
policy_url: "https://github.com/my-org/my-project/blob/main/AI_POLICY.md"
policy_path: "AI_POLICY.md"
```

---

### 4. `categories`

* **Type**: `object`
* **Requirement**: Mandatory
* **Sub-fields Requirement**: `code` is mandatory; other categories are optional.
* **Strict Mode**: `additionalProperties: false`
* **Sub-fields**:
  * `code` (`string`, required): Policy for source code. Enum: `["forbidden", "restricted", "permissive"]`.
  * `docs` (`string`, optional): Policy for documentation, README, and comments. Enum: `["forbidden", "restricted", "permissive"]`.
  * `tests` (`string`, optional): Policy for unit, integration, and test fixtures. Enum: `["forbidden", "restricted", "permissive"]`.
  * `reviews` (`string`, optional): Policy for AI-generated code review comments. Enum: `["forbidden", "restricted", "permissive"]`.
  * `issues` (`string`, optional): Policy for AI-generated bug reports or triage comments. Enum: `["forbidden", "restricted", "permissive"]`.

```yaml
categories:
  code: "restricted"
  docs: "permissive"
  tests: "restricted"
  reviews: "forbidden"
  issues: "restricted"
```

---

### 5. `disclosure`

* **Type**: `object`
* **Requirement**: Mandatory
* **Sub-fields Requirement**: `required` is mandatory.
* **Strict Mode**: `additionalProperties: false`
* **Sub-fields**:
  * `required` (`boolean`, required): Whether contributors must disclose generative AI usage.
  * `methods` (`array` of `string`, optional, unique elements): Allowed or required disclosure channels. Allowed values:
    * `commit_trailer`: Git commit trailer in commit messages.
    * `pr_checklist`: Interactive checkbox in the pull request description.
    * `pr_description`: Freeform text disclosure in pull request body.
    * `issue_template`: Disclosure checkbox or section in issue templates.
  * `commit_trailer` (`object`, optional, required keys if present: `["key"]`):
    * `key` (`string`, required, default: `"AI-Assisted"`): Name of the Git commit trailer.
    * `required` (`boolean`, optional, default: `false`): Whether every commit using AI assistance must include this trailer.
    * `pattern` (`string`, optional): Regular expression pattern that the trailer value must satisfy.
  * `tool_name_required` (`boolean`, optional, default: `false`): Whether the contributor must name the specific tool/model used (e.g. `Copilot`, `Claude 3.5 Sonnet`, `ChatGPT`).
  * `prompt_disclosure` (`string`, optional, default: `"optional"`): Expectation for publishing prompts used. Allowed values: `["forbidden", "optional", "required"]`.

```yaml
disclosure:
  required: true
  methods:
    - "commit_trailer"
    - "pr_checklist"
  commit_trailer:
    key: "AI-Assisted"
    required: false
    pattern: "^(Claude.*|Copilot.*|None)$"
  tool_name_required: true
  prompt_disclosure: "optional"
```

---

### 6. `accountability`

* **Type**: `object`
* **Requirement**: Mandatory
* **Sub-fields Requirement**: `author_takes_responsibility` is mandatory.
* **Strict Mode**: `additionalProperties: false`
* **Sub-fields**:
  * `author_takes_responsibility` (`boolean`, required): Contributor accepts full legal and technical liability for all submitted code, tests, and documentation.
  * `author_understands_code` (`boolean`, optional): Contributor warrants that they personally understand, reviewed, and can explain every submitted line.
  * `dco_signoff` (`boolean`, optional, default: `false`): Mandates Developer Certificate of Origin (`Signed-off-by:` Git trailer) for all commits.

```yaml
accountability:
  author_understands_code: true
  author_takes_responsibility: true
  dco_signoff: true
```

---

### 7. `bots`

* **Type**: `object`
* **Requirement**: Mandatory
* **Sub-fields Requirement**: `automated_prs` is mandatory.
* **Strict Mode**: `additionalProperties: false`
* **Sub-fields**:
  * `automated_prs` (`string`, required): Policy on autonomous or automated bot pull requests. Enum: `["forbidden", "restricted", "permissive"]`.
  * `automated_reviews` (`string`, optional): Policy on unsolicited automated bot review comments. Enum: `["forbidden", "restricted", "permissive"]`.
  * `automated_issues` (`string`, optional): Policy on automated issue generation. Enum: `["forbidden", "restricted", "permissive"]`.
  * `bot_allowlist` (`array` of `string`, optional, unique elements): List of authorized bot accounts exempted from automated restrictions.

```yaml
bots:
  automated_prs: "restricted"
  automated_reviews: "forbidden"
  automated_issues: "forbidden"
  bot_allowlist:
    - "dependabot[bot]"
    - "renovate[bot]"
```

---

## Canonical Presets Comparison

`ai-policy-kit` provides 3 standard presets in `presets/`:

| Dimension | `strict.yml` | `balanced.yml` | `permissive.yml` |
| :--- | :--- | :--- | :--- |
| **`level`** | `forbidden` | `restricted` | `permissive` |
| **`categories.code`** | `forbidden` | `restricted` | `permissive` |
| **`categories.docs`** | `restricted` | `permissive` | `permissive` |
| **`categories.tests`** | `forbidden` | `restricted` | `permissive` |
| **`categories.reviews`** | `forbidden` | `forbidden` | `permissive` |
| **`disclosure.required`** | `true` | `true` | `false` |
| **`commit_trailer.required`** | `true` | `false` | `false` |
| **`commit_trailer.pattern`** | `^AI-Assisted: (None\|docs:[a-zA-Z0-9_-]+)$` | *(unrestricted)* | *(unrestricted)* |
| **`author_understands_code`** | `true` | `true` | `false` |
| **`author_takes_responsibility`** | `true` | `true` | `true` |
| **`dco_signoff`** | `true` | `false` | `false` |
| **`bots.automated_prs`** | `forbidden` | `restricted` | `permissive` |
| **`bots.automated_reviews`** | `forbidden` | `forbidden` | `permissive` |
| **`bots.bot_allowlist`** | `["dependabot[bot]"]` | `["dependabot[bot]", "renovate[bot]"]` | `["dependabot[bot]", "renovate[bot]"]` |

---

## Complete Reference Example

Below is a complete, fully conforming `.github/ai-policy.yml` configuration:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/thanhtrieunguyen/ai-policy-kit/main/schema/v0.1/ai-policy.schema.json
version: "0.1"
level: "restricted"
policy_url: "https://github.com/my-org/my-project/blob/main/AI_POLICY.md"
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
    pattern: "^(None|[a-zA-Z0-9_-]+( [0-9.]+)?)$"
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

---

## Validation via CLI

You can validate this file or any custom policy file using `ai-policy check`:

```bash
# Validate default .github/ai-policy.yml
npx ai-policy check

# Validate specific path
npx ai-policy check ./my-custom-policy.yml

# Produce machine-readable diagnostic output
npx ai-policy check .github/ai-policy.yml --json
```
