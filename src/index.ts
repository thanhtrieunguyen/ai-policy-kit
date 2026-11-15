import type { PresetName } from './types.js';

export * from './types.js';

export {
  loadPolicy,
  loadPolicySync,
  findPolicyFile,
  findPolicyFileSync,
  CANDIDATE_POLICY_PATHS,
} from './engine/loader.js';

export {
  parsePolicyContent,
  stripBOM,
  type ParsePolicyResult,
} from './engine/parser.js';

export {
  validatePolicy,
  ajv,
  compiledValidator,
} from './schema/validator.js';

export { schema as schemaData, schema } from './schema/schema-data.js';

export {
  resolveLineCol,
  generateRemediation,
  formatDiagnostic,
  formatDiagnostics,
  parseJsonPointer,
  pointerToPropertyPath,
  unescapeJsonPointerToken,
} from './schema/diagnostics.js';

export {
  lintPullRequest,
  type LintPROptions,
  type LintPRResult,
  type Violation,
  type Leak,
} from './cli/lint-pr.js';

export {
  renderAiPolicyMarkdown,
  renderAgentsMarkdown,
} from './templates/markdown.js';

export {
  renderPrChecklistMarkdown,
} from './templates/pr-checklist.js';

export {
  PRESETS_DATA,
  getPresetContent,
  SCHEMA_HEADER,
} from './templates/presets-data.js';

export {
  getCommitsInRange,
  parseTrailers,
  matchesTrailerPattern,
  type GitTrailer,
  type CommitInfo,
} from './git/trailers.js';

export {
  getChangedFiles,
  normalizeRepoPath,
  type DiffResult,
  type ChangedFile,
  type FileChangeStatus,
} from './git/diff.js';

export {
  detectWorkspaceLeaks,
  checkLeakPath,
  FORBIDDEN_LEAK_RULES,
  type WorkspaceLeak,
} from './git/leaks.js';

export {
  VERSION,
  version,
  DISCLAIMER,
} from './constants.js';

/**
 * Relative paths to canonical presets.
 */
export const PRESETS: Record<PresetName, string> = {
  strict: 'presets/strict.yml',
  balanced: 'presets/balanced.yml',
  permissive: 'presets/permissive.yml',
};

/**
 * Schema v0.1 metadata reference.
 */
export const SCHEMA_V0_1 = Object.freeze({
  $schema: 'http://json-schema.org/draft-07/schema#',
  version: '0.1',
} as const);
