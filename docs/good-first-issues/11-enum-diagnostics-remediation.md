# Good First Issue 11: Enhance Remediation Suggestions for Invalid Enum Values in `diagnostics.ts`

- **Component / Area:** `src/schema/diagnostics.ts`, `tests/schema.test.ts`
- **Difficulty:** Beginner
- **Tags:** `schema`, `diagnostics`, `dx`, `good-first-issue`

---

## 1. Context & Motivation

When a user accidentally mistypes an enum value in `ai-policy.yml`—such as typing `level: "prohibited"` instead of `"forbidden"`, or `prompt_disclosure: "mandatory"` instead of `"required"`—the current schema diagnostic output says:
```
Value must be one of: 'forbidden', 'restricted', 'permissive'. Received 'prohibited'.
```

While accurate, we can make the developer experience much more helpful by adding a fuzzy or distance-based "Did you mean ...?" suggestion, similar to compilers like `tsc`, Git, and Rust.

---

## 2. Concrete Files & Lines

1. **`src/schema/diagnostics.ts` (lines 200–206)**:
   In `generateRemediation`, under `case 'enum':`, compute the closest allowed value and append a "Did you mean ...?" suggestion.
2. **`tests/schema.test.ts`**:
   Add test coverage asserting that invalid enum values generate actionable "Did you mean ...?" hints.

---

## 3. Step-by-Step Implementation

### Step 1: Implement Closest Match Helper

Add a simple, lightweight string similarity or Levenshtein distance helper in `src/schema/diagnostics.ts`:

```ts
function findClosestMatch(target: string, candidates: string[]): string | undefined {
  if (!target || candidates.length === 0) return undefined;
  
  // 1. Prefix or substring match
  const lowerTarget = target.toLowerCase();
  for (const c of candidates) {
    if (c.toLowerCase().startsWith(lowerTarget) || lowerTarget.startsWith(c.toLowerCase())) {
      return c;
    }
  }

  // 2. Levenshtein edit distance
  let minDistance = Infinity;
  let bestMatch: string | undefined = undefined;

  for (const candidate of candidates) {
    const dist = levenshteinDistance(lowerTarget, candidate.toLowerCase());
    if (dist < minDistance && dist <= 3) {
      minDistance = dist;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}
```

### Step 2: Update `case 'enum':` in `generateRemediation`

```ts
    case 'enum': {
      const allowedArr =
        params && Array.isArray((params as { allowedValues?: unknown }).allowedValues)
          ? ((params as { allowedValues: unknown[] }).allowedValues.map(String))
          : [];
      const allowedVals = allowedArr.map((v) => `'${v}'`).join(', ');
      const receivedStr = data !== undefined ? String(data) : '';
      const suggestion = receivedStr ? findClosestMatch(receivedStr, allowedArr) : undefined;
      const didYouMean = suggestion ? ` Did you mean '${suggestion}'?` : '';
      const received = receivedStr ? ` Received '${receivedStr}'.` : '';

      return `Value must be one of: ${allowedVals}.${received}${didYouMean}`;
    }
```

### Step 3: Add Unit Tests in `tests/schema.test.ts`

Add test asserting that `level: "prohibitive"` or `level: "restrictive"` produces `Did you mean 'forbidden'?` or `Did you mean 'restricted'?`.

---

## 4. Acceptance Criteria & Verification

- [ ] Typing a close typo like `level: "prohibitive"` outputs a remediation containing `Did you mean 'forbidden'?`.
- [ ] Completely unrelated typos do not offer erroneous suggestions if distance > 3.
- [ ] All existing schema validation tests remain green.
- [ ] Verification command:
  ```bash
  npm test -- tests/schema.test.ts
  npm run typecheck
  ```
