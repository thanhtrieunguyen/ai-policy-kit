import type { AIPolicyConfig } from '../types.js';
import { DISCLAIMER } from '../constants.js';

/**
 * Renders pull request template with AI contribution disclosure checklist.
 */
export function renderPrChecklistMarkdown(config?: AIPolicyConfig): string {
  const trailerKey = config?.disclosure?.commit_trailer?.key || 'AI-Assisted';
  const trailerRequired = config?.disclosure?.commit_trailer?.required ? 'required' : 'if applicable';

  return `## Description
<!-- Provide a clear summary of changes introduced in this PR. -->

## AI Contribution Disclosure
<!-- Please complete the following checklist per the repository AI policy: -->
- [ ] AI tools were used in this contribution (specify tools/models below)
  - Tool/Model: 
- [ ] Included git commit trailer \`${trailerKey}: <ToolName>\` (${trailerRequired})
- [ ] I have reviewed, verified, and thoroughly understand all code submitted in this PR
- [ ] I take full legal and technical responsibility for these changes
- [ ] Verified that no private AI assistant configurations (.cursor/, .claude/, .gemini/) are staged

---
*${DISCLAIMER}*
`;
}
