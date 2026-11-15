import type { Document } from 'yaml';

/**
 * Overall repository or category policy posture.
 */
export type PolicyLevel = 'forbidden' | 'restricted' | 'permissive';

/**
 * Valid disclosure methods for AI-assisted contributions.
 */
export type DisclosureMethod =
  | 'commit_trailer'
  | 'pr_checklist'
  | 'pr_description'
  | 'issue_template';

/**
 * Policy expectation regarding prompt disclosure.
 */
export type PromptDisclosure = 'forbidden' | 'optional' | 'required';

/**
 * Git commit trailer disclosure configuration.
 */
export interface CommitTrailerConfig {
  key: string;
  required?: boolean;
  pattern?: string;
}

/**
 * Granular contribution permissions by artifact category.
 */
export interface PolicyCategories {
  code: PolicyLevel;
  docs?: PolicyLevel;
  tests?: PolicyLevel;
  reviews?: PolicyLevel;
  issues?: PolicyLevel;
}

/**
 * Requirements for disclosing AI model usage in contributions.
 */
export interface DisclosureConfig {
  required: boolean;
  methods?: DisclosureMethod[];
  commit_trailer?: CommitTrailerConfig;
  tool_name_required?: boolean;
  prompt_disclosure?: PromptDisclosure;
}

/**
 * Contributor comprehension and accountability requirements.
 */
export interface AccountabilityConfig {
  author_understands_code?: boolean;
  author_takes_responsibility: boolean;
  dco_signoff?: boolean;
}

/**
 * Policies regarding automated bots and pull requests.
 */
export interface BotsConfig {
  automated_prs: PolicyLevel;
  automated_reviews?: PolicyLevel;
  automated_issues?: PolicyLevel;
  bot_allowlist?: string[];
}

/**
 * Root AI policy configuration object matching schema v0.1.
 */
export interface AIPolicyConfig {
  version: string;
  level: PolicyLevel;
  policy_url?: string;
  policy_path?: string;
  categories: PolicyCategories;
  disclosure: DisclosureConfig;
  accountability: AccountabilityConfig;
  bots: BotsConfig;
}

/**
 * Severity level for policy diagnostics.
 */
export type PolicyDiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * Detailed diagnostic item for schema validation errors or policy violations.
 */
export interface PolicyDiagnostic {
  message: string;
  path: string;
  line?: number;
  column?: number;
  severity?: PolicyDiagnosticSeverity;
  keyword?: string;
  remediation?: string;
}

/**
 * Result returned by policy validation functions.
 */
export interface ValidationResult {
  valid: boolean;
  diagnostics: PolicyDiagnostic[];
  /** Alias for diagnostics for ergonomics and downstream compatibility */
  errors: PolicyDiagnostic[];
}

/**
 * Options for validating policy configuration.
 */
export interface ValidateOptions {
  sourcePath?: string;
  sourceText?: string;
  strict?: boolean;
}

/**
 * Result returned by loadPolicy and loadPolicySync.
 */
export interface LoadPolicyResult {
  config: AIPolicyConfig;
  filepath: string;
  doc?: Document;
}

/**
 * Canonical preset names supported by ai-policy-kit.
 */
export type PresetName = 'strict' | 'balanced' | 'permissive';

/**
 * Base error class for all AI policy operations.
 */
export class PolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when no policy configuration file is found in target directory or path.
 */
export class PolicyNotFoundError extends PolicyError {
  public readonly targetPath?: string;
  public readonly candidates?: string[];

  constructor(message: string, options?: { targetPath?: string; candidates?: string[] }) {
    super(message);
    this.name = 'PolicyNotFoundError';
    this.targetPath = options?.targetPath;
    this.candidates = options?.candidates;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the policy file is empty (0 bytes), whitespace-only, or contains only comments.
 */
export class PolicyEmptyError extends PolicyError {
  public readonly filepath?: string;

  constructor(message: string, filepath?: string) {
    super(message);
    this.name = 'PolicyEmptyError';
    this.filepath = filepath;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when YAML or JSON parsing encounters syntax or indentation errors.
 */
export class PolicySyntaxError extends PolicyError {
  public readonly filepath?: string;
  public readonly line?: number;
  public readonly column?: number;
  public readonly snippet?: string;

  constructor(
    message: string,
    options?: {
      filepath?: string;
      line?: number;
      column?: number;
      snippet?: string;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = 'PolicySyntaxError';
    this.filepath = options?.filepath;
    this.line = options?.line;
    this.column = options?.column;
    this.snippet = options?.snippet;
    if (options?.cause) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Custom error class thrown when policy parsing or validation fails.
 */
export class PolicyValidationError extends PolicyError {
  public readonly diagnostics: PolicyDiagnostic[];

  constructor(message: string, diagnostics: PolicyDiagnostic[] = []) {
    super(message);
    this.name = 'PolicyValidationError';
    this.diagnostics = diagnostics;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
