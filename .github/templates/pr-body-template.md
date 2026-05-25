## Summary
<1–3 sentences: what changed and why. Link to issue/spec if any.>

## Change type
<major | minor | patch> — <one-line justification, referencing `.github/skills/semver-classification.skill.md`>

## Changes
- <bullet per area of code modified, derived from `git log` + `git diff --name-status`>
- <group by package/src module when possible>
- <do NOT list test files here; see Test plan instead>

## Breaking changes
<Only if change_type = major. List affected public APIs and a short migration note for each. Otherwise: _N/A_.>

## Test plan
- Tests added/modified in this PR:
  - [ ] <test file / test name> — <what it verifies>
  - [ ] <test file / test name> — <what it verifies>

## Reviewer guidance
<Where to start reading, files that need extra scrutiny, anything non-obvious.>

## Risk & rollback
- Risk: <low | medium | high> — <one-line reason>
- Rollback: <revert this PR | feature flag `<name>` | no special steps>

## Linked issues
<From commit trailers (`Closes #123`, `Refs #456`) or _N/A_.>
