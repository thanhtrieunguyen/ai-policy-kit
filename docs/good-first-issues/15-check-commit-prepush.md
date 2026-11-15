# Good First Issue 15: Add `check-commit` Subcommand for Pre-Push Commit Message Verification

- **Component / Area:** `src/cli/index.ts`, `src/cli/check-commit.ts`, `src/git/trailers.ts`, `tests/cli-check.test.ts`
- **Difficulty:** Intermediate
- **Tags:** `cli`, `git`, `pre-push`, `hooks`, `good-first-issue`

---

## 1. Context & Motivation

Contributors frequently want to verify that their local commit messages comply with repository policy *before* pushing to remote. Running `ai-policy lint-pr` requires a base and head git ref, which is designed for pull request branches in CI.

In contrast, when developing locally or running a git `commit-msg` or `pre-push` hook, developers want a targeted command:
```bash
ai-policy check-commit HEAD
# or in a commit-msg hook:
ai-policy check-commit .git/COMMIT_EDITMSG
```

This verifies that the specified commit message includes any required `AI-Assisted:` trailer and adheres to the configured trailer regex pattern.

---

## 2. Concrete Files & Lines

1. **`src/cli/index.ts`**:
   - `GLOBAL_HELP` (lines 13–17): Add `check-commit` to list of commands.
   - Command dispatcher (lines 52–65): Add `case 'check-commit': return await handleCheckCommit(subArgs);`.
2. **`src/cli/check-commit.ts`** (new command module):
   Implement `handleCheckCommit` accepting a commit SHA, ref name, or commit message file path.
3. **`tests/cli-check.test.ts`**:
   Add test coverage for `ai-policy check-commit`.

---

## 3. Step-by-Step Implementation

### Step 1: Create `src/cli/check-commit.ts`

```ts
import * as fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { findPolicyFile, loadPolicy } from '../engine/index.js';
import { parseTrailers, matchesTrailerPattern } from '../git/trailers.js';
import { DISCLAIMER } from '../constants.js';

export async function handleCheckCommit(rawArgs: string[], cwd = process.cwd()): Promise<number> {
  const parsed = parseArgs({
    args: rawArgs,
    options: {
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  const target = parsed.positionals[0] || 'HEAD';
  let commitMessage = '';

  // 1. Check if target is a file path (e.g. .git/COMMIT_EDITMSG)
  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    commitMessage = fs.readFileSync(target, 'utf-8');
  } else {
    // 2. Otherwise extract commit message via git
    try {
      commitMessage = execFileSync('git', ['log', '-1', '--format=%B', target], {
        cwd,
        encoding: 'utf-8',
      });
    } catch (err: any) {
      console.error(`Error: Failed to read commit "${target}": ${err.message}`);
      return 2;
    }
  }

  // 3. Load policy configuration
  const policyFile = await findPolicyFile(cwd);
  if (!policyFile) {
    console.error('Error: No ai-policy.yml found in repository.');
    return 2;
  }
  const { config } = await loadPolicy(policyFile);

  // 4. Validate trailer requirements
  const trailerConfig = config.disclosure?.commit_trailer;
  const key = trailerConfig?.key || 'AI-Assisted';
  const pattern = trailerConfig?.pattern;
  const isRequired = Boolean(trailerConfig?.required);

  const trailers = parseTrailers(commitMessage);
  const matching = trailers.filter((t) => t.key.toLowerCase() === key.toLowerCase());

  if (isRequired && matching.length === 0) {
    console.error(`Violation: Commit is missing required trailer "${key}".\n\n${DISCLAIMER}`);
    return 1;
  }

  if (matching.length > 0 && pattern) {
    for (const t of matching) {
      if (!matchesTrailerPattern(t.key, t.value, pattern)) {
        console.error(`Violation: Trailer "${t.raw}" does not match pattern "${pattern}".\n\n${DISCLAIMER}`);
        return 1;
      }
    }
  }

  console.log(`✓ Commit compliant with ${key} trailer policy.`);
  return 0;
}
```

### Step 2: Wire Subcommand in `src/cli/index.ts`

Import and route `handleCheckCommit` in `src/cli/index.ts`.

### Step 3: Add Tests in `tests/cli-check.test.ts`

Test with valid and invalid commit messages using temporary git repositories.

---

## 4. Acceptance Criteria & Verification

- [ ] `ai-policy check-commit HEAD` passes when trailers match repository policy.
- [ ] Direct commit message files (e.g. `.git/COMMIT_EDITMSG`) are read and validated.
- [ ] Exits with code `0` on compliance, `1` on trailer violation, and `2` on invalid git ref.
- [ ] Verification command:
  ```bash
  npm test -- tests/cli-check.test.ts
  npm run typecheck
  ```
