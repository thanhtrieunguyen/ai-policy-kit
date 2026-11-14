# AI Policy: Open edX

- **Project**: Open edX
- **Ecosystem / Category**: Online Education Platform / Python, JavaScript & Django
- **Source URL**: https://github.com/openedx/.github/blob/master/.github/AI_POLICY.md
- **Reference Document**: Open edX AI Contribution Policy (`AI_POLICY.md`)
- **Primary Stance**: Restricted

## Verbatim Policy Text

> "Open edX allows the use of specific approved AI tools in contribution workflows (Microsoft Copilot, Anthropic Claude, OpenAI, AWS, Google) due to their reputation for proper training.
>
> Using AI to generate code or text you don't understand is discouraged because it shifts the burden onto reviewers and maintainers. However, using AI to build understanding is encouraged.
>
> AI usage should be clearly disclosed so that reviewers and maintainers can appropriately calibrate their expectations."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `restricted`
- **Scope**: Platform microservices, frontend applications, documentation.
- **Exceptions**: Specific approved AI tools allowed (Copilot, Claude, OpenAI, AWS, Google); unapproved tools require Open Source Community Review.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Required in PR descriptions so maintainers can calibrate review expectations.
- **Tool Transparency**: Contributor must name the specific tool/service used.

### 3. Comprehension & Accountability
- **Human Comprehension**: Required. Shifting the cognitive review burden to maintainers by dumping ununderstood code is discouraged and rejected.
- **Legal Accountability**: Open edX Contributor Agreement compliance.

### 4. Review & Issue Rules
- **Automated PRs / Issues**: Unsolicited automated bot submissions are discouraged.
- **Reviewer Symmetry**: Reviewers may use AI to understand diffs but must manually verify their feedback before posting.
