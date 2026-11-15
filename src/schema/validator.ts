import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import YAML, { type Document, type LineCounter } from 'yaml';
import type {
  ValidateOptions,
  ValidationResult,
} from '../types.js';
import { PolicyValidationError } from '../types.js';
import { schema } from './schema-data.js';
import { formatDiagnostics } from './diagnostics.js';

// ESM / CJS interop guards for Ajv and ajv-formats
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AjvClass = (Ajv as any).default || Ajv;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormatsFn = (addFormats as any).default || addFormats;

/**
 * Singleton Ajv Draft-07 validator instance with allErrors and URI formats enabled.
 */
const ajv = new AjvClass({
  allErrors: true,
  verbose: true,
  strict: false,
});
addFormatsFn(ajv);

/**
 * Compiled JSON Schema validator for ai-policy specification v0.1.
 */
const compiledValidator = ajv.compile(schema);

/**
 * Validates a policy configuration against ai-policy schema v0.1.
 *
 * @param data Parsed policy object to validate.
 * @param options Optional validation settings including strict mode and sourceText for CST mapping.
 * @returns ValidationResult containing validation status and diagnostics.
 * @throws {PolicyValidationError} If validation fails and options.strict is true.
 */
export function validatePolicy(data: unknown, options?: ValidateOptions): ValidationResult {
  let doc: Document | undefined;
  let lineCounter: LineCounter | undefined;

  if (options?.sourceText) {
    lineCounter = new YAML.LineCounter();
    doc = YAML.parseDocument(options.sourceText, { lineCounter });
  }

  const isValid = Boolean(compiledValidator(data));

  if (isValid) {
    return {
      valid: true,
      diagnostics: [],
      errors: [],
    };
  }

  const diagnostics = formatDiagnostics(compiledValidator.errors, doc, lineCounter);

  if (options?.strict) {
    throw new PolicyValidationError(
      `Policy validation failed with ${diagnostics.length} error${diagnostics.length === 1 ? '' : 's'}`,
      diagnostics
    );
  }

  return {
    valid: false,
    diagnostics,
    errors: diagnostics,
  };
}

export { ajv, compiledValidator };
