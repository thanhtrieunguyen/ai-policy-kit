import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { DISCLAIMER } from '../constants.js';
import { findPolicyFile } from '../engine/loader.js';
import { parsePolicyContent } from '../engine/parser.js';
import { validatePolicy } from '../schema/validator.js';
import type { PolicyDiagnostic } from '../types.js';

export const CHECK_HELP = `ai-policy check - Validate an ai-policy.yml configuration file or remote policy

USAGE:
  ai-policy check [file-or-repo] [options]

OPTIONS:
  -q, --quiet   Suppress standard output on successful validation
  --json        Emit machine-readable JSON output
  -h, --help    Show this help message

ARGUMENTS:
  [file-or-repo]  Path to local file/directory, or HTTP(S) URL (default: searches working directory)

DISCLAIMER:
  ${DISCLAIMER}
`;

export async function handleCheck(rawArgs: string[], cwd = process.cwd()): Promise<number> {
  let parsed: ReturnType<typeof parseArgs>;

  try {
    parsed = parseArgs({
      args: rawArgs,
      options: {
        quiet: { type: 'boolean', short: 'q', default: false },
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      strict: true,
      allowPositionals: true,
    });
  } catch (err: any) {
    console.error(`Error: ${err.message}\n\n${CHECK_HELP}`);
    return 2;
  }

  const { values, positionals } = parsed;

  if (values.help) {
    console.log(CHECK_HELP);
    return 0;
  }

  const isQuiet = Boolean(values.quiet);
  const isJson = Boolean(values.json);
  const target = positionals[0];

  let content = '';
  let filepath = '';
  let isRemote = false;

  if (target && (target.startsWith('http://') || target.startsWith('https://'))) {
    isRemote = true;
    filepath = target;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(target, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      content = await res.text();
    } catch (err: any) {
      const errMsg = `Failed to fetch remote policy from ${target}: ${err.message}`;
      if (isJson) {
        console.log(
          JSON.stringify(
            {
              valid: false,
              filepath: target,
              diagnostics: [
                {
                  message: errMsg,
                  path: '',
                  severity: 'error',
                },
              ],
              disclaimer: DISCLAIMER,
            },
            null,
            2
          )
        );
      } else {
        console.error(`Error: ${errMsg}\n\n${DISCLAIMER}`);
      }
      return 2;
    }
  } else if (target) {
    const resolved = path.resolve(cwd, target);
    if (!fs.existsSync(resolved)) {
      const errMsg = `Target policy file or directory not found: "${target}". Run 'ai-policy init' to scaffold an ai-policy.yml configuration.`;
      if (isJson) {
        console.log(
          JSON.stringify(
            {
              valid: false,
              filepath: target,
              diagnostics: [
                {
                  message: errMsg,
                  path: '',
                  severity: 'error',
                },
              ],
              disclaimer: DISCLAIMER,
            },
            null,
            2
          )
        );
      } else {
        console.error(`Error: ${errMsg}\n\n${DISCLAIMER}`);
      }
      return 2;
    }

    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      let discovered: string | null = null;
      try {
        discovered = await findPolicyFile(resolved);
      } catch {
        discovered = null;
      }
      if (!discovered) {
        const errMsg = `No policy file found in directory "${target}". Run 'ai-policy init' to scaffold an ai-policy.yml configuration.`;
        if (isJson) {
          console.log(
            JSON.stringify(
              {
                valid: false,
                filepath: target,
                diagnostics: [
                  {
                    message: errMsg,
                    path: '',
                    severity: 'error',
                  },
                ],
                disclaimer: DISCLAIMER,
              },
              null,
              2
            )
          );
        } else {
          console.error(`Error: ${errMsg}\n\n${DISCLAIMER}`);
        }
        return 2;
      }
      filepath = path.relative(cwd, discovered).replace(/\\/g, '/');
      content = fs.readFileSync(discovered, 'utf-8');
    } else {
      filepath = path.relative(cwd, resolved).replace(/\\/g, '/');
      content = fs.readFileSync(resolved, 'utf-8');
    }
  } else {
    // Auto-discover in cwd
    let discovered: string | null = null;
    try {
      discovered = await findPolicyFile(cwd);
    } catch {
      discovered = null;
    }
    if (!discovered) {
      const errMsg = `No AI policy file found. Run 'ai-policy init' to scaffold an ai-policy.yml configuration.`;
      if (isJson) {
        console.log(
          JSON.stringify(
            {
              valid: false,
              filepath: '',
              diagnostics: [
                {
                  message: errMsg,
                  path: '',
                  severity: 'error',
                },
              ],
              disclaimer: DISCLAIMER,
            },
            null,
            2
          )
        );
      } else {
        console.error(`Error: ${errMsg}\n\n${DISCLAIMER}`);
      }
      return 2;
    }
    filepath = path.relative(cwd, discovered).replace(/\\/g, '/');
    content = fs.readFileSync(discovered, 'utf-8');
  }

  // Parse & Validate
  let diagnostics: PolicyDiagnostic[] = [];
  let isValid = false;

  try {
    const parseResult = parsePolicyContent(content, filepath);
    const valResult = validatePolicy(parseResult.data, {
      sourceText: content,
      sourcePath: isRemote ? undefined : filepath,
    });
    isValid = valResult.valid;
    diagnostics = valResult.diagnostics;
  } catch (err: any) {
    isValid = false;
    if (err.diagnostics && Array.isArray(err.diagnostics)) {
      diagnostics = err.diagnostics;
    } else {
      diagnostics = [
        {
          message: err.message || 'Syntax or validation error',
          path: '',
          line: err.line,
          column: err.column,
          severity: 'error',
          remediation: err.snippet,
        },
      ];
    }
  }

  if (isValid) {
    if (isJson) {
      console.log(
        JSON.stringify(
          {
            valid: true,
            filepath,
            diagnostics: [],
            disclaimer: DISCLAIMER,
          },
          null,
          2
        )
      );
    } else if (!isQuiet) {
      console.log(`✓ Policy valid and compliant: ${filepath}`);
      console.log(`\n${DISCLAIMER}`);
    }
    return 0;
  }

  // Validation failure
  if (isJson) {
    console.log(
      JSON.stringify(
        {
          valid: false,
          filepath,
          diagnostics,
          disclaimer: DISCLAIMER,
        },
        null,
        2
      )
    );
  } else {
    console.error(`❌ Validation failed for ${filepath}:\n`);
    for (const diag of diagnostics) {
      const loc = diag.line ? `:${diag.line}:${diag.column || 1}` : '';
      console.error(`  - ${filepath}${loc} [${diag.path || 'root'}]: ${diag.message}`);
      if (diag.remediation) {
        console.error(`    Remediation: ${diag.remediation}`);
      }
    }
    console.error(`\n${DISCLAIMER}`);
  }

  return 2;
}
