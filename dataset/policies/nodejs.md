# AI Policy: Node.js / OpenJS Foundation

- **Project**: Node.js
- **Ecosystem / Category**: JavaScript Runtime / OpenJS Foundation
- **Source URL**: https://github.com/nodejs/node/blob/main/doc/contributing/ai-guidelines.md
- **Reference Document**: Node.js AI Guidelines (`doc/contributing/ai-guidelines.md`)
- **Primary Stance**: Restricted

## Verbatim Policy Text

> "Decision-making in the project must always be based on human judgment rather than machine automation.
>
> Contributors must disclose when AI is used and explain the steps they took to personally verify the output.
>
> Submitting AI-generated code that the author does not personally understand is treated as a waste of maintainer time, leading to pull request closure without further review. Repeated violations or dishonesty can result in contribution bans.
>
> Pull requests cannot be opened automatically by tooling unless given explicit, prior approval. Using AI to automatically shotgun-fix issues marked specifically as 'good first issues' is strictly prohibited."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `restricted`
- **Scope**: Source code, core modules, tests, documentation.
- **Exceptions**: Allowed with human verification; maximum scope per PR recommended to avoid review fatigue.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Required. Contributor must declare tool used and document the verification steps taken.
- **Method**: PR description statement and test verification notes.

### 3. Comprehension & Accountability
- **Human Comprehension**: Mandatory. Submitting code that author does not personally understand results in PR closure and contributor bans.
- **Decision-Making**: Decisions must always be based on human judgment rather than automated tooling.

### 4. Review & Issue Rules
- **Automated PRs**: Prohibited without prior explicit approval.
- **Beginner Issue Protection**: Using AI to shotgun-fix issues marked as "good first issues" is strictly prohibited to preserve newcomer learning.
- **Automated Reviews**: Unsolicited automated review bots are prohibited.
