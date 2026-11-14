# AI Policy: Debian Project

- **Project**: Debian Project
- **Ecosystem / Category**: Linux Distribution / Universal OS
- **Source URL**: https://www.debian.org/vote/2024/vote_004
- **Reference Document**: Debian General Resolution: Responsible Use of Generative AI (Option 5)
- **Primary Stance**: Permissive

## Verbatim Policy Text

> "Debian officially neither endorses nor prohibits the use of generative AI tools in software development, packaging, documentation, translations, and other project media.
>
> Contributors remain 100% responsible for the correctness, technical quality, maintainability, legal compliance, and licensing of everything they submit.
>
> Contributors are expected to understand, review, test, and modify any AI-assisted output. Blindly pasting or uploading unverified AI-generated text or code is strictly discouraged.
>
> While contributors are encouraged to mention when and how AI tools were helpful, labeling or disclosing AI assistance is not mandatory.
>
> Contributors must avoid transmitting sensitive, non-public Debian information (such as embargoed security reports or keys) to third-party AI services."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `permissive`
- **Scope**: Packaging, source patches, documentation, translation, infrastructure.
- **Exceptions**: Maintainers retain discretion over their respective packages.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Voluntary. Encouraged for transparency and communal learning, but not legally or procedurally mandated.
- **Method**: Git commit messages or package changelog entries when appropriate.

### 3. Comprehension & Accountability
- **Human Comprehension**: Contributors remain 100% responsible for correctness, quality, and licensing.
- **Data Privacy**: Strict prohibition against transmitting embargoed security advisories or cryptographic keys to external AI APIs.

### 4. Review & Issue Rules
- **Automated PRs / Issues**: Unverified dumps are discouraged; maintainers can reject low-quality contributions.
- **Automated Reviews**: Human maintainer maintains packaging authority under Debian Free Software Guidelines (DFSG).
