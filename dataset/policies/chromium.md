# AI Policy: Chromium

- **Project**: Chromium
- **Ecosystem / Category**: Web Browser / C++ Ecosystem
- **Source URL**: https://chromium.googlesource.com/chromium/src/+/main/docs/ai_coding_policy.md
- **Reference Document**: Chromium AI Coding Policy (`ai_coding_policy.md`)
- **Primary Stance**: Restricted

## Verbatim Policy Text

> "Authors must thoroughly self-review and completely understand all code and documentation updates they submit before submitting them for review.
>
> Authors must be fully prepared to answer any questions from reviewers regarding correctness, design, security properties, and style.
>
> Accounts that submit CLs not actually understood by the human operator risk losing their committer status or being banned from the system.
>
> In any project discussions (code review, bugs, mailing lists), a human reply must get a human reply. If an AI agent creates a CL or files a bug, the human operator must handle any feedback.
>
> To assist reviewers, authors should flag areas that had AI assistance or areas they feel less confident about in the CL description or inline code comments."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `restricted`
- **Scope**: Code and documentation changes are permitted with rigorous human review.
- **Exceptions**: Experimental code assistance permitted provided all architecture and security design principles are met.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Required in Changelist (CL) descriptions and inline code comments where AI assisted or where confidence is lower.
- **Prompt Transparency**: Authors are encouraged to provide prompts used for complex generative tasks.

### 3. Comprehension & Accountability
- **Human Comprehension**: Non-negotiable requirement. Submitting CLs without understanding them results in loss of committer status or account bans.
- **Legal Accountability**: Full adherence to Google / Chromium Contributor License Agreement.

### 4. Review & Issue Rules
- **Human-to-Human Communication**: "A human reply must get a human reply." AI agents cannot respond to review questions on Gerrit or issue trackers.
- **Automated Reviews**: Prohibited from providing final code approval (rubber-stamping).
