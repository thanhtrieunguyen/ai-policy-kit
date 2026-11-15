import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import {
  validatePolicy,
  schema,
  PolicyValidationError,
  type AIPolicyConfig,
} from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AjvClass = (Ajv as any).default || Ajv;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormatsFn = (addFormats as any).default || addFormats;

/**
 * Creates a minimal valid policy object adhering to schema v0.1.
 */
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
      automated_prs: 'forbidden',
    },
  };
}

describe('Schema v0.1 & Diagnostics Engine (tests/schema.test.ts)', () => {
  describe('Suite 1: Schema Integrity & Zero-IO Parity', () => {
    it('1.1 validates schema/v0.1/ai-policy.schema.json against Draft-07 meta-schema', () => {
      const schemaPath = path.join(REPO_ROOT, 'schema', 'v0.1', 'ai-policy.schema.json');
      expect(fs.existsSync(schemaPath)).toBe(true);
      const fileSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

      const ajv = new AjvClass({ allErrors: true });
      addFormatsFn(ajv);

      const isValid = ajv.validateSchema(fileSchema);
      expect(isValid).toBe(true);
    });

    it('1.2 verifies inlined schema deeply equals the JSON file on disk', () => {
      const schemaPath = path.join(REPO_ROOT, 'schema', 'v0.1', 'ai-policy.schema.json');
      const fileSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

      expect(schema).toEqual(fileSchema);
    });

    it('1.3 compiles inlined schema without filesystem IO', () => {
      const ajv = new AjvClass({ allErrors: true });
      addFormatsFn(ajv);

      const compiled = ajv.compile(schema);
      expect(typeof compiled).toBe('function');
    });
  });

  describe('Suite 2: Canonical Presets Validation', () => {
    it('2.1 validates presets/strict.yml with zero errors', () => {
      const content = fs.readFileSync(path.join(REPO_ROOT, 'presets', 'strict.yml'), 'utf8');
      const data = YAML.parse(content);

      const result = validatePolicy(data, { sourceText: content });
      expect(result.valid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('2.2 validates presets/balanced.yml with zero errors', () => {
      const content = fs.readFileSync(path.join(REPO_ROOT, 'presets', 'balanced.yml'), 'utf8');
      const data = YAML.parse(content);

      const result = validatePolicy(data, { sourceText: content });
      expect(result.valid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('2.3 validates presets/permissive.yml with zero errors', () => {
      const content = fs.readFileSync(path.join(REPO_ROOT, 'presets', 'permissive.yml'), 'utf8');
      const data = YAML.parse(content);

      const result = validatePolicy(data, { sourceText: content });
      expect(result.valid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('2.4 verifies canonical posture levels across all presets', () => {
      const strict = YAML.parse(fs.readFileSync(path.join(REPO_ROOT, 'presets', 'strict.yml'), 'utf8'));
      const balanced = YAML.parse(fs.readFileSync(path.join(REPO_ROOT, 'presets', 'balanced.yml'), 'utf8'));
      const permissive = YAML.parse(fs.readFileSync(path.join(REPO_ROOT, 'presets', 'permissive.yml'), 'utf8'));

      expect(strict.level).toBe('forbidden');
      expect(balanced.level).toBe('restricted');
      expect(permissive.level).toBe('permissive');
    });
  });

  describe('Suite 3: Valid Configuration Scenarios', () => {
    it('3.1 accepts minimal valid policy with only required fields', () => {
      const policy = createMinimalValidPolicy();
      const result = validatePolicy(policy);
      expect(result.valid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('3.2 accepts fully populated policy with all optional properties', () => {
      const fullPolicy: AIPolicyConfig = {
        version: '0.1.0',
        level: 'restricted',
        policy_url: 'https://github.com/org/repo/blob/main/docs/ai-policy.md',
        policy_path: 'docs/ai-policy.md',
        categories: {
          code: 'restricted',
          docs: 'permissive',
          tests: 'restricted',
          reviews: 'forbidden',
          issues: 'permissive',
        },
        disclosure: {
          required: true,
          methods: ['commit_trailer', 'pr_checklist', 'pr_description', 'issue_template'],
          commit_trailer: {
            key: 'AI-Assisted',
            required: true,
            pattern: '^(Copilot|Claude|ChatGPT)',
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
          automated_issues: 'restricted',
          bot_allowlist: ['dependabot[bot]', 'renovate[bot]'],
        },
      };

      const result = validatePolicy(fullPolicy);
      expect(result.valid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('3.3 accepts valid version strings adhering to ^0.1(.[0-9]+)?$', () => {
      const validVersions = ['0.1', '0.1.0', '0.1.1', '0.1.42', '0.1.999'];
      for (const ver of validVersions) {
        const policy = createMinimalValidPolicy();
        policy.version = ver;
        const res = validatePolicy(policy);
        expect(res.valid).toBe(true);
      }
    });

    it('3.4 accepts valid absolute URIs for policy_url', () => {
      const validUris = [
        'https://github.com/org/repo',
        'http://example.com/policy',
        'file:///workspace/docs/policy.md',
      ];
      for (const url of validUris) {
        const policy = createMinimalValidPolicy();
        policy.policy_url = url;
        const res = validatePolicy(policy);
        expect(res.valid).toBe(true);
      }
    });

    it('3.5 accepts valid empty arrays for disclosure.methods and bot_allowlist', () => {
      const policy = createMinimalValidPolicy();
      policy.disclosure.methods = [];
      policy.bots.bot_allowlist = [];

      const res = validatePolicy(policy);
      expect(res.valid).toBe(true);
    });
  });

  describe('Suite 4: Version Pattern Rejection (pattern)', () => {
    it('4.1 rejects version strings with wrong major/minor numbers', () => {
      const invalidVersions = ['1.0', '2.0', '0.2', '0.0.1', '0.0'];
      for (const ver of invalidVersions) {
        const policy = createMinimalValidPolicy();
        policy.version = ver;
        const res = validatePolicy(policy);
        expect(res.valid).toBe(false);
        const diag = res.diagnostics.find((d) => d.path === 'version');
        expect(diag).toBeDefined();
        expect(diag?.keyword).toBe('pattern');
        expect(diag?.remediation).toContain('0.1');
      }
    });

    it('4.2 rejects prefixed, suffixed, and malformed versions', () => {
      const malformed = ['v0.1', '0.1.', '0.1.0.1', '0.1-beta', '0.1-alpha.1'];
      for (const ver of malformed) {
        const policy = createMinimalValidPolicy();
        policy.version = ver;
        const res = validatePolicy(policy);
        expect(res.valid).toBe(false);
        const diag = res.diagnostics.find((d) => d.path === 'version');
        expect(diag?.keyword).toBe('pattern');
      }
    });

    it('4.3 rejects empty string version', () => {
      const policy = createMinimalValidPolicy();
      policy.version = '';
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      expect(res.diagnostics[0]?.path).toBe('version');
    });

    it('4.4 provides actionable remediation tip for version pattern failure', () => {
      const policy = createMinimalValidPolicy();
      policy.version = '1.0.0';
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      expect(res.diagnostics[0]?.remediation).toBe(
        "Version must match pattern '^0\\.1(\\.[0-9]+)?$' (e.g. '0.1' or '0.1.0')."
      );
    });
  });

  describe('Suite 5: Posture & Enum Violations (enum)', () => {
    it('5.1 rejects invalid root level', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (policy as any).level = 'strict'; // 'strict' is preset name, not posture level!
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'level');
      expect(diag?.keyword).toBe('enum');
      expect(diag?.remediation).toContain("'forbidden', 'restricted', 'permissive'");
      expect(diag?.remediation).toContain("'strict'");
    });

    it('5.2 rejects invalid category policy posture', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (policy.categories as any).code = 'always';
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'categories.code');
      expect(diag?.keyword).toBe('enum');
    });

    it('5.3 rejects invalid disclosure method item', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      policy.disclosure.methods = ['email' as any];
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path.startsWith('disclosure.methods'));
      expect(diag?.keyword).toBe('enum');
    });

    it('5.4 rejects invalid prompt_disclosure setting', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      policy.disclosure.prompt_disclosure = 'mandatory' as any;
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'disclosure.prompt_disclosure');
      expect(diag?.keyword).toBe('enum');
    });

    it('5.5 rejects invalid bots.automated_prs level', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (policy.bots as any).automated_prs = 'allowed';
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'bots.automated_prs');
      expect(diag?.keyword).toBe('enum');
    });

    it('5.6 outputs allowed enum values in remediation tip', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (policy as any).level = 'unrestricted';
      const res = validatePolicy(policy);
      const diag = res.diagnostics.find((d) => d.path === 'level');
      expect(diag?.remediation).toBe(
        "Value must be one of: 'forbidden', 'restricted', 'permissive'. Received 'unrestricted'."
      );
    });
  });

  describe('Suite 6: Missing Required Properties (required)', () => {
    it('6.1 rejects missing top-level required properties', () => {
      const requiredKeys = ['version', 'level', 'categories', 'disclosure', 'accountability', 'bots'] as const;
      for (const key of requiredKeys) {
        const policy = createMinimalValidPolicy();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (policy as any)[key];
        const res = validatePolicy(policy);
        expect(res.valid).toBe(false);
        const diag = res.diagnostics.find((d) => d.path === key);
        expect(diag).toBeDefined();
        expect(diag?.keyword).toBe('required');
      }
    });

    it('6.2 rejects missing categories.code', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (policy.categories as any).code;
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'categories.code');
      expect(diag).toBeDefined();
      expect(diag?.keyword).toBe('required');
      expect(diag?.remediation).toBe("Define 'categories.code' policy level ('forbidden', 'restricted', or 'permissive').");
    });

    it('6.3 rejects missing disclosure.required', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (policy.disclosure as any).required;
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'disclosure.required');
      expect(diag).toBeDefined();
      expect(diag?.keyword).toBe('required');
    });

    it('6.4 rejects missing accountability.author_takes_responsibility', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (policy.accountability as any).author_takes_responsibility;
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'accountability.author_takes_responsibility');
      expect(diag).toBeDefined();
      expect(diag?.keyword).toBe('required');
    });

    it('6.5 rejects missing bots.automated_prs', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (policy.bots as any).automated_prs;
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'bots.automated_prs');
      expect(diag).toBeDefined();
      expect(diag?.keyword).toBe('required');
    });

    it('6.6 rejects missing commit_trailer.key when commit_trailer is defined', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      policy.disclosure.commit_trailer = { required: true } as any;
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'disclosure.commit_trailer.key');
      expect(diag).toBeDefined();
      expect(diag?.keyword).toBe('required');
      expect(diag?.remediation).toBe("Specify the git commit trailer key name (e.g. key: 'AI-Assisted').");
    });

    it('6.7 produces precise dot-notation path for missing property', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (policy.categories as any).code;
      const res = validatePolicy(policy);
      expect(res.diagnostics[0]?.path).toBe('categories.code');
    });
  });

  describe('Suite 7: Additional Properties Rejection (additionalProperties: false)', () => {
    it('7.1 rejects extraneous root property', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (policy as any).extra_root_prop = 'invalid';
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'extra_root_prop');
      expect(diag?.keyword).toBe('additionalProperties');
      expect(diag?.remediation).toContain('Remove unrecognized property');
    });

    it('7.2 rejects extraneous property in categories', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (policy.categories as any).custom_category = 'forbidden';
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'categories.custom_category');
      expect(diag?.keyword).toBe('additionalProperties');
    });

    it('7.3 rejects extraneous property in disclosure', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (policy.disclosure as any).webhook = 'https://example.com';
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'disclosure.webhook');
      expect(diag?.keyword).toBe('additionalProperties');
    });

    it('7.4 rejects extraneous property in commit_trailer', () => {
      const policy = createMinimalValidPolicy();
      policy.disclosure.commit_trailer = {
        key: 'AI-Assisted',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extra: 'not allowed',
      } as any;
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'disclosure.commit_trailer.extra');
      expect(diag?.keyword).toBe('additionalProperties');
    });

    it('7.5 rejects extraneous property in accountability', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (policy.accountability as any).legal_audit = true;
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'accountability.legal_audit');
      expect(diag?.keyword).toBe('additionalProperties');
    });

    it('7.6 rejects extraneous property in bots', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (policy.bots as any).allow_ai_scrapers = false;
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'bots.allow_ai_scrapers');
      expect(diag?.keyword).toBe('additionalProperties');
    });

    it('7.7 remediation message instructs user to remove unauthorized property', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (policy as any).unknown_key = 123;
      const res = validatePolicy(policy);
      const diag = res.diagnostics.find((d) => d.path === 'unknown_key');
      expect(diag?.remediation).toBe(
        "Remove unrecognized property 'unknown_key'. Schema v0.1 does not allow additional properties."
      );
    });
  });

  describe('Suite 8: Type Mismatches (type)', () => {
    it('8.1 rejects string for boolean field (disclosure.required: "true")', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (policy.disclosure as any).required = 'true';
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'disclosure.required');
      expect(diag?.keyword).toBe('type');
      expect(diag?.remediation).toContain('Expected \'disclosure.required\' to be of type boolean');
    });

    it('8.2 rejects number for boolean field', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (policy.accountability as any).author_takes_responsibility = 1;
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'accountability.author_takes_responsibility');
      expect(diag?.keyword).toBe('type');
    });

    it('8.3 rejects unquoted numeric float for version', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (policy as any).version = 0.1;
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'version');
      expect(diag?.keyword).toBe('type');
    });

    it('8.4 rejects non-array for bot_allowlist', () => {
      const policy = createMinimalValidPolicy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      policy.bots.bot_allowlist = 'dependabot' as any;
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'bots.bot_allowlist');
      expect(diag?.keyword).toBe('type');
    });

    it('8.5 rejects primitive non-object root inputs', () => {
      const primitives = [null, 'string', 123, true, []];
      for (const prim of primitives) {
        const res = validatePolicy(prim);
        expect(res.valid).toBe(false);
        expect(res.diagnostics.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Suite 9: Duplicate Items (uniqueItems)', () => {
    it('9.1 rejects duplicate entries in disclosure.methods', () => {
      const policy = createMinimalValidPolicy();
      policy.disclosure.methods = ['commit_trailer', 'commit_trailer'];
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'disclosure.methods');
      expect(diag?.keyword).toBe('uniqueItems');
      expect(diag?.remediation).toContain('duplicate items');
    });

    it('9.2 rejects duplicate entries in bots.bot_allowlist', () => {
      const policy = createMinimalValidPolicy();
      policy.bots.bot_allowlist = ['dependabot[bot]', 'dependabot[bot]'];
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'bots.bot_allowlist');
      expect(diag?.keyword).toBe('uniqueItems');
    });
  });

  describe('Suite 10: URI Format Validation (format: "uri")', () => {
    it('10.1 rejects relative path in policy_url', () => {
      const policy = createMinimalValidPolicy();
      policy.policy_url = 'docs/ai-policy.md';
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'policy_url');
      expect(diag?.keyword).toBe('format');
      expect(diag?.remediation).toContain('valid absolute URI');
    });

    it('10.2 rejects malformed URL string in policy_url', () => {
      const policy = createMinimalValidPolicy();
      policy.policy_url = 'not a valid uri';
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'policy_url');
      expect(diag?.keyword).toBe('format');
    });

    it('10.3 rejects empty string for policy_url', () => {
      const policy = createMinimalValidPolicy();
      policy.policy_url = '';
      const res = validatePolicy(policy);
      expect(res.valid).toBe(false);
      const diag = res.diagnostics.find((d) => d.path === 'policy_url');
      expect(diag?.keyword).toBe('format');
    });

    it('10.4 accepts valid absolute HTTP and HTTPS URLs', () => {
      const policy = createMinimalValidPolicy();
      policy.policy_url = 'https://example.com/legal/ai-policy';
      const res = validatePolicy(policy);
      expect(res.valid).toBe(true);
    });
  });

  describe('Suite 11: YAML CST Line & Column Mapping', () => {
    it('11.1 resolves line and column when sourceText is provided', () => {
      const yamlText = [
        'version: "0.1"',
        'level: invalid_posture',
        'categories:',
        '  code: restricted',
        'disclosure:',
        '  required: true',
        'accountability:',
        '  author_takes_responsibility: true',
        'bots:',
        '  automated_prs: forbidden',
      ].join('\n');

      const data = YAML.parse(yamlText);
      const res = validatePolicy(data, { sourceText: yamlText });
      expect(res.valid).toBe(false);

      const diag = res.diagnostics.find((d) => d.path === 'level');
      expect(diag).toBeDefined();
      expect(diag?.line).toBe(2);
      expect(diag?.column).toBe(1);
    });

    it('11.2 maps error on nested category key to exact line and column', () => {
      const yamlText = [
        'version: "0.1"',
        'level: restricted',
        'categories:',
        '  code: invalid_enum',
        'disclosure:',
        '  required: true',
        'accountability:',
        '  author_takes_responsibility: true',
        'bots:',
        '  automated_prs: forbidden',
      ].join('\n');

      const data = YAML.parse(yamlText);
      const res = validatePolicy(data, { sourceText: yamlText });
      expect(res.valid).toBe(false);

      const diag = res.diagnostics.find((d) => d.path === 'categories.code');
      expect(diag).toBeDefined();
      expect(diag?.line).toBe(4);
      expect(diag?.column).toBe(3);
    });

    it('11.3 maps missing category property to parent map position', () => {
      const yamlText = [
        'version: "0.1"',
        'level: restricted',
        'categories:',
        '  docs: permissive',
        'disclosure:',
        '  required: true',
        'accountability:',
        '  author_takes_responsibility: true',
        'bots:',
        '  automated_prs: forbidden',
      ].join('\n');

      const data = YAML.parse(yamlText);
      const res = validatePolicy(data, { sourceText: yamlText });
      expect(res.valid).toBe(false);

      const diag = res.diagnostics.find((d) => d.path === 'categories.code');
      expect(diag).toBeDefined();
      // categories is at line 3, col 1
      expect(diag?.line).toBe(3);
      expect(diag?.column).toBe(1);
    });

    it('11.4 maps additional property to exact line and column of offending key', () => {
      const yamlText = [
        'version: "0.1"',
        'level: restricted',
        'categories:',
        '  code: restricted',
        '  extra_category: forbidden',
        'disclosure:',
        '  required: true',
        'accountability:',
        '  author_takes_responsibility: true',
        'bots:',
        '  automated_prs: forbidden',
      ].join('\n');

      const data = YAML.parse(yamlText);
      const res = validatePolicy(data, { sourceText: yamlText });
      expect(res.valid).toBe(false);

      const diag = res.diagnostics.find((d) => d.path === 'categories.extra_category');
      expect(diag).toBeDefined();
      expect(diag?.line).toBe(5);
      expect(diag?.column).toBe(3);
    });

    it('11.5 handles CRLF line endings with accurate line & column positions', () => {
      const yamlText = [
        'version: "0.1"',
        'level: restricted',
        'categories:',
        '  code: restricted',
        'disclosure:',
        '  required: "not_a_bool"',
        'accountability:',
        '  author_takes_responsibility: true',
        'bots:',
        '  automated_prs: forbidden',
      ].join('\r\n');

      const data = YAML.parse(yamlText);
      const res = validatePolicy(data, { sourceText: yamlText });
      expect(res.valid).toBe(false);

      const diag = res.diagnostics.find((d) => d.path === 'disclosure.required');
      expect(diag).toBeDefined();
      expect(diag?.line).toBe(6);
      expect(diag?.column).toBe(3);
    });
  });

  describe('Suite 12: Validation Options & Strict Mode', () => {
    it('12.1 strict: false returns valid: false without throwing', () => {
      const invalidData = { version: 'invalid' };
      const res = validatePolicy(invalidData, { strict: false });
      expect(res.valid).toBe(false);
      expect(res.diagnostics.length).toBeGreaterThan(0);
      expect(res.errors.length).toBeGreaterThan(0);
    });

    it('12.2 strict: true throws PolicyValidationError containing diagnostics array', () => {
      const invalidData = { version: 'invalid' };
      expect(() => validatePolicy(invalidData, { strict: true })).toThrowError(PolicyValidationError);

      try {
        validatePolicy(invalidData, { strict: true });
      } catch (err) {
        expect(err).toBeInstanceOf(PolicyValidationError);
        const valErr = err as PolicyValidationError;
        expect(valErr.diagnostics.length).toBeGreaterThan(0);
        expect(valErr.name).toBe('PolicyValidationError');
      }
    });

    it('12.3 strict: true returns clean ValidationResult when policy is valid', () => {
      const validData = createMinimalValidPolicy();
      const res = validatePolicy(validData, { strict: true });
      expect(res.valid).toBe(true);
      expect(res.diagnostics).toHaveLength(0);
      expect(res.errors).toHaveLength(0);
    });

    it('12.4 errors property is identical reference to diagnostics property', () => {
      const res = validatePolicy({});
      expect(res.errors).toBe(res.diagnostics);
    });
  });
});
