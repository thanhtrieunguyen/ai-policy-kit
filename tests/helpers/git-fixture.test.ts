import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createGitFixture,
  withGitFixture,
  setupPRScenario,
  cleanupAllFixtures,
  GitFixture,
} from './git-fixture.js';

describe('GitFixture Infrastructure', () => {
  afterAll(async () => {
    await cleanupAllFixtures();
  });

  describe('1. Repository Lifecycle & Hermetic Git Initialization', () => {
    it('initializes a temporary hermetic git repository with default branch', async () => {
      await withGitFixture(async (fixture) => {
        expect(fs.existsSync(fixture.repoDir)).toBe(true);
        expect(fs.existsSync(path.join(fixture.repoDir, '.git'))).toBe(true);

        const currentBranch = fixture.getCurrentBranch();
        expect(currentBranch).toBe('main');

        const symbolicRef = fixture.git(['symbolic-ref', '--short', 'HEAD']).trim();
        expect(symbolicRef).toBe('main');

        const userName = fixture.git(['config', 'user.name']).trim();
        const userEmail = fixture.git(['config', 'user.email']).trim();
        const gpgSign = fixture.git(['config', 'commit.gpgsign']).trim();

        expect(userName).toBe('AI Policy Fixture');
        expect(userEmail).toBe('fixture@aipolicykit.local');
        expect(gpgSign).toBe('false');
      });
    });

    it('initializes with custom branch and custom user config', async () => {
      await withGitFixture(
        async (fixture) => {
          const currentBranch = fixture.getCurrentBranch();
          expect(currentBranch).toBe('trunk');

          const symbolicRef = fixture.git(['symbolic-ref', '--short', 'HEAD']).trim();
          expect(symbolicRef).toBe('trunk');

          const userName = fixture.git(['config', 'user.name']).trim();
          const userEmail = fixture.git(['config', 'user.email']).trim();
          expect(userName).toBe('Custom Tester');
          expect(userEmail).toBe('tester@custom.local');
        },
        {
          defaultBranch: 'trunk',
          userName: 'Custom Tester',
          userEmail: 'tester@custom.local',
        }
      );
    });

    it('manages file lifecycle: write, read, exists, and delete', async () => {
      await withGitFixture(async (fixture) => {
        const testFile = 'sub/dir/test.txt';
        const fileContent = 'sample content for testing';

        expect(fixture.exists(testFile)).toBe(false);

        fixture.writeFile(testFile, fileContent);
        expect(fixture.exists(testFile)).toBe(true);
        expect(fixture.readFile(testFile)).toBe(fileContent);

        fixture.deleteFile(testFile);
        expect(fixture.exists(testFile)).toBe(false);
      });
    });
  });

  describe('2. Commit Synthesis & Git Trailer Formatting', () => {
    it('creates standard commit and extracts commit SHA', async () => {
      await withGitFixture(async (fixture) => {
        fixture.writeFile('file.txt', 'hello');
        fixture.stage('file.txt');
        const sha = fixture.commit('feat: initial commit');

        expect(sha).toMatch(/^[0-9a-f]{40}$/);
        const log = fixture.git(['log', '-1', '--pretty=%B']).trim();
        expect(log).toBe('feat: initial commit');
      });
    });

    it('formats single commit trailer conforming to Git trailer RFC', async () => {
      await withGitFixture(async (fixture) => {
        fixture.writeFile('model.ts', 'export const x = 1;');
        fixture.stage('model.ts');
        fixture.commit('feat(core): implement model', {
          trailers: {
            'AI-Assisted': 'Claude 3.5 Sonnet',
          },
        });

        const trailerVal = fixture.getTrailerValue('HEAD', 'AI-Assisted');
        expect(trailerVal).toBe('Claude 3.5 Sonnet');

        const fullMessage = fixture.git(['log', '-1', '--pretty=%B']).trim();
        expect(fullMessage).toContain('feat(core): implement model');
        expect(fullMessage).toContain('AI-Assisted: Claude 3.5 Sonnet');
      });
    });

    it('formats multiple commit trailers using array representation', async () => {
      await withGitFixture(async (fixture) => {
        fixture.writeFile('api.ts', 'export const api = true;');
        fixture.stage('api.ts');
        fixture.commit('feat(api): add endpoint', {
          trailers: [
            { key: 'AI-Assisted', value: 'Gemini 1.5 Pro' },
            { key: 'Co-authored-by', value: 'Jane Developer <jane@example.com>' },
          ],
        });

        const aiTrailer = fixture.getTrailerValue('HEAD', 'AI-Assisted');
        const coAuthored = fixture.getTrailerValue('HEAD', 'Co-authored-by');

        expect(aiTrailer).toBe('Gemini 1.5 Pro');
        expect(coAuthored).toBe('Jane Developer <jane@example.com>');
      });
    });

    it('supports DCO signoff trailer and custom author', async () => {
      await withGitFixture(async (fixture) => {
        fixture.writeFile('doc.md', '# Documentation');
        fixture.stage('doc.md');
        fixture.commit('docs: add documentation', {
          signoff: true,
          author: 'Alice Contributor',
          email: 'alice@example.org',
        });

        const author = fixture.git(['log', '-1', '--pretty=%an <%ae>']).trim();
        expect(author).toBe('Alice Contributor <alice@example.org>');

        const signoffTrailer = fixture.getTrailerValue('HEAD', 'Signed-off-by');
        expect(signoffTrailer).toBe('AI Policy Fixture <fixture@aipolicykit.local>');
      });
    });

    it('allows raw trailer blocks for simulating malformed or boundary trailers', async () => {
      await withGitFixture(async (fixture) => {
        fixture.writeFile('data.json', '{}');
        fixture.stage('data.json');
        // Raw block with custom spacing
        fixture.commit('fix: patch data issue', {
          rawTrailersBlock: 'AI-Assisted: GPT-4o\nCustom-Header: value',
        });

        const trailerVal = fixture.getTrailerValue('HEAD', 'AI-Assisted');
        expect(trailerVal).toBe('GPT-4o');
      });
    });
  });

  describe('3. Branching, Merging, and Diff Inspection', () => {
    it('creates branches, commits on feature branch, and generates accurate diffs', async () => {
      await withGitFixture(async (fixture) => {
        // Base commit on main
        fixture.writeFile('README.md', '# Project');
        fixture.stage('README.md');
        fixture.commit('chore: initialize project');

        // Feature branch
        fixture.checkout('feature/add-service', { create: true });
        fixture.writeFile('service.ts', 'class Service {}');
        fixture.stage('service.ts');
        fixture.commit('feat: add service');

        const diff = fixture.getDiff('main', 'feature/add-service');
        expect(diff.split('\n')).toContain('service.ts');
        expect(diff.split('\n')).not.toContain('README.md');
      });
    });

    it('inspects cached (staged) diff accurately', async () => {
      await withGitFixture(async (fixture) => {
        fixture.writeFile('staged.txt', 'staged content');
        fixture.stage('staged.txt');

        const stagedDiff = fixture.getDiff(undefined, undefined, { cached: true });
        expect(stagedDiff.split('\n')).toContain('staged.txt');
      });
    });

    it('performs merge and tagging operations', async () => {
      await withGitFixture(async (fixture) => {
        fixture.writeFile('base.txt', 'base');
        fixture.stage('base.txt');
        fixture.commit('init');
        fixture.tag('v0.1.0', { annotated: true, message: 'Release v0.1.0' });

        fixture.checkout('feature/quick', { create: true });
        fixture.writeFile('quick.txt', 'quick');
        fixture.stage('quick.txt');
        fixture.commit('feat: quick feature');

        fixture.checkout('main');
        fixture.merge('feature/quick', { noFf: true, message: 'Merge feature/quick' });

        const log = fixture.git(['log', '-1', '--pretty=%s']).trim();
        expect(log).toBe('Merge feature/quick');
        expect(fixture.exists('quick.txt')).toBe(true);
      });
    });
  });

  describe('4. AI Assistant Workspace Leak Simulation', () => {
    it('creates standard Cursor workspace leak file (committed)', async () => {
      await withGitFixture(async (fixture) => {
        fixture.writeFile('index.js', 'console.log(1);');
        fixture.stage('index.js');
        fixture.commit('feat: initial app');

        fixture.checkout('feature/cursor-pr', { create: true });
        const leakPath = fixture.createLeak('cursor', { committed: true });

        expect(leakPath).toBe('.cursor/rules/custom-instructions.mdc');
        expect(fixture.exists(leakPath)).toBe(true);

        const diff = fixture.getDiff('main', 'HEAD');
        expect(diff.replace(/\\/g, '/')).toContain('.cursor/rules/custom-instructions.mdc');
      });
    });

    it('creates standard Claude, Gemini, and Continue leaks', async () => {
      await withGitFixture(async (fixture) => {
        const claudeLeak = fixture.createLeak('claude', { staged: true });
        const geminiLeak = fixture.createLeak('gemini', { staged: true });
        const continueLeak = fixture.createLeak('continue', { staged: true });

        expect(claudeLeak).toBe('.claude/config.json');
        expect(geminiLeak).toBe('.gemini/settings.json');
        expect(continueLeak).toBe('.continue/config.json');

        const stagedDiff = fixture.getDiff(undefined, undefined, { cached: true });
        const normalizedDiff = stagedDiff.replace(/\\/g, '/');

        expect(normalizedDiff).toContain('.claude/config.json');
        expect(normalizedDiff).toContain('.gemini/settings.json');
        expect(normalizedDiff).toContain('.continue/config.json');
      });
    });

    it('creates custom leak path with custom payload', async () => {
      await withGitFixture(async (fixture) => {
        const customPath = '.copilot/settings.json';
        const customContent = '{"copilot": true}';

        const leakPath = fixture.createLeak('custom', {
          path: customPath,
          content: customContent,
          committed: true,
        });

        expect(leakPath).toBe(customPath);
        expect(fixture.readFile(customPath)).toBe(customContent);
      });
    });
  });

  describe('5. High-Level PR Scenario Setup', () => {
    it('constructs a multi-commit PR scenario with policy config, trailers, and leaks', async () => {
      await withGitFixture(async (fixture) => {
        const policyConfig = {
          version: '0.1',
          level: 'strict',
          categories: { generated_code: 'allowed' },
          disclosure: {
            commit_trailer: {
              key: 'AI-Assisted',
              required: true,
              pattern: '^AI-Assisted: .+$',
            },
          },
        };

        const { baseRef, headRef } = await setupPRScenario(fixture, {
          baseBranch: 'main',
          featureBranch: 'feature/ai-integration',
          policyConfig,
          baseCommits: [
            {
              message: 'feat: add user model',
              files: { 'src/user.ts': 'export class User {}' },
            },
          ],
          featureCommits: [
            {
              message: 'feat(ai): integrate intelligence service',
              files: { 'src/ai-service.ts': 'export class AIService {}' },
              trailers: { 'AI-Assisted': 'Claude 3.5 Sonnet' },
              leaks: ['cursor'],
            },
          ],
        });

        expect(baseRef).toBe('main');
        expect(headRef).toBe('feature/ai-integration');

        // Verify policy exists in git
        fixture.checkout(baseRef);
        expect(fixture.exists('.github/ai-policy.yml')).toBe(true);

        // Verify feature branch has trailer and leak
        fixture.checkout(headRef);
        const trailer = fixture.getTrailerValue('HEAD', 'AI-Assisted');
        expect(trailer).toBe('Claude 3.5 Sonnet');

        const diff = fixture.getDiff(baseRef, headRef);
        const normalizedDiff = diff.replace(/\\/g, '/');
        expect(normalizedDiff).toContain('src/ai-service.ts');
        expect(normalizedDiff).toContain('.cursor/rules/custom-instructions.mdc');
      });
    });
  });

  describe('6. Teardown Reliability & Windows Protection', () => {
    it('cleans up temporary repository directory and removes all files', async () => {
      let createdRepoDir = '';
      await withGitFixture(async (fixture) => {
        createdRepoDir = fixture.repoDir;
        fixture.writeFile('file1.txt', '1');
        fixture.writeFile('file2.txt', '2');
        expect(fs.existsSync(createdRepoDir)).toBe(true);
      });

      expect(fs.existsSync(createdRepoDir)).toBe(false);
    });

    it('supports synchronous cleanup with cleanupSync', async () => {
      const fixture = await createGitFixture();
      const repoDir = fixture.repoDir;
      expect(fs.existsSync(repoDir)).toBe(true);

      fixture.writeFile('sync-test.txt', 'data');
      fixture.cleanupSync();

      expect(fs.existsSync(repoDir)).toBe(false);
    });

    it('handles idempotent cleanup calls safely', async () => {
      const fixture = await createGitFixture();
      expect(fs.existsSync(fixture.repoDir)).toBe(true);

      await fixture.cleanup();
      // Second cleanup should not throw
      await expect(fixture.cleanup()).resolves.toBeUndefined();
    });

    it('cleans up repositories containing read-only files (Windows lock simulation)', async () => {
      const fixture = await createGitFixture();
      const readOnlyFile = path.join(fixture.repoDir, 'readonly.txt');
      fs.writeFileSync(readOnlyFile, 'read only content', 'utf-8');
      fs.chmodSync(readOnlyFile, 0o444);

      await expect(fixture.cleanup()).resolves.toBeUndefined();
      expect(fs.existsSync(fixture.repoDir)).toBe(false);
    });
  });
});
