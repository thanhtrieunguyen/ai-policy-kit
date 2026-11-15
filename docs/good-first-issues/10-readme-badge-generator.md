# Good First Issue 10: Add Shields.io Markdown Badge Generator `renderAiPolicyBadge`

- **Component / Area:** `src/templates/markdown.ts`, `src/cli/init.ts`, `src/index.ts`
- **Difficulty:** Beginner
- **Tags:** `templates`, `shields-io`, `badges`, `good-first-issue`

---

## 1. Context & Motivation

Open-source maintainers love displaying status badges on their project `README.md` (e.g. CI status, license, npm version). A standardized AI Policy badge lets maintainers visibly advertise their policy posture to contributors and automated agents right at the top of their repository.

We want to add a helper function `renderAiPolicyBadge(config: AIPolicyConfig): string` and automatically display the badge snippet upon completing `ai-policy init`.

---

## 2. Concrete Files & Lines

1. **`src/templates/markdown.ts`**:
   Implement and export `renderAiPolicyBadge(config: AIPolicyConfig): string`.
2. **`src/index.ts`**:
   Re-export `renderAiPolicyBadge` in the public API.
3. **`src/cli/init.ts` (lines 190–205)**:
   Include the generated badge markdown snippet in the terminal output after successful initialization.
4. **`tests/cli-init.test.ts`**:
   Add test assertions checking that the badge is displayed or generated properly.

---

## 3. Step-by-Step Implementation

### Step 1: Implement `renderAiPolicyBadge` in `src/templates/markdown.ts`

```ts
/**
 * Generates a Shields.io markdown badge for the repository AI policy posture.
 */
export function renderAiPolicyBadge(config: AIPolicyConfig): string {
  const level = config.level || 'restricted';

  let color = 'blue';
  if (level === 'forbidden') {
    color = 'red';
  } else if (level === 'permissive') {
    color = 'brightgreen';
  } else if (level === 'restricted') {
    color = 'blue';
  }

  const encodedLevel = encodeURIComponent(level);
  return `[![AI Policy](https://img.shields.io/badge/AI_Policy-${encodedLevel}-${color})](AI_POLICY.md)`;
}
```

### Step 2: Export from `src/index.ts`

Export `renderAiPolicyBadge` in `src/index.ts`.

### Step 3: Update `ai-policy init` Completion Message in `src/cli/init.ts`

When `ai-policy init` finishes successfully in human-readable mode (non-`--json`), print:

```ts
const badgeSnippet = renderAiPolicyBadge(parsedConfig);
console.log(`\nBadge for your README.md:\n${badgeSnippet}\n`);
```

---

## 4. Acceptance Criteria & Verification

- [ ] `renderAiPolicyBadge` returns valid Shields.io markdown for `strict`, `balanced`, and `permissive` configurations.
- [ ] Special characters and spaces in levels are URL-encoded.
- [ ] Exported in root package index.
- [ ] Verification command:
  ```bash
  npm test -- tests/cli-init.test.ts
  npm run typecheck
  ```
