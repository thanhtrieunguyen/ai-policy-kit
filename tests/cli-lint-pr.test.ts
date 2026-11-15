import { describe, it, expect } from 'vitest';
import { withGitFixture, setupPRScenario } from './helpers/git-fixture.js';
import {
  runCli,
  expectCliSuccess,
  expectCliViolation,
  expectCliError,
  expectDisclaimerPresent,
} from './e2e/harness.js';
import { lintPullRequest } from '../src/index.js';

describe('CLI: ai-policy lint-pr & Compliance Engine', () => {
  it('passes clean PR with valid commit trailer (exit code 0)', async () => {
    await withGitFixture(async (fixture) => {
      const { baseRef, headRef } = await setupPRScenario(fixture, {
        policyConfig: {
          version: '0.1',
          level: 'restricted',
          categories: { code: 'restricted' },
          disclosure: {
            required: true,
            commit_trailer: { key: 'AI-Assisted' },
          },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'restricted' },
        },
        featureCommits: [
          {
            message: 'feat(api): add endpoint',
            files: { 'src/api.ts': 'export const api = 1;' },
            trailers: { 'AI-Assisted': 'Claude 3.5 Sonnet' },
          },
        ],
      });

      const result = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
        cwd: fixture.repoDir,
      });
      expectCliSuccess(result);
      expectDisclaimerPresent(result);
    });
  }, 30000);

  it('passes PR when checklist disclosure is satisfied in PR body', async () => {
    await withGitFixture(async (fixture) => {
      const { baseRef, headRef } = await setupPRScenario(fixture, {
        policyConfig: {
          version: '0.1',
          level: 'restricted',
          categories: { code: 'restricted' },
          disclosure: {
            required: true,
            methods: ['pr_checklist'],
          },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'restricted' },
        },
        featureCommits: [
          {
            message: 'feat(docs): update readme',
            files: { 'README.md': '# Updated' },
          },
        ],
      });

      const result = await runCli(
        [
          'lint-pr',
          '--base',
          baseRef,
          '--head',
          headRef,
          '--pr-body',
          '### PR Checklist\n- [x] AI-assisted contribution disclosed: Copilot',
        ],
        { cwd: fixture.repoDir }
      );
      expectCliSuccess(result);
    });
  }, 30000);

  it('passes on zero-diff / empty commit range', async () => {
    await withGitFixture(async (fixture) => {
      await runCli(['init'], { cwd: fixture.repoDir });
      fixture.commit('chore: init');
      const result = await runCli(['lint-pr', '--base', 'main', '--head', 'main'], {
        cwd: fixture.repoDir,
      });
      expectCliSuccess(result);
    });
  }, 30000);

  it('pinpoints offending commit SHA missing required trailer (exit code 1)', async () => {
    await withGitFixture(async (fixture) => {
      const { baseRef, headRef } = await setupPRScenario(fixture, {
        policyConfig: {
          version: '0.1',
          level: 'restricted',
          categories: { code: 'restricted' },
          disclosure: {
            required: true,
            commit_trailer: { key: 'AI-Assisted', required: true },
          },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'restricted' },
        },
        featureCommits: [
          {
            message: 'feat: commit 1 with trailer',
            files: { 'f1.txt': '1' },
            trailers: { 'AI-Assisted': 'Copilot' },
          },
          {
            message: 'feat: commit 2 missing trailer',
            files: { 'f2.txt': '2' },
          },
        ],
      });

      const result = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
        cwd: fixture.repoDir,
      });
      expectCliViolation(result, 1);
      expect(result.stderr + result.stdout).toMatch(/missing|violation/i);
    });
  }, 30000);

  it('enforces trailer pattern regex and detects pattern mismatch', async () => {
    await withGitFixture(async (fixture) => {
      const { baseRef, headRef } = await setupPRScenario(fixture, {
        policyConfig: {
          version: '0.1',
          level: 'restricted',
          categories: { code: 'restricted' },
          disclosure: {
            required: true,
            commit_trailer: {
              key: 'AI-Assisted',
              pattern: '^AI-Assisted: [a-zA-Z0-9_-]+ v[0-9]+\\.[0-9]+.*$',
            },
          },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'restricted' },
        },
        featureCommits: [
          {
            message: 'feat: tool without version',
            files: { 'c.ts': 'export const c = 3;' },
            trailers: { 'AI-Assisted': 'Cursor' },
          },
        ],
      });

      const result = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
        cwd: fixture.repoDir,
      });
      expectCliViolation(result, 1);
    });
  }, 30000);

  it('handles non-fast-forward merge commits gracefully without requiring trailers', async () => {
    await withGitFixture(async (fixture) => {
      fixture.writeFile('init.txt', 'init');
      fixture.stage('init.txt');
      fixture.commit('initial commit');
      fixture.checkout('feature-branch', { create: true });
      fixture.writeFile('feat.txt', 'feat');
      fixture.stage('feat.txt');
      fixture.commit('feat commit', { trailers: { 'AI-Assisted': 'Copilot' } });
      fixture.checkout('main');
      fixture.merge('feature-branch', { noFf: true, message: 'Merge branch feature-branch' });

      const result = await runCli(['lint-pr', '--base', 'main~2', '--head', 'main'], {
        cwd: fixture.repoDir,
      });
      expectCliSuccess(result);
    });
  }, 30000);

  it('detects .claude and .cursor workspace leaks (exit code 1)', async () => {
    await withGitFixture(async (fixture) => {
      const { baseRef, headRef } = await setupPRScenario(fixture, {
        featureCommits: [
          {
            message: 'leak: accidental claude settings',
            leaks: ['claude'],
          },
        ],
      });

      const result = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
        cwd: fixture.repoDir,
      });
      expectCliViolation(result, 1);
      expect(result.stdout + result.stderr).toContain('.claude');
    });
  }, 30000);

  it('produces zero false positives for normal files mentioning assistants', async () => {
    await withGitFixture(async (fixture) => {
      const { baseRef, headRef } = await setupPRScenario(fixture, {
        featureCommits: [
          {
            message: 'feat: add docs mentioning tools',
            files: {
              'docs/claude.md': '# Claude Guide',
              'src/cursor-utils.ts': 'export const cursor = true;',
              'tests/gemini.test.ts': '// test',
            },
            trailers: { 'AI-Assisted': 'None' },
          },
        ],
      });

      const result = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
        cwd: fixture.repoDir,
      });
      expectCliSuccess(result);
    });
  }, 30000);

  it('allows deletions of forbidden workspace directories (status D)', async () => {
    await withGitFixture(async (fixture) => {
      // Create initial commit with leak
      fixture.writeFile('.cursor/rules.json', '{"rules": []}');
      fixture.stage('.cursor/rules.json');
      fixture.commit('initial with accidental leak');

      fixture.checkout('fix-leak', { create: true });
      fixture.removeFile('.cursor/rules.json');
      fixture.stage('.cursor/rules.json');
      fixture.commit('remediate leak', { trailers: { 'AI-Assisted': 'None' } });

      const result = await runCli(['lint-pr', '--base', 'main', '--head', 'fix-leak'], {
        cwd: fixture.repoDir,
      });
      expectCliSuccess(result);
    });
  }, 30000);

  it('emits valid machine-readable JSON in --json mode', async () => {
    await withGitFixture(async (fixture) => {
      const { baseRef, headRef } = await setupPRScenario(fixture, {
        featureCommits: [
          {
            message: 'feat: valid commit',
            files: { 'index.ts': 'console.log(1);' },
            trailers: { 'AI-Assisted': 'Copilot' },
          },
        ],
      });

      const result = await runCli(
        ['lint-pr', '--base', baseRef, '--head', headRef, '--json'],
        { cwd: fixture.repoDir }
      );
      expectCliSuccess(result);
      const json = result.parseJson();
      expect(json.passed).toBe(true);
      expect(json.violations).toEqual([]);
      expect(json.disclaimer).toContain('ai-policy is a deterministic policy compliance validator');
    });
  }, 30000);

  it('programmatic lintPullRequest function returns typed result', async () => {
    await withGitFixture(async (fixture) => {
      await runCli(['init', '--preset', 'balanced'], { cwd: fixture.repoDir });
      fixture.commit('chore: init');

      const result = await lintPullRequest({
        baseRef: 'main',
        headRef: 'main',
        cwd: fixture.repoDir,
      });

      expect(result.valid).toBe(true);
      expect(result.passed).toBe(true);
      expect(result.commitsEvaluated).toBe(0);
      expect(result.violations).toEqual([]);
      expect(result.leaks).toEqual([]);
    });
  }, 30000);
});
