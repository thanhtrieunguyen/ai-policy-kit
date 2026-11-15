import * as fs from 'node:fs';
import * as os from 'node:os';
import { DISCLAIMER } from '../constants.js';
import { lintPullRequest } from '../cli/lint-pr.js';

// Minimal zero-dependency GitHub Actions core helper implementation
// to avoid CJS require() issues when bundling into pure ESM.
function getInput(name: string): string {
  const val =
    process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '';
  return val.trim();
}

function setOutput(name: string, value: string): void {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile && fs.existsSync(outputFile)) {
    fs.appendFileSync(outputFile, `${name}=${value}${os.EOL}`, 'utf-8');
  } else {
    // Fallback workflow command
    process.stdout.write(`::set-output name=${name}::${value}${os.EOL}`);
  }
}

function setFailed(message: string): void {
  process.exitCode = 1;
  process.stderr.write(`::error::${message}${os.EOL}`);
}

export async function run(): Promise<void> {
  try {
    // 1. Read Inputs with fallback to GitHub context env vars
    const policyPathInput = getInput('policy-path') || undefined;
    const baseRefInput =
      getInput('base-ref') ||
      process.env.GITHUB_BASE_REF ||
      process.env.BASE_REF ||
      undefined;
    const headRefInput =
      getInput('head-ref') ||
      process.env.GITHUB_HEAD_REF ||
      process.env.HEAD_REF ||
      undefined;
    const prBodyInput = getInput('pr-body') || undefined;
    const failOnLeakInput = getInput('fail-on-leak');
    const failOnLeak = failOnLeakInput !== 'false';

    console.log(DISCLAIMER);
    console.log('');

    // 2. Execute Linting
    const result = await lintPullRequest({
      configPath: policyPathInput,
      baseRef: baseRefInput,
      headRef: headRefInput,
      prBody: prBodyInput,
      failOnLeak,
    });

    // 3. Set Action Outputs
    setOutput('passed', String(result.passed));
    setOutput('violations', String(result.violations.length));

    const leakList = result.leaks.map((l) => l.path).join(',');
    setOutput('leaks', leakList || String(result.leaks.length));

    // 4. Construct Step Summary Markdown Table
    const summaryLines: string[] = [];
    summaryLines.push('## AI Policy Compliance Report');
    summaryLines.push('');
    summaryLines.push(
      result.passed
        ? '✅ **Pull request is fully compliant with AI contribution policy.**'
        : '❌ **Pull request policy check failed.**'
    );
    summaryLines.push('');
    summaryLines.push('| Check | Status | Details |');
    summaryLines.push('| :--- | :---: | :--- |');
    summaryLines.push(
      `| Policy File | ${result.policyValid ? '✅' : '❌'} | ${result.policyPath || 'Loaded'} |`
    );
    summaryLines.push(
      `| Disclosure Trailer | ${result.trailersValid ? '✅' : '❌'} | ${result.commitsEvaluated} commit(s) evaluated |`
    );
    summaryLines.push(
      `| PR Checklist | ${result.checklistValid ? '✅' : '➖'} | ${prBodyInput !== undefined ? (result.checklistValid ? 'Satisfied' : 'Not satisfied') : 'N/A'} |`
    );
    summaryLines.push(
      `| Workspace Leaks | ${result.leaks.length === 0 ? '✅' : '❌'} | ${result.leaks.length === 0 ? '0 detected' : `${result.leaks.length} leak(s) found`} |`
    );
    summaryLines.push('');

    if (result.violations.length > 0) {
      summaryLines.push('### Violations');
      summaryLines.push('');
      for (const v of result.violations) {
        summaryLines.push(`- **[${v.rule}]** ${v.commit ? `\`${v.commit}\`: ` : ''}${v.message}`);
      }
      summaryLines.push('');
    }

    if (result.leaks.length > 0) {
      summaryLines.push('### Leaked AI Workspace Configurations');
      summaryLines.push('');
      for (const leak of result.leaks) {
        summaryLines.push(`- \`${leak.path}\` (${leak.tool} ${leak.status})`);
      }
      summaryLines.push('');
    }

    summaryLines.push(`> **Notice:** ${DISCLAIMER}`);

    const summaryContent = summaryLines.join(os.EOL);

    // Write to GITHUB_STEP_SUMMARY if available
    const stepSummaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (stepSummaryFile && stepSummaryFile.trim() !== '') {
      try {
        fs.appendFileSync(stepSummaryFile, summaryContent + os.EOL, 'utf-8');
      } catch (err) {
        console.warn('::warning::Failed to write step summary to GITHUB_STEP_SUMMARY:', err);
      }
    } else {
      // If GITHUB_STEP_SUMMARY is empty or unset, print table to stdout for visibility
      console.log(summaryContent);
    }

    // 5. Exit or Fail Action
    if (!result.passed) {
      setFailed(`AI Policy validation failed with ${result.violations.length} violation(s) and ${result.leaks.length} leak(s).`);
      process.exitCode = 1;
    }
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    setFailed(`AI Policy Action encountered an unhandled error: ${errMessage}`);
    process.exitCode = 1;
  }
}

// Automatically invoke if executed directly
run();
