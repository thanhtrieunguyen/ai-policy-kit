import YAML, { type Document, type LineCounter } from 'yaml';
import { PolicyEmptyError, PolicySyntaxError } from '../types.js';

export interface ParsePolicyResult {
  data: unknown;
  doc: Document;
  lineCounter: LineCounter;
}

/**
 * Safely strips UTF-8 Byte Order Mark (BOM) if present.
 */
export function stripBOM(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
}

/**
 * Parses raw YAML or JSON policy content, preserving CST Document and line positions.
 *
 * @throws {PolicyEmptyError} If content is empty, whitespace-only, or comments-only.
 * @throws {PolicySyntaxError} If YAML or JSON parsing fails with syntax errors.
 */
export function parsePolicyContent(content: string, filepath?: string): ParsePolicyResult {
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new PolicyEmptyError(
      filepath ? `Policy file is empty: "${filepath}"` : 'Policy content is empty',
      filepath
    );
  }

  const cleanContent = stripBOM(content);
  const isJson = filepath ? filepath.toLowerCase().endsWith('.json') : false;

  // Strict JSON verification for .json files
  if (isJson) {
    try {
      JSON.parse(cleanContent);
    } catch (err) {
      let line: number | undefined;
      let column: number | undefined;
      const errorMsg = (err as Error).message;

      const lineColMatch = errorMsg.match(/line (\d+) column (\d+)/i);
      const atMatch = errorMsg.match(/at (\d+):(\d+)/i);
      const posMatch = errorMsg.match(/position (\d+)/i);

      if (lineColMatch && lineColMatch[1] && lineColMatch[2]) {
        line = parseInt(lineColMatch[1], 10);
        column = parseInt(lineColMatch[2], 10);
      } else if (atMatch && atMatch[1] && atMatch[2]) {
        line = parseInt(atMatch[1], 10);
        column = parseInt(atMatch[2], 10);
      } else if (posMatch && posMatch[1]) {
        const pos = parseInt(posMatch[1], 10);
        const lc = new YAML.LineCounter();
        YAML.parseDocument(cleanContent, { lineCounter: lc });
        const lp = lc.linePos(pos);
        line = lp.line;
        column = lp.col;
      }

      throw new PolicySyntaxError(
        `Invalid JSON syntax in ${filepath ? `"${filepath}"` : 'content'}: ${errorMsg}`,
        { filepath, line, column, cause: err }
      );
    }
  }

  const lineCounter = new YAML.LineCounter();
  const doc = YAML.parseDocument(cleanContent, { lineCounter, prettyErrors: true });

  if (doc.errors.length > 0) {
    const firstErr = doc.errors[0]!;
    const linePos = firstErr.linePos?.[0];
    const line = linePos?.line;
    const column = linePos?.col;
    throw new PolicySyntaxError(
      `Invalid YAML syntax in ${filepath ? `"${filepath}"` : 'content'}: ${firstErr.message}`,
      {
        filepath,
        line,
        column,
        cause: firstErr,
      }
    );
  }

  if (doc.contents === null) {
    throw new PolicyEmptyError(
      filepath
        ? `Policy file contains no document content: "${filepath}"`
        : 'Policy content contains no document content',
      filepath
    );
  }

  const data = doc.toJS();
  return { data, doc, lineCounter };
}
