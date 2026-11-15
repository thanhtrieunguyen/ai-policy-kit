# Good First Issue 12: Add `--ignore-bots` Option to CLI and GitHub Action

- **Component / Area:** `src/cli/lint-pr.ts`, `action.yml`, `src/action/index.ts`, `tests/cli-lint-pr.test.ts`
- **Difficulty:** Intermediate
- **Tags:** `cli`, `action`, `github`, `bots`, `good-first-issue`

---

## 1. Context & Motivation

Repositories using automated service accounts or internal bots (e.g., `release-drafter[bot]`, `crowdin-bot`, `changeset-bot`) often want these bots to create automated PRs or commits without requiring an `AI-Assisted` commit trailer.

While `ai-policy.yml` provides a `bots.bot_allowlist` configuration array, maintainers occasionally need to supply dynamic or CI-specific bot usernames without modifying their static repository policy file.

Adding an `--ignore-bots` option to `ai-policy lint-pr` and an `ignore-bots` input to GitHub Action (`action.yml`) provides this flexibility.

---

## 2. Concrete Files & Lines

1. **`src/cli/lint-pr.ts`**:
   - Add `--ignore-bots <list>` string option to `parseArgs`.
   - Pass parsed `ignoredBots: string[]` to `lintPullRequest`.
2. **`action.yml` (lines 8–33)**:
   - Add input `ignore-bots`:
     ```yaml
     ignore-bots:
       description: 'Comma-separated bot usernames to ignore during trailer checks'
       required: false
       default: ''
     ```
3. **`src/action/index.ts`**:
   - Read `process.env.INPUT_IGNORE_BOTS` and pass to `lintPullRequest`.
4. **`tests/cli-lint-pr.test.ts`**:
   - Add test case verifying that commits by specified ignored bots pass without trailers.

---

## 3. Step-by-Step Implementation

### Step 1: Update CLI Arguments in `src/cli/lint-pr.ts`

Add `'ignore-bots'` to `parseArgs`:

```ts
options: {
  // ... existing options ...
  'ignore-bots': { type: 'string', default: '' },
}
```

Parse into an array:
```ts
const cliIgnoredBots = values['ignore-bots']
  ? String(values['ignore-bots']).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  : [];
```

### Step 2: Skip Trailer Validation for Ignored Bots

In commit author inspection, check if the commit author matches either the policy `bot_allowlist` or the CLI `--ignore-bots` list:

```ts
const isIgnored = allIgnoredBots.some((bot) =>
  commit.author.toLowerCase().includes(bot) || commit.committer.toLowerCase().includes(bot)
);
```

### Step 3: Update `action.yml` and `src/action/index.ts`

1. In `action.yml`, define `ignore-bots` input.
2. In `src/action/index.ts`, parse `process.env['INPUT_IGNORE-BOTS'] || process.env['INPUT_IGNORE_BOTS']` and pass to `lintPullRequest`.

---

## 4. Acceptance Criteria & Verification

- [ ] Commits authored by bots specified in `--ignore-bots="my-bot[bot],release-bot"` do not fail trailer checks.
- [ ] Non-bot authors are still required to comply with trailer rules.
- [ ] Action runner reads `ignore-bots` input successfully.
- [ ] Verification command:
  ```bash
  npm test -- tests/cli-lint-pr.test.ts
  npm run typecheck
  ```
