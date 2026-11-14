# AI Policy: Django Community & attrs

- **Project**: Django Community & attrs
- **Ecosystem / Category**: Web Framework / Python Ecosystem
- **Source URL**: https://github.com/python-attrs/attrs/blob/main/AI_POLICY.md
- **Reference Document**: attrs Generative AI / LLM Policy (`AI_POLICY.md`) (widely referenced model in Django ecosystem)
- **Primary Stance**: Restricted

## Verbatim Policy Text

> "Submitters take full technical and legal responsibility for every line in their submission.
>
> Pull requests that list an LLM product as a co-author will not be merged and are closed without discussion due to copyright and licensing risks.
>
> Contributors must remove any LLM co-author tags, ensure they fully understand and can defend the code, and hold the legal right to contribute it.
>
> Automated AI reviews must not be requested on pull requests."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `restricted`
- **Scope**: Source code, test suites, documentation.
- **Exceptions**: Permitted if human developer vets and defends every line; AI co-authorship tags strictly prohibited.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Disclosed in PR text; explicit ban on listing AI in `Co-authored-by:` commit trailers.
- **Method**: PR description disclosure.

### 3. Comprehension & Accountability
- **Human Comprehension**: Required. Submitter must be able to defend the code line by line and hold legal rights.
- **Legal Accountability**: MIT license (attrs) / BSD-3-Clause (Django); contributors bear full legal warranty.

### 4. Review & Issue Rules
- **Automated PRs / Issues**: Closed without discussion if LLM is credited as co-author.
- **Automated Reviews**: Explicit prohibition against requesting automated AI code reviews on PRs.
