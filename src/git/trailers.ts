import { execFileSync } from 'node:child_process';

export interface GitTrailer {
  key: string;
  value: string;
  raw: string;
}

export interface CommitInfo {
  sha: string;
  authorName: string;
  authorEmail: string;
  parents: string[];
  isMerge: boolean;
  subject: string;
  body: string;
  trailers: GitTrailer[];
}

/**
 * Normalizes CRLF and LF line terminators to LF.
 */
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Pure TypeScript RFC 5322 Git commit trailer parser.
 * Works on raw commit message strings, git log output, and PR descriptions.
 */
export function parseTrailers(commitMessage: string): GitTrailer[] {
  const normalized = normalizeLineEndings(commitMessage);
  const lines = normalized.split('\n');

  // 1. Trim trailing blank lines
  let endIdx = lines.length - 1;
  while (endIdx >= 0 && lines[endIdx]!.trim() === '') {
    endIdx--;
  }
  if (endIdx < 0) return [];

  // 2. Locate beginning of last paragraph
  let startIdx = endIdx;
  while (startIdx >= 0 && lines[startIdx]!.trim() !== '') {
    startIdx--;
  }
  startIdx++; // first line of the last paragraph

  const paragraphLines = lines.slice(startIdx, endIdx + 1);
  const trailerKeyRegex = /^[A-Za-z0-9][A-Za-z0-9-_]*$/;

  // 3. Scan from bottom up (Git interpret-trailers convention)
  let i = paragraphLines.length - 1;
  const collectedLines: string[] = [];

  while (i >= 0) {
    const line = paragraphLines[i]!;
    if (line.startsWith(' ') || line.startsWith('\t')) {
      // Continuation line (RFC 5322 folding)
      collectedLines.unshift(line);
      i--;
    } else {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const potentialKey = line.slice(0, colonIdx);
        if (trailerKeyRegex.test(potentialKey)) {
          collectedLines.unshift(line);
          i--;
          continue;
        }
      }
      break;
    }
  }

  // 4. Assemble trailers
  const trailers: GitTrailer[] = [];
  let current: GitTrailer | null = null;

  for (const line of collectedLines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (current) {
        current.value += ' ' + line.trim();
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

  return trailers;
}

/**
 * Validates whether a trailer matches configured regex pattern.
 * Supports patterns that match the full trailer line (`AI-Assisted: ...`) or the value.
 */
export function matchesTrailerPattern(key: string, value: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern);
    const regexInsensitive = new RegExp(pattern, 'i');
    const fullLine = `${key}: ${value}`;
    return (
      regex.test(fullLine) ||
      regex.test(value) ||
      regexInsensitive.test(fullLine) ||
      regexInsensitive.test(value)
    );
  } catch {
    return false;
  }
}

/**
 * Resolves a git ref safely, handling cases where relative tilde notation
 * (e.g. main~2) exceeds available repository commit depth.
 */
export function resolveSafeGitRef(ref: string, cwd?: string): string {
  try {
    execFileSync('git', ['rev-parse', '--verify', ref], {
      cwd: cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });
    return ref;
  } catch {
    const tildeMatch = ref.match(/^(.*)~(\d+)$/);
    if (tildeMatch) {
      const base = tildeMatch[1]!;
      const count = parseInt(tildeMatch[2]!, 10);
      for (let n = count - 1; n >= 1; n--) {
        try {
          execFileSync('git', ['rev-parse', '--verify', `${base}~${n}`], {
            cwd: cwd || process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
          });
          return `${base}~${n}`;
        } catch {}
      }
      try {
        const root = execFileSync('git', ['rev-list', '--max-parents=0', 'HEAD'], {
          cwd: cwd || process.cwd(),
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false,
        })
          .trim()
          .split(/\s+/)[0];
        if (root) return root;
      } catch {}
    }
    return ref;
  }
}

/**
 * Retrieves commits in revision range using safe, collision-free null/unit delimiters.
 */
export function getCommitsInRange(
  baseRef: string,
  headRef: string,
  options: { cwd?: string } = {}
): CommitInfo[] {
  const safeBaseRef = resolveSafeGitRef(baseRef, options.cwd);
  const safeHeadRef = resolveSafeGitRef(headRef, options.cwd);

  if (safeBaseRef === safeHeadRef) {
    return [];
  }

  const args = [
    'log',
    '--format=%H%x1f%an%x1f%ae%x1f%P%x1f%s%x1f%B%x1e',
    `${safeBaseRef}..${safeHeadRef}`,
    '--',
  ];

  let rawLog = '';
  try {
    rawLog = execFileSync('git', args, {
      cwd: options.cwd || process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });
  } catch (err: any) {
    if (err.status !== 0) {
      throw new Error(`Failed to query git log between ${baseRef} and ${headRef}: ${err.stderr || err.message}`);
    }
    return [];
  }

  const commitBlocks = rawLog.split('\x1e').filter((b) => b.trim().length > 0);
  const commits: CommitInfo[] = [];

  for (const block of commitBlocks) {
    const fields = block.split('\x1f');
    if (fields.length < 6) continue;

    const sha = fields[0]!.trim();
    const authorName = fields[1]!.trim();
    const authorEmail = fields[2]!.trim();
    const parentHashes = fields[3]!.trim();
    const subject = fields[4]!.trim();
    const body = fields[5] || '';

    const parents = parentHashes ? parentHashes.split(/\s+/) : [];
    const isMerge = parents.length > 1;
    const trailers = parseTrailers(body);

    commits.push({
      sha,
      authorName,
      authorEmail,
      parents,
      isMerge,
      subject,
      body,
      trailers,
    });
  }

  return commits;
}
