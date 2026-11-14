# AI Policy: Linux Kernel

- **Project**: Linux Kernel
- **Ecosystem / Category**: Operating System Kernel / C & Rust
- **Source URL**: https://www.kernel.org/doc/html/latest/process/coding-assistants.html
- **Reference Document**: `Documentation/process/coding-assistants.rst` & `submitting-patches.rst`
- **Primary Stance**: Restricted

## Verbatim Policy Text

> "AI agents MUST NOT add Signed-off-by tags. Only humans can legally certify the Developer Certificate of Origin (DCO).
>
> The human submitter takes full responsibility for reviewing all AI-generated code, ensuring compliance, and adding their own Signed-off-by tag.
>
> When AI tools make meaningful contributions, proper attribution is required via an Assisted-by tag in the commit message (e.g., Assisted-by: LLM [TOOL]).
>
> Submitters must verify bugs by attempting to create a reproducer for non-trivial issues rather than submitting unverified output."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `restricted`
- **Scope**: Code assistance permitted only under full human verification and testing; direct autonomous bot submissions banned.
- **Exceptions**: Assistive code completion, linting, and boilerplate generation subject to human developer audit.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Required when AI makes a meaningful contribution.
- **Commit Trailer**: Standardized git trailer: `Assisted-by: <tool>`.
- **DCO Restriction**: AI models MUST NOT add `Signed-off-by:` tags; only humans can legally certify the DCO.

### 3. Comprehension & Accountability
- **Human Comprehension**: Mandatory. The human developer certifies the Developer Certificate of Origin (DCO) 1.1 and warrants provenance and correctness.
- **Verification Obligation**: Non-trivial bug reports or fixes must have a reproducible test case.

### 4. Review & Issue Rules
- **Automated PRs / Issues**: Automated mailing list patch bombs or unverified bot emails are rejected and filtered.
- **Automated Reviews**: Subsystem maintainers evaluate code with human domain expertise; automated review bots are not recognized as reviewers.
