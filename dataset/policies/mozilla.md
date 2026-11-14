# AI Policy: Mozilla / Firefox

- **Project**: Mozilla / Firefox
- **Ecosystem / Category**: Web Browser / C++, Rust & JavaScript
- **Source URL**: https://firefox-source-docs.mozilla.org/contributing/contribution_quickref.html
- **Reference Document**: Firefox AI Coding Policy
- **Primary Stance**: Restricted

## Verbatim Policy Text

> "While AI can assist in exploring and writing code, responsibility always stays with the human. Patches must meet the exact same rigorous standards of correctness, security, and maintainability as human-written code.
>
> Contributors must fully understand and be able to explain every line of code they submit. Reviewers evaluate human work, not AI outputs.
>
> Private, security-sensitive, or confidential information must NEVER be included in prompts sent to external AI tools.
>
> Submitting a large volume of AI-generated solutions to 'Good First' bugs defeats the learning goal and is counterproductive."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `restricted`
- **Scope**: Browser engine (Gecko, SpiderMonkey), tooling, web extensions, documentation.
- **Exceptions**: Permitted as exploratory aid; security and confidentiality strictly enforced.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Disclosed in Phabricator revision or Bugzilla patch review.
- **Confidentiality**: Zero transmission of embargoed security bugs or confidential user telemetry in prompts.

### 3. Comprehension & Accountability
- **Human Comprehension**: Required. Full line-by-line understanding required; reviewers evaluate human work, not AI outputs.
- **Legal Accountability**: Mozilla Public License 2.0 (MPL-2.0) compliance.

### 4. Review & Issue Rules
- **Beginner Issue Protection**: Submitting high-volume AI solutions to "Good First" bugs is counterproductive and rejected.
- **Automated Reviews**: Not allowed to bypass Module Owner review requirements.
