import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AIPolicyConfig, LoadPolicyResult } from '../types.js';
import { PolicyNotFoundError } from '../types.js';
import { parsePolicyContent } from './parser.js';

/**
 * Standard candidate policy discovery paths in descending priority order.
 */
export const CANDIDATE_POLICY_PATHS: readonly string[] = [
  '.github/ai-policy.yml',
  '.github/ai-policy.yaml',
  '.github/ai-policy.json',
  'ai-policy.yml',
  'ai-policy.yaml',
  'ai-policy.json',
] as const;

/**
 * Finds the candidate policy file synchronously in the given directory or returns the file path.
 */
export function findPolicyFileSync(filePathOrDir?: string): string {
  const target = filePathOrDir && filePathOrDir.trim() !== '' ? filePathOrDir : process.cwd();
  const resolved = path.resolve(target);

  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolved);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new PolicyNotFoundError(`Policy file or directory not found: "${resolved}"`, {
        targetPath: resolved,
      });
    }
    throw err;
  }

  if (stat.isFile()) {
    return resolved;
  }

  if (stat.isDirectory()) {
    for (const candidate of CANDIDATE_POLICY_PATHS) {
      const candidatePath = path.resolve(resolved, candidate);
      try {
        const cStat = fs.statSync(candidatePath);
        if (cStat.isFile()) {
          return candidatePath;
        }
      } catch {
        // Continue searching next candidate
      }
    }

    throw new PolicyNotFoundError(
      `No AI policy configuration found in directory "${resolved}". Searched: ${CANDIDATE_POLICY_PATHS.join(', ')}`,
      { targetPath: resolved, candidates: [...CANDIDATE_POLICY_PATHS] }
    );
  }

  throw new PolicyNotFoundError(`Specified path is not a file or directory: "${resolved}"`, {
    targetPath: resolved,
  });
}

/**
 * Finds the candidate policy file asynchronously in the given directory or returns the file path.
 */
export async function findPolicyFile(filePathOrDir?: string): Promise<string> {
  const target = filePathOrDir && filePathOrDir.trim() !== '' ? filePathOrDir : process.cwd();
  const resolved = path.resolve(target);

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(resolved);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new PolicyNotFoundError(`Policy file or directory not found: "${resolved}"`, {
        targetPath: resolved,
      });
    }
    throw err;
  }

  if (stat.isFile()) {
    return resolved;
  }

  if (stat.isDirectory()) {
    for (const candidate of CANDIDATE_POLICY_PATHS) {
      const candidatePath = path.resolve(resolved, candidate);
      try {
        const cStat = await fs.promises.stat(candidatePath);
        if (cStat.isFile()) {
          return candidatePath;
        }
      } catch {
        // Continue searching next candidate
      }
    }

    throw new PolicyNotFoundError(
      `No AI policy configuration found in directory "${resolved}". Searched: ${CANDIDATE_POLICY_PATHS.join(', ')}`,
      { targetPath: resolved, candidates: [...CANDIDATE_POLICY_PATHS] }
    );
  }

  throw new PolicyNotFoundError(`Specified path is not a file or directory: "${resolved}"`, {
    targetPath: resolved,
  });
}

/**
 * Synchronously discovers, reads, and parses AI policy configuration.
 */
export function loadPolicySync(filePathOrDir?: string): LoadPolicyResult {
  const resolvedPath = findPolicyFileSync(filePathOrDir);
  const content = fs.readFileSync(resolvedPath, 'utf8');
  const { data, doc } = parsePolicyContent(content, resolvedPath);

  return {
    config: data as AIPolicyConfig,
    filepath: resolvedPath,
    doc,
  };
}

/**
 * Asynchronously discovers, reads, and parses AI policy configuration.
 */
export async function loadPolicy(filePathOrDir?: string): Promise<LoadPolicyResult> {
  const resolvedPath = await findPolicyFile(filePathOrDir);
  const content = await fs.promises.readFile(resolvedPath, 'utf8');
  const { data, doc } = parsePolicyContent(content, resolvedPath);

  return {
    config: data as AIPolicyConfig,
    filepath: resolvedPath,
    doc,
  };
}
