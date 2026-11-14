# AI Policy: curl

- **Project**: curl
- **Ecosystem / Category**: Networking Utility & Library / C
- **Source URL**: https://curl.se/docs/security.html
- **Reference Document**: curl Vulnerability Reporting Guidelines & Project AI Policy
- **Primary Stance**: Restricted

## Verbatim Policy Text

> "Code written with the help of AI is accepted only if it meets normal project standards. Contributors are fully responsible for the quality, correctness, and licensing compliance.
>
> If an AI tool is used to find problems or analyze curl, the reporter MUST explicitly disclose that fact in the report.
>
> Reporters must double-check and verify findings thoroughly with a human before submission. Pasted, raw AI-generated reports and unverified explanations are strongly discouraged.
>
> (Due to an overwhelming surge of low-quality AI-generated vulnerability reports ('AI slop'), curl permanently closed its cash bug bounty program on Jan 31, 2026)."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `restricted`
- **Scope**: C library source code, command-line utility, security vulnerability reports.
- **Exceptions**: Permitted if meeting normal project standards; raw unedited dumps are strictly rejected.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Required in vulnerability reports and pull requests if AI tools were used.
- **Verification Proof**: Reporters must demonstrate human verification and reproduction steps.

### 3. Comprehension & Accountability
- **Human Comprehension**: Required. Human contributors must understand the code and verify absence of hallucinated C library functions.
- **Legal Accountability**: curl license (MIT/X derivate) and clean IP provenance.

### 4. Review & Issue Rules
- **Security Reports**: High penalty for unverified AI vulnerability reports; led to closure of cash bug bounties to prevent DDoS of volunteer triage.
- **Automated Reviews**: Not accepted in PR reviews.
