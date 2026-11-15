/**
 * E2E CLI and GitHub Action Invocation Harness for ai-policy-kit.
 * 
 * Provides robust child-process execution utilities, output normalization,
 * GitHub Action environment emulation, Step Summary parsing, and
 * assertions for E2E testing suites.
 */

import { execFile, execFileSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, '../..');
export const DIST_CLI_PATH = path.join(REPO_ROOT, 'dist', 'cli.js');
export const SRC_CLI_PATH = path.join(REPO_ROOT, 'src', 'cli', 'index.ts');
export const DIST_ACTION_PATH = path.join(REPO_ROOT, 'dist', 'action.js');
export const SRC_ACTION_PATH = path.join(REPO_ROOT, 'src', 'action', 'index.ts');

export const MANDATORY_DISCLAIMER =
  'ai-policy is a deterministic policy compliance validator, NOT an AI text/code detector.';

const ANSI_REGEX =
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

export interface RunCliOptions {
  /** Working directory to execute the CLI in (e.g. synthetic git fixture directory) */
  cwd?: string;
  /** Environment variables to merge with process.env */
  env?: Record<string, string | undefined>;
  /** Stdin input string to pipe to the process */
  input?: string;
  /** Execution timeout in milliseconds (default: 30,000ms) */
  timeout?: number;
  /** Max buffer size for stdout/stderr in bytes (default: 10 * 1024 * 1024 = 10MB) */
  maxBuffer?: number;
  /** Whether to reject/throw if exit code is non-zero (default: false) */
  rejectOnError?: boolean;
  /** Prefer built artifact dist/cli.js over src/cli/index.ts (default: true) */
  preferDist?: boolean;
  /** Explicit CLI entrypoint override path (optional) */
  cliPath?: string;
}

export interface CliResult {
  /** Exit code returned by CLI (0 = success, 1 = policy violation, 2 = operational/syntax error) */
  exitCode: number;
  /** Normalized stdout (CRLF converted to LF, ANSI escape sequences stripped) */
  stdout: string;
  /** Normalized stderr (CRLF converted to LF, ANSI escape sequences stripped) */
  stderr: string;
  /** Raw unprocessed stdout from process */
  rawStdout: string;
  /** Raw unprocessed stderr from process */
  rawStderr: string;
  /** Automatically parsed JSON payload if output is valid JSON, otherwise undefined */
  json?: any;
  /** Parse error if JSON parsing was attempted and failed */
  jsonError?: Error;
  /** True if exitCode === 0 */
  isSuccess: boolean;
  /** Command string that was executed */
  command: string;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Helper to safely parse stdout as JSON with custom type */
  parseJson<T = any>(): T;
}

export interface RunActionOptions {
  /** GitHub Action inputs corresponding to action.yml with: entries */
  inputs?: Record<string, string | boolean | number>;
  /** Working directory (defaults to process.cwd() or git fixture root) */
  cwd?: string;
  /** Simulated GitHub context properties */
  githubContext?: {
    workspace?: string;
    action?: string;
    actor?: string;
    repository?: string;
    eventName?: string;
    eventPath?: string;
    sha?: string;
    ref?: string;
    baseRef?: string;
    headRef?: string;
  };
  /** Additional custom environment variables */
  env?: Record<string, string | undefined>;
  /** Execution timeout in milliseconds (default: 30,000ms) */
  timeout?: number;
  /** Prefer dist/action.js over src/action/index.ts (default: true) */
  preferDist?: boolean;
  /** Explicit action entrypoint override path (optional) */
  actionPath?: string;
}

export interface ActionResult {
  /** Exit code returned by Action runner (0 = success, 1 = failure) */
  exitCode: number;
  /** Normalized stdout */
  stdout: string;
  /** Normalized stderr */
  stderr: string;
  /** Contents of GITHUB_STEP_SUMMARY markdown file */
  stepSummary: string;
  /** Parsed key-value map of outputs written to GITHUB_OUTPUT (or ::set-output) */
  outputs: Record<string, string>;
  /** True if exitCode === 0 */
  isSuccess: boolean;
  /** Command string that was executed */
  command: string;
  /** Execution duration in milliseconds */
  durationMs: number;
}

export interface MarkdownTable {
  headers: string[];
  rows: string[][];
}

/**
 * Strips ANSI color escape sequences from text.
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, '');
}

/**
 * Normalizes command output by stripping ANSI codes and converting CRLF to LF.
 */
export function normalizeOutput(text: string): string {
  return stripAnsi(text).replace(/\r\n/g, '\n');
}

/**
 * Resolves the path to the CLI executable.
 */
export function resolveCliPath(preferDist = true, customPath?: string): string {
  if (customPath) {
    if (fs.existsSync(customPath)) return customPath;
    throw new Error(`Custom CLI path not found: ${customPath}`);
  }
  if (preferDist && fs.existsSync(DIST_CLI_PATH)) {
    return DIST_CLI_PATH;
  }
  if (fs.existsSync(DIST_CLI_PATH)) {
    return DIST_CLI_PATH;
  }
  if (fs.existsSync(SRC_CLI_PATH)) {
    return SRC_CLI_PATH;
  }
  throw new Error(
    `Cannot find CLI entrypoint at "${DIST_CLI_PATH}" or "${SRC_CLI_PATH}". ` +
      `Please run "npm run build" before running E2E tests.`
  );
}

/**
 * Resolves the path to the Action runner script.
 */
export function resolveActionPath(preferDist = true, customPath?: string): string {
  if (customPath) {
    if (fs.existsSync(customPath)) return customPath;
    throw new Error(`Custom Action path not found: ${customPath}`);
  }
  if (preferDist && fs.existsSync(DIST_ACTION_PATH)) {
    return DIST_ACTION_PATH;
  }
  if (fs.existsSync(DIST_ACTION_PATH)) {
    return DIST_ACTION_PATH;
  }
  if (fs.existsSync(SRC_ACTION_PATH)) {
    return SRC_ACTION_PATH;
  }
  throw new Error(
    `Cannot find Action entrypoint at "${DIST_ACTION_PATH}" or "${SRC_ACTION_PATH}". ` +
      `Please run "npm run build" before running E2E tests.`
  );
}

/**
 * Parses GitHub Action outputs from file content and stdout fallback.
 */
export function parseGitHubOutput(content: string, stdout = ''): Record<string, string> {
  const outputs: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }
    // Delimiter format: NAME<<DELIMITER
    const delimMatch = line.match(/^([^<]+)<<(.+)$/);
    if (delimMatch && delimMatch[1] && delimMatch[2]) {
      const name = delimMatch[1].trim();
      const delimiter = delimMatch[2].trim();
      const valueLines: string[] = [];
      i++;
      while (i < lines.length) {
        const nextLine = lines[i];
        if (nextLine !== undefined && nextLine.trim() === delimiter) {
          break;
        }
        if (nextLine !== undefined) {
          valueLines.push(nextLine);
        }
        i++;
      }
      outputs[name] = valueLines.join('\n');
      i++;
      continue;
    }
    // Single line: key=value
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const name = line.slice(0, eqIdx).trim();
      outputs[name] = line.slice(eqIdx + 1);
    }
    i++;
  }
  // Fallback for ::set-output name=NAME::VALUE in stdout
  const stdoutMatches = stdout.matchAll(/::set-output name=([^:]+)::(.*)/g);
  for (const m of stdoutMatches) {
    const key = m[1];
    const val = m[2];
    if (key && val !== undefined && !(key in outputs)) {
      outputs[key] = val;
    }
  }
  return outputs;
}

/**
 * Parses GitHub Step Summary markdown table into structured headers and rows.
 */
export function parseMarkdownTable(markdown: string): MarkdownTable {
  const lines = markdown
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && l.endsWith('|'));

  if (lines.length < 2 || !lines[0]) {
    return { headers: [], rows: [] };
  }

  const parseRow = (line: string): string[] =>
    line
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim());

  const headers = parseRow(lines[0]);
  const dataLines = lines
    .slice(1)
    .filter((l) => !l.match(/^\|(?:\s*:?-+:?\s*\|)+$/));
  const rows = dataLines.map(parseRow);
  return { headers, rows };
}

/**
 * Executes the CLI asynchronously.
 */
export async function runCli(
  args: string[],
  options: RunCliOptions = {}
): Promise<CliResult> {
  const cliPath = resolveCliPath(options.preferDist, options.cliPath);
  const startTime = Date.now();
  const execEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    TERM: 'dumb',
    ...options.env,
  };

  const spawnArgs = [cliPath, ...args];

  return new Promise((resolve, reject) => {
    const child = execFile(
      process.execPath,
      spawnArgs,
      {
        cwd: options.cwd || process.cwd(),
        env: execEnv,
        timeout: options.timeout || 30000,
        maxBuffer: options.maxBuffer || 10 * 1024 * 1024,
        encoding: 'utf-8',
      },
      (err, rawStdout, rawStderr) => {
        const durationMs = Date.now() - startTime;
        let exitCode = 0;
        if (err) {
          if (typeof (err as any).code === 'number') {
            exitCode = (err as any).code;
          } else if (typeof (err as any).status === 'number') {
            exitCode = (err as any).status;
          } else {
            return reject(err);
          }
        }

        const stdout = normalizeOutput(rawStdout || '');
        const stderr = normalizeOutput(rawStderr || '');

        let json: any = undefined;
        let jsonError: Error | undefined = undefined;
        if (
          args.includes('--json') ||
          stdout.trim().startsWith('{') ||
          stdout.trim().startsWith('[')
        ) {
          try {
            json = JSON.parse(stdout.trim());
          } catch (e: any) {
            // Tolerant boundary search fallback
            const firstBrace = stdout.indexOf('{');
            const lastBrace = stdout.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
              try {
                json = JSON.parse(stdout.slice(firstBrace, lastBrace + 1));
              } catch (subErr) {
                jsonError = e instanceof Error ? e : new Error(String(e));
              }
            } else {
              jsonError = e instanceof Error ? e : new Error(String(e));
            }
          }
        }

        const result: CliResult = {
          exitCode,
          stdout,
          stderr,
          rawStdout: rawStdout || '',
          rawStderr: rawStderr || '',
          json,
          jsonError,
          isSuccess: exitCode === 0,
          command: `node ${spawnArgs.join(' ')}`,
          durationMs,
          parseJson<T = any>(): T {
            return expectValidJson<T>(this);
          },
        };

        if (options.rejectOnError && exitCode !== 0) {
          return reject(
            new Error(
              `CLI command failed with exit code ${exitCode}:\nStdout: ${stdout}\nStderr: ${stderr}`
            )
          );
        }

        resolve(result);
      }
    );

    if (options.input !== undefined && child.stdin) {
      child.stdin.write(options.input);
      child.stdin.end();
    }
  });
}

/**
 * Executes the CLI synchronously.
 */
export function runCliSync(
  args: string[],
  options: RunCliOptions = {}
): CliResult {
  const cliPath = resolveCliPath(options.preferDist, options.cliPath);
  const startTime = Date.now();
  const execEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    TERM: 'dumb',
    ...options.env,
  };

  const spawnArgs = [cliPath, ...args];

  let rawStdout = '';
  let rawStderr = '';
  let exitCode = 0;

  try {
    const stdoutBuf = execFileSync(process.execPath, spawnArgs, {
      cwd: options.cwd || process.cwd(),
      env: execEnv,
      input: options.input,
      timeout: options.timeout || 30000,
      maxBuffer: options.maxBuffer || 10 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    rawStdout = stdoutBuf;
  } catch (err: any) {
    if (typeof err.status === 'number') {
      exitCode = err.status;
      rawStdout = err.stdout ? String(err.stdout) : '';
      rawStderr = err.stderr ? String(err.stderr) : '';
    } else {
      throw err;
    }
  }

  const durationMs = Date.now() - startTime;
  const stdout = normalizeOutput(rawStdout);
  const stderr = normalizeOutput(rawStderr);

  let json: any = undefined;
  let jsonError: Error | undefined = undefined;
  if (
    args.includes('--json') ||
    stdout.trim().startsWith('{') ||
    stdout.trim().startsWith('[')
  ) {
    try {
      json = JSON.parse(stdout.trim());
    } catch (e: any) {
      jsonError = e instanceof Error ? e : new Error(String(e));
    }
  }

  const result: CliResult = {
    exitCode,
    stdout,
    stderr,
    rawStdout,
    rawStderr,
    json,
    jsonError,
    isSuccess: exitCode === 0,
    command: `node ${spawnArgs.join(' ')}`,
    durationMs,
    parseJson<T = any>(): T {
      return expectValidJson<T>(this);
    },
  };

  if (options.rejectOnError && exitCode !== 0) {
    throw new Error(
      `CLI command failed with exit code ${exitCode}:\nStdout: ${stdout}\nStderr: ${stderr}`
    );
  }

  return result;
}

export type RunActionParam = RunActionOptions | Record<string, string | undefined>;

/**
 * Executes the GitHub Action runner asynchronously in an isolated child process.
 */
export async function runAction(
  optionsOrEnv: RunActionParam = {}
): Promise<ActionResult> {
  const isDirectEnv =
    !('inputs' in optionsOrEnv) &&
    !('githubContext' in optionsOrEnv) &&
    !('cwd' in optionsOrEnv) &&
    !('actionPath' in optionsOrEnv) &&
    !('preferDist' in optionsOrEnv) &&
    !('timeout' in optionsOrEnv) &&
    !('env' in optionsOrEnv);

  const options: RunActionOptions = isDirectEnv
    ? { env: optionsOrEnv as Record<string, string | undefined> }
    : (optionsOrEnv as RunActionOptions);

  const actionPath = resolveActionPath(options.preferDist, options.actionPath);
  const startTime = Date.now();

  const tempDir = fs.mkdtempSync(
    path.join(fs.realpathSync(os.tmpdir()), 'gh-action-test-')
  );
  const summaryPath = path.join(tempDir, 'step_summary.md');
  const outputPath = path.join(tempDir, 'output.txt');
  fs.writeFileSync(summaryPath, '', 'utf-8');
  fs.writeFileSync(outputPath, '', 'utf-8');

  const actionEnv: NodeJS.ProcessEnv = {
    ...process.env,
    GITHUB_STEP_SUMMARY: summaryPath,
    GITHUB_OUTPUT: outputPath,
    GITHUB_WORKSPACE: options.cwd || process.cwd(),
    GITHUB_EVENT_NAME: options.githubContext?.eventName || 'pull_request',
    GITHUB_BASE_REF: options.githubContext?.baseRef || 'main',
    GITHUB_HEAD_REF: options.githubContext?.headRef || 'feature',
    GITHUB_SHA: options.githubContext?.sha || 'HEAD',
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    TERM: 'dumb',
    ...options.env,
  };

  if (options.inputs) {
    for (const [key, value] of Object.entries(options.inputs)) {
      const upper = key.toUpperCase().replace(/ /g, '_');
      const valStr = String(value);
      actionEnv[`INPUT_${upper}`] = valStr;
      if (upper.includes('-')) {
        actionEnv[`INPUT_${upper.replace(/-/g, '_')}`] = valStr;
      } else if (upper.includes('_')) {
        actionEnv[`INPUT_${upper.replace(/_/g, '-')}`] = valStr;
      }
    }
  }

  const spawnArgs = [actionPath];

  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      spawnArgs,
      {
        cwd: options.cwd || process.cwd(),
        env: actionEnv,
        timeout: options.timeout || 30000,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf-8',
      },
      (err, rawStdout, rawStderr) => {
        const durationMs = Date.now() - startTime;
        let exitCode = 0;
        if (err) {
          if (typeof (err as any).code === 'number') {
            exitCode = (err as any).code;
          } else if (typeof (err as any).status === 'number') {
            exitCode = (err as any).status;
          } else {
            // Cleanup on spawn failure
            try {
              fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (_) {}
            return reject(err);
          }
        }

        const stdout = normalizeOutput(rawStdout || '');
        const stderr = normalizeOutput(rawStderr || '');

        let stepSummary = '';
        if (fs.existsSync(summaryPath)) {
          stepSummary = normalizeOutput(fs.readFileSync(summaryPath, 'utf-8'));
        }

        let rawOutput = '';
        if (fs.existsSync(outputPath)) {
          rawOutput = fs.readFileSync(outputPath, 'utf-8');
        }
        const outputs = parseGitHubOutput(rawOutput, stdout);

        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (_) {}

        resolve({
          exitCode,
          stdout,
          stderr,
          stepSummary,
          outputs,
          isSuccess: exitCode === 0,
          command: `node ${spawnArgs.join(' ')}`,
          durationMs,
        });
      }
    );
  });
}

/**
 * Asserts that CLI output contains valid JSON and returns the parsed payload.
 */
export function expectValidJson<T = any>(result: CliResult): T {
  if (result.json !== undefined) {
    return result.json as T;
  }
  if (result.jsonError) {
    throw new Error(
      `Failed to parse CLI stdout as JSON: ${result.jsonError.message}\n` +
        `Raw Stdout:\n${result.stdout}\n` +
        `Raw Stderr:\n${result.stderr}`
    );
  }
  try {
    return JSON.parse(result.stdout.trim()) as T;
  } catch (err: any) {
    throw new Error(
      `Expected valid JSON in CLI output, but JSON.parse failed: ${err.message}\n` +
        `Stdout:\n${result.stdout}\n` +
        `Stderr:\n${result.stderr}`
    );
  }
}

/**
 * Asserts that the CLI succeeded with exit code 0.
 */
export function expectCliSuccess(result: CliResult): void {
  if (result.exitCode !== 0) {
    throw new Error(
      `Expected CLI command to succeed with exit code 0, but received ${result.exitCode}.\n` +
        `Command: ${result.command}\n` +
        `Stdout:\n${result.stdout}\n` +
        `Stderr:\n${result.stderr}`
    );
  }
}

/**
 * Asserts that the CLI exited with policy violation code (default 1).
 */
export function expectCliViolation(result: CliResult, expectedCode = 1): void {
  if (result.exitCode !== expectedCode) {
    throw new Error(
      `Expected CLI policy violation exit code ${expectedCode}, but received ${result.exitCode}.\n` +
        `Command: ${result.command}\n` +
        `Stdout:\n${result.stdout}\n` +
        `Stderr:\n${result.stderr}`
    );
  }
}

/**
 * Asserts that the CLI exited with error code (default 2).
 */
export function expectCliError(result: CliResult, expectedCode = 2): void {
  if (result.exitCode !== expectedCode) {
    throw new Error(
      `Expected CLI error exit code ${expectedCode}, but received ${result.exitCode}.\n` +
        `Command: ${result.command}\n` +
        `Stdout:\n${result.stdout}\n` +
        `Stderr:\n${result.stderr}`
    );
  }
}

/**
 * Asserts that the mandatory disclaimer banner is present in output.
 */
export function expectDisclaimerPresent(
  target: CliResult | ActionResult | string
): void {
  let text = '';
  if (typeof target === 'string') {
    text = target;
  } else if ('stdout' in target) {
    text = target.stdout + '\n' + target.stderr;
    if (target.json && typeof target.json === 'object') {
      text += '\n' + JSON.stringify(target.json);
    }
  }
  if (!text.includes(MANDATORY_DISCLAIMER)) {
    throw new Error(
      `Expected output to include mandatory disclaimer banner:\n"${MANDATORY_DISCLAIMER}"\n\nActual output:\n${text}`
    );
  }
}

/**
 * Asserts that Action step summary contains a valid markdown table.
 */
export function expectSummaryTable(result: ActionResult): MarkdownTable {
  const table = parseMarkdownTable(result.stepSummary);
  if (table.headers.length === 0 || table.rows.length === 0) {
    throw new Error(
      `Expected Action step summary to contain a Markdown table, but none was found.\n` +
        `Step Summary:\n${result.stepSummary}`
    );
  }
  return table;
}
