import type { AIPolicyConfig } from '../types.js';
import { DISCLAIMER } from '../constants.js';

/**
 * Renders a human-readable AI Contribution Policy (AI_POLICY.md).
 */
export function renderAiPolicyMarkdown(config: AIPolicyConfig): string {
  const version = config.version || '0.1';
  const level = config.level || 'restricted';
  const categories = config.categories || { code: 'restricted' };
  const disclosure = config.disclosure || { required: true };
  const accountability = config.accountability || { author_takes_responsibility: true };
  const bots = config.bots || { automated_prs: 'restricted' };

  const methodsList = Array.isArray(disclosure.methods) && disclosure.methods.length > 0
    ? disclosure.methods.join(', ')
    : 'None';

  let trailerSection = '';
  if (disclosure.commit_trailer) {
    const key = disclosure.commit_trailer.key || 'AI-Assisted';
    const req = disclosure.commit_trailer.required ? 'true' : 'false';
    const pattern = disclosure.commit_trailer.pattern || 'None';
    trailerSection = `
- **Commit Trailer**:
  - Key: \`${key}\`
  - Required: ${req}
  - Pattern: \`${pattern}\``;
  }

  const botList = Array.isArray(bots.bot_allowlist) && bots.bot_allowlist.length > 0
    ? bots.bot_allowlist.join(', ')
    : 'None';

  return `# AI Contribution Policy

> Version: ${version} | Policy Level: ${level}

## 1. Overview & Posture
This repository adopts a **${level}** contribution policy regarding Artificial Intelligence (AI) and Large Language Model (LLM) tools.

## 2. Granular Category Permissions
- **Code**: \`${categories.code}\`
- **Documentation**: \`${categories.docs || 'permissive'}\`
- **Tests**: \`${categories.tests || 'restricted'}\`
- **Reviews**: \`${categories.reviews || 'restricted'}\`
- **Issues**: \`${categories.issues || 'restricted'}\`

## 3. Disclosure Requirements
- **Disclosure Required**: ${disclosure.required ? 'true' : 'false'}
- **Accepted Methods**: ${methodsList}${trailerSection}
- **Tool Name Required**: ${disclosure.tool_name_required ? 'true' : 'false'}
- **Prompt Disclosure**: \`${disclosure.prompt_disclosure || 'optional'}\`

## 4. Contributor Accountability & Warranties
- **Author Understands Code**: ${accountability.author_understands_code ? 'true' : 'false'}
- **Author Takes 100% Responsibility**: ${accountability.author_takes_responsibility ? 'true' : 'false'}
- **DCO Signoff Required**: ${accountability.dco_signoff ? 'true' : 'false'}

## 5. Automated Bots & Agent Rules
- **Automated PRs**: \`${bots.automated_prs}\`
- **Automated Reviews**: \`${bots.automated_reviews || 'restricted'}\`
- **Automated Issues**: \`${bots.automated_issues || 'restricted'}\`
- **Allowed Bots**: ${botList}

---
*${DISCLAIMER}*
`;
}

/**
 * Renders repository directives for coding agents and AI tools (AGENTS.md).
 */
export function renderAgentsMarkdown(config: AIPolicyConfig): string {
  const trailerKey = config.disclosure?.commit_trailer?.key || 'AI-Assisted';
  const trailerRequired = config.disclosure?.commit_trailer?.required ? 'Required' : 'Optional';
  const trailerPattern = config.disclosure?.commit_trailer?.pattern;

  let patternNote = '';
  if (trailerPattern) {
    patternNote = `\n- Regex pattern requirement: \`${trailerPattern}\``;
  }

  return `# AI Agent Directives & Repository Rules (AGENTS.md)

This repository enforces deterministic compliance validation using \`ai-policy-kit\`.
All autonomous agents, coding assistants (Cursor, Claude Code, GitHub Copilot, Codex, Gemini), and contributors must adhere to the following rules:

## 1. Accidental Workspace Leak Prevention (STRICT PROHIBITION)
Do NOT stage or commit any internal AI assistant workspace configurations or temporary directories:
- \`.cursor/\` (including \`.cursor/rules/\`, \`.cursorrules\`)
- \`.claude/\`
- \`.gemini/\`
- \`.continue/\`
- \`.copilot/\`
- \`aider*\`
- \`.agents/memory/\`

## 2. Commit Trailer Disclosure
When authoring commits assisted by AI:
- Key: \`${trailerKey}\` (${trailerRequired})${patternNote}
- Expected format: \`${trailerKey}: <ToolName> [Model/Version]\`
Example:
\`\`\`
feat(auth): add OAuth2 token verification

${trailerKey}: Claude 3.5 Sonnet
\`\`\`

## 3. Human Review & Accountability
- AI models have no legal personality and cannot execute DCO or CLA agreements.
- The human committer assumes 100% legal and technical responsibility for all submitted changes.

---
*${DISCLAIMER}*
`;
}
