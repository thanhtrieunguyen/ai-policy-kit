# Good First Issue 06: Add Pre-Commit Hook Definition (`.pre-commit-hooks.yaml`) and Integration Guide

- **Component / Area:** `.pre-commit-hooks.yaml`, `docs/guides/pre-commit.md`, `README.md`
- **Difficulty:** Beginner
- **Tags:** `tooling`, `git-hooks`, `yaml`, `good-first-issue`

---

## 1. Context & Motivation

Many open-source repositories use the [pre-commit](https://pre-commit.com/) framework (popular in Python, C++, and multi-language projects) to run automated linters and schema validators before changes are committed.

By defining an official `.pre-commit-hooks.yaml` file in the root of the repository, developers and maintainers can configure automated policy validation in one line inside their `.pre-commit-config.yaml`.

---

## 2. Concrete Files & Lines

1. **`.pre-commit-hooks.yaml`** (new file in root):
   Define the hook metadata according to the pre-commit specification.
2. **`docs/guides/pre-commit.md`** (new documentation guide):
   Document how to set up `pre-commit` and `husky` hooks.
3. **`README.md`**:
   Link to the guide from the Integrations / Tooling section.

---

## 3. Step-by-Step Implementation

### Step 1: Create `.pre-commit-hooks.yaml` in Repository Root

Create `.pre-commit-hooks.yaml` with the following definition:

```yaml
- id: ai-policy-check
  name: AI Policy Kit Validator
  description: Validates ai-policy.yml configuration against JSON Schema v0.1
  entry: npx --no-install ai-policy check
  language: node
  files: (^|/)(ai-policy|\.github/ai-policy)\.ya?ml$
  pass_filenames: true
```

### Step 2: Create Integration Guide `docs/guides/pre-commit.md`

Write a concise guide showing how developers can integrate this hook into their projects:

```markdown
# Integrating with pre-commit

Add the following to your repository's `.pre-commit-config.yaml`:

\`\`\`yaml
repos:
  - repo: https://github.com/thanhtrieunguyen/ai-policy-kit
    rev: v0.1.0  # Use the latest release tag
    hooks:
      - id: ai-policy-check
\`\`\`

To test locally:
\`\`\`bash
pre-commit run ai-policy-check --all-files
\`\`\`
```

### Step 3: Verify YAML Syntax

Run a quick Node.js script to ensure `.pre-commit-hooks.yaml` is valid YAML and conforms to the schema.

---

## 4. Acceptance Criteria & Verification

- [ ] `.pre-commit-hooks.yaml` exists in the repository root.
- [ ] YAML parses cleanly without syntax errors:
  ```bash
  node -e "const yaml = require('yaml'); const fs = require('fs'); yaml.parse(fs.readFileSync('.pre-commit-hooks.yaml', 'utf8')); console.log('Pre-commit YAML is valid');"
  ```
- [ ] Guide in `docs/guides/pre-commit.md` provides copy-pasteable instructions for `.pre-commit-config.yaml`.
