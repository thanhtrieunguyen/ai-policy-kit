# AI Policy: OpenSSL

- **Project**: OpenSSL
- **Ecosystem / Category**: Cryptography & Security Infrastructure / C
- **Source URL**: https://www.openssl-library.org/policies/ai-policy/
- **Reference Document**: OpenSSL AI Code and Documentation Contribution Policy & CLA v1.1
- **Primary Stance**: Restricted

## Verbatim Policy Text

> "If a non-trivial portion of a code or documentation contribution is created or substantially assisted by an AI tool, the contributor must include an Assisted-by trailer beneath their commit message specifying the agent and model used (e.g., Assisted-by: Claude:claude-sonnet-4-6).
>
> Submitting a non-trivial AI-assisted contribution triggers the requirement to sign the v1.1 CLA (or later), acknowledging the legal status of AI-generated content.
>
> The human submitter takes total legal and technical responsibility for everything they submit... Contributors must thoroughly read and comprehend every single line of AI-generated output."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `restricted`
- **Scope**: Cryptographic primitives, protocol implementations, documentation, test suites.
- **Exceptions**: Non-trivial assistance requires formal CLA v1.1 compliance.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Required for any non-trivial AI contribution.
- **Commit Trailer**: Strict standardized format: `Assisted-by: <agent>:<model>` (e.g. `Assisted-by: Claude:claude-sonnet-4-6`).

### 3. Comprehension & Accountability
- **Human Comprehension**: Required. Contributors must thoroughly read and comprehend every single line of generated code, particularly critical for cryptographic security.
- **Legal Accountability**: Mandatory signing of OpenSSL CLA v1.1 acknowledging IP conditions of generative outputs.

### 4. Review & Issue Rules
- **Automated PRs / Issues**: Direct bot commits are prohibited; security vulnerability filings must be verified by humans.
- **Automated Reviews**: Prohibited from satisfying mandatory two-committer cryptographic review requirements.
