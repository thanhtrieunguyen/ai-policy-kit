import * as path from 'node:path';
import { parseArgs } from 'node:util';
import YAML from 'yaml';
import { DISCLAIMER } from '../constants.js';
import { findPolicyFile, loadPolicy } from '../engine/loader.js';
import { getCommitsInRange, matchesTrailerPattern } from '../git/trailers.js';
import { getChangedFiles } from '../git/diff.js';
import { detectWorkspaceLeaks, type WorkspaceLeak } from '../git/leaks.js';
import { BALANCED_PRESET_YAML } from '../templates/presets-data.js';
import type { AIPolicyConfig } from '../types.js';

export interface LintPROptions {
  configPath?: string;
  baseRef?: string;
  headRef?: string;
  prBody?: string;
  cwd?: string;
  failOnLeak?: boolean;
}

export interface Violation {
  rule: string;
  commit?: string;
  message: string;
}

export interface Leak {
  file: string;
  path: string;
  tool: string;
  status: 'added' | 'modified';
  description?: string;
  rule?: string;
}

export interface LintPRResult {
  valid: boolean;
  passed: boolean;
  policyValid: boolean;
  trailersValid: boolean;
  checklistValid: boolean;
  violations: Violation[];
  leaks: Leak[];
  commitsEvaluated: number;
  policyPath?: string;
  summary: string;
  disclaimer: string;
}

export const LINT_PR_HELP = `ai-policy lint-pr - Validate pull request compliance against AI policy

USAGE:
  ai-policy lint-pr [options]

OPTIONS:
  --base <ref>          Base git reference (default: main)
  --head <ref>          Head git reference (default: HEAD)
  --pr-body <text>      Pull request description body to inspect for checklist
  --config <path>       Custom policy file path
  --fail-on-leak <bool> Fail build when AI workspace leak detected (default: true)
  -q, --quiet           Suppress output on success
  --json                Emit machine-readable JSON output
  -h, --help            Show this help message

DISCLAIMER:
  ${DISCLAIMER}
`;

/**
 * Programmatic core engine for validating pull request compliance.
 * Exported for CLI and GitHub Action integration.
 */
export async function lintPullRequest(options: LintPROptions = {}): Promise<LintPRResult> {
  const cwd = options.cwd || process.cwd();
  const baseRef = options.baseRef || 'main';
  const headRef = options.headRef || 'HEAD';
  const failOnLeak = options.failOnLeak !== false;

  // 1. Load Policy
  let policyConfig: AIPolicyConfig;
  let policyPath = options.configPath;

  if (policyPath) {
    const loaded = await loadPolicy(policyPath);
    policyConfig = loaded.config;
    policyPath = path.relative(cwd, loaded.filepath).replace(/\\/g, '/');
  } else {
    let discovered: string | null = null;
    try {
      discovered = await findPolicyFile(cwd);
    } catch {
      discovered = null;
    }
    if (discovered) {
      const loaded = await loadPolicy(discovered);
      policyConfig = loaded.config;
      policyPath = path.relative(cwd, loaded.filepath).replace(/\\/g, '/');
    } else {
      policyConfig = YAML.parse(BALANCED_PRESET_YAML) as AIPolicyConfig;
      policyPath = 'default (balanced preset)';
    }
  }

  const violations: Violation[] = [];
  const disclosure = policyConfig.disclosure || { required: false };
  const methods = disclosure.methods || [];
  const trailerConfig = disclosure.commit_trailer;
  const trailerKey = trailerConfig?.key || 'AI-Assisted';
  const trailerRequired = Boolean(trailerConfig?.required);
  const trailerPattern = trailerConfig?.pattern;

  // 2. PR Body Checklist Evaluation
  let checklistValid = true;
  let checklistSatisfied = false;

  if (options.prBody !== undefined) {
    const checkedBoxRegex = /-\s*\[[xX]\]\s*.*(?:AI|Copilot|Claude|Cursor|assistant|None|disclosed)/i;
    const anyCheckedBox = /-\s*\[[xX]\]/;
    if (checkedBoxRegex.test(options.prBody) || anyCheckedBox.test(options.prBody)) {
      checklistSatisfied = true;
      checklistValid = true;
    } else {
      checklistValid = false;
      if (methods.includes('pr_checklist') && !methods.includes('commit_trailer')) {
        violations.push({
          rule: 'pr_checklist',
          message: 'Pull request description does not contain a checked AI contribution disclosure',
        });
      }
    }
  }

  // 3. Git Commits & Trailer Evaluation
  let commitsEvaluated = 0;
  let trailersValid = true;

  if (baseRef !== headRef) {
    const commits = getCommitsInRange(baseRef, headRef, { cwd });
    commitsEvaluated = commits.length;

    for (const commit of commits) {
      // Skip non-fast-forward merge commits (multiple parents)
      if (commit.isMerge) {
        continue;
      }

      // Check trailers
      const matchingTrailers = commit.trailers.filter(
        (t) => t.key.toLowerCase() === trailerKey.toLowerCase()
      );

      // Determine if trailer is required for this commit:
      // Trailer is required if:
      // - trailerConfig.required is true, OR
      // - disclosure.required is true AND methods does NOT exclusively rely on satisfied checklist
      const needTrailer =
        trailerRequired ||
        (disclosure.required &&
          !checklistSatisfied &&
          (methods.length === 0 || methods.includes('commit_trailer') || Boolean(trailerConfig)));

      if (needTrailer && matchingTrailers.length === 0) {
        trailersValid = false;
        violations.push({
          rule: 'commit_trailer',
          commit: commit.sha.slice(0, 7),
          message: `Commit ${commit.sha.slice(0, 7)} ("${commit.subject}") is missing required trailer "${trailerKey}"`,
        });
      } else if (matchingTrailers.length > 0 && trailerPattern) {
        // Validate regex pattern against each trailer line
        for (const trailer of matchingTrailers) {
          if (!matchesTrailerPattern(trailer.key, trailer.value, trailerPattern)) {
            trailersValid = false;
            violations.push({
              rule: 'commit_trailer',
              commit: commit.sha.slice(0, 7),
              message: `Commit ${commit.sha.slice(0, 7)} trailer "${trailer.raw}" does not match pattern "${trailerPattern}"`,
            });
          }
        }
      }
    }
  }

  // 4. Git Diff & AI Workspace Leak Detection
  const diffResult = getChangedFiles(baseRef, headRef, { cwd });
  const rawLeaks = detectWorkspaceLeaks(diffResult.files);
  const leaks: Leak[] = rawLeaks.map((l: WorkspaceLeak) => ({
    file: l.file,
    path: l.path,
    tool: l.tool,
    status: l.status,
    description: l.description,
    rule: l.rule,
  }));

  const hasLeakViolation = leaks.length > 0 && failOnLeak;
  const passed = violations.length === 0 && !hasLeakViolation;

  let summary = 'Compliance check passed: PR satisfies AI contribution policy';
  if (!passed) {
    const parts: string[] = [];
    if (violations.length > 0) {
      parts.push(`${violations.length} policy violation(s)`);
    }
    if (leaks.length > 0) {
      parts.push(`${leaks.length} workspace leak(s) detected`);
    }
    summary = `Policy violation: ${parts.join(', ')}`;
  }

  return {
    valid: passed,
    passed,
    policyValid: true,
    trailersValid,
    checklistValid,
    violations,
    leaks,
    commitsEvaluated,
    policyPath,
    summary,
    disclaimer: DISCLAIMER,
  };
}

/**
 * CLI Handler for `ai-policy lint-pr`.
 */
export async function handleLintPR(rawArgs: string[], cwd = process.cwd()): Promise<number> {
  let parsed: ReturnType<typeof parseArgs>;

  try {
    parsed = parseArgs({
      args: rawArgs,
      options: {
        base: { type: 'string', default: 'main' },
        head: { type: 'string', default: 'HEAD' },
        'pr-body': { type: 'string' },
        config: { type: 'string' },
        'fail-on-leak': { type: 'string', default: 'true' },
        quiet: { type: 'boolean', short: 'q', default: false },
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      strict: true,
      allowPositionals: false,
    });
  } catch (err: any) {
    console.error(`Error: ${err.message}\n\n${LINT_PR_HELP}`);
    return 2;
  }

  const { values } = parsed;

  if (values.help) {
    console.log(LINT_PR_HELP);
    return 0;
  }

  const isQuiet = Boolean(values.quiet);
  const isJson = Boolean(values.json);
  const failOnLeak = values['fail-on-leak'] !== 'false';

  let result: LintPRResult;
  try {
    result = await lintPullRequest({
      configPath: typeof values.config === 'string' ? values.config : undefined,
      baseRef: typeof values.base === 'string' ? values.base : 'main',
      headRef: typeof values.head === 'string' ? values.head : 'HEAD',
      prBody: typeof values['pr-body'] === 'string' ? values['pr-body'] : undefined,
      failOnLeak,
      cwd,
    });
  } catch (err: any) {
    if (isJson) {
      console.log(
        JSON.stringify(
          {
            valid: false,
            passed: false,
            error: err.message,
            disclaimer: DISCLAIMER,
          },
          null,
          2
        )
      );
    } else {
      console.error(`Error: ${err.message}\n\n${DISCLAIMER}`);
    }
    return 2;
  }

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
    return result.passed ? 0 : 1;
  }

  if (result.passed) {
    if (!isQuiet) {
      console.log(`✓ ${result.summary}`);
      console.log(`  Commits evaluated: ${result.commitsEvaluated}`);
      console.log(`  Policy configuration: ${result.policyPath || 'discovered'}`);
      console.log(`\n${DISCLAIMER}`);
    }
    return 0;
  }

  // Policy Violations
  console.error(`❌ ${result.summary}\n`);
  if (result.violations.length > 0) {
    console.error('Violations:');
    for (const v of result.violations) {
      console.error(`  - [${v.rule}] ${v.message}`);
    }
    console.error('');
  }
  if (result.leaks.length > 0) {
    console.error('Workspace Leaks:');
    for (const leak of result.leaks) {
      console.error(`  - [${leak.tool}] ${leak.file} (${leak.status}): ${leak.description || ''}`);
    }
    console.error('');
  }
  console.error(DISCLAIMER);
  return 1;
}
