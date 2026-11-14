# AI Policy: rust-analyzer

- **Project**: rust-analyzer
- **Ecosystem / Category**: Developer Tooling / Rust Ecosystem
- **Source URL**: https://github.com/rust-lang/rust-analyzer/blob/master/AI_POLICY.md
- **Reference Document**: `rust-analyzer` AI Policy (`AI_POLICY.md`)
- **Primary Stance**: Restricted

## Verbatim Policy Text

> "Using AI/LLMs as tools to help contribute code is allowed, but contributors remain fully responsible for any code they publish... a human-in-the-loop who thoroughly understands the work is required.
>
> Autonomous agents are NOT allowed to open pull requests or issues, and any PRs believed to be created autonomously will be closed.
>
> AI should NOT be used to generate comments or replies when communicating with maintainers. If including context from an AI interaction, it must be put in a quote block (`>`), clearly disclosed, and accompanied by human commentary.
>
> AI should not be used to author code for issues labeled with both E-easy and E-has-instructions, as these are specifically kept as structured learning opportunities for newcomers."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `restricted`
- **Scope**: Compiler analysis code, syntax tree transformations, tests, docs.
- **Exceptions**: Human-in-the-loop required; beginner issues (`E-easy`, `E-has-instructions`) are off-limits for AI generation.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Expected in PR descriptions and checklist.
- **Discussion Containers**: Markdown quote block (`>`) required when citing AI interaction text.

### 3. Comprehension & Accountability
- **Human Comprehension**: Required. Contributors must thoroughly understand semantic analysis and type engine details.
- **Legal Accountability**: Dual MIT/Apache-2.0 licensing warranty.

### 4. Review & Issue Rules
- **Automated PRs / Issues**: Closed immediately if created autonomously.
- **Beginner Issue Protection**: AI strictly forbidden on `E-easy` and `E-has-instructions` issues to preserve newcomer learning.
- **Review Communications**: AI-generated responses to maintainer inquiries are banned.
