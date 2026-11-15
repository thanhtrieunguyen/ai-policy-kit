# Good First Issue 04: Support GitHub Shorthand `owner/repo` in `ai-policy check`

- **Component / Area:** `src/cli/check.ts`, `tests/cli-check.test.ts`
- **Difficulty:** Intermediate
- **Tags:** `cli`, `network`, `fetch`, `good-first-issue`

---

## 1. Context & Motivation

Currently, `ai-policy check` accepts either a local file/directory path or a full HTTPS URL pointing directly to a raw YAML file (e.g., `ai-policy check https://raw.githubusercontent.com/owner/repo/main/.github/ai-policy.yml`).

However, many developer CLI tools (such as `gh`, `npx`, and Homebrew) allow passing a shorthand repository slug: `owner/repo` (for example: `ai-policy check thanhtrieunguyen/ai-policy-kit`). Supporting this shorthand makes checking open-source repository policies fast and intuitive.

---

## 2. Concrete Files & Lines

1. **`src/cli/check.ts`**:
   - `CHECK_HELP` string (lines 13–35): Document `owner/repo` shorthand syntax in help message.
   - Positional target evaluation (lines 55–100): Detect `owner/repo` format and resolve candidates against GitHub raw content endpoints.
2. **`tests/cli-check.test.ts`**:
   - Add test cases verifying that `owner/repo` shorthand correctly attempts candidate fetches and reports meaningful errors when not found.

---

## 3. Step-by-Step Implementation

### Step 1: Detect GitHub Shorthand Pattern

In `src/cli/check.ts`, before resolving local file paths, check if `target` matches a GitHub repository slug:

```ts
const GITHUB_SLUG_REGEX = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const isGitHubSlug = Boolean(target && GITHUB_SLUG_REGEX.test(target) && !fs.existsSync(path.resolve(cwd, target)));
```

### Step 2: Resolve Raw GitHub Policy URLs

If `isGitHubSlug` is true, check the standard policy locations on GitHub (`HEAD` branch):
1. Candidate A: `https://raw.githubusercontent.com/${target}/HEAD/.github/ai-policy.yml`
2. Candidate B: `https://raw.githubusercontent.com/${target}/HEAD/ai-policy.yml`

Implement sequential fetching:
- Attempt Candidate A using `fetch` with a 10-second timeout.
- If Candidate A returns 404, attempt Candidate B.
- If either succeeds (HTTP 200), parse and validate the policy using `validatePolicy` as normal.
- If both return 404, emit a diagnostic error: `No ai-policy.yml found in repository "${target}". Checked .github/ai-policy.yml and ai-policy.yml on HEAD.` and exit with code `2`.

---

## 4. Acceptance Criteria & Verification

- [ ] `ai-policy check owner/repo` detects valid policies on GitHub repositories.
- [ ] If a local directory named `owner/repo` exists, local resolution takes precedence.
- [ ] Returns exit code `0` on compliant remote policies.
- [ ] Returns exit code `2` with clear diagnostic when no policy exists in the remote repository.
- [ ] `--json` mode returns structured diagnostic payload.
- [ ] Verification command:
  ```bash
  npm test -- tests/cli-check.test.ts
  npm run typecheck
  ```
