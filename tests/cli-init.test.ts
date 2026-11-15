import { describe, it, expect } from 'vitest';
import { withGitFixture } from './helpers/git-fixture.js';
import { runCli, expectCliSuccess, expectCliError, expectDisclaimerPresent } from './e2e/harness.js';

describe('CLI: ai-policy init', () => {
  it('scaffolds .github/ai-policy.yml with balanced preset by default', async () => {
    await withGitFixture(async (fixture) => {
      const result = await runCli(['init'], { cwd: fixture.repoDir });
      expectCliSuccess(result);
      expect(fixture.exists('.github/ai-policy.yml')).toBe(true);

      const content = fixture.readFile('.github/ai-policy.yml');
      expect(content).toContain('level: "restricted"');
      expect(content).toContain('categories:');
      expectDisclaimerPresent(result);
    });
  });

  it('scaffolds strict preset with --preset strict', async () => {
    await withGitFixture(async (fixture) => {
      const result = await runCli(['init', '--preset', 'strict'], { cwd: fixture.repoDir });
      expectCliSuccess(result);

      const content = fixture.readFile('.github/ai-policy.yml');
      expect(content).toContain('level: "forbidden"');
      expect(content).toContain('code: "forbidden"');
      expect(content).toContain('required: true');
    });
  });

  it('scaffolds permissive preset with --preset permissive', async () => {
    await withGitFixture(async (fixture) => {
      const result = await runCli(['init', '--preset', 'permissive'], { cwd: fixture.repoDir });
      expectCliSuccess(result);

      const content = fixture.readFile('.github/ai-policy.yml');
      expect(content).toContain('level: "permissive"');
      expect(content).toContain('required: false');
    });
  });

  it('fails with code 2 on unknown preset', async () => {
    await withGitFixture(async (fixture) => {
      const result = await runCli(['init', '--preset', 'invalid-preset'], { cwd: fixture.repoDir });
      expectCliError(result, 2);
      expect(result.stderr).toContain('Unknown preset');
    });
  });

  it('prevents accidental overwrite without --force, allows with --force', async () => {
    await withGitFixture(async (fixture) => {
      fixture.writeFile('.github/ai-policy.yml', '# custom-content-sentinel');
      const failResult = await runCli(['init', '--preset', 'strict'], { cwd: fixture.repoDir });
      expect(failResult.exitCode).toBeGreaterThan(0);
      expect(fixture.readFile('.github/ai-policy.yml')).toBe('# custom-content-sentinel');

      const forceResult = await runCli(['init', '--preset', 'strict', '--force'], {
        cwd: fixture.repoDir,
      });
      expectCliSuccess(forceResult);
      expect(fixture.readFile('.github/ai-policy.yml')).toContain('level: "forbidden"');
    });
  });

  it('includes yaml-language-server header on line 1', async () => {
    await withGitFixture(async (fixture) => {
      await runCli(['init'], { cwd: fixture.repoDir });
      const firstLine = fixture.readFile('.github/ai-policy.yml').split(/\r?\n/)[0];
      expect(firstLine).toMatch(/^#\s*yaml-language-server:\s*\$schema=/);
      expect(firstLine).toContain('ai-policy.schema.json');
    });
  });

  it('generates AI_POLICY.md, AGENTS.md, and PR checklist when --docs is passed', async () => {
    await withGitFixture(async (fixture) => {
      const result = await runCli(['init', '--preset', 'balanced', '--docs'], {
        cwd: fixture.repoDir,
      });
      expectCliSuccess(result);
      expect(fixture.exists('.github/ai-policy.yml')).toBe(true);
      expect(fixture.exists('AI_POLICY.md')).toBe(true);
      expect(fixture.exists('AGENTS.md')).toBe(true);
      expect(fixture.exists('.github/PULL_REQUEST_TEMPLATE.md')).toBe(true);

      const aiPolicy = fixture.readFile('AI_POLICY.md');
      expect(aiPolicy).toMatch(/# .*AI.*Policy/i);
      expect(aiPolicy).not.toMatch(/\{\{[a-zA-Z0-9_-]+\}\}/);

      const agents = fixture.readFile('AGENTS.md');
      expect(agents).toContain('AI-Assisted');
      expect(agents).toContain('.cursor');

      const prTmpl = fixture.readFile('.github/PULL_REQUEST_TEMPLATE.md');
      expect(prTmpl).toContain('- [ ]');
      expect(prTmpl).toMatch(/AI|disclosure/i);
    });
  });

  it('outputs valid JSON in --json mode', async () => {
    await withGitFixture(async (fixture) => {
      const result = await runCli(['init', '--preset', 'strict', '--json'], {
        cwd: fixture.repoDir,
      });
      expectCliSuccess(result);
      const json = result.parseJson();
      expect(json.success).toBe(true);
      expect(json.preset).toBe('strict');
      expect(Array.isArray(json.files)).toBe(true);
      expect(json.disclaimer).toContain('ai-policy is a deterministic policy compliance validator');
    });
  });
});
