# AI Policy: QEMU

- **Project**: QEMU
- **Ecosystem / Category**: Virtualization & Systems Software
- **Source URL**: https://www.qemu.org/docs/master/devel/submitting-a-patch.html
- **Reference Document**: QEMU Submitting a Patch, Section "Code provenance"
- **Primary Stance**: Forbidden

## Verbatim Policy Text

> "Current QEMU project policy is to DECLINE any contributions which are believed to include or derive from AI generated content.
>
> This policy is driven by legal provenance and compliance with QEMU's DCO requirements. The terms of service of generative AI engines and the copyright status of training data make it impossible to certify the Developer Certificate of Origin (DCO) 1.1 clauses (a), (b), or (c).
>
> Secondary assistance like researching APIs or debugging is permitted provided the actual AI-generated output is not directly included in the patch."

## 4-Dimension Breakdown

### 1. Usage Regulations
- **Overall Level**: `forbidden`
- **Scope**: Source code, patch submissions, documentation patches.
- **Exceptions**: Secondary assistance such as API exploration and interactive debugging is permitted, as long as no generated text or code is directly included in the submission.

### 2. Disclosure Requirements
- **Mandatory Disclosure**: Contributions believed to contain AI-generated text are declined; contributors must certify DCO provenance cleanly.
- **Attribution / Commit Trailer**: AI co-authorship tags or trailers certifying AI as author are invalid under DCO.

### 3. Comprehension & Accountability
- **Human Comprehension**: Required. Human submitters must certify Developer Certificate of Origin (DCO) 1.1 personally.
- **Legal Accountability**: DCO legal warranty requires the patch to be the author's original work or based on appropriate open-source licenses. AI cannot provide this warranty.

### 4. Review & Issue Rules
- **Automated PRs / Issues**: Declined on arrival.
- **Automated Reviews**: Not accepted in patch review workflows.
- **Mailing List Submissions**: Patches flagged as derived from AI are rejected by subsystem maintainers.
