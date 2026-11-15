import type { ErrorObject } from 'ajv';
import type { Document, LineCounter } from 'yaml';
import { isMap, isPair, isScalar, isSeq } from 'yaml';
import type { PolicyDiagnostic } from '../types.js';

/**
 * Decodes RFC 6901 JSON pointer escaping (~1 -> /, ~0 -> ~).
 */
export function unescapeJsonPointerToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

/**
 * Parses a JSON Pointer string into an array of unescaped path tokens.
 */
export function parseJsonPointer(pointer: string): string[] {
  if (!pointer || pointer === '#' || pointer === '') {
    return [];
  }
  let clean = pointer;
  if (clean.startsWith('#/')) {
    clean = clean.slice(2);
  } else if (clean.startsWith('/')) {
    clean = clean.slice(1);
  } else if (clean.startsWith('#')) {
    clean = clean.slice(1);
  }
  if (!clean) {
    return [];
  }
  return clean.split('/').map(unescapeJsonPointerToken);
}

/**
 * Converts a JSON pointer and optional suffix into a user-friendly property path
 * (e.g. 'categories.code', 'disclosure.methods[0]').
 */
export function pointerToPropertyPath(pointer: string, suffix?: string): string {
  const tokens = parseJsonPointer(pointer);
  if (suffix !== undefined && suffix !== '') {
    tokens.push(String(suffix));
  }
  if (tokens.length === 0) {
    return '';
  }
  return tokens.reduce((acc, token, idx) => {
    if (/^\d+$/.test(token)) {
      return `${acc}[${token}]`;
    }
    return idx === 0 ? token : `${acc}.${token}`;
  }, '');
}

/**
 * Traverses a YAML CST Document using JSON pointer tokens and resolves 1-based line & column coordinates.
 */
export function resolveLineCol(
  doc: Document | undefined,
  lineCounter: LineCounter | undefined,
  target: string | ErrorObject | undefined
): { line?: number; column?: number } {
  if (!doc || !doc.contents || !lineCounter) {
    return { line: undefined, column: undefined };
  }

  let pointer = '';
  let additionalProp: string | undefined = undefined;

  if (typeof target === 'string') {
    pointer = target;
  } else if (target && typeof target === 'object') {
    pointer = target.instancePath || '';
    if (
      target.keyword === 'additionalProperties' &&
      target.params &&
      typeof (target.params as { additionalProperty?: unknown }).additionalProperty === 'string'
    ) {
      additionalProp = (target.params as { additionalProperty: string }).additionalProperty;
    }
  }

  const tokens = parseJsonPointer(pointer);
  if (additionalProp) {
    tokens.push(additionalProp);
  }

  if (tokens.length === 0) {
    const range = (doc.contents as { range?: [number, number, number] }).range;
    if (range) {
      const pos = lineCounter.linePos(range[0]);
      return { line: pos.line, column: pos.col };
    }
    return { line: 1, column: 1 };
  }

  let current: unknown = doc.contents;
  let lastKnownRange = (doc.contents as { range?: [number, number, number] }).range;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const isLast = i === tokens.length - 1;

    if (isMap(current)) {
      let foundPair: unknown = undefined;
      for (const item of current.items) {
        if (isPair(item)) {
          const keyVal = isScalar(item.key) ? String(item.key.value) : String(item.key);
          if (keyVal === token) {
            foundPair = item;
            break;
          }
        }
      }

      if (!foundPair) {
        break;
      }

      const pair = foundPair as { key?: { range?: [number, number, number] }; value?: { range?: [number, number, number] } };
      if (pair.key && pair.key.range) {
        lastKnownRange = pair.key.range;
      } else if (pair.value && pair.value.range) {
        lastKnownRange = pair.value.range;
      }

      if (isLast) {
        const offset = lastKnownRange ? lastKnownRange[0] : 0;
        const pos = lineCounter.linePos(offset);
        return { line: pos.line, column: pos.col };
      } else {
        current = pair.value;
      }
    } else if (isSeq(current)) {
      const idx = parseInt(token, 10);
      if (isNaN(idx) || idx < 0 || idx >= current.items.length) {
        break;
      }
      const item = current.items[idx] as { range?: [number, number, number] } | undefined;
      if (item && item.range) {
        lastKnownRange = item.range;
      }
      if (isLast) {
        const offset = lastKnownRange ? lastKnownRange[0] : 0;
        const pos = lineCounter.linePos(offset);
        return { line: pos.line, column: pos.col };
      } else {
        current = item;
      }
    } else {
      break;
    }
  }

  if (lastKnownRange) {
    const pos = lineCounter.linePos(lastKnownRange[0]);
    return { line: pos.line, column: pos.col };
  }

  return { line: undefined, column: undefined };
}

/**
 * Generates user-friendly, actionable remediation hints for Ajv schema violations.
 */
export function generateRemediation(error: ErrorObject): string {
  const { keyword, instancePath, params, data } = error;
  const propPath = pointerToPropertyPath(instancePath);

  switch (keyword) {
    case 'required': {
      const missing =
        params && typeof (params as { missingProperty?: unknown }).missingProperty === 'string'
          ? (params as { missingProperty: string }).missingProperty
          : 'property';
      const fullPath = instancePath ? `${pointerToPropertyPath(instancePath)}.${missing}` : missing;

      if (fullPath === 'version') return "Specify specification version in 'version' (e.g. version: \"0.1\").";
      if (fullPath === 'level') return "Specify repository policy posture in 'level' ('forbidden', 'restricted', or 'permissive').";
      if (fullPath === 'categories') return "Define 'categories' section with at least 'code' specified (e.g. categories: { code: 'restricted' }).";
      if (fullPath === 'categories.code') return "Define 'categories.code' policy level ('forbidden', 'restricted', or 'permissive').";
      if (fullPath === 'disclosure') return "Define 'disclosure' section with 'required: true' or 'required: false'.";
      if (fullPath === 'accountability') return "Define 'accountability' section with 'author_takes_responsibility: true'.";
      if (fullPath === 'bots') return "Define 'bots' section with 'automated_prs' policy level ('forbidden', 'restricted', or 'permissive').";
      if (missing === 'author_takes_responsibility') return "Set 'accountability.author_takes_responsibility' to true (or false) to attest contributor accountability.";
      if (missing === 'automated_prs') return "Set 'bots.automated_prs' to 'forbidden', 'restricted', or 'permissive'.";
      if (missing === 'key') return "Specify the git commit trailer key name (e.g. key: 'AI-Assisted').";

      return `Missing required property '${fullPath}'. Add '${missing}' to the configuration.`;
    }

    case 'additionalProperties': {
      const extra =
        params && typeof (params as { additionalProperty?: unknown }).additionalProperty === 'string'
          ? (params as { additionalProperty: string }).additionalProperty
          : 'property';
      const fullPath = instancePath ? `${pointerToPropertyPath(instancePath)}.${extra}` : extra;
      return `Remove unrecognized property '${fullPath}'. Schema v0.1 does not allow additional properties.`;
    }

    case 'enum': {
      const allowedVals = params && Array.isArray((params as { allowedValues?: unknown }).allowedValues)
        ? ((params as { allowedValues: unknown[] }).allowedValues).map((v) => `'${String(v)}'`).join(', ')
        : 'allowed values';
      const received = data !== undefined ? ` Received '${String(data)}'.` : '';
      return `Value must be one of: ${allowedVals}.${received}`;
    }

    case 'pattern': {
      const pattern = params && typeof (params as { pattern?: unknown }).pattern === 'string'
        ? (params as { pattern: string }).pattern
        : '';
      if (propPath === 'version') {
        return "Version must match pattern '^0\\.1(\\.[0-9]+)?$' (e.g. '0.1' or '0.1.0').";
      }
      return `Value at '${propPath}' must match regex pattern '${pattern}'.`;
    }

    case 'format': {
      const format = params && typeof (params as { format?: unknown }).format === 'string'
        ? (params as { format: string }).format
        : '';
      if (format === 'uri') {
        return "Provide a valid absolute URI starting with http:// or https:// (e.g. 'https://github.com/org/repo/blob/main/docs/ai-policy.md').";
      }
      return `Value at '${propPath}' must match format '${format}'.`;
    }

    case 'type': {
      const expectedType = params && typeof (params as { type?: unknown }).type === 'string'
        ? (params as { type: string }).type
        : 'valid type';
      const actualType = typeof data;
      return `Expected '${propPath}' to be of type ${expectedType}, but received ${actualType}.`;
    }

    case 'uniqueItems': {
      return `Array at '${propPath}' contains duplicate items. Remove duplicates so all elements are unique.`;
    }

    default:
      return error.message || 'Fix schema violation.';
  }
}

/**
 * Transforms an Ajv ErrorObject into a standardized PolicyDiagnostic.
 */
export function formatDiagnostic(
  error: ErrorObject,
  doc?: Document,
  lineCounter?: LineCounter
): PolicyDiagnostic {
  let targetPath = pointerToPropertyPath(error.instancePath);
  if (
    error.keyword === 'required' &&
    error.params &&
    typeof (error.params as { missingProperty?: unknown }).missingProperty === 'string'
  ) {
    const missing = (error.params as { missingProperty: string }).missingProperty;
    targetPath = error.instancePath
      ? `${pointerToPropertyPath(error.instancePath)}.${missing}`
      : missing;
  } else if (
    error.keyword === 'additionalProperties' &&
    error.params &&
    typeof (error.params as { additionalProperty?: unknown }).additionalProperty === 'string'
  ) {
    const extra = (error.params as { additionalProperty: string }).additionalProperty;
    targetPath = error.instancePath
      ? `${pointerToPropertyPath(error.instancePath)}.${extra}`
      : extra;
  }

  const { line, column } = resolveLineCol(doc, lineCounter, error);

  return {
    message: error.message || 'Validation error',
    path: targetPath,
    line,
    column,
    severity: 'error',
    keyword: error.keyword,
    remediation: generateRemediation(error),
  };
}

/**
 * Batch transforms an array of Ajv ErrorObjects into PolicyDiagnostic items.
 */
export function formatDiagnostics(
  errors: ErrorObject[] | null | undefined,
  doc?: Document,
  lineCounter?: LineCounter
): PolicyDiagnostic[] {
  if (!errors || errors.length === 0) {
    return [];
  }
  return errors.map((err) => formatDiagnostic(err, doc, lineCounter));
}
