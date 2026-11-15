# Good First Issue 07: Add Academic & Open Research Policy Preset (`presets/academic.yml`)

- **Component / Area:** `presets/academic.yml`, `src/templates/presets-data.ts`, `src/types.ts`
- **Difficulty:** Beginner
- **Tags:** `presets`, `schema`, `yaml`, `good-first-issue`

---

## 1. Context & Motivation

Academic and scientific research repositories (e.g. NumFOCUS projects, scientific computing libraries, universities, and research labs) have specialized publishing guidelines regarding AI tools:
- AI models cannot be listed as co-authors.
- Prompts, models, and methodologies used during research or paper generation must be transparently disclosed.
- Human authors must take 100% accountability for mathematical correctness, proofs, and experimental citations.

Adding a built-in `academic` preset provides researchers and academic maintainers with an out-of-the-box configuration tailored to scholarly standards.

---

## 2. Concrete Files & Lines

1. **`presets/academic.yml`** (new file):
   Define the YAML policy configuration conforming to `schema/v0.1/ai-policy.schema.json`.
2. **`src/types.ts`** (line 12):
   Update `PresetName` union type: `export type PresetName = 'strict' | 'balanced' | 'permissive' | 'academic';`.
3. **`src/templates/presets-data.ts`**:
   Add `ACADEMIC_PRESET_YAML` constant and update `getPresetContent`.
4. **`tests/schema.test.ts`**:
   Add a test case validating `presets/academic.yml` against the schema.

---

## 3. Step-by-Step Implementation

### Step 1: Create `presets/academic.yml`

Create `presets/academic.yml` with the following configuration:

```yaml
# yaml-language-server: $schema=../schema/v0.1/ai-policy.schema.json
version: "0.1"
level: "restricted"
policy_url: "https://github.com/thanhtrieunguyen/ai-policy-kit/blob/main/presets/academic.yml"

categories:
  code: "restricted"
  docs: "restricted"
  tests: "restricted"
  reviews: "forbidden"
  issues: "restricted"

disclosure:
  required: true
  methods:
    - "commit_trailer"
    - "pr_checklist"
    - "pr_description"
  commit_trailer:
    key: "AI-Assisted"
    required: true
    pattern: "^AI-Assisted: .+$"
  tool_name_required: true
  prompt_disclosure: "required"

accountability:
  author_understands_code: true
  author_takes_responsibility: true
  dco_signoff: true

bots:
  automated_prs: "forbidden"
  automated_reviews: "forbidden"
  automated_issues: "forbidden"
  bot_allowlist:
    - "dependabot[bot]"
```

### Step 2: Update `src/types.ts`

Add `'academic'` to the `PresetName` type:

```ts
export type PresetName = 'strict' | 'balanced' | 'permissive' | 'academic';
```

### Step 3: Update `src/templates/presets-data.ts`

Export `ACADEMIC_PRESET_YAML` and update `getPresetContent(name: PresetName)` to handle `'academic'`.

### Step 4: Add Validation Test

In `tests/schema.test.ts`, add:

```ts
it('validates academic preset against schema v0.1', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '../presets/academic.yml'), 'utf-8');
  const parsed = YAML.parse(content);
  const result = validatePolicy(parsed);
  expect(result.valid).toBe(true);
  expect(result.diagnostics).toHaveLength(0);
});
```

---

## 4. Acceptance Criteria & Verification

- [ ] `presets/academic.yml` passes JSON Schema v0.1 validation with 0 diagnostics.
- [ ] `ai-policy init --preset academic` successfully initializes a project with the academic preset.
- [ ] TypeScript compilation succeeds with strict type checking.
- [ ] Verification command:
  ```bash
  npm test -- tests/schema.test.ts
  npm run typecheck
  ```
