# Contributing to ai-policy-kit

Thank you for your interest in contributing to `ai-policy-kit`! We are building open-source tooling for deterministic AI policy validation and compliance across Git workflows and CI pipelines.

Please take a few moments to review this guide before getting started.

---

## Code of Conduct

All contributors, maintainers, and community members are expected to uphold the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). Please report any violations to `thanhtrieunguyen@proton.me`.

---

## Where to Start: Good First Issues

If you are new to the repository or looking for a bite-sized contribution:
- Browse our catalog of **[15 Good First Issues](docs/good-first-issues/INDEX.md)**.
- Filter issues on GitHub labeled with [`good-first-issue`](https://github.com/thanhtrieunguyen/ai-policy-kit/issues?q=is%3Aissue+is%3Aopen+label%3Agood-first-issue).
- Each Good First Issue includes the problem context, exact files and line numbers, step-by-step implementation instructions, and automated test commands.
- Please comment on an issue before starting work to avoid duplicate efforts.

---

## Development Prerequisites

Before contributing, ensure your environment meets these requirements:

- **Node.js**: `>= 20.0.0` (Node 20 LTS or Node 22 recommended)
- **Package Manager**: `npm >= 10.0.0` or `pnpm >= 9.0.0`
- **Git**: `>= 2.30.0`
- **OS**: Linux, macOS, or Windows 10/11 (PowerShell / WSL / Git Bash)
  *(Note on Windows: if PowerShell restricts running scripts, execute via `cmd /c npm <command>`)*

---

## Local Setup & Development Commands

1. **Clone the repository:**
   ```bash
   git clone https://github.com/thanhtrieunguyen/ai-policy-kit.git
   cd ai-policy-kit
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build distribution bundles:**
   ```bash
   npm run build
   ```
   *Compiles TypeScript to ESM bundles via `tsup` into `dist/index.js`, `dist/cli.js`, and `dist/action.js`.*

4. **Run TypeScript type checks:**
   ```bash
   npm run typecheck
   ```
   *Executes `tsc --noEmit` across all modules in strict mode.*

5. **Run the test suite:**
   ```bash
   npm test
   ```
   *Runs unit and integration tests using Vitest.*

   To run a specific test file:
   ```bash
   npm test -- tests/engine.test.ts
   ```

---

## Codebase Architecture & Directory Map

`ai-policy-kit` is organized modularly in TypeScript with NodeNext module resolution:

```
ai-policy-kit/
├── src/
│   ├── index.ts           # Public API barrel export
│   ├── types.ts           # Core TypeScript types & interface declarations
│   ├── constants.ts       # Shared constants, exit codes, and banners
│   ├── schema/            # JSON Schema v0.1 definitions & diagnostic mappings
│   │   ├── validator.ts   # Ajv schema compilation and validation
│   │   └── diagnostics.ts # Line-accurate CST error mapping & remediations
│   ├── engine/            # Configuration discovery and parsing
│   │   ├── finder.ts      # Discovery for ai-policy.yml / .github/ai-policy.yml
│   │   └── parser.ts      # YAML/JSON parser with BOM-stripping & error locations
│   ├── git/               # Git integration & security inspection
│   │   ├── diff.ts        # Git diff analysis & changed file enumeration
│   │   ├── trailers.ts    # RFC 5322 commit message trailer parsing
│   │   └── leaks.ts       # AI assistant workspace leak detection (.cursor/, etc.)
│   ├── cli/               # Command-line interface commands
│   │   ├── index.ts       # CLI entry point routing
│   │   ├── init.ts        # 'ai-policy init' interactive & preset bootstrapping
│   │   ├── check.ts       # 'ai-policy check' schema & policy verification
│   │   └── lint-pr.ts     # 'ai-policy lint-pr' pull request compliance linter
│   ├── action/            # GitHub Action runner
│   │   ├── index.ts       # Action runner entry point
│   │   └── summary.ts     # Step summary table & output generator
│   └── templates/         # Preset definitions & markdown generators
│       ├── markdown.ts    # AI_POLICY.md & AGENTS.md document generation
│       └── pr-checklist.ts# PR checklist snippet generator
├── presets/               # Built-in policy presets (strict, balanced, permissive)
├── schema/                # Canonical JSON Schema Draft-07 (v0.1)
├── docs/                  # Documentation, threat models, guides & GFIs
│   └── good-first-issues/ # 15 guided beginner-friendly issues
└── tests/                 # Vitest test suite and hermetic git fixtures
```

---

## Coding Standards & Conventions

1. **TypeScript Strictness**:
   - `strict: true` and `noUncheckedIndexedAccess: true`.
   - NodeNext ESM imports: all relative imports must include the explicit `.js` extension (e.g., `import { loadPolicySync } from './parser.js';`).
2. **Determinism**:
   - `ai-policy-kit` is a **deterministic validator**, NOT a probabilistic AI text/code detector. We never evaluate statistical token probabilities or guess author identities.
3. **No External Network Dependencies in Core**:
   - Schema validation and git inspection run hermetically without external HTTP calls (except optional remote repository fetching in `check`).

---

## Commit Message Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature or capability
- `fix:` A bug fix
- `docs:` Documentation changes only
- `refactor:` Code changes that neither fix a bug nor add a feature
- `test:` Adding or improving tests
- `chore:` Changes to build process, dependencies, or toolchains

### AI Usage Disclosure in Commits

Per this repository's own AI policy (`.github/ai-policy.yml`), if you used an AI coding assistant (Claude, Cursor, Copilot, ChatGPT, etc.) to help write or refine code, please append the `AI-Assisted` trailer to your commit message:

```
feat(cli): add dry-run flag to init subcommand

AI-Assisted: Claude 3.5 Sonnet
```

---

## Pull Request Guidelines

1. **Create a topic branch:**
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. **Ensure all verification steps pass locally:**
   ```bash
   npm run build
   npm run typecheck
   npm test
   ```
3. **Open a Pull Request:**
   - Complete all sections of the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
   - Reference the related issue (e.g. `Fixes #42`).
   - Fill out the AI Contribution Disclosure checklist.
   - Ensure no private AI workspace directories (`.cursor/`, `.claude/`, `.gemini/`, etc.) are included in the PR diff.
4. **Code Review:**
   - Maintainers will review your PR and provide constructive feedback.
   - All CI checks must pass before merging.

Thank you for helping make open-source AI policy transparent, deterministic, and safe!
