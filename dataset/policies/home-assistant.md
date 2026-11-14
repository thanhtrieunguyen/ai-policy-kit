# AI Policy: Home Assistant / Open Home Foundation

- **Project**: Home Assistant
- **Ecosystem / Category**: Smart Home & IoT / Python Ecosystem
- **Source URL**: https://developers.home-assistant.io/docs/policies/ai/
- **Reference Document**: Open Home Foundation AI Policy (`AI_POLICY.md` / `developers.home-assistant.io`)
- **Primary Stance**: Restricted

## Verbatim Policy Text

> "You are allowed to use AI tools to help you write code or documentation... However, you take full personal responsibility for everything you submit. If you submit unreviewed AI-generated code that wastes maintainers' time, the contribution will be closed.
>
> Autonomous agents are not allowed to be used for contributing to Open Home Foundation projects.
>
> You must understand and be able to explain every change you submit in your own words. Do not use an AI tool to generate responses to maintainers.
>
> If you include context from an AI interaction in comments, it must be put in a quote block (`>`), explicitly disclosed, and accompanied by your own commentary."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `restricted`
- **Scope**: Source code and documentation assistance allowed; autonomous agents completely forbidden.
- **Exceptions**: Personal developer interactive assistance is allowed provided the human reviews and tests every line.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Required. PR checklist confirmation that contributor understands the code.
- **Discussion Containers**: AI quotes must be placed inside markdown quote blocks (`>`) with explicit human explanation.
- **Attribution / Commit Trailer**: Encouraged for transparency.

### 3. Comprehension & Accountability
- **Human Comprehension**: Mandatory. Contributors must understand and explain every submitted change in their own words.
- **Legal Accountability**: Human author assumes 100% personal responsibility for correctness, maintainability, and license compliance.

### 4. Review & Issue Rules
- **Automated PRs / Issues**: Strictly prohibited. Unsolicited autonomous agent PRs are closed immediately.
- **Automated Reviews**: Prohibited. Maintainers communicate human-to-human; AI-generated responses to reviewer feedback are prohibited.
- **Enforcement**: Submitting unreviewed code that wastes maintainer time results in PR closure and potential block.
