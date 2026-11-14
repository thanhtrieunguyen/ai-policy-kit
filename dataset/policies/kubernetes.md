# AI Policy: Kubernetes / CNCF

- **Project**: Kubernetes
- **Ecosystem / Category**: Cloud Native Infrastructure / Go Ecosystem
- **Source URL**: https://kubernetes.io/docs/contribute/
- **Reference Document**: Kubernetes Generative AI Contribution Guidelines
- **Primary Stance**: Restricted

## Verbatim Policy Text

> "Contributors must disclose when generative AI tools have assisted in writing a pull request (e.g., adding a statement in the PR description).
>
> The human author remains entirely responsible for correctness, security, and maintenance.
>
> The policy explicitly PROHIBITS attributing work directly to AI tools inside commit metadata (such as listing AI as a co-author, using AI co-signing, or adding trailers like Co-authored-by or assisted-by) because an AI tool cannot sign a legal CLA agreement or accept liability."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `restricted`
- **Scope**: Kubernetes controllers, API machinery, documentation, manifests.
- **Exceptions**: Permitted with human review and PR description disclosure.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Required in PR descriptions.
- **Commit Trailer Ban**: Attributing work to AI tools via commit metadata (such as `Co-authored-by: ChatGPT` or `Assisted-by:`) is explicitly **prohibited** because an AI model cannot legally sign the CNCF CLA.

### 3. Comprehension & Accountability
- **Human Comprehension**: Required. Human contributor acts as the sole legal author and guarantor under CNCF CLA.
- **Legal Accountability**: 100% human legal responsibility; AI tools have no legal standing.

### 4. Review & Issue Rules
- **Automated PRs / Issues**: Automated PR bots are closed; CI fails commits with invalid co-author trailers.
- **Automated Reviews**: Prohibited. Approval requires human OWNERS file reviewers.
