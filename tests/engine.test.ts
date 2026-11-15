import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  loadPolicy,
  loadPolicySync,
  findPolicyFile,
  findPolicyFileSync,
  parsePolicyContent,
  stripBOM,
  CANDIDATE_POLICY_PATHS,
  PolicyError,
  PolicyNotFoundError,
  PolicyEmptyError,
  PolicySyntaxError,
  PolicyValidationError,
} from '../src/index.js';

const MINIMAL_POLICY_YAML = `version: "0.1"
level: restricted
categories:
  code: restricted
disclosure:
  required: true
accountability:
  author_takes_responsibility: true
bots:
  automated_prs: forbidden
`;

const MINIMAL_POLICY_JSON = JSON.stringify(
  {
    version: '0.1',
    level: 'restricted',
    categories: { code: 'restricted' },
    disclosure: { required: true },
    accountability: { author_takes_responsibility: true },
    bots: { automated_prs: 'forbidden' },
  },
  null,
  2
);

describe('Engine: Loader & Parser (tests/engine.test.ts)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-policy-engine-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error on Windows file locks
    }
  });

  describe('Suite 1: Error Hierarchy & Instanceof Invariants', () => {
    it('1.1 PolicyError is base class for all operational errors', () => {
      const err = new PolicyError('base error');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(PolicyError);
      expect(err.name).toBe('PolicyError');
    });

    it('1.2 PolicyNotFoundError extends PolicyError and captures targetPath & candidates', () => {
      const err = new PolicyNotFoundError('Not found', {
        targetPath: '/custom/path',
        candidates: ['.github/ai-policy.yml'],
      });
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(PolicyError);
      expect(err).toBeInstanceOf(PolicyNotFoundError);
      expect(err.name).toBe('PolicyNotFoundError');
      expect(err.targetPath).toBe('/custom/path');
      expect(err.candidates).toEqual(['.github/ai-policy.yml']);
    });

    it('1.3 PolicyEmptyError extends PolicyError and captures filepath', () => {
      const err = new PolicyEmptyError('Empty', '/path/to/empty.yml');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(PolicyError);
      expect(err).toBeInstanceOf(PolicyEmptyError);
      expect(err.name).toBe('PolicyEmptyError');
      expect(err.filepath).toBe('/path/to/empty.yml');
    });

    it('1.4 PolicySyntaxError extends PolicyError and captures line, col, snippet, cause', () => {
      const cause = new Error('nested syntax issue');
      const err = new PolicySyntaxError('Syntax error', {
        filepath: '/path/to/file.yml',
        line: 10,
        column: 5,
        snippet: 'bad: yaml:',
        cause,
      });
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(PolicyError);
      expect(err).toBeInstanceOf(PolicySyntaxError);
      expect(err.name).toBe('PolicySyntaxError');
      expect(err.filepath).toBe('/path/to/file.yml');
      expect(err.line).toBe(10);
      expect(err.column).toBe(5);
      expect(err.snippet).toBe('bad: yaml:');
      expect(err.cause).toBe(cause);
    });

    it('1.5 PolicyValidationError extends PolicyError and preserves diagnostics', () => {
      const diag = { message: 'invalid property', path: 'categories.code', severity: 'error' as const };
      const err = new PolicyValidationError('Validation failed', [diag]);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(PolicyError);
      expect(err).toBeInstanceOf(PolicyValidationError);
      expect(err.name).toBe('PolicyValidationError');
      expect(err.diagnostics).toEqual([diag]);
    });
  });

  describe('Suite 2: Candidate Discovery Order & Precedence', () => {
    it('2.1 CANDIDATE_POLICY_PATHS matches the exact 6 canonical search paths', () => {
      expect(CANDIDATE_POLICY_PATHS).toEqual([
        '.github/ai-policy.yml',
        '.github/ai-policy.yaml',
        '.github/ai-policy.json',
        'ai-policy.yml',
        'ai-policy.yaml',
        'ai-policy.json',
      ]);
    });

    it('2.2 selects .github/ai-policy.yml over root ai-policy.yml when both exist', () => {
      const githubDir = path.join(tmpDir, '.github');
      fs.mkdirSync(githubDir);

      const githubFile = path.join(githubDir, 'ai-policy.yml');
      const rootFile = path.join(tmpDir, 'ai-policy.yml');

      fs.writeFileSync(githubFile, MINIMAL_POLICY_YAML.replace('restricted', 'forbidden'));
      fs.writeFileSync(rootFile, MINIMAL_POLICY_YAML);

      const syncResult = loadPolicySync(tmpDir);
      expect(syncResult.filepath).toBe(githubFile);
      expect(syncResult.config.level).toBe('forbidden');

      const foundPath = findPolicyFileSync(tmpDir);
      expect(foundPath).toBe(githubFile);
    });

    it('2.3 selects .github/ai-policy.yml over .github/ai-policy.yaml', () => {
      const githubDir = path.join(tmpDir, '.github');
      fs.mkdirSync(githubDir);

      const ymlFile = path.join(githubDir, 'ai-policy.yml');
      const yamlFile = path.join(githubDir, 'ai-policy.yaml');

      fs.writeFileSync(ymlFile, MINIMAL_POLICY_YAML.replace('restricted', 'forbidden'));
      fs.writeFileSync(yamlFile, MINIMAL_POLICY_YAML);

      const syncResult = loadPolicySync(tmpDir);
      expect(syncResult.filepath).toBe(ymlFile);
      expect(syncResult.config.level).toBe('forbidden');
    });

    it('2.4 selects .github/ai-policy.yaml over .github/ai-policy.json', () => {
      const githubDir = path.join(tmpDir, '.github');
      fs.mkdirSync(githubDir);

      const yamlFile = path.join(githubDir, 'ai-policy.yaml');
      const jsonFile = path.join(githubDir, 'ai-policy.json');

      fs.writeFileSync(yamlFile, MINIMAL_POLICY_YAML);
      fs.writeFileSync(jsonFile, MINIMAL_POLICY_JSON);

      const syncResult = loadPolicySync(tmpDir);
      expect(syncResult.filepath).toBe(yamlFile);
    });

    it('2.5 falls back to root ai-policy.yml when .github folder has no policy files', () => {
      const githubDir = path.join(tmpDir, '.github');
      fs.mkdirSync(githubDir);

      const rootFile = path.join(tmpDir, 'ai-policy.yml');
      fs.writeFileSync(rootFile, MINIMAL_POLICY_YAML);

      const syncResult = loadPolicySync(tmpDir);
      expect(syncResult.filepath).toBe(rootFile);
    });

    it('2.6 falls back to root ai-policy.yaml over root ai-policy.json', () => {
      const yamlFile = path.join(tmpDir, 'ai-policy.yaml');
      const jsonFile = path.join(tmpDir, 'ai-policy.json');

      fs.writeFileSync(yamlFile, MINIMAL_POLICY_YAML);
      fs.writeFileSync(jsonFile, MINIMAL_POLICY_JSON);

      const syncResult = loadPolicySync(tmpDir);
      expect(syncResult.filepath).toBe(yamlFile);
    });

    it('2.7 loads root ai-policy.json when it is the only candidate', () => {
      const jsonFile = path.join(tmpDir, 'ai-policy.json');
      fs.writeFileSync(jsonFile, MINIMAL_POLICY_JSON);

      const syncResult = loadPolicySync(tmpDir);
      expect(syncResult.filepath).toBe(jsonFile);
      expect(syncResult.config.version).toBe('0.1');
    });

    it('2.8 throws PolicyNotFoundError when no candidate exists in directory', () => {
      expect(() => loadPolicySync(tmpDir)).toThrowError(PolicyNotFoundError);

      try {
        loadPolicySync(tmpDir);
      } catch (err) {
        expect(err).toBeInstanceOf(PolicyNotFoundError);
        const pErr = err as PolicyNotFoundError;
        expect(pErr.targetPath).toBe(path.resolve(tmpDir));
        expect(pErr.candidates).toEqual([...CANDIDATE_POLICY_PATHS]);
        expect(pErr.message).toContain('No AI policy configuration found');
      }
    });

    it('2.9 throws PolicyNotFoundError when directory does not exist', () => {
      const nonExistent = path.join(tmpDir, 'does-not-exist');
      expect(() => loadPolicySync(nonExistent)).toThrowError(PolicyNotFoundError);
    });
  });

  describe('Suite 3: Direct File Loading & Cross-Platform Paths', () => {
    it('3.1 loads direct .yml file path', () => {
      const filePath = path.join(tmpDir, 'custom-policy.yml');
      fs.writeFileSync(filePath, MINIMAL_POLICY_YAML);

      const result = loadPolicySync(filePath);
      expect(result.filepath).toBe(filePath);
      expect(result.config.level).toBe('restricted');
    });

    it('3.2 loads direct .yaml file path', () => {
      const filePath = path.join(tmpDir, 'custom-policy.yaml');
      fs.writeFileSync(filePath, MINIMAL_POLICY_YAML);

      const result = loadPolicySync(filePath);
      expect(result.filepath).toBe(filePath);
      expect(result.config.categories.code).toBe('restricted');
    });

    it('3.3 loads direct .json file path', () => {
      const filePath = path.join(tmpDir, 'custom-policy.json');
      fs.writeFileSync(filePath, MINIMAL_POLICY_JSON);

      const result = loadPolicySync(filePath);
      expect(result.filepath).toBe(filePath);
      expect(result.config.accountability.author_takes_responsibility).toBe(true);
    });

    it('3.4 throws PolicyNotFoundError when direct file path does not exist', () => {
      const missing = path.join(tmpDir, 'missing-file.yml');
      expect(() => loadPolicySync(missing)).toThrowError(PolicyNotFoundError);
    });

    it('3.5 handles POSIX forward-slash paths on Windows', () => {
      const filePath = path.join(tmpDir, 'posix-test.yml');
      fs.writeFileSync(filePath, MINIMAL_POLICY_YAML);

      const posixPath = filePath.replace(/\\/g, '/');
      const result = loadPolicySync(posixPath);
      expect(result.config.version).toBe('0.1');
    });
  });

  describe('Suite 4: Empty and Comment-Only Files (PolicyEmptyError)', () => {
    it('4.1 throws PolicyEmptyError on 0-byte file', () => {
      const filePath = path.join(tmpDir, 'empty.yml');
      fs.writeFileSync(filePath, '');

      expect(() => loadPolicySync(filePath)).toThrowError(PolicyEmptyError);
      try {
        loadPolicySync(filePath);
      } catch (err) {
        expect(err).toBeInstanceOf(PolicyEmptyError);
        expect((err as PolicyEmptyError).filepath).toBe(filePath);
      }
    });

    it('4.2 throws PolicyEmptyError on whitespace-only file', () => {
      const filePath = path.join(tmpDir, 'whitespace.yml');
      fs.writeFileSync(filePath, '   \n\t  \r\n   ');

      expect(() => loadPolicySync(filePath)).toThrowError(PolicyEmptyError);
    });

    it('4.3 throws PolicyEmptyError on comment-only YAML file', () => {
      const filePath = path.join(tmpDir, 'comments.yml');
      fs.writeFileSync(filePath, '# This is a comment\n# Another comment\n');

      expect(() => loadPolicySync(filePath)).toThrowError(PolicyEmptyError);
      try {
        loadPolicySync(filePath);
      } catch (err) {
        expect(err).toBeInstanceOf(PolicyEmptyError);
        expect((err as PolicyEmptyError).message).toContain('contains no document content');
      }
    });

    it('4.4 throws PolicyEmptyError from parsePolicyContent directly', () => {
      expect(() => parsePolicyContent('')).toThrowError(PolicyEmptyError);
      expect(() => parsePolicyContent('   ')).toThrowError(PolicyEmptyError);
      expect(() => parsePolicyContent('# comments only\n')).toThrowError(PolicyEmptyError);
    });
  });

  describe('Suite 5: Malformed Syntax Parsing (PolicySyntaxError)', () => {
    it('5.1 throws PolicySyntaxError with accurate line & column on bad YAML syntax', () => {
      const malformedYaml = `version: "0.1"
level: "unclosed string
categories:
  code: restricted
`;
      const filePath = path.join(tmpDir, 'bad-syntax.yml');
      fs.writeFileSync(filePath, malformedYaml);

      expect(() => loadPolicySync(filePath)).toThrowError(PolicySyntaxError);
      try {
        loadPolicySync(filePath);
      } catch (err) {
        expect(err).toBeInstanceOf(PolicySyntaxError);
        const sErr = err as PolicySyntaxError;
        expect(sErr.filepath).toBe(filePath);
        expect(sErr.line).toBeDefined();
        expect(typeof sErr.line).toBe('number');
        expect(sErr.column).toBeDefined();
        expect(typeof sErr.column).toBe('number');
        expect(sErr.message).toContain('Invalid YAML syntax');
      }
    });

    it('5.2 throws PolicySyntaxError on malformed YAML colon/key syntax', () => {
      const malformedYaml = `version: "0.1"
level: [unclosed bracket
`;
      expect(() => parsePolicyContent(malformedYaml, 'test.yml')).toThrowError(PolicySyntaxError);
    });

    it('5.3 throws PolicySyntaxError with line & column on malformed JSON', () => {
      const malformedJson = `{\n  "version": "0.1",,\n  "level": "restricted"\n}`;
      const filePath = path.join(tmpDir, 'bad.json');
      fs.writeFileSync(filePath, malformedJson);

      expect(() => loadPolicySync(filePath)).toThrowError(PolicySyntaxError);
      try {
        loadPolicySync(filePath);
      } catch (err) {
        expect(err).toBeInstanceOf(PolicySyntaxError);
        const sErr = err as PolicySyntaxError;
        expect(sErr.line).toBe(2);
        expect(sErr.column).toBeDefined();
        expect(sErr.message).toContain('Invalid JSON syntax');
      }
    });
  });

  describe('Suite 6: UTF-8 BOM Handling', () => {
    it('6.1 stripBOM removes leading \uFEFF character', () => {
      const withBOM = '\uFEFFversion: "0.1"';
      expect(stripBOM(withBOM)).toBe('version: "0.1"');
      expect(stripBOM('normal text')).toBe('normal text');
    });

    it('6.2 parses JSON file containing UTF-8 BOM cleanly without SyntaxError', () => {
      const jsonWithBOM = `\uFEFF${MINIMAL_POLICY_JSON}`;
      const filePath = path.join(tmpDir, 'bom.json');
      fs.writeFileSync(filePath, jsonWithBOM, 'utf8');

      const result = loadPolicySync(filePath);
      expect(result.config.version).toBe('0.1');
      expect(result.config.level).toBe('restricted');
    });

    it('6.3 parses YAML file containing UTF-8 BOM cleanly', () => {
      const yamlWithBOM = `\uFEFF${MINIMAL_POLICY_YAML}`;
      const filePath = path.join(tmpDir, 'bom.yml');
      fs.writeFileSync(filePath, yamlWithBOM, 'utf8');

      const result = loadPolicySync(filePath);
      expect(result.config.version).toBe('0.1');
    });
  });

  describe('Suite 7: Async vs Sync Parity', () => {
    it('7.1 loadPolicy and loadPolicySync return identical config and filepath', async () => {
      const filePath = path.join(tmpDir, 'ai-policy.yml');
      fs.writeFileSync(filePath, MINIMAL_POLICY_YAML);

      const syncResult = loadPolicySync(tmpDir);
      const asyncResult = await loadPolicy(tmpDir);

      expect(asyncResult.filepath).toBe(syncResult.filepath);
      expect(asyncResult.config).toEqual(syncResult.config);
    });

    it('7.2 findPolicyFile and findPolicyFileSync return identical paths', async () => {
      const filePath = path.join(tmpDir, 'ai-policy.yml');
      fs.writeFileSync(filePath, MINIMAL_POLICY_YAML);

      const syncPath = findPolicyFileSync(tmpDir);
      const asyncPath = await findPolicyFile(tmpDir);

      expect(asyncPath).toBe(syncPath);
    });

    it('7.3 async loadPolicy rejects with PolicyNotFoundError when file is missing', async () => {
      await expect(loadPolicy(tmpDir)).rejects.toThrowError(PolicyNotFoundError);
    });

    it('7.4 async loadPolicy rejects with PolicyEmptyError on empty file', async () => {
      const filePath = path.join(tmpDir, 'ai-policy.yml');
      fs.writeFileSync(filePath, '');

      await expect(loadPolicy(filePath)).rejects.toThrowError(PolicyEmptyError);
    });

    it('7.5 async loadPolicy rejects with PolicySyntaxError on syntax error', async () => {
      const filePath = path.join(tmpDir, 'ai-policy.yml');
      fs.writeFileSync(filePath, 'version: [unclosed');

      await expect(loadPolicy(filePath)).rejects.toThrowError(PolicySyntaxError);
    });
  });

  describe('Suite 8: CST Document Preservation', () => {
    it('8.1 loadPolicySync returns doc property representing yaml CST Document', () => {
      const filePath = path.join(tmpDir, 'ai-policy.yml');
      fs.writeFileSync(filePath, MINIMAL_POLICY_YAML);

      const result = loadPolicySync(filePath);
      expect(result.doc).toBeDefined();
      expect(result.doc?.contents).toBeDefined();
    });

    it('8.2 loadPolicy (async) returns doc property representing yaml CST Document', async () => {
      const filePath = path.join(tmpDir, 'ai-policy.yml');
      fs.writeFileSync(filePath, MINIMAL_POLICY_YAML);

      const result = await loadPolicy(filePath);
      expect(result.doc).toBeDefined();
      expect(result.doc?.contents).toBeDefined();
    });
  });
});
