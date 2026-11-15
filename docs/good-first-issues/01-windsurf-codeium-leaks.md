# Good First Issue 01: Add Workspace Leak Rules for Windsurf (`.windsurf/`) and Codeium (`.codeium/`)

- **Component / Area:** `src/git/leaks.ts`, `src/templates/markdown.ts`
- **Difficulty:** Beginner
- **Tags:** `security`, `git`, `regex`, `good-first-issue`

---

## 1. Context & Motivation

Windsurf (an AI-powered IDE by Codeium) creates internal workspace directories like `.windsurf/` (containing workspace rules, memory, and automated workflows) and `.codeium/` (containing local extension telemetry, index caches, and tokens).

When contributors use Windsurf to contribute to open-source repositories, these directories can accidentally be staged and committed into pull requests. This pollutes git history and can inadvertently leak internal workspace configurations.

`ai-policy-kit` features an automated workspace leak detection engine in `src/git/leaks.ts` that catches accidental assistant leaks (such as `.cursor/` and `.claude/`). We need to add first-class leak detection rules for Windsurf and Codeium.

---

## 2. Concrete Files & Lines

1. **`src/git/leaks.ts` (lines 18–59)**:
   Add two new entries to `FORBIDDEN_LEAK_RULES`.
2. **`src/templates/markdown.ts` (lines 89–98)**:
   Add `.windsurf/` and `.codeium/` to the prohibition checklist in `renderAgentsMarkdown`.
3. **`tests/cli-lint-pr.test.ts`**:
   Add test assertions verifying that files inside `.windsurf/` or `.codeium/` trigger leak violations.

---

## 3. Step-by-Step Implementation

### Step 1: Update `FORBIDDEN_LEAK_RULES` in `src/git/leaks.ts`

In `src/git/leaks.ts`, append the following rule definitions inside the `FORBIDDEN_LEAK_RULES` array:

```ts
  {
    tool: 'windsurf',
    regex: /(^|\/)\.windsurf(\/|$)/i,
    description: 'Internal Windsurf editor rules or workspace directory',
  },
  {
    tool: 'codeium',
    regex: /(^|\/)\.codeium(\/|$)/i,
    description: 'Internal Codeium extension cache or configuration directory',
  },
```

### Step 2: Update `renderAgentsMarkdown` in `src/templates/markdown.ts`

In `src/templates/markdown.ts`, add the directories to the list under `## 1. Accidental Workspace Leak Prevention (STRICT PROHIBITION)`:

```markdown
- `.windsurf/`
- `.codeium/`
```

### Step 3: Add Unit Tests in `tests/cli-lint-pr.test.ts`

Add test cases in `tests/cli-lint-pr.test.ts` (or `tests/engine.test.ts`) that call `checkLeakPath`:

```ts
it('detects .windsurf and .codeium workspace leaks', () => {
  const windsurfResult = checkLeakPath('.windsurf/workflows/rules.json');
  expect(windsurfResult.isLeak).toBe(true);
  expect(windsurfResult.tool).toBe('windsurf');

  const codeiumResult = checkLeakPath('.codeium/cache.db');
  expect(codeiumResult.isLeak).toBe(true);
  expect(codeiumResult.tool).toBe('codeium');
});
```

---

## 4. Acceptance Criteria & Verification

- [ ] `checkLeakPath('.windsurf/rules.json')` returns `{ isLeak: true, tool: 'windsurf' }`.
- [ ] `checkLeakPath('.codeium/config.json')` returns `{ isLeak: true, tool: 'codeium' }`.
- [ ] Subdirectory paths such as `packages/app/.windsurf/context.json` are also flagged.
- [ ] Normal files mentioning the words (e.g. `docs/windsurf.md` or `src/codeium-client.ts`) return `{ isLeak: false }` (no false positives).
- [ ] All tests pass:
  ```bash
  npm test -- tests/cli-lint-pr.test.ts
  npm run typecheck
  ```
