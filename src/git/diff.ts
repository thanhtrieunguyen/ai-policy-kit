import { execFileSync } from 'node:child_process';
import { resolveSafeGitRef } from './trailers.js';

export type FileChangeStatus =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'type_changed'
  | 'unknown';

export interface ChangedFile {
  path: string;
  oldPath?: string;
  status: FileChangeStatus;
  statusCode: string;
}

export interface DiffResult {
  files: ChangedFile[];
  added: ChangedFile[];
  modified: ChangedFile[];
  deleted: ChangedFile[];
  renamed: ChangedFile[];
  isEmpty: boolean;
}

/**
 * Normalizes repository-relative paths to POSIX slashes and removes leading dot-slashes.
 */
export function normalizeRepoPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

/**
 * Inspects changed files using git diff -z with safe array arguments (shell: false).
 */
export function getChangedFiles(
  baseRef?: string,
  headRef?: string,
  options: { cwd?: string; cached?: boolean } = {}
): DiffResult {
  const args = ['diff', '--name-status', '-z'];

  if (options.cached) {
    args.push('--cached');
  }

  const safeBase = baseRef ? resolveSafeGitRef(baseRef, options.cwd) : undefined;
  const safeHead = headRef ? resolveSafeGitRef(headRef, options.cwd) : undefined;

  if (safeBase && safeHead) {
    if (safeBase === safeHead) {
      return { files: [], added: [], modified: [], deleted: [], renamed: [], isEmpty: true };
    }
    args.push(`${safeBase}...${safeHead}`);
  } else if (safeBase) {
    args.push(safeBase);
  }

  args.push('--');

  let rawOutput = '';
  try {
    rawOutput = execFileSync('git', args, {
      cwd: options.cwd || process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });
  } catch (err: any) {
    throw new Error(`Git diff execution failed: ${err.stderr || err.message}`);
  }

  const tokens = rawOutput.split('\0');
  if (tokens.length > 0 && tokens[tokens.length - 1] === '') {
    tokens.pop();
  }

  const files: ChangedFile[] = [];
  let i = 0;

  while (i < tokens.length) {
    const statusToken = tokens[i]!;
    if (!statusToken) {
      i++;
      continue;
    }
    const code = statusToken[0]!.toUpperCase();
    i++;

    if (code === 'R' || code === 'C') {
      const oldPath = normalizeRepoPath(tokens[i++] || '');
      const newPath = normalizeRepoPath(tokens[i++] || '');
      files.push({
        path: newPath,
        oldPath,
        status: code === 'R' ? 'renamed' : 'copied',
        statusCode: statusToken,
      });
    } else {
      const filePath = normalizeRepoPath(tokens[i++] || '');
      let status: FileChangeStatus = 'unknown';
      if (code === 'A') status = 'added';
      else if (code === 'M') status = 'modified';
      else if (code === 'D') status = 'deleted';
      else if (code === 'T') status = 'type_changed';

      files.push({
        path: filePath,
        status,
        statusCode: statusToken,
      });
    }
  }

  return {
    files,
    added: files.filter((f) => f.status === 'added' || f.status === 'copied'),
    modified: files.filter((f) => f.status === 'modified' || f.status === 'renamed'),
    deleted: files.filter((f) => f.status === 'deleted'),
    renamed: files.filter((f) => f.status === 'renamed'),
    isEmpty: files.length === 0,
  };
}
