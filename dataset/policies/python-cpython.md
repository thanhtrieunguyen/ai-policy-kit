# AI Policy: Python Software Foundation / CPython

- **Project**: CPython
- **Ecosystem / Category**: Programming Language Runtime / Python Core
- **Source URL**: https://devguide.python.org/getting-started/ai-tools/
- **Reference Document**: Python Developer's Guide: Guidelines for using AI tools
- **Primary Stance**: Restricted / Permissive

## Verbatim Policy Text

> "The person submitting an issue, pull request (PR), or patch is fully responsible for its content, regardless of whether generative AI tools were used to help create it.
>
> Contributors must thoroughly review any AI-generated output to ensure it is correct, safe, and makes sense. PR authors are expected to be able to explain their proposed changes in their own words if asked by maintainers.
>
> While disclosing the use of AI tools in a PR description is not strictly mandatory, it is appreciated... Low-effort submissions, code churn, or bypassing/altering existing tests just to make a failing suite pass are strictly unacceptable."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `restricted`
- **Scope**: Core C/Python codebase, documentation, test suites (Lib/test).
- **Exceptions**: Permitted as developer aid; low-effort churn and test bypasses are strictly unacceptable.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Voluntary but strongly appreciated in PR description.
- **Human Explanation**: Authors must be able to explain changes in their own words if asked by core developers.

### 3. Comprehension & Accountability
- **Human Comprehension**: Required. Human submitter bears complete responsibility for technical correctness and safety.
- **Legal Accountability**: Python Software Foundation Contributor Agreement (PSF CLA).

### 4. Review & Issue Rules
- **Automated PRs / Issues**: Low-effort automated PRs or churn are closed. Repeat disruptive behavior results in account blocking.
- **Automated Reviews**: Core dev review remains exclusively human.
