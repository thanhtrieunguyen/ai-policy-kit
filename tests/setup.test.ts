import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import {
  VERSION,
  version,
  DISCLAIMER,
  PRESETS,
  SCHEMA_V0_1,
  loadPolicy,
  loadPolicySync,
  validatePolicy,
  PolicyValidationError,
} from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Handle ESM / CJS interop for Ajv
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AjvClass = (Ajv as any).default || Ajv;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormatsFn = (addFormats as any).default || addFormats;

describe('Toolchain & Starter Code Verification', () => {
  describe('Environment & Runtime Sanity', () => {
    it('runs in Node.js 20+ ESM environment', () => {
      expect(process.version).toBeDefined();
      const majorVersion = parseInt(process.versions.node.split('.')[0]!, 10);
      expect(majorVersion).toBeGreaterThanOrEqual(20);
    });

    it('correctly resolves paths via import.meta.url', () => {
      expect(fs.existsSync(REPO_ROOT)).toBe(true);
      expect(fs.existsSync(path.join(REPO_ROOT, 'package.json'))).toBe(true);
    });
  });

  describe('Core Starter Contract Exports', () => {
    it('exports VERSION and version matching semver format', () => {
      expect(VERSION).toBe('1.0.0');
      expect(version).toBe(VERSION);
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('exports mandatory disclaimer stating deterministic compliance', () => {
      expect(DISCLAIMER).toContain('deterministic policy compliance validator');
      expect(DISCLAIMER).toContain('NOT an AI text/code detector');
    });

    it('exports canonical PRESETS catalog', () => {
      expect(PRESETS).toHaveProperty('strict');
      expect(PRESETS).toHaveProperty('balanced');
      expect(PRESETS).toHaveProperty('permissive');
      expect(PRESETS.strict).toContain('strict.yml');
    });

    it('exports SCHEMA_V0_1 metadata', () => {
      expect(SCHEMA_V0_1.version).toBe('0.1');
      expect(SCHEMA_V0_1.$schema).toContain('draft-07');
    });

    it('exports validatePolicy stub conforming to ValidationResult contract', () => {
      const result = validatePolicy({});
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.diagnostics)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.diagnostics.length).toBeGreaterThan(0);
    });

    it('exports loadPolicy and loadPolicySync functions with live resolution', async () => {
      expect(typeof loadPolicy).toBe('function');
      expect(typeof loadPolicySync).toBe('function');

      const presetPath = path.join(REPO_ROOT, 'presets', 'strict.yml');
      const syncResult = loadPolicySync(presetPath);
      expect(syncResult.filepath).toBe(presetPath);
      expect(syncResult.config.level).toBe('forbidden');

      const asyncResult = await loadPolicy(presetPath);
      expect(asyncResult.filepath).toBe(presetPath);
      expect(asyncResult.config.level).toBe('forbidden');
    });

    it('exports PolicyValidationError class with proper Error hierarchy', () => {
      const diag = { message: 'invalid property', path: 'categories.code', severity: 'error' as const };
      const error = new PolicyValidationError('Validation failed', [diag]);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PolicyValidationError);
      expect(error.name).toBe('PolicyValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.diagnostics).toHaveLength(1);
      expect(error.diagnostics[0]?.path).toBe('categories.code');
    });
  });

  describe('Dependency Loading: YAML & Ajv', () => {
    it('loads and executes yaml v2 parser & AST Document', () => {
      const parsed = YAML.parse('name: ai-policy-kit\nversion: "0.1"\n');
      expect(parsed).toEqual({ name: 'ai-policy-kit', version: '0.1' });

      const doc = new YAML.Document({ sample: true });
      expect(doc.toString()).toContain('sample: true');
    });

    it('loads and executes ajv v8 with ajv-formats', () => {
      const ajv = new AjvClass({ allErrors: true });
      addFormatsFn(ajv);

      const schema = {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' },
          count: { type: 'number' },
        },
        required: ['url', 'count'],
      };

      const validate = ajv.compile(schema);
      expect(validate({ url: 'https://github.com', count: 10 })).toBe(true);
      expect(validate({ url: 'not-a-url', count: 10 })).toBe(false);
    });
  });

  describe('Repository Schema v0.1 & Presets Sanity', () => {
    const schemaPath = path.join(REPO_ROOT, 'schema', 'v0.1', 'ai-policy.schema.json');

    it('validates schema/v0.1/ai-policy.schema.json against Draft-07 meta-schema', () => {
      expect(fs.existsSync(schemaPath)).toBe(true);
      const raw = fs.readFileSync(schemaPath, 'utf8');
      const schemaJson = JSON.parse(raw);

      const ajv = new AjvClass({ allErrors: true });
      addFormatsFn(ajv);

      const isSchemaValid = ajv.validateSchema(schemaJson);
      expect(isSchemaValid).toBe(true);
    });

    it('validates canonical presets (strict, balanced, permissive) against schema v0.1', () => {
      const schemaJson = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      const ajv = new AjvClass({ allErrors: true });
      addFormatsFn(ajv);
      const validate = ajv.compile(schemaJson);

      const presetFiles = ['strict.yml', 'balanced.yml', 'permissive.yml'];
      for (const presetFile of presetFiles) {
        const presetPath = path.join(REPO_ROOT, 'presets', presetFile);
        expect(fs.existsSync(presetPath)).toBe(true);

        const content = fs.readFileSync(presetPath, 'utf8');
        const parsed = YAML.parse(content);

        const valid = validate(parsed);
        if (!valid) {
          console.error(`Preset validation error in ${presetFile}:`, validate.errors);
        }
        expect(valid).toBe(true);
      }
    });
  });
});
