# Good First Issue 14: Add Recommended VS Code & Cursor JSON Schema Configuration (`.vscode/settings.json`)

- **Component / Area:** `.vscode/settings.json`, `docs/guides/ide-setup.md`, `README.md`
- **Difficulty:** Beginner
- **Tags:** `ide`, `vscode`, `schema`, `developer-experience`, `good-first-issue`

---

## 1. Context & Motivation

When developers author or edit `.github/ai-policy.yml` in editors like Visual Studio Code or Cursor, they get instant code completion, hover documentation, and real-time schema validation squiggles if the editor is configured with JSON Schema associations (via the standard Red Hat YAML extension).

Adding a recommended `.vscode/settings.json` and a setup guide in `docs/guides/ide-setup.md` ensures that any contributor opening the repository enjoys an optimal editing experience immediately.

---

## 2. Concrete Files & Lines

1. **`.vscode/settings.json`** (new configuration file):
   Configure `yaml.schemas` mapping for local policy files.
2. **`docs/guides/ide-setup.md`** (new documentation guide):
   Document how to enable schema validation in VS Code, Cursor, and JetBrains IDEs.
3. **`README.md`**:
   Link to the IDE setup guide in the documentation section.

---

## 3. Step-by-Step Implementation

### Step 1: Create `.vscode/settings.json`

Create `.vscode/settings.json` in the repository root:

```json
{
  "yaml.schemas": {
    "./schema/v0.1/ai-policy.schema.json": [
      "ai-policy.yml",
      "ai-policy.yaml",
      ".github/ai-policy.yml",
      ".github/ai-policy.yaml"
    ]
  },
  "yaml.customTags": [],
  "editor.tabSize": 2,
  "editor.insertSpaces": true
}
```

### Step 2: Create Guide `docs/guides/ide-setup.md`

Write a guide explaining:
1. **VS Code & Cursor**:
   - Install the official **YAML** extension by Red Hat (`redhat.vscode-yaml`).
   - The `.vscode/settings.json` mapping automatically links local schema files.
   - Alternatively, use the in-file schema modeline: `# yaml-language-server: $schema=https://raw.githubusercontent.com/thanhtrieunguyen/ai-policy-kit/main/schema/v0.1/ai-policy.schema.json`.
2. **JetBrains IDEs (IntelliJ IDEA, WebStorm, PyCharm)**:
   - Go to *Settings | Languages & Frameworks | Schemas and DTDs | JSON Schema*.
   - Add a new schema pointing to `schema/v0.1/ai-policy.schema.json` mapped to `ai-policy.yml`.

### Step 3: Verify JSON Syntax

Ensure `.vscode/settings.json` is strictly valid JSON:

```bash
node -e "JSON.parse(require('fs').readFileSync('.vscode/settings.json', 'utf8')); console.log('JSON is valid');"
```

---

## 4. Acceptance Criteria & Verification

- [ ] `.vscode/settings.json` exists and parses cleanly as valid JSON.
- [ ] Schema mapping correctly associates `ai-policy.schema.json` with `.github/ai-policy.yml`.
- [ ] `docs/guides/ide-setup.md` provides clear instructions for VS Code, Cursor, and JetBrains IDEs.
