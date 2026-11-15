import { describe, it, expect } from 'vitest';
import YAML from 'yaml';
import { withGitFixture } from './helpers/git-fixture.js';
import { runCli, expectCliSuccess, expectCliError, expectDisclaimerPresent } from './e2e/harness.js';

describe('CLI: ai-policy check', () => {
  it('automatically discovers and validates .github/ai-policy.yml', async () => {
    await withGitFixture(async (fixture) => {
      await runCli(['init'], { cwd: fixture.repoDir });
      const result = await runCli(['check'], { cwd: fixture.repoDir });
      expectCliSuccess(result);
      expect(result.stdout).toMatch(/valid|compliant/i);
      expectDisclaimerPresent(result);
    });
  });

  it('validates custom policy file path', async () => {
    await withGitFixture(async (fixture) => {
      fixture.writeFile(
        'config/custom-policy.yml',
        YAML.stringify({
          version: '0.1',
          level: 'permissive',
          categories: { code: 'permissive' },
          disclosure: { required: false },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'permissive' },
        })
      );

      const result = await runCli(['check', 'config/custom-policy.yml'], {
        cwd: fixture.repoDir,
      });
      expectCliSuccess(result);
      expect(result.stdout).toMatch(/valid|compliant/i);
    });
  });

  it('exits with code 2 and suggests remediation when no config exists', async () => {
    await withGitFixture(async (fixture) => {
      const result = await runCli(['check'], { cwd: fixture.repoDir });
      expectCliError(result, 2);
      expect(result.stderr + result.stdout).toContain('ai-policy init');
    });
  });

  it('exits with code 2 on configuration schema error', async () => {
    await withGitFixture(async (fixture) => {
      fixture.writeFile(
        '.github/ai-policy.yml',
        'version: "0.1"\nunexpected_invalid_property: true\n'
      );
      const result = await runCli(['check'], { cwd: fixture.repoDir });
      expectCliError(result, 2);
    });
  });

  it('suppresses stdout in quiet mode on success', async () => {
    await withGitFixture(async (fixture) => {
      await runCli(['init'], { cwd: fixture.repoDir });
      const result = await runCli(['check', '--quiet'], { cwd: fixture.repoDir });
      expectCliSuccess(result);
      expect(result.stdout.trim()).toBe('');
    });
  });

  it('outputs valid JSON for valid configuration in --json mode', async () => {
    await withGitFixture(async (fixture) => {
      await runCli(['init'], { cwd: fixture.repoDir });
      const result = await runCli(['check', '--json'], { cwd: fixture.repoDir });
      expectCliSuccess(result);
      const json = result.parseJson();
      expect(json.valid).toBe(true);
      expect(Array.isArray(json.diagnostics)).toBe(true);
      expect(json.diagnostics.length).toBe(0);
      expect(json.disclaimer).toContain('ai-policy is a deterministic policy compliance validator');
    });
  });

  it('outputs diagnostic errors in --json mode for invalid configuration', async () => {
    await withGitFixture(async (fixture) => {
      fixture.writeFile('.github/ai-policy.yml', 'version: "0.1"\nlevel: "forbidden"\n');
      const result = await runCli(['check', '--json'], { cwd: fixture.repoDir });
      expectCliError(result, 2);
      const json = result.parseJson();
      expect(json.valid).toBe(false);
      expect(json.diagnostics.length).toBeGreaterThan(0);
      expect(json.diagnostics[0]).toHaveProperty('message');
    });
  });

  it('handles remote URL validation gracefully (exit 0 or exit 2)', async () => {
    const url =
      'https://raw.githubusercontent.com/thanhtrieunguyen/ai-policy-kit/main/presets/balanced.yml';
    const result = await runCli(['check', url]);
    expect([0, 2]).toContain(result.exitCode);
  });
});
