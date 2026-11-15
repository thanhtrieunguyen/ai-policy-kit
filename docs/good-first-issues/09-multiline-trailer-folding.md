# Good First Issue 09: Support Multi-Line RFC 5322 Commit Trailer Continuation Folding in `parseTrailers`

- **Component / Area:** `src/git/trailers.ts`, `tests/helpers/git-fixture.test.ts`
- **Difficulty:** Intermediate
- **Tags:** `git`, `rfc5322`, `parsing`, `good-first-issue`

---

## 1. Context & Motivation

Under RFC 5322 section 2.2.3 and Git's `interpret-trailers` specification, a trailer value can span across multiple lines if the continuation lines begin with at least one whitespace character (space or tab), known as header folding.

For example, a detailed AI disclosure trailer might look like:
```
AI-Assisted: Claude 3.5 Sonnet
    (model: claude-3-5-sonnet-20241022, temperature: 0.2)
```

While `parseTrailers` in `src/git/trailers.ts` already has initial support for continuation lines, we need to ensure that multi-line indentation is collapsed cleanly into a single space in `value`, while preserving the exact verbatim multi-line block in `raw`.

---

## 2. Concrete Files & Lines

1. **`src/git/trailers.ts` (lines 53–95)**:
   Review `parseTrailers` where continuation lines (`line.startsWith(' ') || line.startsWith('\t')`) are assembled.
2. **`tests/helpers/git-fixture.test.ts`** or `tests/engine.test.ts`:
   Add test cases verifying multi-line trailer folding.

---

## 3. Step-by-Step Implementation

### Step 1: Inspect `src/git/trailers.ts` Continuation Handling

In `parseTrailers` (lines 80–95):

```ts
  for (const line of collectedLines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (current) {
        current.value = (current.value ? current.value + ' ' : '') + line.trim();
        current.raw += '\n' + line;
      }
    } else {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx);
        const value = line.slice(colonIdx + 1).trim();
        current = { key, value, raw: line };
        trailers.push(current);
      }
    }
  }
```

### Step 2: Handle Edge Cases

1. When multiple consecutive continuation lines occur:
   Ensure each continuation line is trimmed and joined with a single space into `current.value`.
2. When the initial line of the trailer has an empty value (e.g. `AI-Assisted:\n    Claude 3.5 Sonnet`):
   Ensure `current.value` does not start with a leading space.
3. Preserve original indentation and newlines in `current.raw`.

### Step 3: Add Unit Tests

Add tests in `tests/engine.test.ts` (or git trailer tests):

```ts
it('parses folded multiline trailers per RFC 5322', () => {
  const commitMsg = [
    'feat: implement transformer attention',
    '',
    'AI-Assisted: Claude 3.5 Sonnet',
    '    (model: claude-3-5-sonnet-20241022)',
    '    (verified-by: human-reviewer)',
  ].join('\n');

  const trailers = parseTrailers(commitMsg);
  expect(trailers).toHaveLength(1);
  expect(trailers[0]?.key).toBe('AI-Assisted');
  expect(trailers[0]?.value).toBe(
    'Claude 3.5 Sonnet (model: claude-3-5-sonnet-20241022) (verified-by: human-reviewer)'
  );
  expect(trailers[0]?.raw).toContain('\n    (model:');
});
```

---

## 4. Acceptance Criteria & Verification

- [ ] Multi-line folded trailers parse correctly into a single normalized string in `value`.
- [ ] Raw representation retains the original indentation.
- [ ] Trailing blank lines or comments do not corrupt the trailer block.
- [ ] Verification command:
  ```bash
  npm test -- tests/engine.test.ts
  npm run typecheck
  ```
