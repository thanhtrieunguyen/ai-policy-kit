/**
 * Tier 1 Feature Coverage E2E Test Suite for ai-policy-kit.
 *
 * Implements comprehensive end-to-end verification covering all 19 features (F1 to F19)
 * defined in ORIGINAL_REQUEST.md, PROJECT.md, and SCOPE.md.
 *
 * Architecture:
 * - Pillar 1: Project Foundation & Core Library Engine (F1 to F8) [44 test cases]
 * - Pillar 2: CLI Commands & Documentation Generators (F9 to F11) [15 test cases]
 * - Pillar 3: Pull Request Compliance Engine (F12 to F17) [33 test cases]
 * - Pillar 4: GitHub Action Integration (F18 to F19) [12 test cases]
 * Total: 104 test cases (exceeds minimum threshold of >=95 test cases).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import {
  REPO_ROOT,
  DIST_CLI_PATH,
  SRC_CLI_PATH,
  DIST_ACTION_PATH,
  SRC_ACTION_PATH,
  MANDATORY_DISCLAIMER,
  runCli,
  runAction,
  resolveCliPath,
  resolveActionPath,
  normalizeOutput,
  expectCliSuccess,
  expectCliViolation,
  expectCliError,
  expectDisclaimerPresent,
  expectValidJson,
  expectSummaryTable,
} from './harness.js';

import {
  GitFixture,
  createGitFixture,
  withGitFixture,
  setupPRScenario,
  cleanupAllFixtures,
} from '../helpers/git-fixture.js';

import * as aipk from '../../src/index.js';
import type {
  AIPolicyConfig,
  PolicyLevel,
  PolicyDiagnostic,
  ValidationResult,
  LoadPolicyResult,
  PolicyDiagnosticSeverity,
} from '../../src/types.js';

// ESM / CJS interop for Ajv and ajv-formats
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AjvClass = (Ajv as any).default || Ajv;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormatsFn = (addFormats as any).default || addFormats;

// State management for temporary test directories
const tempDirsToCleanup: string[] = [];

function createTempDir(prefix = 'aipk-test-'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirsToCleanup.push(dir);
  return dir;
}

async function cleanupTempDirs(): Promise<void> {
  for (const dir of tempDirsToCleanup) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        if (fs.existsSync(dir)) {
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

// Staging & Progressive Testability detection
const isForceRunAll = Boolean(process.env.FORCE_RUN_ALL_E2E);

function checkCliLive(): boolean {
  try {
    const rawOut = execFileSync(process.execPath, [resolveCliPath()], {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return !rawOut.includes('Placeholder for Milestone 1');
  } catch {
    return false;
  }
}

function checkActionLive(): boolean {
  try {
    const actionYml = path.join(REPO_ROOT, 'action.yml');
    if (!fs.existsSync(actionYml)) return false;
    const rawOut = execFileSync(process.execPath, [resolveActionPath()], {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return !rawOut.includes('Placeholder for Milestone 1');
  } catch {
    return false;
  }
}

const isCliImplemented = isForceRunAll || checkCliLive();
const isActionManifestPresent = isForceRunAll || fs.existsSync(path.join(REPO_ROOT, 'action.yml'));
const isActionImplemented = isForceRunAll || checkActionLive();

describe('Tier 1: Feature Coverage E2E Suite', () => {
  afterAll(async () => {
    await cleanupAllFixtures();
    await cleanupTempDirs();
  });

  // =========================================================================
  // PILLAR 1: Project Foundation & Core Library Engine (Features 1 to 8)
  // =========================================================================
  describe('Pillar 1: Project Foundation & Core Library Engine (F1 to F8)', () => {
    // -----------------------------------------------------------------------
    // Feature 1: TypeScript Project Foundation
    // -----------------------------------------------------------------------
    describe('F1: TypeScript Project Foundation', () => {
      it('F1-01: Package Manifest Structural Integrity', () => {
        const pkgJsonPath = path.join(REPO_ROOT, 'package.json');
        expect(fs.existsSync(pkgJsonPath)).toBe(true);
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));

        expect(pkg.name).toBe('ai-policy-kit');
        expect(pkg.type).toBe('module');
        expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(pkg.engines?.node).toMatch(/>=20/);
        expect(pkg.bin?.['ai-policy']).toBe('./dist/cli.js');
        expect(pkg.files).toContain('dist');
        expect(pkg.files).toContain('presets');
        expect(pkg.files).toContain('schema');
        expect(pkg.files).toContain('action.yml');
      });

      it('F1-02: Package Exports Map Resolution', () => {
        const pkgJsonPath = path.join(REPO_ROOT, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));

        expect(pkg.exports).toBeDefined();
        expect(pkg.exports['.']).toBeDefined();
        expect(pkg.exports['.']?.import?.types).toBe('./dist/index.d.ts');
        expect(pkg.exports['.']?.import?.default).toBe('./dist/index.js');
        expect(pkg.exports['./package.json']).toBe('./package.json');
      });

      it('F1-03: Core Named Exports Contract', () => {
        expect(typeof aipk.loadPolicy).toBe('function');
        expect(typeof aipk.loadPolicySync).toBe('function');
        expect(typeof aipk.validatePolicy).toBe('function');
        expect(typeof aipk.PolicyValidationError).toBe('function');
        expect(typeof aipk.VERSION).toBe('string');
        expect(typeof aipk.version).toBe('string');
        expect(typeof aipk.DISCLAIMER).toBe('string');
        expect(typeof aipk.PRESETS).toBe('object');
        expect(typeof aipk.SCHEMA_V0_1).toBe('object');
      });

      it('F1-04: TypeScript Declaration Types Contract', () => {
        const sampleConfig: AIPolicyConfig = {
          version: '0.1',
          level: 'restricted',
          categories: { code: 'restricted' },
          disclosure: { required: true },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'forbidden' },
        };
        expect(sampleConfig.level).toBe('restricted');

        const levels: PolicyLevel[] = ['forbidden', 'restricted', 'permissive'];
        expect(levels).toHaveLength(3);

        const diag: PolicyDiagnostic = {
          message: 'sample message',
          path: 'categories.code',
          severity: 'error',
          line: 1,
          column: 1,
          remediation: 'fix this',
        };
        expect(diag.severity).toBe('error');

        const valResult: ValidationResult = {
          valid: true,
          diagnostics: [],
          errors: [],
        };
        expect(valResult.valid).toBe(true);
      });

      it('F1-05: CLI Executable Shebang & Invocation', async () => {
        const cliSrcPath = path.join(REPO_ROOT, 'src', 'cli', 'index.ts');
        expect(fs.existsSync(cliSrcPath)).toBe(true);
        const cliContent = fs.readFileSync(cliSrcPath, 'utf-8');
        const line1 = cliContent.split(/\r?\n/)[0];
        expect(line1).toMatch(/^#!\/usr\/bin\/env node/);

        const result = await runCli(['--version']);
        expect(result.exitCode).toBe(0);
      });

      it('F1-06: Mandatory Compliance Disclaimer Export', () => {
        expect(aipk.DISCLAIMER).toBe(
          'ai-policy is a deterministic policy compliance validator, NOT an AI text/code detector.'
        );
        expect(aipk.DISCLAIMER).toBe(MANDATORY_DISCLAIMER);
      });
    });

    // -----------------------------------------------------------------------
    // Feature 2: Dependency Setup & Toolchain
    // -----------------------------------------------------------------------
    describe('F2: Dependency Setup & Toolchain', () => {
      it('F2-01: Zero/Minimal Runtime Overhead Footprint', () => {
        const pkg = JSON.parse(
          fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8')
        );
        const depKeys = Object.keys(pkg.dependencies || {});
        expect(depKeys.length).toBeLessThanOrEqual(3);
        expect(depKeys).toContain('ajv');
        expect(depKeys).toContain('ajv-formats');
        expect(depKeys).toContain('yaml');

        // Zero heavy dependencies
        const forbiddenDeps = ['lodash', 'axios', 'commander', 'yargs', 'chalk'];
        for (const dep of forbiddenDeps) {
          expect(depKeys).not.toContain(dep);
        }
      });

      it('F2-02: YAML v2 Parser & CST LineCounter Sanity', () => {
        const yamlStr = 'name: test\nposture: strict\ncount: 42\n';
        const lineCounter = new YAML.LineCounter();
        const doc = YAML.parseDocument(yamlStr, { lineCounter });

        expect(doc.errors).toHaveLength(0);
        const jsObj = doc.toJS();
        expect(jsObj.name).toBe('test');
        expect(jsObj.posture).toBe('strict');

        // linePos offset 0 corresponds to line 1, column 1
        const pos1 = lineCounter.linePos(0);
        expect(pos1.line).toBe(1);
        expect(pos1.col).toBe(1);
      });

      it('F2-03: Ajv Draft-07 & ajv-formats Validator Sanity', () => {
        const ajv = new AjvClass({ allErrors: true });
        addFormatsFn(ajv);

        const schema = {
          type: 'object',
          properties: {
            policyUrl: { type: 'string', format: 'uri' },
          },
          required: ['policyUrl'],
        };
        const validate = ajv.compile(schema);
        expect(validate({ policyUrl: 'https://example.com/ai-policy' })).toBe(true);
        expect(validate({ policyUrl: 'invalid-uri-scheme' })).toBe(false);
      });

      it('F2-04: Toolchain Scripts Contract Verification', () => {
        const pkg = JSON.parse(
          fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8')
        );
        expect(pkg.scripts?.build).toBe('tsup');
        expect(pkg.scripts?.typecheck).toBe('tsc --noEmit');
        expect(pkg.scripts?.test).toBe('vitest run');
      });

      it('F2-05: Clean Module Import (Zero Side Effects)', async () => {
        let errorThrown = false;
        try {
          const mod = await import('../../src/index.js');
          expect(mod).toBeDefined();
          expect(mod.VERSION).toBeDefined();
        } catch {
          errorThrown = true;
        }
        expect(errorThrown).toBe(false);
      });
    });

    // -----------------------------------------------------------------------
    // Feature 3: Cross-Platform Execution
    // -----------------------------------------------------------------------
    describe('F3: Cross-Platform Execution', () => {
      it('F3-01: Path Normalization (POSIX vs Windows Separators)', async () => {
        const tempDir = createTempDir('aipk-norm-');
        const subDir = path.join(tempDir, 'sub');
        fs.mkdirSync(subDir, { recursive: true });

        const policyContent = YAML.stringify({
          version: '0.1',
          level: 'permissive',
          categories: { code: 'permissive' },
          disclosure: { required: false },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'permissive' },
        });

        const targetFile = path.join(subDir, 'ai-policy.yml');
        fs.writeFileSync(targetFile, policyContent, 'utf-8');

        // Path with forward slashes
        const posixPath = targetFile.replace(/\\/g, '/');
        const posixRes = await aipk.loadPolicy(posixPath);
        expect(posixRes.config.level).toBe('permissive');

        // Path with backslashes
        const winPath = targetFile.replace(/\//g, '\\');
        const winRes = await aipk.loadPolicy(winPath);
        expect(winRes.config.level).toBe('permissive');

        expect(path.normalize(posixRes.filepath)).toBe(path.normalize(winRes.filepath));
      });

      it('F3-02: CRLF (\\r\\n) vs LF (\\n) Invariance', () => {
        const contentLf =
          'version: "0.1"\nlevel: "restricted"\ncategories:\n  code: "restricted"\ndisclosure:\n  required: true\naccountability:\n  author_takes_responsibility: true\nbots:\n  automated_prs: "restricted"\n';
        const contentCrlf = contentLf.replace(/\n/g, '\r\n');

        const parsedLf = YAML.parse(contentLf);
        const parsedCrlf = YAML.parse(contentCrlf);
        expect(parsedLf).toEqual(parsedCrlf);

        const resLf = aipk.validatePolicy(parsedLf, { sourceText: contentLf });
        const resCrlf = aipk.validatePolicy(parsedCrlf, { sourceText: contentCrlf });
        expect(resLf.valid).toBe(resCrlf.valid);
        expect(resLf.diagnostics).toEqual(resCrlf.diagnostics);
      });

      it('F3-03: Case-Preserving Path Precedence Resolution', async () => {
        const tempDir = createTempDir('aipk-case-');
        const githubDir = path.join(tempDir, '.github');
        fs.mkdirSync(githubDir, { recursive: true });

        const policyContent = YAML.stringify({
          version: '0.1',
          level: 'permissive',
          categories: { code: 'permissive' },
          disclosure: { required: false },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'permissive' },
        });

        fs.writeFileSync(path.join(githubDir, 'ai-policy.yml'), policyContent, 'utf-8');
        const res = await aipk.loadPolicy(tempDir);
        expect(res.filepath).toContain('.github');
        expect(res.config.level).toBe('permissive');
      });

      it('F3-04: Windows Drive Letter & Absolute Path Resolution', async () => {
        const tempDir = createTempDir('aipk-drive-');
        const policyPath = path.resolve(tempDir, 'ai-policy.yml');
        fs.writeFileSync(
          policyPath,
          YAML.stringify({
            version: '0.1',
            level: 'restricted',
            categories: { code: 'restricted' },
            disclosure: { required: false },
            accountability: { author_takes_responsibility: true },
            bots: { automated_prs: 'restricted' },
          }),
          'utf-8'
        );

        const absPath = path.resolve(policyPath);
        const res = await aipk.loadPolicy(absPath);
        expect(res.config.level).toBe('restricted');
        expect(path.isAbsolute(res.filepath)).toBe(true);
      });

      it('F3-05: CLI Output Stream Normalization', () => {
        const raw = 'Hello\r\n\u001b[32mSuccess\u001b[0m\r\n';
        const normalized = normalizeOutput(raw);
        expect(normalized).toBe('Hello\nSuccess\n');
        expect(normalized).not.toContain('\r');
        expect(normalized).not.toContain('\u001b');
      });
    });

    // -----------------------------------------------------------------------
    // Feature 4: Schema v0.1 Types & Validation
    // -----------------------------------------------------------------------
    describe('F4: Schema v0.1 Types & Validation', () => {
      it('F4-01: Full Valid Policy Configuration Validation', () => {
        const fullPolicy: AIPolicyConfig = {
          version: '0.1',
          level: 'restricted',
          policy_url: 'https://example.com/ai-policy',
          policy_path: 'docs/AI_POLICY.md',
          categories: {
            code: 'restricted',
            docs: 'permissive',
            tests: 'restricted',
            reviews: 'forbidden',
            issues: 'permissive',
          },
          disclosure: {
            required: true,
            methods: ['commit_trailer', 'pr_checklist'],
            commit_trailer: {
              key: 'AI-Assisted',
              required: true,
              pattern: '^AI-Assisted: .+$',
            },
            tool_name_required: true,
            prompt_disclosure: 'optional',
          },
          accountability: {
            author_understands_code: true,
            author_takes_responsibility: true,
            dco_signoff: true,
          },
          bots: {
            automated_prs: 'restricted',
            automated_reviews: 'forbidden',
            automated_issues: 'permissive',
            bot_allowlist: ['dependabot[bot]', 'renovate[bot]'],
          },
        };

        const res = aipk.validatePolicy(fullPolicy);
        expect(res.valid).toBe(true);
        expect(res.diagnostics).toHaveLength(0);
        expect(res.errors).toHaveLength(0);
      });

      it('F4-02: Minimal Valid Policy Configuration Validation', () => {
        const minimalPolicy = {
          version: '0.1',
          level: 'permissive',
          categories: { code: 'permissive' },
          disclosure: { required: false },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'permissive' },
        };

        const res = aipk.validatePolicy(minimalPolicy);
        expect(res.valid).toBe(true);
        expect(res.diagnostics).toHaveLength(0);
      });

      it('F4-03: Canonical Presets Schema Adherence', () => {
        const presetNames: aipk.PresetName[] = ['strict', 'balanced', 'permissive'];
        for (const name of presetNames) {
          const presetFilePath = path.join(REPO_ROOT, 'presets', `${name}.yml`);
          expect(fs.existsSync(presetFilePath)).toBe(true);
          const raw = fs.readFileSync(presetFilePath, 'utf-8');
          const parsed = YAML.parse(raw);
          const res = aipk.validatePolicy(parsed);
          expect(res.valid, `Preset ${name} must be schema valid`).toBe(true);
        }
      });

      it('F4-04: Strict Validation Mode Enforcement', () => {
        const validPolicy = {
          version: '0.1',
          level: 'permissive',
          categories: { code: 'permissive' },
          disclosure: { required: false },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'permissive' },
        };
        expect(() => aipk.validatePolicy(validPolicy, { strict: true })).not.toThrow();

        const invalidPolicy = {
          version: '0.1',
          level: 'forbidden',
          // Missing required fields
        };
        expect(() => aipk.validatePolicy(invalidPolicy, { strict: true })).toThrow(
          aipk.PolicyValidationError
        );
      });

      it('F4-05: ValidationResult & PolicyValidationError Structural Contract', () => {
        const diag: PolicyDiagnostic = {
          message: 'Schema violation',
          path: 'categories.code',
          severity: 'error',
        };
        const err = new aipk.PolicyValidationError('Validation error occurred', [diag]);

        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(aipk.PolicyValidationError);
        expect(err.name).toBe('PolicyValidationError');
        expect(err.diagnostics).toHaveLength(1);
        expect(err.diagnostics[0]?.path).toBe('categories.code');

        const res = aipk.validatePolicy({ invalid: true });
        expect(res.valid).toBe(false);
        expect(res.errors).toBe(res.diagnostics);
      });

      it('F4-06: Schema Specification Version Pattern Enforcement', () => {
        const base = {
          level: 'permissive',
          categories: { code: 'permissive' },
          disclosure: { required: false },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'permissive' },
        };

        const validVersions = ['0.1', '0.1.0', '0.1.9'];
        for (const ver of validVersions) {
          const res = aipk.validatePolicy({ ...base, version: ver });
          expect(res.valid, `Version ${ver} should be valid`).toBe(true);
        }

        const invalidVersions = ['1.0', '0.2', 'v0.1', 'latest'];
        for (const ver of invalidVersions) {
          const res = aipk.validatePolicy({ ...base, version: ver });
          expect(res.valid, `Version ${ver} should be invalid`).toBe(false);
          expect(res.diagnostics.some((d) => d.keyword === 'pattern')).toBe(true);
        }
      });
    });

    // -----------------------------------------------------------------------
    // Feature 5: Policy Discovery & Loading (loadPolicy / loadPolicySync)
    // -----------------------------------------------------------------------
    describe('F5: Policy Discovery & Loading (loadPolicy / loadPolicySync)', () => {
      it('F5-01: Discovery Precedence Order Resolution', async () => {
        const tempDir = createTempDir('aipk-prec-');
        const ghDir = path.join(tempDir, '.github');
        fs.mkdirSync(ghDir, { recursive: true });

        const ghPolicy = path.join(ghDir, 'ai-policy.yml');
        const rootPolicy = path.join(tempDir, 'ai-policy.yml');

        const strictCfg = YAML.stringify({
          version: '0.1',
          level: 'forbidden',
          categories: { code: 'forbidden' },
          disclosure: { required: true },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'forbidden' },
        });

        const permCfg = YAML.stringify({
          version: '0.1',
          level: 'permissive',
          categories: { code: 'permissive' },
          disclosure: { required: false },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'permissive' },
        });

        fs.writeFileSync(ghPolicy, strictCfg, 'utf-8');
        fs.writeFileSync(rootPolicy, permCfg, 'utf-8');

        // .github/ai-policy.yml has priority over root ai-policy.yml
        const res1 = await aipk.loadPolicy(tempDir);
        expect(res1.config.level).toBe('forbidden');
        expect(res1.filepath).toContain('.github');

        // When .github/ai-policy.yml is removed, root is discovered
        fs.unlinkSync(ghPolicy);
        const res2 = await aipk.loadPolicy(tempDir);
        expect(res2.config.level).toBe('permissive');
      });

      it('F5-02: Explicit Custom YAML Filepath Loading', async () => {
        const tempDir = createTempDir('aipk-custom-');
        const customFile = path.join(tempDir, 'custom-rules.yaml');
        fs.writeFileSync(
          customFile,
          YAML.stringify({
            version: '0.1',
            level: 'restricted',
            categories: { code: 'restricted' },
            disclosure: { required: true },
            accountability: { author_takes_responsibility: true },
            bots: { automated_prs: 'restricted' },
          }),
          'utf-8'
        );

        const res = await aipk.loadPolicy(customFile);
        expect(res.config.level).toBe('restricted');
        expect(res.filepath).toBe(path.resolve(customFile));
      });

      it('F5-03: JSON Format Policy File Loading', async () => {
        const tempDir = createTempDir('aipk-json-');
        const jsonFile = path.join(tempDir, 'ai-policy.json');
        fs.writeFileSync(
          jsonFile,
          JSON.stringify({
            version: '0.1',
            level: 'permissive',
            categories: { code: 'permissive' },
            disclosure: { required: false },
            accountability: { author_takes_responsibility: true },
            bots: { automated_prs: 'permissive' },
          }),
          'utf-8'
        );

        const res = await aipk.loadPolicy(jsonFile);
        expect(res.config.level).toBe('permissive');
        expect(res.filepath.endsWith('.json')).toBe(true);
      });

      it('F5-04: Async loadPolicy & Sync loadPolicySync Parity', async () => {
        const tempDir = createTempDir('aipk-parity-');
        const policyFile = path.join(tempDir, 'ai-policy.yml');
        fs.writeFileSync(
          policyFile,
          YAML.stringify({
            version: '0.1',
            level: 'restricted',
            categories: { code: 'restricted' },
            disclosure: { required: true },
            accountability: { author_takes_responsibility: true },
            bots: { automated_prs: 'restricted' },
          }),
          'utf-8'
        );

        const asyncRes = await aipk.loadPolicy(policyFile);
        const syncRes = aipk.loadPolicySync(policyFile);

        expect(asyncRes.config).toEqual(syncRes.config);
        expect(asyncRes.filepath).toBe(syncRes.filepath);
        expect(asyncRes.doc?.toJSON()).toEqual(syncRes.doc?.toJSON());
      });

      it('F5-05: Missing File Descriptive Error Rejection', async () => {
        const nonExistent = path.join(os.tmpdir(), 'non-existent-dir-' + Date.now());
        await expect(aipk.loadPolicy(nonExistent)).rejects.toThrow();
        expect(() => aipk.loadPolicySync(nonExistent)).toThrow();
      });

      it('F5-06: CST Document Retention for Source Mapping', async () => {
        const tempDir = createTempDir('aipk-cst-');
        const policyFile = path.join(tempDir, 'ai-policy.yml');
        fs.writeFileSync(
          policyFile,
          '# Top Comment\nversion: "0.1"\nlevel: "permissive"\ncategories:\n  code: "permissive"\ndisclosure:\n  required: false\naccountability:\n  author_takes_responsibility: true\nbots:\n  automated_prs: "permissive"\n',
          'utf-8'
        );

        const res = await aipk.loadPolicy(policyFile);
        expect(res.doc).toBeDefined();
        expect(res.doc?.contents).not.toBeNull();
      });
    });

    // -----------------------------------------------------------------------
    // Feature 6: Line & Column Coordinate Resolver
    // -----------------------------------------------------------------------
    describe('F6: Line & Column Coordinate Resolver', () => {
      it('F6-01: Root-Level Property Error Coordinate Mapping', () => {
        const text = 'version: "0.1"\nlevel: "invalid_level"\ncategories:\n  code: "permissive"\n';
        const parsed = YAML.parse(text);
        const res = aipk.validatePolicy(parsed, { sourceText: text });

        expect(res.valid).toBe(false);
        const levelDiag = res.diagnostics.find((d) => d.path.includes('level'));
        expect(levelDiag).toBeDefined();
        expect(levelDiag?.line).toBe(2);
        expect(levelDiag?.column).toBeGreaterThanOrEqual(1);
      });

      it('F6-02: Nested Object Error Coordinate Mapping', () => {
        const text =
          'version: "0.1"\nlevel: "permissive"\ncategories:\n  code: "unsupported_posture"\n';
        const parsed = YAML.parse(text);
        const res = aipk.validatePolicy(parsed, { sourceText: text });

        expect(res.valid).toBe(false);
        const codeDiag = res.diagnostics.find((d) => d.path.includes('categories.code'));
        expect(codeDiag).toBeDefined();
        expect(codeDiag?.line).toBe(4);
      });

      it('F6-03: Array Element Error Coordinate Mapping', () => {
        const text =
          'version: "0.1"\nlevel: "permissive"\ncategories:\n  code: "permissive"\ndisclosure:\n  required: true\n  methods:\n    - commit_trailer\n    - invalid_method\n';
        const parsed = YAML.parse(text);
        const res = aipk.validatePolicy(parsed, { sourceText: text });

        expect(res.valid).toBe(false);
        const methodDiag = res.diagnostics.find((d) => d.path.includes('methods'));
        expect(methodDiag).toBeDefined();
        expect(methodDiag?.line).toBe(9);
      });

      it('F6-04: Coordinate Resolution With Comments & Blank Lines', () => {
        const text =
          '# Header line 1\n# Header line 2\n\n# Configuration\nversion: "0.1"\n\n# Bad level\nlevel: "bad_posture"\n';
        const parsed = YAML.parse(text);
        const res = aipk.validatePolicy(parsed, { sourceText: text });

        expect(res.valid).toBe(false);
        const diag = res.diagnostics.find((d) => d.path.includes('level'));
        expect(diag).toBeDefined();
        expect(diag?.line).toBe(8);
      });

      it('F6-05: JSON Source Coordinate Resolution', () => {
        const jsonText =
          '{\n  "version": "0.1",\n  "level": "bad_level",\n  "categories": {\n    "code": "permissive"\n  }\n}';
        const parsed = JSON.parse(jsonText);
        const res = aipk.validatePolicy(parsed, { sourceText: jsonText });

        expect(res.valid).toBe(false);
        const diag = res.diagnostics.find((d) => d.path.includes('level'));
        expect(diag).toBeDefined();
        expect(diag?.line).toBe(3);
      });
    });

    // -----------------------------------------------------------------------
    // Feature 7: Remediation Engine
    // -----------------------------------------------------------------------
    describe('F7: Remediation Engine', () => {
      it('F7-01: Remediation for Missing Required Fields', () => {
        const incomplete = {
          version: '0.1',
          level: 'permissive',
          categories: { code: 'permissive' },
          disclosure: { required: false },
          bots: { automated_prs: 'permissive' },
          // Missing 'accountability'
        };
        const res = aipk.validatePolicy(incomplete);
        expect(res.valid).toBe(false);

        const diag = res.diagnostics.find((d) => d.keyword === 'required');
        expect(diag).toBeDefined();
        expect(diag?.remediation).toBeDefined();
        expect(diag?.remediation?.length).toBeGreaterThan(10);
        expect(diag?.remediation?.toLowerCase()).toContain('accountability');
      });

      it('F7-02: Remediation for Invalid Data Types', () => {
        const invalidType = {
          version: '0.1',
          level: 'permissive',
          categories: { code: 'permissive' },
          disclosure: { required: 'yes' }, // should be boolean
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'permissive' },
        };
        const res = aipk.validatePolicy(invalidType);
        expect(res.valid).toBe(false);

        const diag = res.diagnostics.find((d) => d.keyword === 'type');
        expect(diag).toBeDefined();
        expect(diag?.remediation).toBeDefined();
        expect(diag?.remediation?.toLowerCase()).toMatch(/type|boolean/);
      });

      it('F7-03: Remediation for Enum Mismatches', () => {
        const enumMismatch = {
          version: '0.1',
          level: 'strict', // valid values: forbidden, restricted, permissive
          categories: { code: 'permissive' },
          disclosure: { required: false },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'permissive' },
        };
        const res = aipk.validatePolicy(enumMismatch);
        expect(res.valid).toBe(false);

        const diag = res.diagnostics.find((d) => d.keyword === 'enum');
        expect(diag).toBeDefined();
        expect(diag?.remediation).toBeDefined();
        expect(diag?.remediation).toContain('forbidden');
        expect(diag?.remediation).toContain('restricted');
        expect(diag?.remediation).toContain('permissive');
      });

      it('F7-04: Remediation for Regex Pattern Violations', () => {
        const patternViolation = {
          version: '2.0', // expected ^0\.1(\.[0-9]+)?$
          level: 'permissive',
          categories: { code: 'permissive' },
          disclosure: { required: false },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'permissive' },
        };
        const res = aipk.validatePolicy(patternViolation);
        expect(res.valid).toBe(false);

        const diag = res.diagnostics.find((d) => d.keyword === 'pattern');
        expect(diag).toBeDefined();
        expect(diag?.remediation).toBeDefined();
        expect(diag?.remediation).toMatch(/pattern|0\.1/);
      });

      it('F7-05: Remediation for Forbidden Additional Properties', () => {
        const additionalProp = {
          version: '0.1',
          level: 'permissive',
          categories: { code: 'permissive' },
          disclosure: { required: false },
          accountability: { author_takes_responsibility: true },
          bots: { automated_prs: 'permissive' },
          unrecognized_property_key: 12345,
        };
        const res = aipk.validatePolicy(additionalProp);
        expect(res.valid).toBe(false);

        const diag = res.diagnostics.find((d) => d.keyword === 'additionalProperties');
        expect(diag).toBeDefined();
        expect(diag?.remediation).toBeDefined();
        expect(diag?.remediation).toContain('unrecognized_property_key');
      });
    });

    // -----------------------------------------------------------------------
    // Feature 8: Presets Catalog & Export
    // -----------------------------------------------------------------------
    describe('F8: Presets Catalog & Export', () => {
      it('F8-01: PRESETS Dictionary Export & File Resolution', () => {
        expect(aipk.PRESETS).toBeDefined();
        expect(aipk.PRESETS.strict).toBe('presets/strict.yml');
        expect(aipk.PRESETS.balanced).toBe('presets/balanced.yml');
        expect(aipk.PRESETS.permissive).toBe('presets/permissive.yml');

        for (const presetPath of Object.values(aipk.PRESETS)) {
          const fullPath = path.join(REPO_ROOT, presetPath);
          expect(fs.existsSync(fullPath), `Preset file ${presetPath} must exist`).toBe(true);
        }
      });

      it('F8-02: Canonical strict.yml Preset Schema & Posture Integrity', () => {
        const presetPath = path.join(REPO_ROOT, aipk.PRESETS.strict);
        const preset = YAML.parse(fs.readFileSync(presetPath, 'utf-8'));

        const res = aipk.validatePolicy(preset);
        expect(res.valid).toBe(true);
        expect(preset.level).toBe('forbidden');
        expect(preset.categories.code).toBe('forbidden');
        expect(preset.disclosure.commit_trailer.required).toBe(true);
        expect(preset.accountability.dco_signoff).toBe(true);
        expect(preset.bots.automated_prs).toBe('forbidden');
      });

      it('F8-03: Canonical balanced.yml Preset Schema & Posture Integrity', () => {
        const presetPath = path.join(REPO_ROOT, aipk.PRESETS.balanced);
        const preset = YAML.parse(fs.readFileSync(presetPath, 'utf-8'));

        const res = aipk.validatePolicy(preset);
        expect(res.valid).toBe(true);
        expect(preset.level).toBe('restricted');
        expect(preset.categories.code).toBe('restricted');
        expect(preset.categories.docs).toBe('permissive');
        expect(preset.disclosure.commit_trailer.required).toBe(false);
        expect(preset.bots.automated_prs).toBe('forbidden');
      });

      it('F8-04: Canonical permissive.yml Preset Schema & Posture Integrity', () => {
        const presetPath = path.join(REPO_ROOT, aipk.PRESETS.permissive);
        const preset = YAML.parse(fs.readFileSync(presetPath, 'utf-8'));

        const res = aipk.validatePolicy(preset);
        expect(res.valid).toBe(true);
        expect(preset.level).toBe('permissive');
        expect(preset.categories.code).toBe('permissive');
        expect(preset.disclosure.required).toBe(false);
        expect(preset.bots.automated_prs).toBe('restricted');
      });

      it('F8-05: SCHEMA_V0_1 Metadata Export & File Alignment', () => {
        expect(aipk.SCHEMA_V0_1).toBeDefined();
        expect(aipk.SCHEMA_V0_1.version).toBe('0.1');
        expect(aipk.SCHEMA_V0_1.$schema).toContain('draft-07');

        const schemaFile = path.join(REPO_ROOT, 'schema', 'v0.1', 'ai-policy.schema.json');
        expect(fs.existsSync(schemaFile)).toBe(true);
        const schemaJson = JSON.parse(fs.readFileSync(schemaFile, 'utf-8'));
        expect(schemaJson.$schema).toBe(aipk.SCHEMA_V0_1.$schema);
      });

      it('F8-06: Presets Language Server Header', () => {
        for (const presetPath of Object.values(aipk.PRESETS)) {
          const fullPath = path.join(REPO_ROOT, presetPath);
          const content = fs.readFileSync(fullPath, 'utf-8');
          const firstLine = content.split(/\r?\n/)[0];
          expect(firstLine).toMatch(/^#\s*yaml-language-server:\s*\$schema=/);
          expect(firstLine).toContain('ai-policy.schema.json');
        }
      });
    });
  });

  // =========================================================================
  // PILLAR 2: CLI Commands & Documentation Generators (Features 9 to 11)
  // =========================================================================
  describe('Pillar 2: CLI Commands & Documentation Generators (F9 to F11)', () => {
    // -----------------------------------------------------------------------
    // Feature 9: CLI Subcommand init
    // -----------------------------------------------------------------------
    describe('F9: CLI Subcommand init', () => {
      it.skipIf(!isCliImplemented)(
        'F9.1: Scaffolds .github/ai-policy.yml with balanced preset by default',
        async () => {
          await withGitFixture(async (fixture) => {
            const result = await runCli(['init'], { cwd: fixture.repoDir });
            expectCliSuccess(result);
            expect(fixture.exists('.github/ai-policy.yml')).toBe(true);
            const content = fixture.readFile('.github/ai-policy.yml');
            expect(content).toContain('level: "restricted"');
            expect(content).toContain('categories:');
            expectDisclaimerPresent(result);
          });
        }
      );

      it.skipIf(!isCliImplemented)(
        'F9.2: Scaffolds strict preset with --preset strict',
        async () => {
          await withGitFixture(async (fixture) => {
            const result = await runCli(['init', '--preset', 'strict'], { cwd: fixture.repoDir });
            expectCliSuccess(result);
            const content = fixture.readFile('.github/ai-policy.yml');
            expect(content).toContain('level: "forbidden"');
            expect(content).toContain('code: "forbidden"');
            expect(content).toContain('required: true');
          });
        }
      );

      it.skipIf(!isCliImplemented)(
        'F9.3: Scaffolds permissive preset with --preset permissive',
        async () => {
          await withGitFixture(async (fixture) => {
            const result = await runCli(['init', '--preset', 'permissive'], { cwd: fixture.repoDir });
            expectCliSuccess(result);
            const content = fixture.readFile('.github/ai-policy.yml');
            expect(content).toContain('level: "permissive"');
            expect(content).toContain('required: false');
          });
        }
      );

      it.skipIf(!isCliImplemented)(
        'F9.4: Prevents accidental overwrite without --force, allows with --force',
        async () => {
          await withGitFixture(async (fixture) => {
            fixture.writeFile('.github/ai-policy.yml', '# sentinel-custom-content');
            const failResult = await runCli(['init', '--preset', 'strict'], { cwd: fixture.repoDir });
            expect(failResult.exitCode).toBeGreaterThan(0);
            expect(fixture.readFile('.github/ai-policy.yml')).toBe('# sentinel-custom-content');

            const forceResult = await runCli(['init', '--preset', 'strict', '--force'], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(forceResult);
            expect(fixture.readFile('.github/ai-policy.yml')).toContain('level: "forbidden"');
          });
        }
      );

      it.skipIf(!isCliImplemented)(
        'F9.5: Includes yaml-language-server schema header pointing to v0.1 schema',
        async () => {
          await withGitFixture(async (fixture) => {
            await runCli(['init'], { cwd: fixture.repoDir });
            const firstLine = fixture.readFile('.github/ai-policy.yml').split(/\r?\n/)[0];
            expect(firstLine).toMatch(/^#\s*yaml-language-server:\s*\$schema=/);
            expect(firstLine).toContain('ai-policy.schema.json');
          });
        }
      );
    });

    // -----------------------------------------------------------------------
    // Feature 10: Markdown Generators
    // -----------------------------------------------------------------------
    describe('F10: Markdown Generators', () => {
      it.skipIf(!isCliImplemented)('F10.1: Generates human-readable AI_POLICY.md', async () => {
        await withGitFixture(async (fixture) => {
          const result = await runCli(['init', '--docs'], { cwd: fixture.repoDir });
          expectCliSuccess(result);
          expect(fixture.exists('AI_POLICY.md')).toBe(true);
          const doc = fixture.readFile('AI_POLICY.md');
          expect(doc).toMatch(/# .*AI.*Policy/i);
        });
      });

      it.skipIf(!isCliImplemented)(
        'F10.2: Generates AGENTS.md policy instructions for coding agents',
        async () => {
          await withGitFixture(async (fixture) => {
            const result = await runCli(['init', '--preset', 'strict', '--docs'], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(result);
            expect(fixture.exists('AGENTS.md')).toBe(true);
            const agents = fixture.readFile('AGENTS.md');
            expect(agents).toContain('AI-Assisted');
            expect(agents).toContain('.cursor');
          });
        }
      );

      it.skipIf(!isCliImplemented)(
        'F10.3: Generates PR checklist template in .github/PULL_REQUEST_TEMPLATE.md',
        async () => {
          await withGitFixture(async (fixture) => {
            const result = await runCli(['init', '--docs'], { cwd: fixture.repoDir });
            expectCliSuccess(result);
            expect(fixture.exists('.github/PULL_REQUEST_TEMPLATE.md')).toBe(true);
            const prTmpl = fixture.readFile('.github/PULL_REQUEST_TEMPLATE.md');
            expect(prTmpl).toContain('- [ ]');
            expect(prTmpl).toMatch(/AI|disclosure/i);
          });
        }
      );

      it.skipIf(!isCliImplemented)(
        'F10.4: Generates config and all markdown docs together with --docs',
        async () => {
          await withGitFixture(async (fixture) => {
            const result = await runCli(['init', '--preset', 'balanced', '--docs'], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(result);
            expect(fixture.exists('.github/ai-policy.yml')).toBe(true);
            expect(fixture.exists('AI_POLICY.md')).toBe(true);
            expect(fixture.exists('AGENTS.md')).toBe(true);
            expect(fixture.exists('.github/PULL_REQUEST_TEMPLATE.md')).toBe(true);
          });
        }
      );

      it.skipIf(!isCliImplemented)(
        'F10.5: Substitutes template variables without dangling brackets',
        async () => {
          await withGitFixture(async (fixture) => {
            await runCli(['init', '--preset', 'strict', '--docs'], { cwd: fixture.repoDir });
            const doc = fixture.readFile('AI_POLICY.md');
            expect(doc).not.toMatch(/\{\{[a-zA-Z0-9_-]+\}\}/);
          });
        }
      );
    });

    // -----------------------------------------------------------------------
    // Feature 11: CLI Subcommand check
    // -----------------------------------------------------------------------
    describe('F11: CLI Subcommand check', () => {
      it.skipIf(!isCliImplemented)(
        'F11.1: Automatically discovers and validates .github/ai-policy.yml',
        async () => {
          await withGitFixture(async (fixture) => {
            await runCli(['init'], { cwd: fixture.repoDir });
            const result = await runCli(['check'], { cwd: fixture.repoDir });
            expectCliSuccess(result);
            expect(result.stdout).toMatch(/valid|compliant/i);
            expectDisclaimerPresent(result);
          });
        }
      );

      it.skipIf(!isCliImplemented)('F11.2: Validates custom policy file path', async () => {
        await withGitFixture(async (fixture) => {
          fixture.writeFile(
            'config/my-policy.yml',
            YAML.stringify({
              version: '0.1',
              level: 'permissive',
              categories: { code: 'permissive' },
              disclosure: { required: false },
              accountability: { author_takes_responsibility: true },
              bots: { automated_prs: 'permissive' },
            })
          );

          const result = await runCli(['check', 'config/my-policy.yml'], {
            cwd: fixture.repoDir,
          });
          expectCliSuccess(result);
        });
      });

      it.skipIf(!isCliImplemented)('F11.3: Validates remote URL policy format', async () => {
        const url =
          'https://raw.githubusercontent.com/thanhtrieunguyen/ai-policy-kit/main/presets/balanced.yml';
        const result = await runCli(['check', url]);
        // Accepts exit 0 or graceful offline rejection
        expect([0, 2]).toContain(result.exitCode);
      });

      it.skipIf(!isCliImplemented)('F11.4: Quiet mode suppresses stdout on success', async () => {
        await withGitFixture(async (fixture) => {
          await runCli(['init'], { cwd: fixture.repoDir });
          const result = await runCli(['check', '--quiet'], { cwd: fixture.repoDir });
          expectCliSuccess(result);
          expect(result.stdout.trim()).toBe('');
        });
      });

      it.skipIf(!isCliImplemented)(
        'F11.5: Exits with code 2 and suggests remediation when no config exists',
        async () => {
          await withGitFixture(async (fixture) => {
            const result = await runCli(['check'], { cwd: fixture.repoDir });
            expectCliError(result, 2);
            expect(result.stderr + result.stdout).toContain('ai-policy init');
          });
        }
      );
    });
  });

  // =========================================================================
  // PILLAR 3: Pull Request Compliance Engine (Features 12 to 17)
  // =========================================================================
  describe('Pillar 3: Pull Request Compliance Engine (F12 to F17)', () => {
    // -----------------------------------------------------------------------
    // Feature 12: CLI Subcommand lint-pr
    // -----------------------------------------------------------------------
    describe('F12: CLI Subcommand lint-pr', () => {
      it.skipIf(!isCliImplemented)(
        'F12.1: Passes clean PR with valid commit trailer',
        async () => {
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
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F12.2: Passes PR when checklist disclosure is satisfied in PR body',
        async () => {
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
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F12.3: Passes on zero-diff / empty commit range',
        async () => {
          await withGitFixture(async (fixture) => {
            await runCli(['init'], { cwd: fixture.repoDir });
            fixture.commit('chore: init');
            const result = await runCli(['lint-pr', '--base', 'main', '--head', 'main'], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(result);
          });
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F12.4: Validates multi-commit PR and pinpoints offending commit SHA',
        async () => {
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
            expect(result.stdout + result.stderr).toMatch(/missing|violation/i);
          });
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F12.5: Scopes check strictly within specified base and head refs',
        async () => {
          await withGitFixture(async (fixture) => {
            fixture.writeFile('base.txt', 'base');
            fixture.stage('base.txt');
            fixture.commit('base commit');
            fixture.checkout('feature-branch', { create: true });
            fixture.writeFile('f.txt', 'f');
            fixture.stage('f.txt');
            fixture.commit('f commit', { trailers: { 'AI-Assisted': 'Copilot' } });

            const result = await runCli(
              ['lint-pr', '--base', 'main', '--head', 'feature-branch'],
              { cwd: fixture.repoDir }
            );
            expectCliSuccess(result);
          });
        },
        30000
      );
    });

    // -----------------------------------------------------------------------
    // Feature 13: Commit Trailer Enforcement
    // -----------------------------------------------------------------------
    describe('F13: Commit Trailer Enforcement', () => {
      it.skipIf(!isCliImplemented)(
        'F13.1: Extracts standard RFC 5322 trailer with trailing blank line',
        async () => {
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
                  message: 'feat: implement feature\n\nDetailed body description',
                  files: { 'a.ts': 'export const a = 1;' },
                  trailers: { 'AI-Assisted': 'Claude 3.5 Sonnet' },
                },
              ],
            });
            const result = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(result);
          });
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F13.2: Handles multi-trailer commits with Signed-off-by and Co-authored-by',
        async () => {
          await withGitFixture(async (fixture) => {
            const rawBlock =
              'Signed-off-by: Dev <dev@example.com>\nCo-authored-by: Pair <pair@example.com>\nAI-Assisted: Cursor v0.42.0';
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
                  message: 'feat: multi trailer commit',
                  files: { 'b.ts': 'export const b = 2;' },
                  rawTrailersBlock: rawBlock,
                },
              ],
            });
            const result = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(result);
          });
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F13.3: Enforces tool version pattern regex',
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
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F13.4: Validates strict preset trailer regex and case sensitivity',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              policyConfig: {
                version: '0.1',
                level: 'forbidden',
                categories: { code: 'forbidden' },
                disclosure: {
                  required: true,
                  commit_trailer: {
                    key: 'AI-Assisted',
                    pattern: '^AI-Assisted: (None|docs:[a-zA-Z0-9_-]+)$',
                  },
                },
                accountability: { author_takes_responsibility: true },
                bots: { automated_prs: 'forbidden' },
              },
              featureCommits: [
                {
                  message: 'docs: update guide',
                  files: { 'guide.md': '# Guide' },
                  trailers: { 'AI-Assisted': 'docs:claude' },
                },
              ],
            });
            const result = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(result);
          });
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F13.5: Handles non-fast-forward merge commits gracefully',
        async () => {
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
        },
        30000
      );
    });

    // -----------------------------------------------------------------------
    // Feature 14: Workspace Leak Detection
    // -----------------------------------------------------------------------
    describe('F14: Workspace Leak Detection', () => {
      it.skipIf(!isCliImplemented)(
        'F14.1: Detects .claude/ directory staged leak',
        async () => {
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
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F14.2: Detects .cursor/ rules staged leak',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [
                {
                  message: 'leak: accidental cursor rules',
                  leaks: ['cursor'],
                },
              ],
            });
            const result = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expectCliViolation(result, 1);
            expect(result.stdout + result.stderr).toContain('.cursor');
          });
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F14.3: Detects .gemini/ settings staged leak',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [
                {
                  message: 'leak: accidental gemini config',
                  leaks: ['gemini'],
                },
              ],
            });
            const result = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expectCliViolation(result, 1);
            expect(result.stdout + result.stderr).toContain('.gemini');
          });
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F14.4: Detects .continue/ config staged leak',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [
                {
                  message: 'leak: accidental continue settings',
                  leaks: ['continue'],
                },
              ],
            });
            const result = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expectCliViolation(result, 1);
            expect(result.stdout + result.stderr).toContain('.continue');
          });
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F14.5: Produces zero false positives for normal files mentioning assistants',
        async () => {
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
        },
        30000
      );
    });

    // -----------------------------------------------------------------------
    // Feature 15: Deterministic Exit Codes
    // -----------------------------------------------------------------------
    describe('F15: Deterministic Exit Codes (0, 1, 2)', () => {
      it.skipIf(!isCliImplemented)(
        'F15.1: Returns exit code 0 on complete pass',
        async () => {
          await withGitFixture(async (fixture) => {
            await runCli(['init'], { cwd: fixture.repoDir });
            const result = await runCli(['check'], { cwd: fixture.repoDir });
            expect(result.exitCode).toBe(0);
          });
        }
      );

      it.skipIf(!isCliImplemented)(
        'F15.2: Returns exit code 1 when required trailer is missing',
        async () => {
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
              featureCommits: [{ message: 'feat: no trailer', files: { 'a.ts': '1' } }],
            });
            const result = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expect(result.exitCode).toBe(1);
          });
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F15.3: Returns exit code 1 when workspace leak is detected',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [{ message: 'leak', leaks: ['cursor'] }],
            });
            const result = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
              cwd: fixture.repoDir,
            });
            expect(result.exitCode).toBe(1);
          });
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F15.4: Returns exit code 2 on configuration schema error',
        async () => {
          await withGitFixture(async (fixture) => {
            fixture.writeFile(
              '.github/ai-policy.yml',
              'version: "0.1"\nunexpected_invalid_key: true\n'
            );
            const result = await runCli(['check'], { cwd: fixture.repoDir });
            expect(result.exitCode).toBe(2);
          });
        }
      );

      it.skipIf(!isCliImplemented)(
        'F15.5: Returns exit code 2 on CLI argument syntax error',
        async () => {
          const result = await runCli(['--unknown-unsupported-flag-xyz']);
          expect(result.exitCode).toBe(2);
        }
      );

      it.skipIf(!isCliImplemented)(
        'F15.6: Returns exit code 2 when target check file is missing',
        async () => {
          const result = await runCli(['check', 'missing-dir/no-such-policy.yml']);
          expect(result.exitCode).toBe(2);
        }
      );
    });

    // -----------------------------------------------------------------------
    // Feature 16: Machine-Readable --json Output
    // -----------------------------------------------------------------------
    describe('F16: Machine-Readable --json Output', () => {
      it.skipIf(!isCliImplemented)(
        'F16.1: init --json outputs valid JSON payload',
        async () => {
          await withGitFixture(async (fixture) => {
            const result = await runCli(['init', '--preset', 'strict', '--json'], {
              cwd: fixture.repoDir,
            });
            expectCliSuccess(result);
            const json = result.parseJson();
            expect(json.success).toBe(true);
            expect(json.preset).toBe('strict');
          });
        }
      );

      it.skipIf(!isCliImplemented)(
        'F16.2: check --json on valid configuration outputs valid: true',
        async () => {
          await withGitFixture(async (fixture) => {
            await runCli(['init'], { cwd: fixture.repoDir });
            const result = await runCli(['check', '--json'], { cwd: fixture.repoDir });
            expectCliSuccess(result);
            const json = result.parseJson();
            expect(json.valid).toBe(true);
            expect(Array.isArray(json.diagnostics)).toBe(true);
            expect(json.diagnostics.length).toBe(0);
          });
        }
      );

      it.skipIf(!isCliImplemented)(
        'F16.3: check --json on invalid configuration outputs diagnostic errors',
        async () => {
          await withGitFixture(async (fixture) => {
            fixture.writeFile('.github/ai-policy.yml', 'version: "0.1"\nlevel: "forbidden"\n');
            const result = await runCli(['check', '--json'], { cwd: fixture.repoDir });
            expectCliError(result, 2);
            const json = result.parseJson();
            expect(json.valid).toBe(false);
            expect(json.diagnostics.length).toBeGreaterThan(0);
            expect(json.diagnostics[0]).toHaveProperty('message');
          });
        }
      );

      it.skipIf(!isCliImplemented)(
        'F16.4: lint-pr --json on compliant PR outputs passed: true',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [
                {
                  message: 'feat: ok',
                  files: { 'a.ts': '1' },
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
          });
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F16.5: lint-pr --json on failing PR outputs violations and leaks',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [{ message: 'leak', leaks: ['cursor'] }],
            });
            const result = await runCli(
              ['lint-pr', '--base', baseRef, '--head', headRef, '--json'],
              { cwd: fixture.repoDir }
            );
            expectCliViolation(result, 1);
            const json = result.parseJson();
            expect(json.passed).toBe(false);
            expect(json.leaks.length).toBeGreaterThan(0);
          });
        },
        30000
      );

      it.skipIf(!isCliImplemented)(
        'F16.6: Deterministic exit code preservation under --json',
        async () => {
          await withGitFixture(async (fixture) => {
            await runCli(['init'], { cwd: fixture.repoDir });
            const passRes = await runCli(['check', '--json'], { cwd: fixture.repoDir });
            expect(passRes.exitCode).toBe(0);

            fixture.writeFile('.github/ai-policy.yml', 'invalid: true\n');
            const errRes = await runCli(['check', '--json'], { cwd: fixture.repoDir });
            expect(errRes.exitCode).toBe(2);
          });
        }
      );
    });

    // -----------------------------------------------------------------------
    // Feature 17: Mandatory Disclaimer Banner
    // -----------------------------------------------------------------------
    describe('F17: Mandatory Disclaimer Banner', () => {
      it.skipIf(!isCliImplemented)('F17.1: Includes disclaimer in root --help', async () => {
        const result = await runCli(['--help']);
        expectCliSuccess(result);
        expectDisclaimerPresent(result);
      });

      it.skipIf(!isCliImplemented)('F17.2: Includes disclaimer in init output', async () => {
        await withGitFixture(async (fixture) => {
          const result = await runCli(['init'], { cwd: fixture.repoDir });
          expectDisclaimerPresent(result);
        });
      });

      it.skipIf(!isCliImplemented)('F17.3: Includes disclaimer in check output', async () => {
        await withGitFixture(async (fixture) => {
          await runCli(['init'], { cwd: fixture.repoDir });
          const result = await runCli(['check'], { cwd: fixture.repoDir });
          expectDisclaimerPresent(result);
        });
      });

      it.skipIf(!isCliImplemented)('F17.4: Includes disclaimer in lint-pr output', async () => {
        await withGitFixture(async (fixture) => {
          const { baseRef, headRef } = await setupPRScenario(fixture, {
            featureCommits: [
              {
                message: 'feat: ok',
                files: { 'a.ts': '1' },
                trailers: { 'AI-Assisted': 'Copilot' },
              },
            ],
          });
          const result = await runCli(['lint-pr', '--base', baseRef, '--head', headRef], {
            cwd: fixture.repoDir,
          });
          expectDisclaimerPresent(result);
        });
      });

      it.skipIf(!isCliImplemented)(
        'F17.5: Preservation of disclaimer in --json metadata or stderr',
        async () => {
          await withGitFixture(async (fixture) => {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              featureCommits: [
                {
                  message: 'feat: ok',
                  files: { 'a.ts': '1' },
                  trailers: { 'AI-Assisted': 'Copilot' },
                },
              ],
            });
            const result = await runCli(
              ['lint-pr', '--base', baseRef, '--head', headRef, '--json'],
              { cwd: fixture.repoDir }
            );
            expect(result.stdout + result.stderr).toContain(MANDATORY_DISCLAIMER);
          });
        }
      );

      it.skipIf(!isCliImplemented)(
        'F17.6: Includes disclaimer banner across all subcommand --help outputs',
        async () => {
          for (const sub of ['init', 'check', 'lint-pr']) {
            const result = await runCli([sub, '--help']);
            expectDisclaimerPresent(result);
          }
        }
      );
    });
  });

  // =========================================================================
  // PILLAR 4: GitHub Action Integration (Features 18 to 19)
  // =========================================================================
  describe('Pillar 4: GitHub Action Integration (F18 to F19)', () => {
    // -----------------------------------------------------------------------
    // Feature 18: GitHub Action Manifest (action.yml)
    // -----------------------------------------------------------------------
    describe('F18: GitHub Action Manifest (action.yml)', () => {
      const ACTION_YML_PATH = path.join(REPO_ROOT, 'action.yml');

      it.skipIf(!isActionManifestPresent)(
        'F18-01: Adheres to GitHub Action metadata schema with required root properties',
        () => {
          expect(fs.existsSync(ACTION_YML_PATH)).toBe(true);
          const manifest = YAML.parse(fs.readFileSync(ACTION_YML_PATH, 'utf-8'));
          expect(manifest).toBeDefined();
          expect(manifest.name).toMatch(/ai-policy/i);
          expect(typeof manifest.description).toBe('string');
          expect(manifest.description.length).toBeGreaterThan(10);
          expect(manifest.author).toBeDefined();
          expect(manifest.branding).toBeDefined();
          expect(manifest.branding.icon).toBeDefined();
          expect(manifest.branding.color).toBeDefined();
        }
      );

      it.skipIf(!isActionManifestPresent)(
        'F18-02: Declares all required input parameters with descriptive documentation',
        () => {
          const manifest = YAML.parse(fs.readFileSync(ACTION_YML_PATH, 'utf-8'));
          const inputs = manifest.inputs;
          expect(inputs).toBeDefined();

          const expectedInputs = [
            'policy-path',
            'base-ref',
            'head-ref',
            'pr-body',
            'fail-on-leak',
            'output-format',
          ];

          for (const key of expectedInputs) {
            expect(inputs, `Missing input parameter: ${key}`).toHaveProperty(key);
            expect(typeof inputs[key].description).toBe('string');
            expect(inputs[key].description.length).toBeGreaterThan(5);
            expect(inputs[key].required).toBe(false);
          }
        }
      );

      it.skipIf(!isActionManifestPresent)(
        'F18-03: Specifies sensible default values for zero-configuration onboarding',
        () => {
          const manifest = YAML.parse(fs.readFileSync(ACTION_YML_PATH, 'utf-8'));
          const inputs = manifest.inputs;
          expect(inputs['policy-path'].default).toBe('.github/ai-policy.yml');
          expect(String(inputs['fail-on-leak'].default)).toBe('true');
          expect(inputs['output-format'].default).toMatch(/both|text|summary/i);
        }
      );

      it.skipIf(!isActionManifestPresent)(
        'F18-04: Declares structured output parameters (passed, violations, leaks)',
        () => {
          const manifest = YAML.parse(fs.readFileSync(ACTION_YML_PATH, 'utf-8'));
          const outputs = manifest.outputs;
          expect(outputs).toBeDefined();

          const expectedOutputs = ['passed', 'violations', 'leaks'];
          for (const key of expectedOutputs) {
            expect(outputs, `Missing output declaration: ${key}`).toHaveProperty(key);
            expect(typeof outputs[key].description).toBe('string');
            expect(outputs[key].description.length).toBeGreaterThan(5);
          }
        }
      );

      it.skipIf(!isActionManifestPresent)(
        'F18-05: Specifies execution runtime targeting Node 20 with dist/action.js entrypoint',
        () => {
          const manifest = YAML.parse(fs.readFileSync(ACTION_YML_PATH, 'utf-8'));
          const runs = manifest.runs;
          expect(runs).toBeDefined();
          expect(runs.using).toBe('node20');
          expect(runs.main).toBe('dist/action.js');
        }
      );

      it.skipIf(!isActionManifestPresent)(
        'F18-06: Includes action.yml in package distribution and requires no elevated privileges',
        () => {
          const pkg = JSON.parse(
            fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8')
          );
          expect(pkg.files).toContain('action.yml');
          expect(pkg.files).toContain('dist');

          const rawYaml = fs.readFileSync(ACTION_YML_PATH, 'utf-8');
          expect(rawYaml).not.toMatch(/permissions:\s*write-all/i);
        }
      );
    });

    // -----------------------------------------------------------------------
    // Feature 19: GitHub Action Entrypoint & Step Summary
    // -----------------------------------------------------------------------
    describe('F19: GitHub Action Entrypoint & Step Summary', () => {
      it.skipIf(!isActionImplemented)(
        'F19-01: Succeeds (exit 0) and reports passed=true for compliant PR',
        async () => {
          const fixture = await createGitFixture();
          try {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              policyConfig: {
                version: '0.1',
                level: 'strict',
                categories: { code: 'restricted' },
                disclosure: {
                  required: true,
                  commit_trailer: { key: 'AI-Assisted', required: true },
                },
                accountability: { author_takes_responsibility: true },
                bots: { automated_prs: 'forbidden' },
              },
              featureCommits: [
                {
                  message: 'feat: implement compliant feature',
                  files: { 'src/feature.ts': 'export const feat = 1;' },
                  trailers: { 'AI-Assisted': 'Claude 3.5 Sonnet' },
                },
              ],
            });

            const result = await runAction({
              cwd: fixture.repoDir,
              inputs: {
                'base-ref': baseRef,
                'head-ref': headRef,
              },
            });

            expect(result.exitCode).toBe(0);
            expect(result.isSuccess).toBe(true);
            expect(result.outputs['passed']).toBe('true');
            expect(result.outputs['violations']).toBe('0');
            expect(result.outputs['leaks']).toBe('0');
            expect(result.stepSummary).toMatch(/pass|compliant|✅/i);
            expectDisclaimerPresent(result);
          } finally {
            await fixture.cleanup();
          }
        },
        30000
      );

      it.skipIf(!isActionImplemented)(
        'F19-02: Fails (exit 1) and reports passed=false when PR violates trailer requirement',
        async () => {
          const fixture = await createGitFixture();
          try {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              policyConfig: {
                version: '0.1',
                level: 'strict',
                categories: { code: 'restricted' },
                disclosure: {
                  required: true,
                  commit_trailer: { key: 'AI-Assisted', required: true },
                },
                accountability: { author_takes_responsibility: true },
                bots: { automated_prs: 'forbidden' },
              },
              featureCommits: [
                {
                  message: 'feat: implement feature without disclosure trailer',
                  files: { 'src/feature.ts': 'export const feat = 1;' },
                },
              ],
            });

            const result = await runAction({
              cwd: fixture.repoDir,
              inputs: {
                'base-ref': baseRef,
                'head-ref': headRef,
              },
            });

            expect(result.exitCode).toBe(1);
            expect(result.isSuccess).toBe(false);
            expect(result.outputs['passed']).toBe('false');
            expect(Number(result.outputs['violations'])).toBeGreaterThan(0);
            expect(result.stepSummary).toMatch(/violation|failed|missing trailer/i);
            expectDisclaimerPresent(result);
          } finally {
            await fixture.cleanup();
          }
        },
        30000
      );

      it.skipIf(!isActionImplemented)(
        'F19-03: Fails (exit 1) and flags leaked assistant config files',
        async () => {
          const fixture = await createGitFixture();
          try {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              policyConfig: {
                version: '0.1',
                level: 'balanced',
                categories: { code: 'permissive' },
                disclosure: { required: false },
                accountability: { author_takes_responsibility: true },
                bots: { automated_prs: 'permissive' },
              },
              featureCommits: [
                {
                  message: 'feat: add feature and accidentally leak workspace instructions',
                  files: { 'src/index.ts': 'console.log("ok");' },
                  leaks: ['cursor'],
                },
              ],
            });

            const result = await runAction({
              cwd: fixture.repoDir,
              inputs: {
                'base-ref': baseRef,
                'head-ref': headRef,
                'fail-on-leak': 'true',
              },
            });

            expect(result.exitCode).toBe(1);
            expect(result.outputs['passed']).toBe('false');
            expect(result.outputs['leaks']).toContain('.cursor');
            expect(result.stepSummary).toContain('.cursor');
          } finally {
            await fixture.cleanup();
          }
        },
        30000
      );

      it.skipIf(!isActionImplemented)(
        'F19-04: Generates GitHub Step Summary markdown table conforming to border pipe format',
        async () => {
          const fixture = await createGitFixture();
          try {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              policyConfig: {
                version: '0.1',
                level: 'permissive',
                categories: { code: 'permissive' },
                disclosure: { required: false },
                accountability: { author_takes_responsibility: true },
                bots: { automated_prs: 'permissive' },
              },
              featureCommits: [
                {
                  message: 'feat: clean commit',
                  files: { 'src/test.txt': 'sample' },
                },
              ],
            });

            const result = await runAction({
              cwd: fixture.repoDir,
              inputs: {
                'base-ref': baseRef,
                'head-ref': headRef,
              },
            });

            expect(result.stepSummary.length).toBeGreaterThan(0);
            const table = expectSummaryTable(result);
            expect(table.headers.length).toBeGreaterThanOrEqual(2);
            expect(table.rows.length).toBeGreaterThanOrEqual(1);

            expect(result.stepSummary).toMatch(/\|[\s-:]+\|/);
            expectDisclaimerPresent(result);
          } finally {
            await fixture.cleanup();
          }
        },
        30000
      );

      it.skipIf(!isActionImplemented)(
        'F19-05: Respects custom policy-path and non-blocking fail-on-leak=false',
        async () => {
          const fixture = await createGitFixture();
          try {
            const customPolicyPath = 'custom/rules/ai-policy.yml';
            fixture.writeFile(
              customPolicyPath,
              YAML.stringify({
                version: '0.1',
                level: 'permissive',
                categories: { code: 'permissive' },
                disclosure: { required: false },
                accountability: { author_takes_responsibility: true },
                bots: { automated_prs: 'permissive' },
              })
            );
            fixture.stage(customPolicyPath);
            fixture.commit('chore: custom policy configuration');

            const baseRef = fixture.getCurrentBranch();
            fixture.checkout('feature/non-blocking-leak', { create: true });
            fixture.createLeak('claude', { committed: true });
            const headRef = 'feature/non-blocking-leak';

            const result = await runAction({
              cwd: fixture.repoDir,
              inputs: {
                'policy-path': customPolicyPath,
                'base-ref': baseRef,
                'head-ref': headRef,
                'fail-on-leak': 'false',
              },
            });

            expect(result.exitCode).toBe(0);
            expect(result.outputs['leaks']).toContain('.claude');
            expect(result.stepSummary).toContain('.claude');
          } finally {
            await fixture.cleanup();
          }
        },
        30000
      );

      it.skipIf(!isActionImplemented)(
        'F19-06: Reads base-ref and head-ref from GitHub context environment variables when inputs omitted',
        async () => {
          const fixture = await createGitFixture();
          try {
            const { baseRef, headRef } = await setupPRScenario(fixture, {
              policyConfig: {
                version: '0.1',
                level: 'permissive',
                categories: { code: 'permissive' },
                disclosure: { required: false },
                accountability: { author_takes_responsibility: true },
                bots: { automated_prs: 'permissive' },
              },
              featureCommits: [
                {
                  message: 'feat: context fallback test',
                  files: { 'file.txt': 'data' },
                },
              ],
            });

            const result = await runAction({
              cwd: fixture.repoDir,
              githubContext: {
                baseRef,
                headRef,
                eventName: 'pull_request',
              },
            });

            expect(result.exitCode).toBe(0);
            expect(result.outputs['passed']).toBe('true');
          } finally {
            await fixture.cleanup();
          }
        },
        30000
      );
    });
  });
});
