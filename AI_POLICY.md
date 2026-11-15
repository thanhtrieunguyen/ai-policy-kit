# AI Contribution Policy

> Version: 0.1 | Policy Level: restricted

## 1. Overview & Posture
This repository adopts a **restricted** contribution policy regarding Artificial Intelligence (AI) and Large Language Model (LLM) tools.

## 2. Granular Category Permissions
- **Code**: `restricted`
- **Documentation**: `permissive`
- **Tests**: `restricted`
- **Reviews**: `restricted`
- **Issues**: `restricted`

## 3. Disclosure Requirements
- **Disclosure Required**: true
- **Accepted Methods**: commit_trailer, pr_checklist, pr_description
- **Commit Trailer**:
  - Key: `AI-Assisted`
  - Required: false
  - Pattern: `^AI-Assisted: .+$`
- **Tool Name Required**: true
- **Prompt Disclosure**: `optional`

## 4. Contributor Accountability & Warranties
- **Author Understands Code**: true
- **Author Takes 100% Responsibility**: true
- **DCO Signoff Required**: false

## 5. Automated Bots & Agent Rules
- **Automated PRs**: `forbidden`
- **Automated Reviews**: `forbidden`
- **Automated Issues**: `restricted`
- **Allowed Bots**: dependabot[bot], renovate[bot]

---
*ai-policy is a deterministic policy compliance validator, NOT an AI text/code detector.*
