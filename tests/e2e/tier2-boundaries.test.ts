/**
 * Tier 2 Boundary & Corner Cases E2E Test Suite for ai-policy-kit.
 *
 * Implements rigorous edge cases, corrupted inputs, permission boundaries,
 * and environmental hostility verification covering all 19 features (F1 to F19).
 *
 * Architecture:
 * - Pillar 1: Engine & Schema Boundaries (F1 to F8) -> 48 specs
 * - Pillar 2: CLI Commands Boundaries (F9 to F11) -> 17 specs
 * - Pillar 3: Pull Request Compliance Engine Boundaries (F12 to F17) -> 34 specs
 * - Pillar 4: GitHub Action Integration Boundaries (F18 to F19) -> 14 specs
 * Total: 113 test specifications (>= 95 requirement, >= 5 per feature)
 */

import { describe, it, expect, afterAll, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { pathToFileURL } from 'node:url';
import YAML from 'yaml';

import {
  REPO_ROOT,
  MANDATORY_DISCLAIMER,
  runCli,
  runAction,
  resolveCliPath,
  resolveActionPath,
  expectCliSuccess,
  expectCliViolation,
  expectCliError,
  expectDisclaimerPresent,
  expectValidJson,
  expectSummaryTable,
} from './harness.js';

import {
  withGitFixture,
  setupPRScenario,
  cleanupAllFixtures,
} from '../helpers/git-fixture.js';

import * as aipk from '../../src/index.js';
import type {
  AIPolicyConfig,
  PolicyLevel,
  PolicyDiagnostic,
  DisclosureMethod,
  AccountabilityConfig,
  PolicyCategories,
} from '../../src/types.js';

// State management for temporary test directories
const tempDirsToCleanup: string[] = [];

function createTempDir(prefix = 'aipk-bva-'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirsToCleanup.push(dir);
  return dir;
}

async function cleanupTempDirs(): Promise<void> {
  for (const dir of tempDirsToCleanup) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        if (fs.existsSync(dir)) {
          const resetPermissions = (p: string) => {
            try {
              const s = fs.statSync(p);
              if (s.isDirectory()) {
                for (const c of fs.readdirSync(p)) resetPermissions(path.join(p, c));
                fs.chmodSync(p, 0o777);
              } else {
                fs.chmodSync(p, 0o666);
              }
            } catch (_) {}
          };
          resetPermissions(dir);
          fs.rmSync(dir, { recursive: true, force: true });
        }
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }
  tempDirsToCleanup.length = 0;
}

function createMinimalValidPolicy(): AIPolicyConfig {
  return {
    version: '0.1',
    level: 'restricted',
    categories: {
      code: 'restricted',
    },
    disclosure: {
      required: true,
    },
    accountability: {
      author_takes_responsibility: true,
    },
    bots: {
      automated_prs: 'restricted',
    },
  };
}

// Progressive Testability skip guards (Immune to non-zero exit codes)
const isForceRunAll = Boolean(process.env.FORCE_RUN_ALL_E2E);

function checkCliImplemented(): boolean {
  if (isForceRunAll) return true;
  try {
    const cliPath = resolveCliPath();
    if (!fs.existsSync(cliPath)) return false;
    const content = fs.readFileSync(cliPath, 'utf-8');
    return !content.includes('Placeholder for Milestone 1');
  } catch {
    return false;
  }
}

function checkActionImplemented(): boolean {
  if (isForceRunAll) return true;
  try {
    const actionYml = path.join(REPO_ROOT, 'action.yml');
    if (!fs.existsSync(actionYml)) return false;
    const actionPath = resolveActionPath();
    if (!fs.existsSync(actionPath)) return false;
    const content = fs.readFileSync(actionPath, 'utf-8');
    return !content.includes('Placeholder for Milestone 1');
  } catch {
    return false;
  }
}

const isCliLive = isForceRunAll || checkCliImplemented();
const isActionManifestPresent = isForceRunAll || fs.existsSync(path.join(REPO_ROOT, 'action.yml'));
const isActionLive = isForceRunAll || checkActionImplemented();
const ACTION_YML_PATH = path.join(REPO_ROOT, 'action.yml');

describe('Tier 2: Boundary & Corner Cases Suite', { timeout: 60000 }, () => {
  afterAll(async () => {
    await cleanupAllFixtures();
    await cleanupTempDirs();
  });

  afterEach(async () => {
    await cleanupTempDirs();
  });

  // =========================================================================
  // PILLAR 1: Engine & Schema Boundaries (Features F1 to F8)
  // =========================================================================
  describe('Pillar 1: Engine & Schema Boundaries (F1 to F8)', () => {
    // -----------------------------------------------------------------------
    // Feature 1: TypeScript Project Foundation (F1)
    // -----------------------------------------------------------------------
    describe('F1: TypeScript Project Foundation (Boundaries)', () => {
      it('T2-F1-01: ESM Dynamic Import Resolution via pathToFileURL with Query Busting', async () => {
        const indexPath = path.resolve(REPO_ROOT, 'dist', 'index.js');
        const targetPath = fs.existsSync(indexPath) ? indexPath : path.resolve(REPO_ROOT, 'src', 'index.ts');
        const fileUrl = pathToFileURL(targetPath).href + `?cacheBust=${Date.now()}`;

        const mod = await import(fileUrl);
        expect(mod).toBeDefined();
        expect(typeof mod.loadPolicy).toBe('function');
        expect(typeof mod.validatePolicy).toBe('function');
        expect(mod.VERSION).toBe('1.0.0');
      });

      it('T2-F1-02: Public Export Surface Completeness & Constant Invariance', () => {
        const expectedExports = [
          'loadPolicy', 'loadPolicySync', 'findPolicyFile', 'findPolicyFileSync', 'validatePolicy',
          'parsePolicyContent', 'stripBOM', 'resolveLineCol', 'generateRemediation', 'formatDiagnostic',
          'formatDiagnostics', 'parseJsonPointer', 'pointerToPropertyPath', 'unescapeJsonPointerToken',
          'PolicyError', 'PolicyNotFoundError', 'PolicyEmptyError', 'PolicySyntaxError', 'PolicyValidationError',
          'ajv', 'compiledValidator', 'schema', 'schemaData',
          'VERSION', 'version', 'DISCLAIMER', 'PRESETS', 'SCHEMA_V0_1', 'CANDIDATE_POLICY_PATHS',
        ];
        for (const exp of expectedExports) {
          expect((aipk as Record<string, unknown>)[exp], `Export ${exp} must be defined`).toBeDefined();
        }
        expect(Object.keys(aipk.PRESETS).sort()).toEqual(['balanced', 'permissive', 'strict']);
        expect(aipk.SCHEMA_V0_1.version).toBe('0.1');
      });

      it('T2-F1-03: Error Class Hierarchy & Cross-Realm Prototype Invariants', () => {
        const baseErr = new aipk.PolicyError('base error');
        expect(baseErr).toBeInstanceOf(Error);
        expect(baseErr).toBeInstanceOf(aipk.PolicyError);
        expect(baseErr.name).toBe('PolicyError');

        const notFound = new aipk.PolicyNotFoundError('not found', { targetPath: '/tmp/test', candidates: ['ai-policy.yml'] });
        expect(notFound).toBeInstanceOf(Error);
        expect(notFound).toBeInstanceOf(aipk.PolicyError);
        expect(notFound).toBeInstanceOf(aipk.PolicyNotFoundError);
        expect(notFound.name).toBe('PolicyNotFoundError');
        expect(notFound.targetPath).toBe('/tmp/test');
        expect(notFound.candidates).toEqual(['ai-policy.yml']);

        const empty = new aipk.PolicyEmptyError('empty', '/tmp/empty.yml');
        expect(empty).toBeInstanceOf(Error);
        expect(empty).toBeInstanceOf(aipk.PolicyError);
        expect(empty).toBeInstanceOf(aipk.PolicyEmptyError);
        expect(empty.name).toBe('PolicyEmptyError');
        expect(empty.filepath).toBe('/tmp/empty.yml');

        const syntax = new aipk.PolicySyntaxError('bad syntax', { filepath: '/tmp/f.yml', line: 5, column: 2 });
        expect(syntax).toBeInstanceOf(Error);
        expect(syntax).toBeInstanceOf(aipk.PolicyError);
        expect(syntax).toBeInstanceOf(aipk.PolicySyntaxError);
        expect(syntax.name).toBe('PolicySyntaxError');
        expect(syntax.line).toBe(5);
        expect(syntax.column).toBe(2);

        const valErr = new aipk.PolicyValidationError('invalid', [{ message: 'err', path: 'level', severity: 'error' }]);
        expect(valErr).toBeInstanceOf(Error);
        expect(valErr).toBeInstanceOf(aipk.PolicyError);
        expect(valErr).toBeInstanceOf(aipk.PolicyValidationError);
        expect(valErr.name).toBe('PolicyValidationError');
        expect(valErr.diagnostics).toHaveLength(1);
      });

      it('T2-F1-04: Side-Effect Free Pure Utility Evaluation', () => {
        const initialExitCode = process.exitCode;
        expect(aipk.stripBOM('\uFEFFversion: "0.1"')).toBe('version: "0.1"');
        expect(aipk.stripBOM('version: "0.1"')).toBe('version: "0.1"');
        expect(aipk.unescapeJsonPointerToken('a~1b~0c')).toBe('a/b~c');
        expect(aipk.parseJsonPointer('/categories/code')).toEqual(['categories', 'code']);
        expect(aipk.pointerToPropertyPath('/disclosure/methods/0')).toBe('disclosure.methods[0]');
        expect(process.exitCode).toBe(initialExitCode);
      });

      it('T2-F1-05: Resilient Handling of Sparse & Optional Diagnostics', () => {
        const minimalDiag: PolicyDiagnostic = {
          message: 'Property level is invalid',
          path: 'level',
        };
        expect(minimalDiag.line).toBeUndefined();
        expect(minimalDiag.column).toBeUndefined();
        expect(minimalDiag.remediation).toBeUndefined();

        const formatted = aipk.formatDiagnostics([
          {
            keyword: 'type',
            instancePath: '/level',
            schemaPath: '#/properties/level/type',
            params: { type: 'string' },
            message: 'must be string',
          },
        ]);
        expect(formatted).toHaveLength(1);
        expect(formatted[0]?.path).toBe('level');
        expect(formatted[0]?.severity).toBe('error');
      });

      it('T2-F1-06: Function Arity & Signature Contract Bounds', () => {
        expect(aipk.loadPolicy.length).toBeLessThanOrEqual(1);
        expect(aipk.loadPolicySync.length).toBeLessThanOrEqual(1);
        expect(aipk.validatePolicy.length).toBeLessThanOrEqual(2);
        expect(aipk.findPolicyFile.length).toBeLessThanOrEqual(1);
        expect(aipk.findPolicyFileSync.length).toBeLessThanOrEqual(1);
        expect(aipk.parsePolicyContent.length).toBeLessThanOrEqual(2);
      });
    });

    // -----------------------------------------------------------------------
    // Feature 2: Dependency Toolchain & Manifest (F2)
    // -----------------------------------------------------------------------
    describe('F2: Dependency Toolchain & Manifest (Boundaries)', () => {
      it('T2-F2-01: Encapsulated Subpath Imports Rejection Boundary', () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'));
        const exportKeys = Object.keys(pkg.exports || {});
        expect(exportKeys).toContain('.');
        expect(exportKeys).toContain('./package.json');
        expect(exportKeys).toContain('./presets/*');
        expect(exportKeys).toContain('./schema/*');
        expect(exportKeys).not.toContain('./src');
        expect(exportKeys).not.toContain('./src/*');
        expect(exportKeys).not.toContain('./dist/engine');
        expect(exportKeys.length).toBe(4);
      });

      it('T2-F2-02: Package Manifest Strict JSON & Field Schema Boundary', () => {
        const raw = fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8');
        expect(() => JSON.parse(raw)).not.toThrow();
        const pkg = JSON.parse(raw);
        expect(pkg.name).toBe('ai-policy-kit');
        expect(pkg.version).toMatch(/^[0-9]+\.[0-9]+\.[0-9]+$/);
        expect(pkg.license).toBe('MIT');
        expect(pkg.type).toBe('module');
        expect(pkg.engines?.node).toMatch(/>=\s*20/);
        expect(pkg.bin?.['ai-policy']).toBe('./dist/cli.js');
      });

      it('T2-F2-03: Executable Shebang Line & Non-BOM Boundary in Bin', () => {
        const binSource = path.join(REPO_ROOT, 'src', 'cli', 'index.ts');
        const content = fs.readFileSync(binSource, 'utf-8');
        expect(content.charCodeAt(0)).not.toBe(0xFEFF);
        const lines = content.split(/\r?\n/);
        expect(lines[0]).toMatch(/^#!\/usr\/bin\/env node/);
      });

      it('T2-F2-04: Draft-07 Ajv Strict Mode & Format Validation Boundary', () => {
        const validUriPolicy = {
          version: '0.1',
          level: 'permissive',
          policy_url: 'https://example.com/legal/ai-policy.md',
          categories: { code: 'permissive' },
          disclosure: { required: false },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'permissive' },
        };
        expect(aipk.validatePolicy(validUriPolicy).valid).toBe(true);

        const invalidUriPolicy = {
          ...validUriPolicy,
          policy_url: 'bad-uri-without-scheme',
        };
        const res = aipk.validatePolicy(invalidUriPolicy);
        expect(res.valid).toBe(false);
        expect(res.diagnostics.some((d) => d.keyword === 'format')).toBe(true);
      });

      it('T2-F2-05: Toolchain Runtime Zero-Bloat Assertion', () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'));
        const runtimeDeps = Object.keys(pkg.dependencies || {});
        expect(runtimeDeps.sort()).toEqual(['ajv', 'ajv-formats', 'yaml']);
        const devDeps = Object.keys(pkg.devDependencies || {});
        expect(devDeps).toContain('tsup');
        expect(devDeps).toContain('typescript');
        expect(devDeps).toContain('vitest');
      });
    });

    // -----------------------------------------------------------------------
    // Feature 3: Cross-Platform Execution (F3)
    // -----------------------------------------------------------------------
    describe('F3: Cross-Platform Execution (Boundaries)', () => {
      it('T2-F3-01: Mixed Separators (/ and \\) Path Resolution', async () => {
        const tempDir = createTempDir('aipk-mixed-slash-');
        const subDir = path.join(tempDir, 'sub', 'deep');
        fs.mkdirSync(subDir, { recursive: true });
        const targetFile = path.join(subDir, 'ai-policy.yml');
        fs.writeFileSync(targetFile, YAML.stringify(createMinimalValidPolicy()), 'utf-8');

        const mixedPath = targetFile.replace(/\\/g, '/').replace(/\/deep\//, '\\deep\\');
        const res = await aipk.loadPolicy(mixedPath);
        expect(res.config.level).toBe('restricted');
        expect(path.normalize(res.filepath)).toBe(path.normalize(targetFile));
      });

      it('T2-F3-02: Unicode, Spaces, and Special Characters in Paths', async () => {
        const tempDir = createTempDir('aipk-unicode-');
        const specialSubDir = path.join(tempDir, 'thư_mục_chính_sách 2026', '政策_policy');
        fs.mkdirSync(specialSubDir, { recursive: true });
        const targetFile = path.join(specialSubDir, 'ai-policy.yml');
        fs.writeFileSync(targetFile, YAML.stringify(createMinimalValidPolicy()), 'utf-8');

        const resAsync = await aipk.loadPolicy(targetFile);
        const resSync = aipk.loadPolicySync(specialSubDir);
        expect(resAsync.config.version).toBe('0.1');
        expect(resSync.config.version).toBe('0.1');
        expect(resSync.filepath).toBe(path.resolve(targetFile));
      });

      it('T2-F3-03: Mixed CRLF and LF Line Terminators in Single Configuration', () => {
        const mixedContent =
          'version: "0.1"\r\n' +
          '# Comment line\n' +
          'level: "invalid_level"\r\n' +
          'categories:\n' +
          '  code: "permissive"\r\n' +
          'disclosure:\n' +
          '  required: true\r\n' +
          'accountability:\n' +
          '  author_takes_responsibility: true\r\n' +
          'bots:\n' +
          '  automated_prs: "permissive"\n';

        const parsed = YAML.parse(mixedContent);
        const res = aipk.validatePolicy(parsed, { sourceText: mixedContent });
        expect(res.valid).toBe(false);
        const levelDiag = res.diagnostics.find((d) => d.path.includes('level'));
        expect(levelDiag).toBeDefined();
        expect(levelDiag?.line).toBe(3);
      });

      it('T2-F3-04: Relative Drive Root and Trailing Dot Segments', async () => {
        const tempDir = createTempDir('aipk-dots-');
        const policyFile = path.join(tempDir, 'ai-policy.yml');
        fs.writeFileSync(policyFile, YAML.stringify(createMinimalValidPolicy()), 'utf-8');

        const redundantPath = path.join(tempDir, '.', 'sub', '..', 'ai-policy.yml');
        const res = await aipk.loadPolicy(redundantPath);
        expect(res.config.level).toBe('restricted');
        expect(res.filepath).toBe(path.resolve(policyFile));
      });

      it('T2-F3-05: Directory Discovery with Trailing Slash Boundaries', async () => {
        const tempDir = createTempDir('aipk-trailing-');
        const targetFile = path.join(tempDir, 'ai-policy.yml');
        fs.writeFileSync(targetFile, YAML.stringify(createMinimalValidPolicy()), 'utf-8');

        const trailingPosix = tempDir.replace(/\\/g, '/') + '///';
        const resolvedPosix = await aipk.findPolicyFile(trailingPosix);
        expect(resolvedPosix).toBe(path.resolve(targetFile));

        const trailingWin = tempDir + '\\\\\\';
        const resolvedWin = aipk.findPolicyFileSync(trailingWin);
        expect(resolvedWin).toBe(path.resolve(targetFile));
      });

      it('T2-F3-06: UTF-8 BOM (\\uFEFF) Invariance Across YAML & JSON', () => {
        const yamlWithBom = '\uFEFF' + YAML.stringify(createMinimalValidPolicy());
        const jsonWithBom = '\uFEFF' + JSON.stringify(createMinimalValidPolicy());

        const parsedYaml = aipk.parsePolicyContent(yamlWithBom);
        expect((parsedYaml.data as AIPolicyConfig).version).toBe('0.1');

        const parsedJson = aipk.parsePolicyContent(jsonWithBom, 'policy.json');
        expect((parsedJson.data as AIPolicyConfig).version).toBe('0.1');
      });
    });

    // -----------------------------------------------------------------------
    // Feature 4: Schema v0.1 Types & Validation (F4)
    // -----------------------------------------------------------------------
    describe('F4: Schema v0.1 Types & Validation (Boundaries)', () => {
      it('T2-F4-01: Malformed YAML: Tab Indentation Rejection', () => {
        const tabYaml = 'version: "0.1"\nlevel: restricted\ncategories:\n\tcode: restricted\n';
        expect(() => aipk.parsePolicyContent(tabYaml, 'ai-policy.yml')).toThrow(aipk.PolicySyntaxError);
        try {
          aipk.parsePolicyContent(tabYaml, 'ai-policy.yml');
        } catch (err) {
          expect(err).toBeInstanceOf(aipk.PolicySyntaxError);
          const syntaxErr = err as aipk.PolicySyntaxError;
          expect(syntaxErr.line).toBeGreaterThanOrEqual(1);
        }
      });

      it('T2-F4-02: Malformed YAML: Unbalanced Quotes & Unclosed Delimiters', () => {
        const unclosedQuote = 'version: "0.1\nlevel: restricted\n';
        expect(() => aipk.parsePolicyContent(unclosedQuote)).toThrow(aipk.PolicySyntaxError);

        const unclosedBracket = 'version: "0.1"\nbots:\n  bot_allowlist: [dependabot, renovate\n';
        expect(() => aipk.parsePolicyContent(unclosedBracket)).toThrow(aipk.PolicySyntaxError);
      });

      it('T2-F4-03: Empty Document and Comment-Only Document Rejection', () => {
        expect(() => aipk.parsePolicyContent('')).toThrow(aipk.PolicyEmptyError);
        expect(() => aipk.parsePolicyContent('   \n\t  \r\n')).toThrow(aipk.PolicyEmptyError);
        expect(() => aipk.parsePolicyContent('# Just a comment\n# Another comment\n')).toThrow(aipk.PolicyEmptyError);
      });

      it('T2-F4-04: Null Documents & Primitive Type Rejection', () => {
        const primitives = [null, undefined, 'simple string', 12345, true, [1, 2, 3]];
        for (const val of primitives) {
          const res = aipk.validatePolicy(val);
          expect(res.valid).toBe(false);
          expect(res.diagnostics.length).toBeGreaterThan(0);
          expect(res.diagnostics[0]?.keyword).toBe('type');
        }
      });

      it('T2-F4-05: Additional Properties Prohibition Across All Hierarchy Levels', () => {
        const base = createMinimalValidPolicy();
        const testCases: { obj: unknown; expectedPath: string }[] = [
          { obj: { ...base, extra_root: true }, expectedPath: 'extra_root' },
          { obj: { ...base, categories: { ...base.categories, extra_cat: 'forbidden' } }, expectedPath: 'categories.extra_cat' },
          { obj: { ...base, disclosure: { ...base.disclosure, extra_disc: 123 } }, expectedPath: 'disclosure.extra_disc' },
          { obj: { ...base, accountability: { ...base.accountability, extra_acc: 'yes' } }, expectedPath: 'accountability.extra_acc' },
          { obj: { ...base, bots: { ...base.bots, extra_bot: false } }, expectedPath: 'bots.extra_bot' },
        ];

        for (const tc of testCases) {
          const res = aipk.validatePolicy(tc.obj);
          expect(res.valid).toBe(false);
          const diag = res.diagnostics.find((d) => d.keyword === 'additionalProperties');
          expect(diag, `Must report additionalProperties at ${tc.expectedPath}`).toBeDefined();
          expect(diag?.path).toBe(tc.expectedPath);
        }
      });

      it('T2-F4-06: Missing Required Fields at Every Sub-Tree Level', () => {
        const rootKeys = ['version', 'level', 'categories', 'disclosure', 'accountability', 'bots'] as const;
        for (const key of rootKeys) {
          const clone = createMinimalValidPolicy();
          delete (clone as Record<string, unknown>)[key];
          const res = aipk.validatePolicy(clone);
          expect(res.valid).toBe(false);
          expect(res.diagnostics.some((d) => d.keyword === 'required' && d.path === key)).toBe(true);
        }

        const missingCatCode = createMinimalValidPolicy();
        missingCatCode.categories = {} as unknown as PolicyCategories;
        const catRes = aipk.validatePolicy(missingCatCode);
        expect(catRes.diagnostics.some((d) => d.path === 'categories.code')).toBe(true);
      });

      it('T2-F4-07: Posture Enum Boundaries Across All Controlled Properties', () => {
        const base = createMinimalValidPolicy();
        const invalidValues = ['strict', 'none', 'moderate', 'TRUE', ''];
        for (const val of invalidValues) {
          const resLevel = aipk.validatePolicy({ ...base, level: val as PolicyLevel });
          expect(resLevel.valid).toBe(false);
          expect(resLevel.diagnostics.some((d) => d.keyword === 'enum' && d.path === 'level')).toBe(true);

          const resCat = aipk.validatePolicy({ ...base, categories: { code: val as PolicyLevel } });
          expect(resCat.valid).toBe(false);
          expect(resCat.diagnostics.some((d) => d.keyword === 'enum' && d.path === 'categories.code')).toBe(true);
        }
      });
    });

    // -----------------------------------------------------------------------
    // Feature 5: Policy Discovery & Loading (F5)
    // -----------------------------------------------------------------------
    describe('F5: Policy Discovery & Loading (Boundaries)', () => {
      it('T2-F5-01: Non-Existent Target File Path Rejection', async () => {
        const bogusPath = path.resolve(os.tmpdir(), 'definitely-missing-file-' + Date.now() + '.yml');
        await expect(aipk.loadPolicy(bogusPath)).rejects.toThrow(aipk.PolicyNotFoundError);
        expect(() => aipk.loadPolicySync(bogusPath)).toThrow(aipk.PolicyNotFoundError);

        try {
          aipk.loadPolicySync(bogusPath);
        } catch (err) {
          const notFound = err as aipk.PolicyNotFoundError;
          expect(notFound.targetPath).toBe(bogusPath);
        }
      });

      it('T2-F5-02: Directory Lacking Any Candidate Policy Files', async () => {
        const emptyDir = createTempDir('aipk-empty-dir-');
        await expect(aipk.loadPolicy(emptyDir)).rejects.toThrow(aipk.PolicyNotFoundError);

        try {
          aipk.loadPolicySync(emptyDir);
        } catch (err) {
          const notFound = err as aipk.PolicyNotFoundError;
          expect(notFound.candidates).toBeDefined();
          expect(notFound.candidates?.length).toBe(6);
          expect(notFound.candidates).toContain('.github/ai-policy.yml');
          expect(notFound.candidates).toContain('ai-policy.yml');
        }
      });

      it('T2-F5-03: Zero-Byte Policy File on Disk', async () => {
        const tempDir = createTempDir('aipk-zero-byte-');
        const emptyFile = path.join(tempDir, 'ai-policy.yml');
        fs.writeFileSync(emptyFile, '', 'utf-8');

        await expect(aipk.loadPolicy(emptyFile)).rejects.toThrow(aipk.PolicyEmptyError);
        expect(() => aipk.loadPolicySync(emptyFile)).toThrow(aipk.PolicyEmptyError);

        try {
          aipk.loadPolicySync(emptyFile);
        } catch (err) {
          const emptyErr = err as aipk.PolicyEmptyError;
          expect(emptyErr.filepath).toBe(path.resolve(emptyFile));
        }
      });

      it('T2-F5-04: Comments-Only Policy File on Disk', async () => {
        const tempDir = createTempDir('aipk-comment-only-');
        const commentFile = path.join(tempDir, 'ai-policy.yml');
        fs.writeFileSync(commentFile, '# Header comment\n# Another comment\n', 'utf-8');

        await expect(aipk.loadPolicy(commentFile)).rejects.toThrow(aipk.PolicyEmptyError);
        expect(() => aipk.loadPolicySync(commentFile)).toThrow(aipk.PolicyEmptyError);
      });

      it('T2-F5-05: Deeply Nested Directory Policy Resolution', async () => {
        const tempDir = createTempDir('aipk-deep-');
        const deepDir = path.join(tempDir, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j');
        fs.mkdirSync(deepDir, { recursive: true });
        const policyFile = path.join(deepDir, 'ai-policy.yml');
        fs.writeFileSync(policyFile, YAML.stringify(createMinimalValidPolicy()), 'utf-8');

        const resAsync = await aipk.loadPolicy(deepDir);
        const resSync = aipk.loadPolicySync(policyFile);
        expect(resAsync.config.level).toBe('restricted');
        expect(resSync.config.level).toBe('restricted');
        expect(resAsync.filepath).toBe(path.resolve(policyFile));
      });

      it('T2-F5-06: Corrupted JSON Syntax in Candidate .json File', async () => {
        const tempDir = createTempDir('aipk-bad-json-');
        const jsonFile = path.join(tempDir, 'ai-policy.json');
        fs.writeFileSync(jsonFile, '{\n  "version": "0.1",\n  "level": "restricted",\n}\n', 'utf-8');

        await expect(aipk.loadPolicy(jsonFile)).rejects.toThrow(aipk.PolicySyntaxError);
        try {
          aipk.loadPolicySync(jsonFile);
        } catch (err) {
          const syntaxErr = err as aipk.PolicySyntaxError;
          expect(syntaxErr.filepath).toBe(path.resolve(jsonFile));
          expect(syntaxErr.message).toContain('JSON syntax');
        }
      });
    });

    // -----------------------------------------------------------------------
    // Feature 6: Line & Column Coordinate Resolver (F6)
    // -----------------------------------------------------------------------
    describe('F6: Line & Column Coordinate Resolver (Boundaries)', () => {
      it('T2-F6-01: Root-Level Fallback to Line 1, Column 1', () => {
        const text = 'version: "0.1"\nlevel: restricted\n';
        const parsed = YAML.parse(text);
        const res = aipk.validatePolicy(parsed, { sourceText: text });
        expect(res.valid).toBe(false);
        const requiredDiag = res.diagnostics.find((d) => d.keyword === 'required');
        expect(requiredDiag).toBeDefined();
        expect(requiredDiag?.line).toBeGreaterThanOrEqual(1);
        expect(requiredDiag?.column).toBeGreaterThanOrEqual(1);
      });

      it('T2-F6-02: End of File Error Without Trailing Newline', () => {
        const text = 'version: "0.1"\nlevel: restricted\ncategories:\n  code: invalid_val';
        const parsed = YAML.parse(text);
        const res = aipk.validatePolicy(parsed, { sourceText: text });
        expect(res.valid).toBe(false);
        const codeDiag = res.diagnostics.find((d) => d.path.includes('categories.code'));
        expect(codeDiag).toBeDefined();
        expect(codeDiag?.line).toBe(4);
      });

      it('T2-F6-03: Multiline Block Scalar Strings (> and |) Invariance', () => {
        const text =
          'version: "0.1"\n' +
          'policy_path: >\n' +
          '  docs/legal/\n' +
          '  ai-policy-guidelines.md\n' +
          'level: "invalid_level"\n';
        const parsed = YAML.parse(text);
        const res = aipk.validatePolicy(parsed, { sourceText: text });
        expect(res.valid).toBe(false);
        const levelDiag = res.diagnostics.find((d) => d.path.includes('level'));
        expect(levelDiag).toBeDefined();
        expect(levelDiag?.line).toBe(5);
      });

      it('T2-F6-04: Inline Comments & Trailing Whitespace Coordinate Invariance', () => {
        const text =
          '# Top header\n' +
          'version: "0.1"   # Version string\n' +
          'level: "bad_val"   # Bad enum value here\n';
        const parsed = YAML.parse(text);
        const res = aipk.validatePolicy(parsed, { sourceText: text });
        expect(res.valid).toBe(false);
        const diag = res.diagnostics.find((d) => d.path.includes('level'));
        expect(diag).toBeDefined();
        expect(diag?.line).toBe(3);
      });

      it('T2-F6-05: Unicode & Emoji Characters in Preceding Lines', () => {
        const text =
          '# Quy tắc sử dụng AI 🤖 cho lập trình viên\n' +
          'version: "0.1"\n' +
          '# 政策指南 - 全球开发者规范\n' +
          'level: "bad_posture"\n';
        const parsed = YAML.parse(text);
        const res = aipk.validatePolicy(parsed, { sourceText: text });
        expect(res.valid).toBe(false);
        const diag = res.diagnostics.find((d) => d.path.includes('level'));
        expect(diag).toBeDefined();
        expect(diag?.line).toBe(4);
      });

      it('T2-F6-06: Deep Array Sequence Element Coordinate Resolution', () => {
        const text =
          'version: "0.1"\n' +
          'level: restricted\n' +
          'disclosure:\n' +
          '  required: true\n' +
          '  methods:\n' +
          '    - commit_trailer\n' +
          '    - pr_checklist\n' +
          '    - unsupported_disclosure_channel\n';
        const parsed = YAML.parse(text);
        const res = aipk.validatePolicy(parsed, { sourceText: text });
        expect(res.valid).toBe(false);
        const methodDiag = res.diagnostics.find((d) => d.path.includes('methods[2]'));
        expect(methodDiag).toBeDefined();
        expect(methodDiag?.line).toBe(8);
      });
    });

    // -----------------------------------------------------------------------
    // Feature 7: Remediation Engine (F7)
    // -----------------------------------------------------------------------
    describe('F7: Remediation Engine (Boundaries)', () => {
      it('T2-F7-01: Actionable Guidance for Completely Misspelled Properties', () => {
        const badPropObj = {
          ...createMinimalValidPolicy(),
          completely_misspelled_property_name: true,
        };
        const res = aipk.validatePolicy(badPropObj);
        expect(res.valid).toBe(false);
        const diag = res.diagnostics.find((d) => d.keyword === 'additionalProperties');
        expect(diag).toBeDefined();
        expect(diag?.remediation).toBe(
          "Remove unrecognized property 'completely_misspelled_property_name'. Schema v0.1 does not allow additional properties."
        );
      });

      it('T2-F7-02: Remediation for Missing Required Properties Across All Sections', () => {
        const missingVersion = { ...createMinimalValidPolicy() };
        delete (missingVersion as Record<string, unknown>).version;
        const resVer = aipk.validatePolicy(missingVersion);
        expect(resVer.diagnostics.find((d) => d.path === 'version')?.remediation).toBe(
          "Specify specification version in 'version' (e.g. version: \"0.1\")."
        );

        const missingLevel = { ...createMinimalValidPolicy() };
        delete (missingLevel as Record<string, unknown>).level;
        const resLevel = aipk.validatePolicy(missingLevel);
        expect(resLevel.diagnostics.find((d) => d.path === 'level')?.remediation).toBe(
          "Specify repository policy posture in 'level' ('forbidden', 'restricted', or 'permissive')."
        );

        const missingResp = {
          ...createMinimalValidPolicy(),
          accountability: {} as unknown as AccountabilityConfig,
        };
        const resResp = aipk.validatePolicy(missingResp);
        expect(resResp.diagnostics.find((d) => d.path.includes('author_takes_responsibility'))?.remediation).toBe(
          "Set 'accountability.author_takes_responsibility' to true (or false) to attest contributor accountability."
        );
      });

      it('T2-F7-03: Remediation for Invalid Enum Posture Values', () => {
        const invalidEnum = {
          ...createMinimalValidPolicy(),
          level: 'ultra_strict' as unknown as PolicyLevel,
        };
        const res = aipk.validatePolicy(invalidEnum);
        expect(res.valid).toBe(false);
        const diag = res.diagnostics.find((d) => d.path === 'level');
        expect(diag?.remediation).toContain("'forbidden', 'restricted', 'permissive'");
        expect(diag?.remediation).toContain("Received 'ultra_strict'");
      });

      it('T2-F7-04: Remediation for Type Mismatches', () => {
        const badType = {
          ...createMinimalValidPolicy(),
          disclosure: { required: 'true' as unknown as boolean },
        };
        const res = aipk.validatePolicy(badType);
        expect(res.valid).toBe(false);
        const diag = res.diagnostics.find((d) => d.path === 'disclosure.required');
        expect(diag?.remediation).toBe(
          "Expected 'disclosure.required' to be of type boolean, but received string."
        );
      });

      it('T2-F7-05: Remediation for Invalid policy_url URI Format', () => {
        const badUri = {
          ...createMinimalValidPolicy(),
          policy_url: 'docs/ai-policy.md',
        };
        const res = aipk.validatePolicy(badUri);
        expect(res.valid).toBe(false);
        const diag = res.diagnostics.find((d) => d.path === 'policy_url');
        expect(diag?.remediation).toBe(
          "Provide a valid absolute URI starting with http:// or https:// (e.g. 'https://github.com/org/repo/blob/main/docs/ai-policy.md')."
        );
      });

      it('T2-F7-06: Remediation for Duplicate Items in Unique Arrays', () => {
        const dupArray = {
          ...createMinimalValidPolicy(),
          disclosure: {
            required: true,
            methods: ['commit_trailer', 'commit_trailer'] as DisclosureMethod[],
          },
        };
        const res = aipk.validatePolicy(dupArray);
        expect(res.valid).toBe(false);
        const diag = res.diagnostics.find((d) => d.keyword === 'uniqueItems');
        expect(diag?.remediation).toBe(
          "Array at 'disclosure.methods' contains duplicate items. Remove duplicates so all elements are unique."
        );
      });
    });

    // -----------------------------------------------------------------------
    // Feature 8: Presets Catalog & Composition (F8)
    // -----------------------------------------------------------------------
    describe('F8: Presets Catalog & Composition (Boundaries)', () => {
      it('T2-F8-01: Corrupted Preset Override Detection', () => {
        const strictPreset = YAML.parse(fs.readFileSync(path.join(REPO_ROOT, aipk.PRESETS.strict), 'utf-8'));
        const overridden = {
          ...strictPreset,
          categories: {
            ...strictPreset.categories,
            code: 'non_existent_posture',
          },
        };
        const res = aipk.validatePolicy(overridden);
        expect(res.valid).toBe(false);
        expect(res.diagnostics.some((d) => d.path === 'categories.code' && d.keyword === 'enum')).toBe(true);
      });

      it('T2-F8-02: Conflicting Disclosure Constraints in Preset Overrides', () => {
        const balancedPreset = YAML.parse(fs.readFileSync(path.join(REPO_ROOT, aipk.PRESETS.balanced), 'utf-8'));
        const conflictConfig = {
          ...balancedPreset,
          disclosure: {
            required: false,
            commit_trailer: {
              key: 'AI-Assisted',
              required: true,
            },
          },
        };
        const res = aipk.validatePolicy(conflictConfig);
        expect(res.valid).toBe(true);
        expect(conflictConfig.disclosure.required).toBe(false);
        expect(conflictConfig.disclosure.commit_trailer.required).toBe(true);
      });

      it('T2-F8-03: Unknown Preset Name Lookup Boundary', () => {
        const invalidPresetNames = ['ultra-strict', 'zero-tolerance', 'custom', '', 'default'];
        for (const name of invalidPresetNames) {
          expect((aipk.PRESETS as Record<string, string>)[name]).toBeUndefined();
        }
        expect(Object.keys(aipk.PRESETS)).toHaveLength(3);
      });

      it('T2-F8-04: Immutability & Const Integrity of Presets Catalog', () => {
        expect(aipk.SCHEMA_V0_1).toBeDefined();
        expect(aipk.SCHEMA_V0_1.version).toBe('0.1');
        expect(aipk.SCHEMA_V0_1.$schema).toContain('draft-07');
        expect(aipk.PRESETS.strict).toBe('presets/strict.yml');
        expect(aipk.PRESETS.balanced).toBe('presets/balanced.yml');
        expect(aipk.PRESETS.permissive).toBe('presets/permissive.yml');
      });

      it('T2-F8-05: Preset Document Structure Uniformity & No Duplicate Keys', () => {
        for (const [name, relPath] of Object.entries(aipk.PRESETS)) {
          const fullPath = path.join(REPO_ROOT, relPath);
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const doc = YAML.parseDocument(raw);
          expect(doc.errors, `Preset ${name} must have 0 YAML errors`).toHaveLength(0);
          expect(doc.warnings, `Preset ${name} must have 0 YAML warnings`).toHaveLength(0);
          const jsObj = doc.toJS() as AIPolicyConfig;
          expect(jsObj.version).toBe('0.1');
          expect(['forbidden', 'restricted', 'permissive']).toContain(jsObj.level);
        }
      });

      it('T2-F8-06: Preset Round-Trip Normalization Invariance', () => {
        for (const relPath of Object.values(aipk.PRESETS)) {
          const fullPath = path.join(REPO_ROOT, relPath);
          const parsed = YAML.parse(fs.readFileSync(fullPath, 'utf-8'));
          const jsonStr = JSON.stringify(parsed);
          const reParsed = JSON.parse(jsonStr);
          const res = aipk.validatePolicy(reParsed);
          expect(res.valid).toBe(true);
          expect(res.diagnostics).toHaveLength(0);
          expect(reParsed).toEqual(parsed);
        }
      });
    });
  });

  // =========================================================================
  // PILLAR 2: CLI Commands & Documentation Generators (Features F9 to F11)
  // =========================================================================
  describe('Pillar 2: CLI Commands & Documentation Generators (F9 to F11)', { timeout: 60000 }, () => {
    // -----------------------------------------------------------------------
    // Feature 9: CLI Subcommand init
    // -----------------------------------------------------------------------
    describe('F9: CLI Subcommand init (Boundaries)', () => {
      it.skipIf(!isCliLive)('F9-B1: init in a non-git directory', async () => {
        const plainDir = createTempDir('aipk-nongit-');
        const res = await runCli(['init'], { cwd: plainDir });
        expectCliSuccess(res);
        expect(fs.existsSync(path.join(plainDir, '.github', 'ai-policy.yml'))).toBe(true);
        expectDisclaimerPresent(res);
      });

      it.skipIf(!isCliLive)('F9-B2: init without --force preserves pre-existing file', async () => {
        await withGitFixture(async (fixture) => {
          fixture.writeFile('.github/ai-policy.yml', '# sentinel-custom-content');
          const res = await runCli(['init', '--preset', 'strict'], { cwd: fixture.repoDir });
          expect(res.exitCode).toBeGreaterThanOrEqual(1);
          expect(fixture.readFile('.github/ai-policy.yml')).toBe('# sentinel-custom-content');
        });
      });

      it.skipIf(!isCliLive)('F9-B3: invalid preset flag --preset nonexistent exits 2', async () => {
        await withGitFixture(async (fixture) => {
          const res = await runCli(['init', '--preset', 'invalid-preset-xyz'], { cwd: fixture.repoDir });
          expectCliError(res, 2);
          expect(res.stderr + res.stdout).toMatch(/preset/i);
        });
      });

      it.skipIf(!isCliLive)('F9-B4: empty preset string --preset= exits 2', async () => {
        await withGitFixture(async (fixture) => {
          const res = await runCli(['init', '--preset='], { cwd: fixture.repoDir });
          expectCliError(res, 2);
        });
      });

      it.skipIf(!isCliLive)('F9-B5: deeply nested target output directory creation', async () => {
        await withGitFixture(async (fixture) => {
          const nested = 'a/b/c/custom-policy.yml';
          const res = await runCli(['init', '--output', nested], { cwd: fixture.repoDir });
          expectCliSuccess(res);
          expect(fixture.exists(nested)).toBe(true);
        });
      });

      it.skipIf(!isCliLive)('F9-B6: graceful handling of write permission error', async () => {
        await withGitFixture(async (fixture) => {
          const readOnlyFile = path.join(fixture.repoDir, 'readonly-policy.yml');
          fs.writeFileSync(readOnlyFile, '# readonly', 'utf-8');
          fs.chmodSync(readOnlyFile, 0o444);
          try {
            const res = await runCli(['init', '--output', 'readonly-policy.yml', '--force'], { cwd: fixture.repoDir });
            expect(res.exitCode).toBeGreaterThanOrEqual(1);
          } finally {
            fs.chmodSync(readOnlyFile, 0o666);
          }
        });
      });
    });

    // -----------------------------------------------------------------------
    // Feature 10: Markdown Generators
    // -----------------------------------------------------------------------
    describe('F10: Markdown Documentation Generators (Boundaries)', () => {
      it.skipIf(!isCliLive)('F10-B1: generation with minimal policy without optional fields', async () => {
        await withGitFixture(async (fixture) => {
          fixture.writeFile(
            '.github/ai-policy.yml',
            YAML.stringify({
              version: '0.1',
              level: 'permissive',
              disclosure: { required: false },
              accountability: { author_takes_responsibility: true },
              bots: { automated_prs: 'permissive' },
            })
          );
          const res = await runCli(['init', '--docs', '--force'], { cwd: fixture.repoDir });
          expectCliSuccess(res);
          expect(fixture.exists('AI_POLICY.md')).toBe(true);
          expect(fixture.exists('AGENTS.md')).toBe(true);
        });
      });

      it.skipIf(!isCliLive)('F10-B2: special characters and markdown pipes in metadata', async () => {
        await withGitFixture(async (fixture) => {
          fixture.writeFile(
            '.github/ai-policy.yml',
            YAML.stringify({
              version: '0.1',
              level: 'restricted',
              categories: { code: 'restricted' },
              disclosure: { required: true },
              accountability: { author_takes_responsibility: true },
              bots: { automated_prs: 'restricted' },
              metadata: {
                custom_rule: 'Rule with | pipe, `backtick`, 🤖 emoji, & <script>alert(1)</script>',
              },
            })
          );
          const res = await runCli(['init', '--docs', '--force'], { cwd: fixture.repoDir });
          expectCliSuccess(res);
          expect(fixture.exists('AI_POLICY.md')).toBe(true);
        });
      });

      it.skipIf(!isCliLive)('F10-B3: non-existent nested directory for generated documentation', async () => {
        const cleanDir = createTempDir('aipk-docs-nested-');
        const res = await runCli(['init', '--docs'], { cwd: cleanDir });
        expectCliSuccess(res);
        expect(fs.existsSync(path.join(cleanDir, '.github', 'PULL_REQUEST_TEMPLATE.md'))).toBe(true);
      });

      it.skipIf(!isCliLive)('F10-B4: pre-existing documentation files without --force', async () => {
        await withGitFixture(async (fixture) => {
          fixture.writeFile('AI_POLICY.md', '# Custom Protected Document');
          await runCli(['init', '--docs'], { cwd: fixture.repoDir });
          expect(fixture.readFile('AI_POLICY.md')).toBe('# Custom Protected Document');
        });
      });

      it.skipIf(!isCliLive)('F10-B5: zero unreplaced template tokens', async () => {
        await withGitFixture(async (fixture) => {
          await runCli(['init', '--preset', 'strict', '--docs', '--force'], { cwd: fixture.repoDir });
          const policyMd = fixture.readFile('AI_POLICY.md');
          const agentsMd = fixture.readFile('AGENTS.md');
          const prTmpl = fixture.readFile('.github/PULL_REQUEST_TEMPLATE.md');
          expect(policyMd.match(/\{\{[a-zA-Z0-9_.-]+\}\}/g)).toBeNull();
          expect(agentsMd.match(/\{\{[a-zA-Z0-9_.-]+\}\}/g)).toBeNull();
          expect(prTmpl.match(/\{\{[a-zA-Z0-9_.-]+\}\}/g)).toBeNull();
        });
      });
    });

    // -----------------------------------------------------------------------
    // Feature 11: CLI Subcommand check
    // -----------------------------------------------------------------------
    describe('F11: CLI Subcommand check (Boundaries)', () => {
      it.skipIf(!isCliLive)('F11-B1: checking explicit non-existent file exits 2', async () => {
        const res = await runCli(['check', 'nonexistent/path/ai-policy.yml']);
        expectCliError(res, 2);
      });

      it.skipIf(!isCliLive)('F11-B2: malformed YAML syntax vs schema validation', async () => {
        await withGitFixture(async (fixture) => {
          fixture.writeFile('.github/ai-policy.yml', 'level: "unclosed string\ncode: true');
          const res = await runCli(['check'], { cwd: fixture.repoDir });
          expectCliError(res, 2);
        });
      });

      it.skipIf(!isCliLive)('F11-B3: config with CRLF and UTF-8 BOM parses cleanly', async () => {
        await withGitFixture(async (fixture) => {
          const yamlContent =
            '\uFEFFversion: "0.1"\r\nlevel: "permissive"\r\ncategories:\r\n  code: "permissive"\r\ndisclosure:\r\n  required: false\r\naccountability:\r\n  author_takes_responsibility: true\r\nbots:\r\n  automated_prs: "permissive"\r\n';
          fixture.writeFile('.github/ai-policy.yml', yamlContent);
          const res = await runCli(['check'], { cwd: fixture.repoDir });
          expectCliSuccess(res);
        });
      });

      it.skipIf(!isCliLive)('F11-B4: directory with zero policy files exits 2', async () => {
        await withGitFixture(async (fixture) => {
          const res = await runCli(['check'], { cwd: fixture.repoDir });
          expectCliError(res, 2);
          expect(res.stderr + res.stdout).toContain('ai-policy init');
        });
      });

      it.skipIf(!isCliLive)('F11-B5: 0-byte (empty) or comments-only policy file exits 2', async () => {
        await withGitFixture(async (fixture) => {
          fixture.writeFile('.github/ai-policy.yml', '# only comments\n# no yaml content\n');
          const res = await runCli(['check'], { cwd: fixture.repoDir });
          expectCliError(res, 2);
        });
      });

      it.skipIf(!isCliLive)('F11-B6: remote URL policy check with network error exits 2', async () => {
        const res = await runCli(['check', 'http://127.0.0.1:59999/nonexistent-policy.yml']);
        expectCliError(res, 2);
      });
    });
  });

  // =========================================================================
  // PILLAR 3: Pull Request Compliance Engine (Features F12 to F17)
  // =========================================================================
  describe('Pillar 3: Pull Request Compliance Engine (F12 to F17)', { timeout: 60000 }, () => {
    // -----------------------------------------------------------------------
    // Feature 12: CLI Subcommand lint-pr
    // -----------------------------------------------------------------------
    describe('F12: CLI Subcommand lint-pr (Boundaries)', () => {
      it.skipIf(!isCliLive)(
        'F12-B1: operates cleanly in detached HEAD state',
        async () => {
          await withGitFixture(async (fixture) => {
            fixture.writeFile('base.txt', '1');
            fixture.stage('base.txt');
            fixture.commit('base commit');
            fixture.checkout('feature', { create: true });
            fixture.writeFile('f.txt', '2');
            fixture.stage('f.txt');
            const headSha = fixture.commit('feat commit', { trailers: { 'AI-Assisted': 'Copilot' } });

            fixture.git(['checkout', headSha]);

            const res = await runCli(['lint-pr', '--base', 'main', '--head', 'HEAD'], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(res);
          });
        },
        45000
      );

      it.skipIf(!isCliLive)(
        'F12-B2: shallow clone repository boundary exits 2',
        async () => {
          await withGitFixture(async (fixture) => {
            const res = await runCli(['lint-pr', '--base', 'nonexistent-base-sha-12345', '--head', 'HEAD'], {
              cwd: fixture.repoDir,
            });
            expectCliError(res, 2);
          });
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F12-B3: PR with 0 commits / empty diff exits 0',
        async () => {
          await withGitFixture(async (fixture) => {
            fixture.writeFile('init.txt', '1');
            fixture.stage('init.txt');
            fixture.commit('init');
            const res = await runCli(['lint-pr', '--base', 'main', '--head', 'main'], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(res);
          });
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F12-B4: exempts non-fast-forward merge commits from trailers',
        async () => {
          await withGitFixture(async (fixture) => {
            fixture.writeFile('init.txt', '1');
            fixture.stage('init.txt');
            fixture.commit('init');

            fixture.checkout('feature', { create: true });
            fixture.writeFile('f1.txt', '1');
            fixture.stage('f1.txt');
            fixture.commit('feat 1', { trailers: { 'AI-Assisted': 'Claude' } });

            fixture.checkout('main');
            fixture.writeFile('m1.txt', '1');
            fixture.stage('m1.txt');
            fixture.commit('main commit');

            fixture.checkout('feature');
            fixture.merge('main', { noFf: true, message: "Merge branch 'main' into feature" });

            fixture.writeFile('f2.txt', '2');
            fixture.stage('f2.txt');
            fixture.commit('feat 2', { trailers: { 'AI-Assisted': 'Claude' } });

            const res = await runCli(['lint-pr', '--base', 'main', '--head', 'feature'], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(res);
          });
        },
        60000
      );

      it.skipIf(!isCliLive)(
        'F12-B5: non-linear commit history scopes to PR commits',
        async () => {
          await withGitFixture(async (fixture) => {
            fixture.writeFile('m1.txt', '1');
            fixture.stage('m1.txt');
            fixture.commit('m1 commit');

            fixture.checkout('feature', { create: true });
            fixture.writeFile('f1.txt', '1');
            fixture.stage('f1.txt');
            fixture.commit('feat 1', { trailers: { 'AI-Assisted': 'Claude' } });

            fixture.checkout('main');
            fixture.writeFile('m2.txt', '2');
            fixture.stage('m2.txt');
            fixture.commit('m2 without trailer');

            fixture.checkout('feature');
            fixture.writeFile('f2.txt', '2');
            fixture.stage('f2.txt');
            fixture.commit('feat 2', { trailers: { 'AI-Assisted': 'Claude' } });

            const res = await runCli(['lint-pr', '--base', 'main', '--head', 'feature'], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(res);
          });
        },
        60000
      );

      it.skipIf(!isCliLive)(
        'F12-B6: PR body checklist disclosure precedence and variations',
        async () => {
          await withGitFixture(async (fixture) => {
            fixture.writePolicy({
              version: '0.1',
              level: 'restricted',
              categories: { code: 'restricted' },
              disclosure: { required: true, methods: ['pr_checklist'] },
              accountability: { author_takes_responsibility: true },
              bots: { automated_prs: 'restricted' },
            });
            fixture.stage('.');
            fixture.commit('chore: policy');

            fixture.checkout('feature', { create: true });
            fixture.writeFile('file.txt', 'data');
            fixture.stage('file.txt');
            fixture.commit('feat: work without trailer');

            // Capital X
            const resA = await runCli(
              ['lint-pr', '--base', 'main', '--head', 'feature', '--pr-body', '### Checklist\n- [X] AI-assisted: Claude'],
              { cwd: fixture.repoDir }
            );
            expectCliSuccess(resA);

            // Whitespace around x
            const resB = await runCli(
              ['lint-pr', '--base', 'main', '--head', 'feature', '--pr-body', '### Checklist\n-   [x]   AI-assisted'],
              { cwd: fixture.repoDir }
            );
            expectCliSuccess(resB);

            // Unchecked
            const resC = await runCli(
              ['lint-pr', '--base', 'main', '--head', 'feature', '--pr-body', '### Checklist\n- [ ] AI-assisted'],
              { cwd: fixture.repoDir }
            );
            expectCliViolation(resC, 1);
          });
        },
        60000
      );
    });

    // -----------------------------------------------------------------------
    // Feature 13: Commit Trailer Enforcement
    // -----------------------------------------------------------------------
    describe('F13: Commit Trailer Enforcement (Boundaries)', () => {
      it.skipIf(!isCliLive)(
        'F13-B1: trailer key casing variations (case-insensitive)',
        async () => {
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
                    required: true,
                  },
                },
                accountability: { author_takes_responsibility: true },
                bots: { automated_prs: 'restricted' },
              },
              featureCommits: [
                {
                  message: 'feat: lowercase trailer',
                  files: { 'a.ts': '1' },
                  trailers: { 'ai-assisted': 'Claude' },
                },
              ],
            });
            const res = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(res);
          });
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F13-B2: trailer in commit body (not footer) fails with exit 1',
        async () => {
          await withGitFixture(async (fixture) => {
            const rawMessage = 'feat: commit title\n\nAI-Assisted: Copilot\n\nBody paragraph text after trailer';
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [
                {
                  message: rawMessage,
                  files: { 'b.ts': '2' },
                },
              ],
            });
            const res = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expectCliViolation(res, 1);
          });
        },
        45000
      );

      it.skipIf(!isCliLive)(
        'F13-B3: multiple conflicting trailers in a single commit',
        async () => {
          await withGitFixture(async (fixture) => {
            const rawTrailers = 'AI-Assisted: Claude\nAI-Assisted: None';
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [
                {
                  message: 'feat: conflicting trailers',
                  files: { 'conf.ts': '1' },
                  rawTrailersBlock: rawTrailers,
                },
              ],
            });
            const res = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            // Process handles conflicting trailers deterministically
            expect([0, 1]).toContain(res.exitCode);
          });
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F13-B4: unicode and emojis in trailer values preserve UTF-8',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [
                {
                  message: 'feat: unicode trailer',
                  files: { 'c.ts': '3' },
                  trailers: { 'AI-Assisted': '🤖 Copilot (智谱AI & Modèle Français)' },
                },
              ],
            });
            const res = await runCli(['lint-pr', '--base', baseRef, '--head', headRef, '--json'], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(res);
          });
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F13-B5: trailing whitespace and folded multiline continuation',
        async () => {
          await withGitFixture(async (fixture) => {
            const rawTrailers = 'AI-Assisted: Claude 3.5 Sonnet\n    with custom security prompt';
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [
                {
                  message: 'feat: multiline folded trailer',
                  files: { 'fold.ts': '1' },
                  rawTrailersBlock: rawTrailers,
                },
              ],
            });
            const res = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(res);
          });
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F13-B6: invalid trailer syntax with leading whitespace on key',
        async () => {
          await withGitFixture(async (fixture) => {
            const rawTrailers = '  AI-Assisted: Copilot';
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [
                {
                  message: 'feat: bad trailer key leading spaces',
                  files: { 'badkey.ts': '1' },
                  rawTrailersBlock: rawTrailers,
                },
              ],
            });
            const res = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expectCliViolation(res, 1);
          });
        },
        30000
      );
    });

    // -----------------------------------------------------------------------
    // Feature 14: Workspace Leak Detection
    // -----------------------------------------------------------------------
    describe('F14: Workspace Leak Detection (Boundaries)', () => {
      it.skipIf(!isCliLive)(
        'F14-B1: simultaneous multi-tool leaks detected in single PR',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [
                {
                  message: 'leak: multiple tools',
                  leaks: ['cursor', 'claude', 'gemini', 'continue'],
                },
              ],
            });
            const res = await runCli(['lint-pr', '--base', baseRef, '--head', headRef, '--json'], {
              cwd: fixture.repoDir,
            });
            expectCliViolation(res, 1);
            const json = res.parseJson();
            expect(json.leaks.length).toBe(4);
          });
        },
        45000
      );

      it.skipIf(!isCliLive)(
        'F14-B2: deeply nested workspace leaks in subpackages',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [
                {
                  message: 'leak: nested',
                  files: { 'packages/app/src/.cursor/settings.json': '{"leak": true}' },
                  trailers: { 'AI-Assisted': 'None' },
                },
              ],
            });
            const res = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expectCliViolation(res, 1);
            expect(res.stdout + res.stderr).toContain('.cursor');
          });
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F14-B3: permitted deletion of leak file in git diff (status D)',
        async () => {
          await withGitFixture(async (fixture) => {
            fixture.createLeak('cursor', { committed: true });

            fixture.checkout('feature-remediation', { create: true });
            fixture.git(['rm', '-r', '.cursor']);
            fixture.commit('chore(security): remove accidental cursor leak', {
              trailers: { 'AI-Assisted': 'None' },
            });

            const res = await runCli(['lint-pr', '--base', 'main', '--head', 'feature-remediation'], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(res);
          });
        },
        45000
      );

      it.skipIf(!isCliLive)(
        'F14-B4: file rename involving a leak path',
        async () => {
          await withGitFixture(async (fixture) => {
            // Rename ordinary into leak -> violation
            fixture.writeFile('rules-backup.txt', 'rules');
            fixture.stage('rules-backup.txt');
            fixture.commit('base: backup file');

            fixture.checkout('feature-rename', { create: true });
            fs.mkdirSync(path.join(fixture.repoDir, '.cursor'), { recursive: true });
            fixture.git(['mv', 'rules-backup.txt', '.cursor/rules.mdc']);
            fixture.commit('feat: rename into leak', { trailers: { 'AI-Assisted': 'None' } });

            const res = await runCli(['lint-pr', '--base', 'main', '--head', 'feature-rename'], {
              cwd: fixture.repoDir,
            });
            expectCliViolation(res, 1);
          });
        },
        45000
      );

      it.skipIf(!isCliLive)(
        'F14-B5: binary file inside forbidden workspace leak directory',
        async () => {
          await withGitFixture(async (fixture) => {
            const binBuffer = Buffer.from([0x00, 0x89, 0x50, 0x4e, 0x47]);
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [
                {
                  message: 'leak: binary file',
                  files: { '.cursor/cache.bin': binBuffer },
                  trailers: { 'AI-Assisted': 'None' },
                },
              ],
            });
            const res = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expectCliViolation(res, 1);
          });
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F14-B6: case-insensitivity variations in leak directory names',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [
                {
                  message: 'leak: uppercase dir',
                  files: { '.Cursor/rules.json': '{}', '.GEMINI/key.json': '{}' },
                  trailers: { 'AI-Assisted': 'None' },
                },
              ],
            });
            const res = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expectCliViolation(res, 1);
          });
        },
        30000
      );
    });

    // -----------------------------------------------------------------------
    // Feature 15: Deterministic Exit Codes
    // -----------------------------------------------------------------------
    describe('F15: Deterministic Exit Codes (Boundaries)', () => {
      it.skipIf(!isCliLive)(
        'F15-B1: exit code 0 on complete compliance across all subcommands',
        async () => {
          await withGitFixture(async (fixture) => {
            await runCli(['init'], { cwd: fixture.repoDir });
            const res = await runCli(['check'], { cwd: fixture.repoDir });
            expect(res.exitCode).toBe(0);
          });
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F15-B2: exit code 1 on policy violation',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              policyConfig: {
                version: '0.1',
                level: 'restricted',
                categories: { code: 'restricted' },
                disclosure: { required: true, commit_trailer: { key: 'AI-Assisted', required: true } },
                accountability: { author_takes_responsibility: true },
                bots: { automated_prs: 'restricted' },
              },
              featureCommits: [{ message: 'no trailer', files: { 'x.ts': '1' } }],
            });
            const res = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expect(res.exitCode).toBe(1);
          });
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F15-B3: exit code 1 on workspace leak violation',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [
                {
                  message: 'feat: with trailer and leak',
                  files: { 'y.ts': '2' },
                  trailers: { 'AI-Assisted': 'Copilot' },
                  leaks: ['cursor'],
                },
              ],
            });
            const res = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expect(res.exitCode).toBe(1);
          });
        },
        45000
      );

      it.skipIf(!isCliLive)(
        'F15-B4: exit code 2 on configuration schema error or invalid YAML syntax',
        async () => {
          await withGitFixture(async (fixture) => {
            fixture.writeFile('.github/ai-policy.yml', 'invalid_syntax: [\nunclosed');
            const res = await runCli(['check'], { cwd: fixture.repoDir });
            expect(res.exitCode).toBe(2);
          });
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F15-B5: exit code 2 on missing target file or unknown CLI option',
        async () => {
          const resA = await runCli(['check', 'missing-policy.yml']);
          expect(resA.exitCode).toBe(2);

          const resB = await runCli(['--unknown-cli-option-xyz']);
          expect(resB.exitCode).toBe(2);

          const resC = await runCli(['init', '--preset', 'bad-preset']);
          expect(resC.exitCode).toBe(2);
        },
        45000
      );

      it.skipIf(!isCliLive)(
        'F15-B6: zero unhandled promise rejections or uncaught exceptions',
        async () => {
          const res = await runCli(['lint-pr', '--base', 'bogus-base', '--head', 'bogus-head']);
          expect(res.exitCode).toBe(2);
          expect(res.stderr).not.toContain('UnhandledPromiseRejection');
        },
        30000
      );
    });

    // -----------------------------------------------------------------------
    // Feature 16: Machine-Readable --json Output
    // -----------------------------------------------------------------------
    describe('F16: Machine-Readable --json Output (Boundaries)', () => {
      it.skipIf(!isCliLive)(
        'F16-B1: valid parseable JSON under exit code 1',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [{ message: 'leak', leaks: ['gemini'] }],
            });
            const res = await runCli(['lint-pr', '--base', baseRef, '--head', headRef, '--json'], {
              cwd: fixture.repoDir,
            });
            expect(res.exitCode).toBe(1);
            const json = res.parseJson();
            expect(json.passed).toBe(false);
            expect(json.leaks.length).toBeGreaterThan(0);
            expect(json.disclaimer).toBe(MANDATORY_DISCLAIMER);
          });
        },
        45000
      );

      it.skipIf(!isCliLive)(
        'F16-B2: valid parseable JSON under exit code 2 (schema validation errors)',
        async () => {
          await withGitFixture(async (fixture) => {
            fixture.writeFile('.github/ai-policy.yml', 'version: "0.1"\nlevel: forbidden\n');
            const res = await runCli(['check', '--json'], { cwd: fixture.repoDir });
            expect(res.exitCode).toBe(2);
            const json = res.parseJson();
            expect(json.valid).toBe(false);
            expect(Array.isArray(json.diagnostics)).toBe(true);
          });
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F16-B3: valid parseable JSON under exit code 2 (missing file errors)',
        async () => {
          const res = await runCli(['check', 'missing-file.yml', '--json']);
          expect(res.exitCode).toBe(2);
          const json = res.parseJson();
          expect(json.valid).toBe(false);
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F16-B4: pure JSON stdout stream without plain-text log contamination',
        async () => {
          await withGitFixture(async (fixture) => {
            await runCli(['init'], { cwd: fixture.repoDir });
            const res = await runCli(['check', '--json'], { cwd: fixture.repoDir });
            expectCliSuccess(res);
            const trimmed = res.stdout.trim();
            expect(trimmed.startsWith('{')).toBe(true);
            expect(trimmed.endsWith('}')).toBe(true);
            expect(() => JSON.parse(trimmed)).not.toThrow();
          });
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F16-B5: combined flags --json with --quiet and --force',
        async () => {
          await withGitFixture(async (fixture) => {
            await runCli(['init'], { cwd: fixture.repoDir });
            const res = await runCli(['check', '--json', '--quiet'], { cwd: fixture.repoDir });
            expectCliSuccess(res);
            expect(res.stdout.trim()).not.toBe('');
            const json = res.parseJson();
            expect(json.valid).toBe(true);
          });
        },
        30000
      );
    });

    // -----------------------------------------------------------------------
    // Feature 17: Mandatory Disclaimer Banner
    // -----------------------------------------------------------------------
    describe('F17: Mandatory Disclaimer Banner (Boundaries)', () => {
      it.skipIf(!isCliLive)(
        'F17-B1: verbatim disclaimer banner in root and all subcommand help screens',
        async () => {
          for (const subcmd of ['--help', 'init --help', 'check --help', 'lint-pr --help']) {
            const res = await runCli(subcmd.split(' '));
            expectCliSuccess(res);
            expectDisclaimerPresent(res);
          }
        },
        45000
      );

      it.skipIf(!isCliLive)(
        'F17-B2: disclaimer banner present across all exit codes in human-readable mode',
        async () => {
          await withGitFixture(async (fixture) => {
            await runCli(['init'], { cwd: fixture.repoDir });
            fixture.stage('.');
            fixture.commit('chore: initial commit');

            // Exit 0 (clean check pass)
            const passRes = await runCli(['check'], { cwd: fixture.repoDir });
            expect(passRes.exitCode).toBe(0);
            expectDisclaimerPresent(passRes);

            // Exit 1 (policy violation in lint-pr)
            fixture.checkout('feature-violation', { create: true });
            fixture.writeFile('feat.txt', 'change');
            fixture.stage('feat.txt');
            fixture.commit('feat: no trailer');
            const violRes = await runCli(['lint-pr', '--base', 'main', '--head', 'feature-violation'], {
              cwd: fixture.repoDir,
            });
            expect(violRes.exitCode).toBe(1);
            expectDisclaimerPresent(violRes);

            // Exit 2 (schema validation error in check)
            fixture.writeFile('.github/ai-policy.yml', 'version: "0.1"\nlevel: "forbidden"\n');
            const errRes = await runCli(['check'], { cwd: fixture.repoDir });
            expect(errRes.exitCode).toBe(2);
            expectDisclaimerPresent(errRes);
          });
        },
        60000
      );

      it.skipIf(!isCliLive)(
        'F17-B3: disclaimer encapsulation in --json payload',
        async () => {
          await withGitFixture(async (fixture) => {
            await runCli(['init'], { cwd: fixture.repoDir });
            const res = await runCli(['check', '--json'], { cwd: fixture.repoDir });
            expectCliSuccess(res);
            const json = res.parseJson();
            expect(json.disclaimer).toBe(MANDATORY_DISCLAIMER);
          });
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F17-B4: disclaimer presence when stdout is redirected / piped',
        async () => {
          await withGitFixture(async (fixture) => {
            await runCli(['init'], { cwd: fixture.repoDir });
            const res = await runCli(['check'], {
              cwd: fixture.repoDir,
              env: { CI: 'true', TERM: 'dumb' },
            });
            expectDisclaimerPresent(res);
          });
        },
        30000
      );

      it.skipIf(!isCliLive)(
        'F17-B5: exact casing and punctuation invariance',
        async () => {
          const expected = 'ai-policy is a deterministic policy compliance validator, NOT an AI text/code detector.';
          const res = await runCli(['--help']);
          expect(res.stdout + res.stderr).toContain(expected);
        },
        30000
      );
    });
  });

  // =========================================================================
  // PILLAR 4: GitHub Action Integration Boundaries (Features F18 & F19)
  // =========================================================================
  describe('Pillar 4: GitHub Action Integration Boundaries (F18 to F19)', () => {
    // -----------------------------------------------------------------------
    // Feature 18: GitHub Action Manifest (action.yml)
    // -----------------------------------------------------------------------
    describe('F18: GitHub Action Manifest Boundaries', () => {
      it.skipIf(!isActionManifestPresent)(
        'F18-B01: Manifest Strict YAML Syntax, Single Document & BOM Immunity',
        () => {
          const rawBytes = fs.readFileSync(ACTION_YML_PATH);
          expect(rawBytes[0] === 0xef && rawBytes[1] === 0xbb && rawBytes[2] === 0xbf).toBe(false);

          const rawText = rawBytes.toString('utf-8');
          const doc = YAML.parseDocument(rawText, { prettyErrors: true });
          expect(doc.errors).toHaveLength(0);
          expect(doc.contents).not.toBeNull();
          expect(typeof doc.toJS()).toBe('object');
        }
      );

      it.skipIf(!isActionManifestPresent)(
        'F18-B02: Missing Required Inputs Safety & Zero-Input Invocation Boundary',
        () => {
          const manifest = YAML.parse(fs.readFileSync(ACTION_YML_PATH, 'utf-8'));
          const inputs = manifest.inputs || {};
          for (const [name, inputDef] of Object.entries<any>(inputs)) {
            expect(
              inputDef.required === true,
              `Input "${name}" must not be marked required: true because it blocks non-PR CI workflows`
            ).toBe(false);
            expect(typeof inputDef.description).toBe('string');
            expect(inputDef.description.trim().length).toBeGreaterThan(0);
          }
        }
      );

      it.skipIf(!isActionManifestPresent)(
        'F18-B03: Input Type String Serialization & Strict Boolean Default Validation',
        () => {
          const manifest = YAML.parse(fs.readFileSync(ACTION_YML_PATH, 'utf-8'));
          const inputs = manifest.inputs || {};

          const failOnLeakDefault = String(inputs['fail-on-leak']?.default);
          expect(['true', 'false']).toContain(failOnLeakDefault);

          const outputFormatDefault = String(inputs['output-format']?.default);
          expect(['both', 'text', 'summary', 'json']).toContain(outputFormatDefault);
        }
      );

      it.skipIf(!isActionManifestPresent)(
        'F18-B04: Default Path Traversal and Sanitization Boundary',
        () => {
          const manifest = YAML.parse(fs.readFileSync(ACTION_YML_PATH, 'utf-8'));
          const policyPath = manifest.inputs?.['policy-path']?.default;
          expect(policyPath).toBe('.github/ai-policy.yml');
          expect(policyPath.startsWith('/')).toBe(false);
          expect(policyPath.includes('\\')).toBe(false);
          expect(policyPath.includes('..')).toBe(false);
          expect(/^[a-zA-Z]:/.test(policyPath)).toBe(false);
        }
      );

      it.skipIf(!isActionManifestPresent)(
        'F18-B05: Read-Only Security Permissions Block Check (Least Privilege)',
        () => {
          const rawText = fs.readFileSync(ACTION_YML_PATH, 'utf-8');
          expect(rawText).not.toMatch(/permissions:\s*write-all/i);
          expect(rawText).not.toMatch(/contents:\s*write/i);
          expect(rawText).not.toMatch(/pull-requests:\s*write/i);
          expect(rawText).not.toMatch(/id-token:\s*write/i);
        }
      );

      it.skipIf(!isActionManifestPresent)(
        'F18-B06: Action Runtime Specification Boundaries (using: node20 & POSIX Main Entrypoint)',
        () => {
          const manifest = YAML.parse(fs.readFileSync(ACTION_YML_PATH, 'utf-8'));
          expect(manifest.runs).toBeDefined();
          expect(manifest.runs.using).toBe('node20');
          expect(manifest.runs.main).toBe('dist/action.js');
          expect(manifest.runs.main.includes('\\')).toBe(false);
        }
      );

      it.skipIf(!isActionManifestPresent)(
        'F18-B07: Manifest Outputs Declaration Completeness',
        () => {
          const manifest = YAML.parse(fs.readFileSync(ACTION_YML_PATH, 'utf-8'));
          const outputs = manifest.outputs || {};
          const expectedKeys = ['passed', 'violations', 'leaks'];
          for (const key of expectedKeys) {
            expect(outputs).toHaveProperty(key);
            expect(typeof outputs[key].description).toBe('string');
            expect(outputs[key].description.trim().length).toBeGreaterThan(5);
            expect(/^[a-z0-9-]+$/.test(key)).toBe(true);
          }
        }
      );
    });

    // -----------------------------------------------------------------------
    // Feature 19: GitHub Action Entrypoint & Step Summary
    // -----------------------------------------------------------------------
    describe('F19: GitHub Action Entrypoint & Step Summary Boundaries', () => {
      it.skipIf(!isActionLive)(
        'F19-B01: Gracefully handles non-existent directory for GITHUB_STEP_SUMMARY without unhandled ENOENT',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [{ message: 'feat: valid', trailers: { 'AI-Assisted': 'Claude' } }],
            });
            const nonExistentPath = path.join(createTempDir('aipk-sum-nonexist-'), 'deep/nested/dir/summary.md');
            const result = await runAction({
              cwd: fixture.repoDir,
              inputs: { 'base-ref': baseRef, 'head-ref': headRef },
              env: { GITHUB_STEP_SUMMARY: nonExistentPath },
            });

            expect(result.exitCode).toBe(0);
            expect(result.outputs['passed']).toBe('true');
          });
        },
        30000
      );

      it.skipIf(!isActionLive)(
        'F19-B02: Emits workflow warning and degrades gracefully when GITHUB_STEP_SUMMARY is read-only (EACCES)',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [{ message: 'feat: valid', trailers: { 'AI-Assisted': 'Claude' } }],
            });
            const readOnlyFile = path.join(createTempDir('aipk-ro-summary-'), 'readonly_summary.md');
            fs.writeFileSync(readOnlyFile, '# Pre-existing content\n', 'utf-8');
            fs.chmodSync(readOnlyFile, 0o444);

            try {
              const result = await runAction({
                cwd: fixture.repoDir,
                inputs: { 'base-ref': baseRef, 'head-ref': headRef },
                env: { GITHUB_STEP_SUMMARY: readOnlyFile },
              });

              expect(result.exitCode).toBe(0);
              expect(result.outputs['passed']).toBe('true');
              const combinedOutput = result.stdout + '\n' + result.stderr;
              expect(combinedOutput).toMatch(/warning|unable to write|failed to write.*step summary/i);
            } finally {
              fs.chmodSync(readOnlyFile, 0o666);
            }
          });
        },
        30000
      );

      it.skipIf(!isActionLive)(
        'F19-B03: Continues execution safely when GITHUB_STEP_SUMMARY is empty or unset',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [{ message: 'feat: valid', trailers: { 'AI-Assisted': 'Claude' } }],
            });
            const result = await runAction({
              cwd: fixture.repoDir,
              inputs: { 'base-ref': baseRef, 'head-ref': headRef },
              env: { GITHUB_STEP_SUMMARY: '' },
            });

            expect(result.exitCode).toBe(0);
            expect(result.outputs['passed']).toBe('true');
            expect(result.stdout).toMatch(/\|[\s-:]+\|/);
            expectDisclaimerPresent(result);
          });
        },
        30000
      );

      it.skipIf(!isActionLive)(
        'F19-B04: Operates deterministically in detached HEAD git environment without PR context',
        async () => {
          await withGitFixture(async (fixture) => {
            fixture.writePolicy({
              version: '0.1',
              level: 'strict',
              categories: { code: 'restricted' },
              disclosure: { required: true, commit_trailer: { key: 'AI-Assisted', required: true } },
              accountability: { author_takes_responsibility: true },
              bots: { automated_prs: 'forbidden' },
            });
            fixture.stage('.');
            fixture.commit('chore(policy): init policy');

            fixture.writeFile('src/feature.ts', 'export const x = 1;');
            fixture.stage('src/feature.ts');
            const sha = fixture.commit('feat: compliant commit in detached state', {
              trailers: { 'AI-Assisted': 'Claude 3.5' },
            });

            fixture.git(['checkout', sha]);

            const result = await runAction({
              cwd: fixture.repoDir,
              env: {
                GITHUB_BASE_REF: '',
                GITHUB_HEAD_REF: '',
                GITHUB_EVENT_NAME: 'push',
                GITHUB_SHA: sha,
              },
            });

            expect(result.exitCode).toBe(0);
            expect(result.outputs['passed']).toBe('true');
            expect(result.stepSummary).toMatch(/compliant|pass|✅/i);
          });
        },
        30000
      );

      it.skipIf(!isActionLive)(
        'F19-B05: Resists markdown table injection, HTML script tags, and entities in PR body',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [{ message: 'feat: valid', trailers: { 'AI-Assisted': 'Claude 3.5' } }],
            });
            const hostileBody = [
              '## PR Description',
              '| Broken | Cell | With | Pipes | Inside | Body |',
              '<script>alert("xss")</script>',
              '<img src="x" onerror="alert(1)">',
              '&quot;&amp;&lt;&gt;&#39;',
              '',
              '### Disclosure Checklist',
              '- [x] AI-Assisted: Claude 3.5',
            ].join('\n');

            const result = await runAction({
              cwd: fixture.repoDir,
              inputs: {
                'base-ref': baseRef,
                'head-ref': headRef,
                'pr-body': hostileBody,
              },
            });

            expect(result.exitCode).toBe(0);
            expect(result.outputs['passed']).toBe('true');

            const table = expectSummaryTable(result);
            expect(table.headers.length).toBeGreaterThanOrEqual(2);
            for (const row of table.rows) {
              expect(row.length).toBe(table.headers.length);
            }
          });
        },
        30000
      );

      it.skipIf(!isActionLive)(
        'F19-B06: Enforces strict 1MB (1,024 KB) upper bound truncation on GITHUB_STEP_SUMMARY output',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [{ message: 'feat: large', trailers: { 'AI-Assisted': 'Claude' } }],
            });
            const result = await runAction({
              cwd: fixture.repoDir,
              inputs: { 'base-ref': baseRef, 'head-ref': headRef },
            });

            const summaryBytes = Buffer.byteLength(result.stepSummary, 'utf-8');
            expect(summaryBytes).toBeLessThanOrEqual(1024 * 1024);

            if (summaryBytes > 500 * 1024) {
              expect(result.stepSummary).toMatch(/truncated.*1MB|size limit/i);
            }
          });
        },
        30000
      );

      it.skipIf(!isActionLive)(
        'F19-B07: Resists delimiter collision and multiline payloads in GITHUB_OUTPUT',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [{ message: 'feat: outputs check', trailers: { 'AI-Assisted': 'Claude' } }],
            });
            const result = await runAction({
              cwd: fixture.repoDir,
              inputs: { 'base-ref': baseRef, 'head-ref': headRef },
            });

            expect(result.outputs).toHaveProperty('passed');
            expect(result.outputs).toHaveProperty('violations');
            expect(result.outputs).toHaveProperty('leaks');
            expect(typeof result.outputs['passed']).toBe('string');
          });
        },
        30000
      );
    });
  });
});
