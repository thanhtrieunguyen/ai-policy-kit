# Good First Issue 02: Add Workspace Leak Rules for Cline (`.cline/`, `.clinerules`) and Roo Code (`.roo/`, `.roomodes`)

- **Component / Area:** `src/git/leaks.ts`, `src/templates/markdown.ts`
- **Difficulty:** Beginner
- **Tags:** `security`, `git`, `regex`, `good-first-issue`

---

## 1. Context & Motivation

Autonomous coding agents Cline and Roo Code (a fork of Cline) store agent state, mode configurations, instruction memory, and execution logs inside `.clinerules`, `.cline/`, `.roomodes`, and `.roo/` directories in repository workspaces.

These files often contain developer prompt scratchpads, system prompt overrides, and local tool execution logs that should never be published to public repositories.

We need to add pattern rules in `src/git/leaks.ts` so that pull requests containing these files are flagged with clear leak diagnostic messages.

---

## 2. Concrete Files & Lines

1. **`src/git/leaks.ts` (lines 18–59)**:
   Add rule definitions to `FORBIDDEN_LEAK_RULES` for Cline and Roo Code.
2. **`src/templates/markdown.ts` (lines 89–98)**:
   Add `.cline/`, `.clinerules`, `.roo/`, and `.roomodes` to `renderAgentsMarkdown`.
3. **`tests/cli-lint-pr.test.ts`**:
   Add test coverage for Cline and Roo Code paths.

---

## 3. Step-by-Step Implementation

### Step 1: Update `FORBIDDEN_LEAK_RULES` in `src/git/leaks.ts`

Add four pattern rules to the `FORBIDDEN_LEAK_RULES` array:

```ts
  {
    tool: 'cline',
    regex: /(^|\/)\.cline(\/|$)/i,
    description: 'Internal Cline agent workspace or configuration directory',
  },
  {
    tool: 'cline',
    regex: /(^|\/)\.clinerules$/i,
    description: 'Internal Cline agent custom instructions file',
  },
  {
    tool: 'roo',
    regex: /(^|\/)\.roo(\/|$)/i,
    description: 'Internal Roo Code agent workspace or configuration directory',
  },
  {
    tool: 'roo',
    regex: /(^|\/)\.roomodes$/i,
    description: 'Internal Roo Code agent custom modes configuration file',
  },
```

### Step 2: Update `renderAgentsMarkdown` in `src/templates/markdown.ts`

In `src/templates/markdown.ts`, update the list of prohibited directories:

```markdown
- `.cline/` (including `.clinerules`)
- `.roo/` (including `.roomodes`)
```

### Step 3: Add Tests in `tests/cli-lint-pr.test.ts`

Verify that:
- `.clinerules` is recognized as a leak with tool `'cline'`.
- `.cline/memory/context.json` is recognized as a leak with tool `'cline'`.
- `.roomodes` is recognized as a leak with tool `'roo'`.
- `.roo/rules/custom.md` is recognized as a leak with tool `'roo'`.

---

## 4. Acceptance Criteria & Verification

- [ ] `checkLeakPath('.clinerules')` returns `{ isLeak: true, tool: 'cline' }`.
- [ ] `checkLeakPath('.roo/state.json')` returns `{ isLeak: true, tool: 'roo' }`.
- [ ] Normal files (e.g. `src/clinerules-parser.ts` or `docs/roo.md`) are NOT flagged as leaks.
- [ ] All tests pass:
  ```bash
  npm test -- tests/cli-lint-pr.test.ts
  npm run typecheck
  ```
