# Security Policy

`ai-policy-kit` provides automated policy validation tools, CLI utilities, and GitHub Actions executing inside CI pipelines. Security, deterministic behavior, and safe execution are paramount.

---

## Supported Versions

Security updates and patches are provided for the following versions:

| Version | Supported          | Notes                                     |
| :------ | :----------------- | :---------------------------------------- |
| 1.x     | :white_check_mark: | Current active release line.              |
| < 1.0   | :x:                | Pre-release versions; upgrade to 1.x.     |

---

## Reporting a Vulnerability

If you discover or suspect a security vulnerability in `ai-policy-kit`, please **do NOT report it in public GitHub issues or discussions**.

Instead, please report it through private, responsible disclosure:

- **Contact**: `thanhtrieunguyen@proton.me`
- **Subject**: `[SECURITY] ai-policy-kit vulnerability report`
- **GPG Key**: Available upon request for encrypted communications.

### What to Include

To help us triage and resolve the issue quickly, please include:
1. **Description**: Clear description of the vulnerability and potential attack vectors.
2. **Affected Component**: CLI (`init`, `check`, `lint-pr`), Action runner, Schema validator, or Git engine.
3. **Environment**: Operating system, Node.js version, and `ai-policy-kit` version.
4. **Reproduction**: Minimal, self-contained proof-of-concept (PoC), sample YAML configuration, or git repository snippet.
5. **Impact**: An assessment of what an attacker could achieve (e.g., CI workflow injection, arbitrary file read, denial of service).

---

## Response SLA & Disclosure Process

We follow a coordinated disclosure process with strict Service Level Agreements (SLAs):

1. **Initial Acknowledgment**: Within **48 hours** of receiving your report.
2. **Triage & Severity Assessment**: Within **5 business days**, confirming whether the issue is reproducible and determining its CVSS score.
3. **Fix Development & Coordination**: We will keep you updated as we develop and verify the fix.
4. **Advisory & Release**: A coordinated security release and CVE/GitHub Security Advisory will typically be published within **14 to 30 calendar days** following initial validation, allowing downstream users sufficient time to patch.

We kindly request that you refrain from publicly disclosing the issue until a patch has been released.

---

## Security Architecture & Boundaries

`ai-policy-kit` is designed with defense-in-depth principles:
- **Threat Model**: For an in-depth analysis of threats, attack surfaces, and mitigations, refer to [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).
- **GitHub Action Execution**: Runs in isolated Node.js ESM environment requiring only `contents: read` permissions.
- **Untrusted Inputs**: Pull request titles, descriptions, and branch names are treated as untrusted user input and are never interpolated directly into shell strings or raw commands.
- **Workspace Leak Detection**: Scans committed file paths against known AI assistant configuration directories (`.cursor/`, `.claude/`, `.gemini/`, etc.) to prevent accidental token, prompt, or sensitive workspace credential leaks.
- **Hermetic CLI Execution**: CLI commands do not execute arbitrary shell commands or load remote untrusted code.

---

## Out of Scope

The following areas are considered out of scope for security reports:
- Attacks requiring physical access to a developer's local workstation.
- Denial-of-Service attacks targeting GitHub runner infrastructure itself.
- Flaws in unsupported, end-of-life Node.js runtimes (< 20.0.0).
- Social engineering attacks against maintainers or contributors.
