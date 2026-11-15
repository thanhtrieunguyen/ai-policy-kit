# Good First Issue 08: Add Colorized Terminal Output with `NO_COLOR` Standards Support

- **Component / Area:** `src/cli/check.ts`, `src/cli/lint-pr.ts`, `src/cli/color.ts`
- **Difficulty:** Beginner
- **Tags:** `cli`, `ansi-colors`, `ux`, `good-first-issue`

---

## 1. Context & Motivation

Terminal output for `ai-policy check` and `ai-policy lint-pr` is currently plain text without ANSI colors. Adding colored status markers (e.g., green `✓ PASS`, red `✗ FAIL`, yellow warnings) greatly improves visual scanability for developers during local checks and CI runs.

However, terminal coloring must strictly respect the [`NO_COLOR` standard](https://no-color.org) and disable escape sequences when output is redirected to a non-TTY pipe or when `--json` output is requested.

---

## 2. Concrete Files & Lines

1. **`src/cli/color.ts`** (new helper module):
   Zero-dependency ANSI color formatters checking `process.stdout.isTTY && !process.env.NO_COLOR`.
2. **`src/cli/check.ts` (lines 140–200)**:
   Colorize validation success/failure output.
3. **`src/cli/lint-pr.ts` (lines 200–260)**:
   Colorize PR compliance check markers and violation tags.
4. **`tests/cli-check.test.ts`**:
   Add tests verifying that colors are disabled when `NO_COLOR` is present or when `--json` is passed.

---

## 3. Step-by-Step Implementation

### Step 1: Create Zero-Dependency ANSI Color Utility `src/cli/color.ts`

```ts
const useColor = (): boolean => {
  if (process.env.NO_COLOR !== undefined) return false;
  return Boolean(process.stdout.isTTY);
};

export const colors = {
  green: (str: string) => (useColor() ? `\x1b[32m${str}\x1b[0m` : str),
  red: (str: string) => (useColor() ? `\x1b[31m${str}\x1b[0m` : str),
  yellow: (str: string) => (useColor() ? `\x1b[33m${str}\x1b[0m` : str),
  bold: (str: string) => (useColor() ? `\x1b[1m${str}\x1b[0m` : str),
  dim: (str: string) => (useColor() ? `\x1b[2m${str}\x1b[0m` : str),
};
```

### Step 2: Apply Formatting to `check.ts` and `lint-pr.ts`

- Format success banner:
  ```ts
  console.log(colors.green('✓ Valid: ') + `Policy file "${filepath}" conforms to schema.`);
  ```
- Format failure banner:
  ```ts
  console.error(colors.red('✗ Violation: ') + violation.message);
  ```
- In `--json` mode, ensure JSON is formatted cleanly without ANSI escape codes.

### Step 3: Add Test Coverage

Verify that:
- Setting `process.env.NO_COLOR = '1'` strips all escape characters (`\x1b[`).
- Running with `--json` outputs clean, valid JSON parseable by `JSON.parse`.

---

## 4. Acceptance Criteria & Verification

- [ ] Zero runtime dependencies added (pure ANSI escapes).
- [ ] When `NO_COLOR` is set, output contains no ANSI escape characters.
- [ ] When `--json` is passed, output is strictly valid JSON.
- [ ] Statuses (`✓ PASS` / `✗ FAIL`) are colored appropriately in interactive TTY terminals.
- [ ] Verification command:
  ```bash
  npm test -- tests/cli-check.test.ts
  npm run typecheck
  ```
