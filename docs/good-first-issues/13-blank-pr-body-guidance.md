# Good First Issue 13: Add Actionable Guidance for Missing or Blank PR Descriptions in `lint-pr`

- **Component / Area:** `src/cli/lint-pr.ts`, `tests/cli-lint-pr.test.ts`
- **Difficulty:** Beginner
- **Tags:** `cli`, `ux`, `pr-linting`, `remediation`, `good-first-issue`

---

## 1. Context & Motivation

When a repository policy requires PR checklist disclosure (`disclosure.methods: ["pr_checklist"]`), contributors who submit pull requests with an empty or whitespace-only body currently receive a generic violation message:
```
Pull request description does not contain a checked AI contribution disclosure
```

New contributors often don't know what markdown snippet they need to paste into their PR body. By embedding an actionable suggestion containing the exact Markdown checklist (generated via `renderPrChecklistMarkdown`), the CLI and Action output tells contributors exactly what to do.

---

## 2. Concrete Files & Lines

1. **`src/cli/lint-pr.ts` (lines 112–132)**:
   In `lintPullRequest`, when `options.prBody` is missing, blank, or lacks checked boxes, enhance the violation object with a copy-pasteable remediation snippet.
2. **`tests/cli-lint-pr.test.ts`**:
   Add test case verifying that blank PR bodies receive actionable guidance.

---

## 3. Step-by-Step Implementation

### Step 1: Detect Empty/Missing PR Body in `src/cli/lint-pr.ts`

In `src/cli/lint-pr.ts`:
Import `renderPrChecklistMarkdown` from `../templates/pr-checklist.js`.

When checking `options.prBody`:

```ts
  const isBlankPrBody = !options.prBody || options.prBody.trim().length === 0;

  if (options.prBody !== undefined) {
    const checkedBoxRegex = /-\s*\[[xX]\]\s*.*(?:AI|Copilot|Claude|Cursor|assistant|None|disclosed)/i;
    const anyCheckedBox = /-\s*\[[xX]\]/;

    if (checkedBoxRegex.test(options.prBody) || anyCheckedBox.test(options.prBody)) {
      checklistSatisfied = true;
      checklistValid = true;
    } else {
      checklistValid = false;
      if (methods.includes('pr_checklist')) {
        const snippet = renderPrChecklistMarkdown(policyConfig);
        const remediation = isBlankPrBody
          ? `Pull request description is empty. Please edit your PR body and paste the following disclosure checklist:\n\n${snippet}`
          : `Pull request description is missing a checked AI contribution disclosure. Please check the appropriate box in your PR description:\n\n${snippet}`;

        violations.push({
          rule: 'pr_checklist',
          message: remediation,
        });
      }
    }
  }
```

### Step 2: Format Output in Terminal & JSON

Ensure the message renders cleanly in terminal output and does not break `--json` formatting.

### Step 3: Add Unit Test in `tests/cli-lint-pr.test.ts`

Verify that running `lintPullRequest` with `{ prBody: '' }` against a policy with `pr_checklist` outputs the checklist snippet in the violation message.

---

## 4. Acceptance Criteria & Verification

- [ ] Empty or whitespace-only PR descriptions output an actionable remediation containing the checklist snippet.
- [ ] Contributors can copy-paste the snippet directly into GitHub PR descriptions.
- [ ] Valid filled-in checklists continue to pass.
- [ ] Verification command:
  ```bash
  npm test -- tests/cli-lint-pr.test.ts
  npm run typecheck
  ```
