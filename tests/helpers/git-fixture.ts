/**
 * Synthetic Git Repository Fixture for ai-policy-kit Testing.
 * 
 * Provides isolated, cross-platform temporary Git repositories with support for:
 * - Deterministic git initialization without global config dependencies.
 * - Commit synthesis with RFC-compliant and malformed git trailers.
 * - Multi-branch PR scenarios, fast-forward and non-fast-forward merges.
 * - AI assistant workspace leak simulation (Cursor, Claude, Gemini, Continue).
 * - Multi-stage Windows-hardened directory cleanup (recursive chmod + retry backoff).
 */

import { execFileSync, type ExecFileSyncOptions } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface CommitOptions {
  author?: string;
  email?: string;
  date?: string | Date;
  trailers?: Record<string, string> | Array<{ key: string; value: string }>;
  rawTrailersBlock?: string;
  allowEmpty?: boolean;
  signoff?: boolean;
}

export interface LeakOptions {
  path?: string;
  content?: string;
  staged?: boolean;
  committed?: boolean;
  commitMessage?: string;
}

export interface GitFixtureOptions {
  defaultBranch?: string;
  userName?: string;
  userEmail?: string;
  gpgSign?: boolean;
  autoCrlf?: boolean;
}

export interface PRScenarioOptions {
  baseBranch?: string;
  featureBranch?: string;
  policyConfig?: string | object;
  baseCommits?: Array<{
    message: string;
    files?: Record<string, string>;
  }>;
  featureCommits?: Array<{
    message: string;
    files?: Record<string, string>;
    trailers?: Record<string, string>;
    rawTrailersBlock?: string;
    leaks?: Array<'cursor' | 'claude' | 'gemini' | 'continue' | string>;
  }>;
}

/** Global registry of active fixtures for automatic test teardown */
const activeFixtures = new Set<GitFixture>();

export class GitFixture {
  public readonly repoDir: string;
  public readonly defaultBranch: string;
  private isDestroyed = false;

  constructor(repoDir: string, defaultBranch = 'main') {
    this.repoDir = repoDir;
    this.defaultBranch = defaultBranch;
    activeFixtures.add(this);
  }

  /**
   * Spawns git inside the fixture repository with sanitized environment variables.
   */
  public git(args: string[], options: ExecFileSyncOptions = {}): string {
    if (this.isDestroyed) {
      throw new Error(`Cannot run git command on destroyed fixture at ${this.repoDir}`);
    }

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: undefined,
      GIT_DIR: undefined,
      GIT_WORK_TREE: undefined,
      GIT_INDEX_FILE: undefined,
      GIT_OBJECT_DIRECTORY: undefined,
      GIT_ALTERNATE_OBJECT_DIRECTORIES: undefined,
      ...options.env,
    };

    if (args[0] === 'mv' && args.length >= 3) {
      const dest = args[args.length - 1]!;
      const fullDest = path.join(this.repoDir, dest);
      fs.mkdirSync(path.dirname(fullDest), { recursive: true });
    }

    return execFileSync('git', args, {
      cwd: this.repoDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options,
      env,
    });
  }

  /**
   * Initializes local git repo and establishes hermetic local configs.
   */
  public init(options: GitFixtureOptions = {}): void {
    const branch = options.defaultBranch || this.defaultBranch;
    this.git(['init', '-b', branch]);
    this.git(['symbolic-ref', 'HEAD', `refs/heads/${branch}`]);

    // Hermetic config overrides
    this.git(['config', 'user.name', options.userName || 'AI Policy Fixture']);
    this.git(['config', 'user.email', options.userEmail || 'fixture@aipolicykit.local']);
    this.git(['config', 'commit.gpgsign', options.gpgSign ? 'true' : 'false']);
    this.git(['config', 'core.autocrlf', options.autoCrlf ? 'true' : 'false']);
    this.git(['config', 'core.safecrlf', 'false']);
    this.git(['config', 'core.quotepath', 'false']);
  }

  /**
   * Checks whether repository has at least one commit.
   */
  public hasCommits(): boolean {
    try {
      this.git(['rev-parse', '--verify', 'HEAD']);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Checks whether HEAD is detached.
   */
  public isDetachedHead(): boolean {
    try {
      const branch = this.git(['branch', '--show-current']).trim();
      return branch === '';
    } catch {
      return true;
    }
  }

  /**
   * Retrieves the current branch name, supporting both unborn and active branches.
   */
  public getCurrentBranch(): string {
    try {
      const branch = this.git(['branch', '--show-current']).trim();
      if (branch) return branch;
    } catch (_) {}
    try {
      return this.git(['symbolic-ref', '--short', 'HEAD']).trim();
    } catch (_) {
      if (!this.hasCommits()) {
        return this.defaultBranch;
      }
      return '(detached HEAD)';
    }
  }

  /**
   * Writes a file to the fixture working tree. Creates parent directories as needed.
   */
  public writeFile(relativePath: string, content: string): void {
    const fullPath = path.join(this.repoDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  /**
   * Reads a file from the fixture working tree.
   */
  public readFile(relativePath: string): string {
    const fullPath = path.join(this.repoDir, relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
  }

  /**
   * Deletes a file from the fixture working tree.
   */
  public deleteFile(relativePath: string): void {
    const fullPath = path.join(this.repoDir, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  /**
   * Alias for deleteFile.
   */
  public removeFile(relativePath: string): void {
    this.deleteFile(relativePath);
  }

  /**
   * Checks if a file exists relative to the fixture root.
   */
  public exists(relativePath: string): boolean {
    return fs.existsSync(path.join(this.repoDir, relativePath));
  }

  /**
   * Stages files (`git add`).
   */
  public stage(paths: string | string[] = '.'): void {
    const targetPaths = Array.isArray(paths) ? paths : [paths];
    this.git(['add', ...targetPaths]);
  }

  /**
   * Creates a git commit with optional trailers, author, or signoff.
   */
  public commit(message: string, options: CommitOptions = {}): string {
    let commitMessage = message.trim();

    if (options.rawTrailersBlock) {
      // Append raw trailer block directly (allows simulating malformed trailers)
      commitMessage += '\n\n' + options.rawTrailersBlock;
    } else if (options.trailers) {
      const trailerEntries = Array.isArray(options.trailers)
        ? options.trailers.map((t) => `${t.key}: ${t.value}`)
        : Object.entries(options.trailers).map(([k, v]) => `${k}: ${v}`);

      if (trailerEntries.length > 0) {
        commitMessage += '\n\n' + trailerEntries.join('\n') + '\n';
      }
    }

    const args: string[] = ['commit', '-m', commitMessage];

    // Auto-stage pending untracked/unstaged changes if nothing is currently staged
    try {
      const staged = this.git(['diff', '--name-only', '--cached']).trim();
      const status = this.git(['status', '--porcelain']).trim();
      if (!staged && status) {
        this.git(['add', '-A']);
      }
    } catch (_) {}

    if (options.allowEmpty) {
      args.push('--allow-empty');
    }
    if (options.signoff) {
      args.push('--signoff');
    }
    if (options.author) {
      const email = options.email || 'fixture@aipolicykit.local';
      args.push(`--author=${options.author} <${email}>`);
    }
    if (options.date) {
      const dateStr = options.date instanceof Date ? options.date.toISOString() : options.date;
      args.push(`--date=${dateStr}`);
    }

    this.git(args);
    return this.git(['rev-parse', 'HEAD']).trim();
  }

  /**
   * Switches or creates branches, supporting unborn repos.
   */
  public checkout(branchName: string, options: { create?: boolean } = {}): void {
    const currentBranch = this.getCurrentBranch();
    if (currentBranch === branchName && !options.create) {
      return;
    }

    if (!this.hasCommits()) {
      this.git(['symbolic-ref', 'HEAD', `refs/heads/${branchName}`]);
      return;
    }

    if (options.create) {
      this.git(['checkout', '-b', branchName]);
    } else {
      this.git(['checkout', branchName]);
    }
  }

  /**
   * Merges another branch into current branch.
   */
  public merge(branchName: string, options: { noFf?: boolean; message?: string } = {}): void {
    const args = ['merge', branchName];
    if (options.noFf) args.push('--no-ff');
    if (options.message) args.push('-m', options.message);
    this.git(args);
  }

  /**
   * Creates lightweight or annotated tags.
   */
  public tag(tagName: string, options: { annotated?: boolean; message?: string } = {}): void {
    const args = ['tag'];
    if (options.annotated) {
      args.push('-a', tagName, '-m', options.message || tagName);
    } else {
      args.push(tagName);
    }
    this.git(args);
  }

  /**
   * Writes an ai-policy.yml configuration to the repository.
   */
  public writePolicy(policy: string | object, location = '.github/ai-policy.yml'): string {
    const content = typeof policy === 'string' ? policy : JSON.stringify(policy, null, 2);
    this.writeFile(location, content);
    return location;
  }

  /**
   * Simulates an accidental AI assistant workspace leak.
   */
  public createLeak(
    toolOrPath: 'cursor' | 'claude' | 'gemini' | 'continue' | string,
    options: LeakOptions = {}
  ): string {
    const standardLeakPaths: Record<string, string> = {
      cursor: '.cursor/rules/custom-instructions.mdc',
      claude: '.claude/config.json',
      gemini: '.gemini/settings.json',
      continue: '.continue/config.json',
    };

    const relativePath = options.path || standardLeakPaths[toolOrPath] || `.${toolOrPath}/settings.json`;
    const defaultContent = JSON.stringify({ leak: true, timestamp: Date.now() }, null, 2);
    const content = options.content ?? defaultContent;

    this.writeFile(relativePath, content);

    if (options.staged || options.committed) {
      this.stage(relativePath);
    }
    if (options.committed) {
      this.commit(options.commitMessage || `leak(${toolOrPath}): accidental commit of ${relativePath}`);
    }

    return relativePath;
  }

  /**
   * Returns list of changed files between two refs or staged changes.
   */
  public getDiff(baseRef?: string, headRef?: string, options: { nameOnly?: boolean; cached?: boolean } = {}): string {
    const args = ['diff'];
    if (options.nameOnly !== false) args.push('--name-only');
    if (options.cached) args.push('--cached');
    if (baseRef && headRef) {
      args.push(`${baseRef}...${headRef}`);
    } else if (baseRef) {
      args.push(baseRef);
    }
    return this.git(args).trim();
  }

  /**
   * Retrieves extracted commit trailer value for a given commit.
   */
  public getTrailerValue(commitRef = 'HEAD', trailerKey = 'AI-Assisted'): string {
    return this.git(['log', '-1', commitRef, `--format=%(trailers:key=${trailerKey},valueonly=true)`]).trim();
  }

  /**
   * Cleans up the temporary fixture directory with Windows-hardened chmod and retry loop.
   */
  public async cleanup(): Promise<void> {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    activeFixtures.delete(this);

    await removeDirRobust(this.repoDir);
  }

  /**
   * Synchronous cleanup for test suites requiring sync teardown.
   */
  public cleanupSync(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    activeFixtures.delete(this);

    removeDirRobustSync(this.repoDir);
  }
}

/**
 * Robust directory removal with recursive chmod to strip read-only attributes
 * and exponential backoff retry to handle Windows file locking.
 */
async function removeDirRobust(dirPath: string, maxRetries = 5, baseDelayMs = 50): Promise<void> {
  if (!fs.existsSync(dirPath)) return;

  const resetPermissions = (targetPath: string) => {
    try {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        for (const child of fs.readdirSync(targetPath)) {
          resetPermissions(path.join(targetPath, child));
        }
        fs.chmodSync(targetPath, 0o777);
      } else {
        fs.chmodSync(targetPath, 0o666);
      }
    } catch (_) {
      // Best-effort permission reset
    }
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await fs.promises.rm(dirPath, { recursive: true, force: true, maxRetries: 2, retryDelay: 25 });
      return;
    } catch (err: any) {
      if (err.code === 'ENOENT') return;
      resetPermissions(dirPath);

      if (attempt === maxRetries) {
        try {
          await fs.promises.rm(dirPath, { recursive: true, force: true });
          return;
        } catch (finalErr: any) {
          console.warn(`[git-fixture] Non-fatal: cleanup of ${dirPath} encountered Windows lock: ${finalErr.message}`);
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * Math.pow(2, attempt - 1)));
    }
  }
}

function removeDirRobustSync(dirPath: string, maxRetries = 4): void {
  if (!fs.existsSync(dirPath)) return;

  const resetPermissions = (targetPath: string) => {
    try {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        for (const child of fs.readdirSync(targetPath)) {
          resetPermissions(path.join(targetPath, child));
        }
        fs.chmodSync(targetPath, 0o777);
      } else {
        fs.chmodSync(targetPath, 0o666);
      }
    } catch (_) {}
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 2, retryDelay: 25 });
      return;
    } catch (err: any) {
      if (err.code === 'ENOENT') return;
      resetPermissions(dirPath);
      if (attempt === maxRetries) {
        try {
          fs.rmSync(dirPath, { recursive: true, force: true });
        } catch (_) {}
      }
    }
  }
}

/**
 * Creates an isolated Git repository fixture.
 */
export async function createGitFixture(
  setupFn?: (fixture: GitFixture) => Promise<void> | void,
  options: GitFixtureOptions = {}
): Promise<GitFixture> {
  const tmpBase = fs.realpathSync(os.tmpdir());
  const repoDir = path.join(tmpBase, `aipk-fixture-${crypto.randomUUID()}`);
  fs.mkdirSync(repoDir, { recursive: true });

  const fixture = new GitFixture(repoDir, options.defaultBranch || 'main');
  fixture.init(options);

  if (setupFn) {
    await setupFn(fixture);
  }

  return fixture;
}

/**
 * Scoped fixture runner: executes test block with a fresh fixture and guarantees cleanup.
 */
export async function withGitFixture<T>(
  fn: (fixture: GitFixture) => Promise<T>,
  options: GitFixtureOptions = {}
): Promise<T> {
  const fixture = await createGitFixture(undefined, options);
  try {
    return await fn(fixture);
  } finally {
    await fixture.cleanup();
  }
}

/**
 * High-level helper for constructing pull request testing scenarios.
 */
export async function setupPRScenario(
  fixture: GitFixture,
  options: PRScenarioOptions
): Promise<{ baseRef: string; headRef: string }> {
  const baseBranch = options.baseBranch || 'main';
  const featureBranch = options.featureBranch || 'feature/ai-contribution';

  // 1. Setup base branch
  fixture.checkout(baseBranch);
  if (options.policyConfig) {
    fixture.writePolicy(options.policyConfig);
    fixture.stage('.github/ai-policy.yml');
    fixture.commit('chore(policy): configure ai contribution policy');
  }

  if (options.baseCommits) {
    for (const bc of options.baseCommits) {
      if (bc.files) {
        for (const [p, c] of Object.entries(bc.files)) {
          fixture.writeFile(p, c);
          fixture.stage(p);
        }
      }
      fixture.commit(bc.message);
    }
  }

  // Ensure base branch has at least an initial commit if no policy or base commits were specified
  if (!fixture.hasCommits()) {
    fixture.writeFile('README.md', '# Repository\n');
    fixture.stage('README.md');
    fixture.commit('chore: initial repository commit');
  }

  // 2. Setup feature branch
  fixture.checkout(featureBranch, { create: true });

  if (options.featureCommits) {
    for (const fc of options.featureCommits) {
      if (fc.files) {
        for (const [p, c] of Object.entries(fc.files)) {
          fixture.writeFile(p, c);
          fixture.stage(p);
        }
      }

      if (fc.leaks) {
        for (const leak of fc.leaks) {
          fixture.createLeak(leak, { staged: true });
        }
      }

      fixture.commit(fc.message, {
        trailers: fc.trailers,
        rawTrailersBlock: fc.rawTrailersBlock,
        allowEmpty: true,
      });
    }
  }

  return { baseRef: baseBranch, headRef: featureBranch };
}

/**
 * Cleans up all active fixtures. Useful in Vitest `afterAll()` hooks.
 */
export async function cleanupAllFixtures(): Promise<void> {
  const fixtures = Array.from(activeFixtures);
  for (const fix of fixtures) {
    await fix.cleanup();
  }
}
