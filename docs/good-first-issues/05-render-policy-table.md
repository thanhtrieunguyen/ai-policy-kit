# Good First Issue 05: Add Compact Markdown Table Renderer `renderAiPolicyTable`

- **Component / Area:** `src/templates/markdown.ts`, `src/index.ts`, `tests/engine.test.ts`
- **Difficulty:** Beginner
- **Tags:** `templates`, `markdown`, `good-first-issue`

---

## 1. Context & Motivation

Maintainers frequently want to embed a concise summary of their AI contribution policy directly inside their existing `CONTRIBUTING.md` or `README.md` without including a multi-page standalone policy document.

Currently, `renderAiPolicyMarkdown` produces the full comprehensive document. Providing a helper function `renderAiPolicyTable(config: AIPolicyConfig): string` enables projects to render a clean, standard Markdown summary table.

---

## 2. Concrete Files & Lines

1. **`src/templates/markdown.ts`**:
   Implement and export `renderAiPolicyTable(config: AIPolicyConfig): string`.
2. **`src/index.ts`**:
   Re-export `renderAiPolicyTable` in the public barrel API.
3. **`tests/engine.test.ts`**:
   Add unit test verifying Markdown table formatting across built-in presets (`strict`, `balanced`, `permissive`).

---

## 3. Step-by-Step Implementation

### Step 1: Implement `renderAiPolicyTable` in `src/templates/markdown.ts`

Add the function to render a compact GitHub-flavored Markdown table:

```ts
/**
 * Renders a compact markdown table summarizing category permissions and disclosure requirements.
 */
export function renderAiPolicyTable(config: AIPolicyConfig): string {
  const categories = config.categories ?? {};
  const disclosure = config.disclosure ?? {};
  const trailerKey = disclosure.commit_trailer?.key || 'AI-Assisted';
  const trailerReq = disclosure.commit_trailer?.required ? 'Required' : 'Optional';

  const rows = [
    '| Category | Permission Level |',
    '| :--- | :--- |',
    `| Code | \`${categories.code ?? config.level}\` |`,
    `| Documentation | \`${categories.docs ?? config.level}\` |`,
    `| Tests | \`${categories.tests ?? config.level}\` |`,
    `| Code Reviews | \`${categories.reviews ?? config.level}\` |`,
    `| Issues | \`${categories.issues ?? config.level}\` |`,
    `| **Commit Trailer** | \`${trailerKey}\` (${trailerReq}) |`,
    `| **Disclosure** | Required: \`${Boolean(disclosure.required)}\` |`,
  ];

  return rows.join('\n');
}
```

### Step 2: Export in `src/index.ts`

Add `renderAiPolicyTable` to the barrel export list:

```ts
export {
  renderAiPolicyMarkdown,
  renderAgentsMarkdown,
  renderAiPolicyTable,
} from './templates/markdown.js';
```

### Step 3: Add Unit Tests in `tests/engine.test.ts`

Add test assertions:
- Verify that table contains expected columns `| Category | Permission Level |`.
- Verify that all categories (`Code`, `Documentation`, `Tests`, `Code Reviews`, `Issues`) are rendered.
- Check table formatting for `balanced`, `strict`, and `permissive` configurations.

---

## 4. Acceptance Criteria & Verification

- [ ] `renderAiPolicyTable` produces valid GitHub-flavored Markdown with leading and trailing pipes (`|`).
- [ ] Correctly handles missing optional category fields by falling back to `config.level`.
- [ ] Exported from root entrypoint `ai-policy-kit`.
- [ ] Verification command:
  ```bash
  npm test -- tests/engine.test.ts
  npm run typecheck
  ```
