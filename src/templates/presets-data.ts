import type { PresetName } from '../types.js';

export const SCHEMA_HEADER =
  '# yaml-language-server: $schema=https://raw.githubusercontent.com/thanhtrieunguyen/ai-policy-kit/main/schema/v0.1/ai-policy.schema.json';

export const STRICT_PRESET_YAML = `${SCHEMA_HEADER}
version: "0.1"
level: "forbidden"
policy_url: "https://github.com/thanhtrieunguyen/ai-policy-kit/blob/main/presets/strict.yml"

categories:
  code: "forbidden"
  docs: "restricted"
  tests: "forbidden"
  reviews: "forbidden"
  issues: "forbidden"

disclosure:
  required: true
  methods:
    - "commit_trailer"
    - "pr_checklist"
  commit_trailer:
    key: "AI-Assisted"
    required: true
    pattern: "^AI-Assisted: (None|docs:[a-zA-Z0-9_-]+)$"
  tool_name_required: true
  prompt_disclosure: "optional"

accountability:
  author_understands_code: true
  author_takes_responsibility: true
  dco_signoff: true

bots:
  automated_prs: "forbidden"
  automated_reviews: "forbidden"
  automated_issues: "forbidden"
  bot_allowlist:
    - "dependabot[bot]"
    - "renovate[bot]"
`;

export const BALANCED_PRESET_YAML = `${SCHEMA_HEADER}
version: "0.1"
level: "restricted"
policy_url: "https://github.com/thanhtrieunguyen/ai-policy-kit/blob/main/presets/balanced.yml"

categories:
  code: "restricted"
  docs: "permissive"
  tests: "restricted"
  reviews: "restricted"
  issues: "restricted"

disclosure:
  required: true
  methods:
    - "commit_trailer"
    - "pr_checklist"
    - "pr_description"
  commit_trailer:
    key: "AI-Assisted"
    required: false
    pattern: "^AI-Assisted: .+$"
  tool_name_required: true
  prompt_disclosure: "optional"

accountability:
  author_understands_code: true
  author_takes_responsibility: true
  dco_signoff: false

bots:
  automated_prs: "forbidden"
  automated_reviews: "forbidden"
  automated_issues: "restricted"
  bot_allowlist:
    - "dependabot[bot]"
    - "renovate[bot]"
`;

export const PERMISSIVE_PRESET_YAML = `${SCHEMA_HEADER}
version: "0.1"
level: "permissive"
policy_url: "https://github.com/thanhtrieunguyen/ai-policy-kit/blob/main/presets/permissive.yml"

categories:
  code: "permissive"
  docs: "permissive"
  tests: "permissive"
  reviews: "permissive"
  issues: "permissive"

disclosure:
  required: false
  methods:
    - "pr_checklist"
    - "pr_description"
  tool_name_required: false
  prompt_disclosure: "optional"

accountability:
  author_understands_code: false
  author_takes_responsibility: true
  dco_signoff: false

bots:
  automated_prs: "restricted"
  automated_reviews: "permissive"
  automated_issues: "permissive"
`;

export const PRESETS_DATA: Record<PresetName, string> = {
  strict: STRICT_PRESET_YAML,
  balanced: BALANCED_PRESET_YAML,
  permissive: PERMISSIVE_PRESET_YAML,
};

export function getPresetContent(preset: PresetName): string {
  const content = PRESETS_DATA[preset];
  if (!content) {
    throw new Error(`Unknown preset: "${preset}". Supported presets: strict, balanced, permissive.`);
  }
  return content;
}
