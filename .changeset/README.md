# Changesets

Welcome to the Changesets directory!

`ai-policy-kit` uses [Changesets](https://github.com/changesets/changesets) to automate semantic versioning, changelog generation, and package releases.

## Adding a Changeset to a Pull Request

If your Pull Request introduces changes that affect users (new features, bug fixes, or breaking changes), please include a changeset:

```bash
npm run changeset
```

This interactive prompt will ask:
1. Which packages to include (select `ai-policy-kit`).
2. The type of version bump:
   - `patch`: Bug fixes and minor internal corrections.
   - `minor`: New backwards-compatible features (e.g., new preset, new CLI flag).
   - `major`: Breaking changes to schemas, CLI flags, or public APIs.
3. A concise summary describing the changes.

A new Markdown file will be generated in `.changeset/`. Commit this file alongside your code changes.

## Automated Release Workflow

When changesets are merged into the `main` branch, GitHub Actions will:
1. Open or update a release pull request titled `chore(release): version package`.
2. When the release pull request is merged, build the package, run tests, and publish the new version to npm with cryptographic provenance and an updated GitHub Release tag (`v1`).
