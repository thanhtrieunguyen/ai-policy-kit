# AI Policy: GitLab

- **Project**: GitLab
- **Ecosystem / Category**: DevOps Platform & Open Core / Ruby, Go & Vue
- **Source URL**: https://docs.gitlab.com/ee/development/contributing/
- **Reference Document**: GitLab DCO and Use of AI in Contributions
- **Primary Stance**: Restricted / Permissive

## Verbatim Policy Text

> "Contributors MUST disclose if a contribution contains AI-generated content (including content generated via GitLab Duo). GitLab advises erring on the side of overinclusiveness.
>
> Contributors must validate AI-generated output using firsthand information or trustworthy third-party sources.
>
> Contributors must scrub and remove anything that might be personal data.
>
> The terms of the generative AI tools used must not prohibit or restrict the use of their output in a way that conflicts with GitLab's DCO or CLA."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `restricted`
- **Scope**: Backend Ruby/Go, frontend Vue components, documentation, CI runner code.
- **Exceptions**: Permitted with mandatory disclosure and firsthand validation.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Required in Merge Requests (MRs). Contributors are advised to err on the side of overinclusiveness.
- **Method**: MR template disclosure checklist.

### 3. Comprehension & Accountability
- **Human Comprehension**: Required. Contributor must validate outputs against authoritative sources.
- **Legal Accountability**: GitLab DCO and Contributor Agreement compliance; personal data must be scrubbed from prompts.

### 4. Review & Issue Rules
- **Automated PRs / Issues**: Unsolicited automated bot MRs are closed without review.
- **Automated Reviews**: Human maintainer review required before merge.
