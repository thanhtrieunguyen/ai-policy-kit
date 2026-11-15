import type { ChangedFile } from './diff.js';

export interface WorkspaceLeak {
  file: string;
  path: string;
  tool: string;
  status: 'added' | 'modified';
  description: string;
  rule: string;
}

export interface ForbiddenLeakRule {
  tool: string;
  regex: RegExp;
  description: string;
}

export const FORBIDDEN_LEAK_RULES: readonly ForbiddenLeakRule[] = [
  {
    tool: 'claude',
    regex: /(^|\/)\.claude(\/|$)/i,
    description: 'Internal Claude assistant workspace or configuration directory',
  },
  {
    tool: 'cursor',
    regex: /(^|\/)\.cursor(\/|$)/i,
    description: 'Internal Cursor editor rules or project configuration directory',
  },
  {
    tool: 'cursor',
    regex: /(^|\/)\.cursorrules$/i,
    description: 'Internal Cursor rules legacy configuration file',
  },
  {
    tool: 'gemini',
    regex: /(^|\/)\.gemini(\/|$)/i,
    description: 'Internal Gemini assistant configuration directory',
  },
  {
    tool: 'continue',
    regex: /(^|\/)\.continue(\/|$)/i,
    description: 'Continue.dev local assistant configuration directory',
  },
  {
    tool: 'copilot',
    regex: /(^|\/)\.copilot(\/|$)/i,
    description: 'GitHub Copilot local workspace configuration directory',
  },
  {
    tool: 'aider',
    regex: /(^|\/)\.?aider(\.|\/|$)/i,
    description: 'Aider AI assistant chat history or configuration file',
  },
  {
    tool: 'agents_memory',
    regex: /(^|\/)\.agents\/memory(\/|$)/i,
    description: 'Internal cross-agent shared memory repository',
  },
] as const;

/**
 * Checks whether a repository-relative path matches an AI assistant workspace leak pattern.
 */
export function checkLeakPath(normalizedPath: string): {
  isLeak: boolean;
  tool?: string;
  description?: string;
} {
  for (const rule of FORBIDDEN_LEAK_RULES) {
    if (rule.regex.test(normalizedPath)) {
      return { isLeak: true, tool: rule.tool, description: rule.description };
    }
  }
  return { isLeak: false };
}

/**
 * Detects workspace leaks from changed files.
 * Rule: Deletions (status === 'deleted') are permitted cleanup and are NOT flagged.
 */
export function detectWorkspaceLeaks(changedFiles: ChangedFile[]): WorkspaceLeak[] {
  const leaks: WorkspaceLeak[] = [];

  for (const file of changedFiles) {
    // Permitted cleanup: deletions are allowed
    if (file.status === 'deleted') {
      continue;
    }

    const check = checkLeakPath(file.path);
    if (check.isLeak) {
      leaks.push({
        file: file.path,
        path: file.path,
        tool: check.tool!,
        status: file.status === 'added' ? 'added' : 'modified',
        description: check.description!,
        rule: `forbidden-ai-workspace-leak:${check.tool}`,
      });
    }
  }

  return leaks;
}
