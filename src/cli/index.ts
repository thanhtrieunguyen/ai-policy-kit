#!/usr/bin/env node

import { VERSION, DISCLAIMER } from '../constants.js';
import { handleInit } from './init.js';
import { handleCheck } from './check.js';
import { handleLintPR } from './lint-pr.js';

export const GLOBAL_HELP = `ai-policy v${VERSION} - Deterministic AI policy compliance validator

USAGE:
  ai-policy <command> [options]

COMMANDS:
  init        Scaffold a new ai-policy.yml configuration from presets
  check       Validate an ai-policy.yml file or remote repository policy
  lint-pr     Validate pull request compliance (trailers, checklist, leaks)

GLOBAL OPTIONS:
  -v, --version   Show package version
  -h, --help      Show this help message
  --json          Output machine-readable JSON (supported across all subcommands)

DISCLAIMER:
  ${DISCLAIMER}
`;

export async function main(argv = process.argv.slice(2)): Promise<number> {
  if (argv.length === 0) {
    console.log(GLOBAL_HELP);
    return 0;
  }

  const firstArg = argv[0]!;

  if (firstArg === '--version' || firstArg === '-v') {
    console.log(`v${VERSION}`);
    return 0;
  }

  if (firstArg === '--help' || firstArg === '-h') {
    console.log(GLOBAL_HELP);
    return 0;
  }

  if (firstArg.startsWith('-')) {
    console.error(`Error: Unknown global option "${firstArg}".\n\n${GLOBAL_HELP}`);
    return 2;
  }

  const subArgs = argv.slice(1);

  switch (firstArg) {
    case 'init':
      return await handleInit(subArgs);

    case 'check':
      return await handleCheck(subArgs);

    case 'lint-pr':
      return await handleLintPR(subArgs);

    default:
      console.error(`Error: Unknown command "${firstArg}".\n\n${GLOBAL_HELP}`);
      return 2;
  }
}

// When invoked directly as CLI entrypoint
const isDirectExecution =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('cli.js') || process.argv[1].endsWith('cli.ts') || process.argv[1].includes('ai-policy'));

if (isDirectExecution) {
  main()
    .then((code) => {
      process.exit(code);
    })
    .catch((err) => {
      console.error(`Fatal error: ${err.message}\n\n${DISCLAIMER}`);
      process.exit(2);
    });
}
