import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import YAML from 'yaml';
import type { PresetName, AIPolicyConfig } from '../types.js';
import { DISCLAIMER } from '../constants.js';
import { getPresetContent } from '../templates/presets-data.js';
import { renderAiPolicyMarkdown, renderAgentsMarkdown } from '../templates/markdown.js';
import { renderPrChecklistMarkdown } from '../templates/pr-checklist.js';

export interface InitOptions {
  preset?: string;
  output?: string;
  docs?: boolean;
  force?: boolean;
  json?: boolean;
  cwd?: string;
}

export const INIT_HELP = `ai-policy init - Scaffold a new ai-policy.yml configuration

USAGE:
  ai-policy init [options]

OPTIONS:
  --preset <name>   Preset template to scaffold: strict, balanced, permissive (default: balanced)
  --output <path>   Output file path (default: .github/ai-policy.yml)
  --docs            Also generate AI_POLICY.md, AGENTS.md, and PR checklist template
  --force           Overwrite existing files if they already exist
  --json            Emit machine-readable JSON output
  -h, --help        Show this help message

DISCLAIMER:
  ${DISCLAIMER}
`;

export async function handleInit(rawArgs: string[], cwd = process.cwd()): Promise<number> {
  let parsed: ReturnType<typeof parseArgs>;

  try {
    parsed = parseArgs({
      args: rawArgs,
      options: {
        preset: { type: 'string', default: 'balanced' },
        output: { type: 'string' },
        docs: { type: 'boolean', default: false },
        force: { type: 'boolean', default: false },
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      strict: true,
      allowPositionals: false,
    });
  } catch (err: any) {
    console.error(`Error: ${err.message}\n\n${INIT_HELP}`);
    return 2;
  }

  const { values } = parsed;

  if (values.help) {
    console.log(INIT_HELP);
    return 0;
  }

  const preset = (typeof values.preset === 'string' ? values.preset : 'balanced') as PresetName;
  const isJson = Boolean(values.json);
  const isDocs = Boolean(values.docs);
  const isForce = Boolean(values.force);

  if (preset !== 'strict' && preset !== 'balanced' && preset !== 'permissive') {
    const errMsg = `Unknown preset: "${preset}". Supported presets are: strict, balanced, permissive.`;
    if (isJson) {
      console.log(
        JSON.stringify(
          {
            success: false,
            error: errMsg,
            disclaimer: DISCLAIMER,
          },
          null,
          2
        )
      );
    } else {
      console.error(`Error: ${errMsg}\n\n${INIT_HELP}`);
    }
    return 2;
  }

  const targetPath = typeof values.output === 'string'
    ? path.resolve(cwd, values.output)
    : path.resolve(cwd, '.github', 'ai-policy.yml');

  // Overwrite guard
  if (fs.existsSync(targetPath) && !isForce) {
    const errMsg = `File already exists: "${path.relative(cwd, targetPath)}". Use --force to overwrite.`;
    if (isJson) {
      console.log(
        JSON.stringify(
          {
            success: false,
            error: errMsg,
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

  // Overwrite guard for docs files
  if (isDocs && !isForce) {
    const docsCandidates = [
      path.resolve(cwd, 'AI_POLICY.md'),
      path.resolve(cwd, 'AGENTS.md'),
      path.resolve(cwd, '.github', 'PULL_REQUEST_TEMPLATE.md'),
    ];
    for (const docFile of docsCandidates) {
      if (fs.existsSync(docFile)) {
        const errMsg = `File already exists: "${path.relative(cwd, docFile)}". Use --force to overwrite.`;
        if (isJson) {
          console.log(
            JSON.stringify(
              {
                success: false,
                error: errMsg,
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
    }
  }

  const presetContent = getPresetContent(preset);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, presetContent, 'utf-8');

  const createdFiles: string[] = [path.relative(cwd, targetPath).replace(/\\/g, '/')];

  if (isDocs) {
    let parsedConfig: AIPolicyConfig;
    try {
      parsedConfig = YAML.parse(presetContent) as AIPolicyConfig;
    } catch {
      parsedConfig = {
        version: '0.1',
        level: preset === 'strict' ? 'forbidden' : preset === 'balanced' ? 'restricted' : 'permissive',
        categories: { code: preset === 'strict' ? 'forbidden' : 'restricted' },
        disclosure: { required: preset !== 'permissive' },
        accountability: { author_takes_responsibility: true },
        bots: { automated_prs: 'restricted' },
      };
    }

    const aiPolicyPath = path.resolve(cwd, 'AI_POLICY.md');
    const agentsPath = path.resolve(cwd, 'AGENTS.md');
    const prTmplPath = path.resolve(cwd, '.github', 'PULL_REQUEST_TEMPLATE.md');

    if (isForce || !fs.existsSync(aiPolicyPath)) {
      fs.writeFileSync(aiPolicyPath, renderAiPolicyMarkdown(parsedConfig), 'utf-8');
      createdFiles.push('AI_POLICY.md');
    }
    if (isForce || !fs.existsSync(agentsPath)) {
      fs.writeFileSync(agentsPath, renderAgentsMarkdown(parsedConfig), 'utf-8');
      createdFiles.push('AGENTS.md');
    }
    if (isForce || !fs.existsSync(prTmplPath)) {
      fs.mkdirSync(path.dirname(prTmplPath), { recursive: true });
      fs.writeFileSync(prTmplPath, renderPrChecklistMarkdown(parsedConfig), 'utf-8');
      createdFiles.push('.github/PULL_REQUEST_TEMPLATE.md');
    }
  }

  if (isJson) {
    console.log(
      JSON.stringify(
        {
          success: true,
          preset,
          files: createdFiles,
          disclaimer: DISCLAIMER,
        },
        null,
        2
      )
    );
  } else {
    console.log(`✓ Scaffolding completed using preset "${preset}".`);
    console.log('Created files:');
    for (const f of createdFiles) {
      console.log(`  - ${f}`);
    }
    console.log(`\n${DISCLAIMER}`);
  }

  return 0;
}
