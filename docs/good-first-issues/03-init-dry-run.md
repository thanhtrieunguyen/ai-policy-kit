# Good First Issue 03: Add `--dry-run` Option to `ai-policy init`

- **Component / Area:** `src/cli/init.ts`, `tests/cli-init.test.ts`
- **Difficulty:** Beginner
- **Tags:** `cli`, `developer-experience`, `good-first-issue`

---

## 1. Context & Motivation

When users evaluate `ai-policy init` for their project or test scaffolding options (e.g. `--preset strict --docs`), they often want to inspect what files would be created and what their contents look like without modifying their repository's working tree.

Currently, `ai-policy init` immediately writes files to disk (or fails if files exist and `--force` is omitted). Adding a `--dry-run` flag allows developers to preview the action safely.

---

## 2. Concrete Files & Lines

1. **`src/cli/init.ts`**:
   - `InitOptions` interface (lines 11–18): Add `dryRun?: boolean;`.
   - `INIT_HELP` string (lines 20–35): Document the `--dry-run` flag.
   - `parseArgs` options (lines 40–53): Add `'dry-run': { type: 'boolean', default: false }`.
   - File generation loop (lines 80–180): Skip filesystem writes (`fs.writeFileSync`, `fs.mkdirSync`) when `values['dry-run']` is true.
2. **`tests/cli-init.test.ts`**:
   - Add test cases verifying that `ai-policy init --dry-run` leaves the directory untouched.

---

## 3. Step-by-Step Implementation

### Step 1: Update `InitOptions` and CLI argument parser in `src/cli/init.ts`

Add `dryRun` to the options interface:

```ts
export interface InitOptions {
  preset?: string;
  output?: string;
  docs?: boolean;
  force?: boolean;
  json?: boolean;
  dryRun?: boolean;
  cwd?: string;
}
```

Add the option to `parseArgs`:

```ts
options: {
  preset: { type: 'string', default: 'balanced' },
  output: { type: 'string' },
  docs: { type: 'boolean', default: false },
  force: { type: 'boolean', default: false },
  json: { type: 'boolean', default: false },
  'dry-run': { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false },
},
```

### Step 2: Implement Dry-Run Simulation

In `handleInit`, read `isDryRun = Boolean(values['dry-run'])`:

1. Build the list of target files and planned contents as usual.
2. If `isDryRun` is `true`:
   - Do NOT invoke `fs.mkdirSync` or `fs.writeFileSync`.
   - If `--json` is specified, output:
     ```json
     {
       "success": true,
       "dryRun": true,
       "files": [
         { "path": ".github/ai-policy.yml", "status": "would_create" }
       ]
     }
     ```
   - In standard terminal output mode, print:
     ```
     [DRY-RUN] Previewing scaffolding (no files written to disk):
       - .github/ai-policy.yml
       - AI_POLICY.md
     ```
   - Return exit code `0`.

---

## 4. Acceptance Criteria & Verification

- [ ] `ai-policy init --dry-run` exits with code `0`.
- [ ] Running in a temporary directory leaves the directory completely empty (0 files created).
- [ ] Running `ai-policy init --dry-run --json` produces valid JSON with `"dryRun": true`.
- [ ] Existing files are not overwritten or truncated.
- [ ] Verification command:
  ```bash
  npm test -- tests/cli-init.test.ts
  npm run typecheck
  ```
