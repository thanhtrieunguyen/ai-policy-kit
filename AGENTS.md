# AI Agent Directives & Repository Rules (AGENTS.md)

This repository enforces deterministic compliance validation using `ai-policy-kit`.
All autonomous agents, coding assistants (Cursor, Claude Code, GitHub Copilot, Codex, Gemini), and contributors must adhere to the following rules:

## 1. Accidental Workspace Leak Prevention (STRICT PROHIBITION)
Do NOT stage or commit any internal AI assistant workspace configurations or temporary directories:
- `.cursor/` (including `.cursor/rules/`, `.cursorrules`)
- `.claude/`
- `.gemini/`
- `.continue/`
- `.copilot/`
- `aider*`
- `.agents/memory/`

## 2. Commit Trailer Disclosure
When authoring commits assisted by AI:
- Key: `AI-Assisted` (Optional)
- Regex pattern requirement: `^AI-Assisted: .+$`
- Expected format: `AI-Assisted: <ToolName> [Model/Version]`
Example:
```
feat(auth): add OAuth2 token verification

AI-Assisted: Claude 3.5 Sonnet
```

## 3. Human Review & Accountability
- AI models have no legal personality and cannot execute DCO or CLA agreements.
- The human committer assumes 100% legal and technical responsibility for all submitted changes.

---
*ai-policy is a deterministic policy compliance validator, NOT an AI text/code detector.*
