# Good First Issues Catalog

Welcome to the `ai-policy-kit` contributor community! We have curated **15 modular, high-impact Good First Issues** specifically designed for first-time contributors and open-source developers.

Each issue is self-contained, specifies the exact source files and line numbers to modify, provides step-by-step guidance, and includes automated verification test commands.

---

## Master Issue Index

| ID | Title | Component / Area | Difficulty | Tags / Skills | Specification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GFI-01** | Add Workspace Leak Rules for Windsurf & Codeium | `src/git/leaks.ts` | Beginner | `security`, `git`, `regex` | [01-windsurf-codeium-leaks.md](01-windsurf-codeium-leaks.md) |
| **GFI-02** | Add Workspace Leak Rules for Cline & Roo Code | `src/git/leaks.ts` | Beginner | `security`, `git`, `regex` | [02-cline-roo-leaks.md](02-cline-roo-leaks.md) |
| **GFI-03** | Add `--dry-run` Option to `ai-policy init` | `src/cli/init.ts` | Beginner | `cli`, `developer-experience` | [03-init-dry-run.md](03-init-dry-run.md) |
| **GFI-04** | Support GitHub Shorthand `owner/repo` in `check` | `src/cli/check.ts` | Intermediate | `cli`, `network`, `fetch` | [04-check-github-shorthand.md](04-check-github-shorthand.md) |
| **GFI-05** | Add Compact Markdown Table Renderer `renderAiPolicyTable` | `src/templates/markdown.ts` | Beginner | `templates`, `markdown` | [05-render-policy-table.md](05-render-policy-table.md) |
| **GFI-06** | Add Pre-Commit Hook Definition & Integration Guide | `.pre-commit-hooks.yaml` | Beginner | `tooling`, `git-hooks`, `yaml` | [06-pre-commit-hook.md](06-pre-commit-hook.md) |
| **GFI-07** | Add Academic & Scientific Research Policy Preset | `presets/academic.yml` | Beginner | `presets`, `schema`, `yaml` | [07-academic-preset.md](07-academic-preset.md) |
| **GFI-08** | Add Colorized Terminal Output with `NO_COLOR` Support | `src/cli/` | Beginner | `cli`, `ansi-colors`, `ux` | [08-colorized-cli-output.md](08-colorized-cli-output.md) |
| **GFI-09** | Support Multi-Line RFC 5322 Trailer Continuation Folding | `src/git/trailers.ts` | Intermediate | `git`, `rfc5322`, `parsing` | [09-multiline-trailer-folding.md](09-multiline-trailer-folding.md) |
| **GFI-10** | Add Shields.io Markdown Badge Generator `renderAiPolicyBadge` | `src/templates/markdown.ts` | Beginner | `templates`, `shields-io` | [10-readme-badge-generator.md](10-readme-badge-generator.md) |
| **GFI-11** | Enhance Remediation Suggestions for Invalid Enum Values | `src/schema/diagnostics.ts`| Beginner | `schema`, `diagnostics`, `dx` | [11-enum-diagnostics-remediation.md](11-enum-diagnostics-remediation.md) |
| **GFI-12** | Add `--ignore-bots` Option to CLI & GitHub Action | `src/cli/lint-pr.ts` | Intermediate | `cli`, `action`, `github` | [12-ignore-bots-option.md](12-ignore-bots-option.md) |
| **GFI-13** | Add Actionable Guidance for Missing or Blank PR Bodies | `src/cli/lint-pr.ts` | Beginner | `cli`, `ux`, `pr-linting` | [13-blank-pr-body-guidance.md](13-blank-pr-body-guidance.md) |
| **GFI-14** | Add VS Code & Cursor JSON Schema Configuration | `.vscode/settings.json` | Beginner | `ide`, `vscode`, `schema` | [14-vscode-schema-integration.md](14-vscode-schema-integration.md) |
| **GFI-15** | Add `check-commit` Subcommand for Pre-Push Hooks | `src/cli/check-commit.ts` | Intermediate | `cli`, `git`, `pre-push` | [15-check-commit-prepush.md](15-check-commit-prepush.md) |

---

## Category Breakdown

### 1. Security & Workspace Leak Prevention
Prevent accidental staging or committing of AI assistant workspace configurations and internal execution artifacts:
- **GFI-01**: [Windsurf & Codeium Leak Rules](01-windsurf-codeium-leaks.md) (`.windsurf/`, `.codeium/`)
- **GFI-02**: [Cline & Roo Code Leak Rules](02-cline-roo-leaks.md) (`.cline/`, `.clinerules`, `.roo/`, `.roomodes`)

### 2. CLI Usability & Developer Ergonomics
Improve command-line workflows, flags, and outputs:
- **GFI-03**: [Add `--dry-run` to `ai-policy init`](03-init-dry-run.md)
- **GFI-04**: [Support `owner/repo` Shorthand in `ai-policy check`](04-check-github-shorthand.md)
- **GFI-08**: [Colorized Terminal Output with `NO_COLOR` Support](08-colorized-cli-output.md)
- **GFI-12**: [Add `--ignore-bots` Option to CLI and GitHub Action](12-ignore-bots-option.md)
- **GFI-15**: [Add `check-commit` Pre-Push Hook Subcommand](15-check-commit-prepush.md)

### 3. Documentation & Markdown Generation
Help repository maintainers communicate their policies cleanly:
- **GFI-05**: [Compact Markdown Policy Table Renderer](05-render-policy-table.md)
- **GFI-07**: [Academic & Open Research Policy Preset](07-academic-preset.md)
- **GFI-10**: [Shields.io Badge Generator `renderAiPolicyBadge`](10-readme-badge-generator.md)

### 4. Git & Compliance Engine Hardening
Enhance compliance parsing and diagnostic feedback:
- **GFI-09**: [RFC 5322 Multi-Line Trailer Continuation Folding](09-multiline-trailer-folding.md)
- **GFI-11**: [Enum Diagnostic Suggestions ("Did you mean ...?")](11-enum-diagnostics-remediation.md)
- **GFI-13**: [Actionable Guidance on Blank PR Descriptions](13-blank-pr-body-guidance.md)

### 5. IDE & Toolchain Integration
Make integrating `ai-policy-kit` into developer environments effortless:
- **GFI-06**: [Pre-Commit Hook Definition & Guide](06-pre-commit-hook.md)
- **GFI-14**: [VS Code & Cursor JSON Schema Integration](14-vscode-schema-integration.md)

---

## How to Claim and Work on an Issue

1. **Pick an Issue**: Choose an issue from the list above that matches your interest and skill level.
2. **Comment to Claim**: On GitHub, find the corresponding issue or open a comment: *"I would like to work on this issue!"* to avoid duplicate efforts.
3. **Follow the Issue Guide**: Open the corresponding `.md` file in `docs/good-first-issues/`. It contains the exact line numbers and steps to follow.
4. **Run Verification**: Ensure the exact test command passes:
   ```bash
   npm run build
   npm run typecheck
   npm test
   ```
5. **Submit your PR**: Open a Pull Request referencing the issue (e.g., `Fixes #X`) and follow the checklist in [CONTRIBUTING.md](../../CONTRIBUTING.md).

Happy hacking!
