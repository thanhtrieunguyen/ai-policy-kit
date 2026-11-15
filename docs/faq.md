# Frequently Asked Questions (FAQ)

This FAQ answers common questions about **`ai-policy-kit`**, its architectural design, continuous integration workflows, and how it helps open-source maintainers govern AI contributions.

---

### 1. Does `ai-policy-kit` detect AI-generated code or text?

**No. Absolutely not.**

`ai-policy-kit` is a **deterministic policy compliance validator**, NOT an AI classifier or probabilistic detection tool.

Statistical and heuristic "AI detectors" (such as perplexity and burstiness classifiers) are fundamentally unsuitable for CI/CD governance:
- They exhibit high false-positive rates (often exceeding 20–40% on idiomatic code).
- They disproportionately flag non-native English speakers writing documentation.
- They are probabilistic and non-reproducible across runs.

Instead of guessing whether code was written by an AI, `ai-policy-kit` checks **explicit, auditable developer signals**:
1. Does the repository have a valid machine-readable policy (`ai-policy.yml`)?
2. Did the contributor disclose their AI usage in the Git commit trailer (e.g. `AI-Assisted: Copilot`)?
3. Did the contributor check the disclosure boxes in the pull request description checklist?
4. Did the contributor sign off on understanding and taking responsibility for the code?
5. Did any private AI assistant workspace directories (such as `.cursor/` or `.claude/`) leak into the PR?

---

### 2. Can contributors use AI tools in a repository governed by `ai-policy-kit`?

**Yes, depending on the project's chosen policy preset:**

* **`strict.yml` (Forbidden)**:
  * Prohibits AI-generated source code and unit tests.
  * Permits AI tools only for grammar, spelling, and translation corrections in documentation.
  * Requires mandatory Git commit trailers and DCO sign-offs.
* **`balanced.yml` (Restricted / Human-in-the-Loop)**:
  * Permits AI assistance for coding, refactoring, documentation, and tests.
  * Requires that the human contributor understands every line, personally reviews the code, and assumes full technical and legal accountability.
  * Discloses tool usage via PR checklists or commit trailers.
* **`permissive.yml` (Permissive)**:
  * Freely permits AI assistance across all contribution types.
  * Retains human contributor accountability.
  * Encourages transparent tool disclosure.

Maintainers can also customize `.github/ai-policy.yml` to set granular category permissions (`code`, `docs`, `tests`, `reviews`, `issues`).

---

### 3. How do Git commit trailers work?

Git commit trailers conform to the standard defined in [RFC 5322](https://datatracker.ietf.org/doc/html/rfc5322#section-3.6) and supported by `git-interpret-trailers` (the same standard used by `Signed-off-by:`, `Co-authored-by:`, and `Fixes:`).

When `disclosure.commit_trailer.required` is set to `true`, `ai-policy-kit` inspects every single-parent commit in a pull request branch to verify that the trailer is present.

#### Example Commit Message
```text
feat(auth): implement token refresh rotation

Rotate refresh tokens upon each token exchange to prevent replay attacks.

Signed-off-by: Alex Doe <alex@example.org>
AI-Assisted: Claude 3.5 Sonnet (boilerplate and type signatures)
```

Maintainers can configure a regular expression pattern in `.github/ai-policy.yml` to enforce trailer formatting:
```yaml
disclosure:
  required: true
  commit_trailer:
    key: "AI-Assisted"
    required: true
    pattern: "^(None|[a-zA-Z0-9_-]+( [0-9.]+)?.*)$"
```

---

### 4. What workspace leaks are blocked and why?

When developers work with modern AI coding assistants, these tools frequently create local workspace folders to store session state, embeddings, system prompts, or conversation histories:
* `.cursor/` (Cursor IDE settings and rules)
* `.claude/` (Claude Code workspace contexts)
* `.gemini/` (Gemini CLI session histories)
* `.continue/` (Continue.dev configs and index)
* `.copilot/` (Copilot CLI cache)
* `aider*` (Aider chat logs and config files)

**Why block them?**
1. **Security & Privacy**: These files can contain internal notes, prompt secrets, developer paths, or API keys.
2. **Repository Cleanliness**: Local IDE state does not belong in open-source repositories.

`ai-policy lint-pr` detects when any file within these paths is added or modified, exiting with code 1. **Deletions are allowed**, enabling contributors to remove previously committed workspace files without blocking CI.

---

### 5. How does `ai-policy-kit` handle automated bots like Dependabot or Renovate?

Automated bots that create legitimate dependency updates should not be blocked by AI bot restrictions.

Configure authorized bot usernames in `bots.bot_allowlist`:

```yaml
bots:
  automated_prs: "restricted"
  automated_reviews: "forbidden"
  automated_issues: "forbidden"
  bot_allowlist:
    - "dependabot[bot]"
    - "renovate[bot]"
```

In `ai-policy` v0.1, `bots.bot_allowlist` is a declarative policy specification documented in `AI_POLICY.md` for human reviewers and community guidelines. It does not automatically bypass CLI `lint-pr` author checks at runtime.

To exempt automated bots from commit trailer requirements in CI, maintainers should configure workflow-level conditional execution in GitHub Actions (e.g., `if: github.actor != 'dependabot[bot]' && github.actor != 'renovate[bot]'`):

```yaml
- name: Lint Pull Request AI Policy
  if: github.actor != 'dependabot[bot]' && github.actor != 'renovate[bot]'
  uses: thanhtrieunguyen/ai-policy-kit@v0.1.0
  with:
    pr-body: ${{ github.event.pull_request.body }}
```

---

### 6. What GitHub token permissions are required in CI?

`ai-policy-kit` adheres strictly to the **principle of least privilege**. The GitHub Action requires **read-only** permissions:

```yaml
permissions:
  contents: read
  pull-requests: read
```

The action does **not** require write permissions, does not modify commits, does not post unsolicited PR comments unless explicitly configured, and does not require third-party API keys or external secrets.

---

### 7. How do I migrate from an unstructured `CONTRIBUTING.md` paragraph?

1. Scaffold your policy files:
   ```bash
   npx ai-policy init --preset balanced --docs
   ```
   This generates:
   * `.github/ai-policy.yml`: The machine-readable configuration.
   * `AI_POLICY.md`: Standardized human-readable policy documentation.
   * `AGENTS.md`: Directives for AI coding agents.
   * `.github/PULL_REQUEST_TEMPLATE.md`: Interactive disclosure checklist.
2. In your existing `CONTRIBUTING.md`, replace the vague paragraph with a link to `AI_POLICY.md`:
   ```markdown
   ## AI Contribution Policy
   This repository adheres to the [AI Contribution Policy](AI_POLICY.md).
   All pull requests are automatically validated for policy compliance.
   ```
3. Add the GitHub Action workflow (`.github/workflows/ai-policy.yml`).

---

### 8. Can I validate my branch locally before pushing?

Yes! You can run the exact same checks locally without pushing to GitHub or waiting for CI:

```bash
# Validate policy syntax and schema
npx ai-policy check

# Lint current branch against main
npx ai-policy lint-pr --base main --head HEAD
```

---

### 9. How does `ai-policy lint-pr` handle Git merge commits?

In Git workflows, merge commits often have multiple parents (`parents.length > 1`). Contributors do not author new code in a pure merge commit.

`ai-policy lint-pr` automatically detects merge commits and skips trailer enforcement for them, focusing only on single-parent commits where actual code changes occurred.
