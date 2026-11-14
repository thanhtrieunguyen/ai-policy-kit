# AI Policy: Apache Software Foundation (ASF)

- **Project**: Apache Software Foundation (ASF)
- **Ecosystem / Category**: Open-Source Foundation / Enterprise Java, Cloud & Big Data
- **Source URL**: https://www.apache.org/legal/generative-tooling.html
- **Reference Document**: ASF Generative Tooling Guidance
- **Primary Stance**: Restricted

## Verbatim Policy Text

> "Under the Apache ICLA and Apache-2.0, contributors are legally responsible for everything they submit. Section 5 of the ICLA mandates that a contribution is an original creation.
>
> Contributors must verify that the terms and conditions of the specific generative AI tool used do not impose any restrictions on the output that contradict the Open Source Definition or the Apache License.
>
> Contributions must not incorporate unauthorized copyrighted materials or verbatim snippets from training data unless proper license compliance, attribution, and notice requirements are satisfied."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `restricted`
- **Scope**: Source code, test cases, and documentation are subject to ICLA Section 5 originality warranties.
- **Exceptions**: Generative tools are acceptable if their terms of service grant unencumbered rights compatible with Apache-2.0.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Required at project level when significant generative components are included.
- **Commit Trailer**: Recommended commit trailers `Generated-by:` or `Assisted-by:`.

### 3. Comprehension & Accountability
- **Human Comprehension**: Required. Committers must defend, debug, and own all submitted code under their signed Apache ICLA/CCLA.
- **Legal Accountability**: Strict compliance with Apache License 2.0; contributors warrant absence of proprietary or GPL-licensed training data leakage.

### 4. Review & Issue Rules
- **Automated PRs / Issues**: Unsolicited automated bot PRs without committer sponsorship are rejected.
- **Automated Reviews**: Not permitted as official project PMC reviews; PMC votes require human committer judgment.
