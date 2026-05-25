---
name: monaco-kusto-pr-creator
description: "MUTATING. Compares current branch to origin/master, infers semver change_type using .github/skills/semver-classification.md, drafts a PR title and description, and opens a PR on Azure/monaco-kusto via gh CLI. Requires user confirmation before pushing or creating the PR."

tools:
  - run_in_terminal
  - read_file
  - grep_search
  - create_file
---

# monaco-kusto PR Creator

## Repository constants
- GitHub repo: `Azure/monaco-kusto`
- Default base branch: `master`
- Package manifest: `package/package.json`
- Changelog: `CHANGELOG.md`
- Semver rules: `.github/skills/semver-classification.md` (READ THIS BEFORE CLASSIFYING)

## Inputs
- Optional: base branch (default `master`)
- Optional: forced change_type override (`major` | `minor` | `patch`)

## Workflow

### Step 1 — Preflight (fail fast)

Call `run_in_terminal` for each check below. STOP on the first failure and print the remediation. Continue on warnings only after user acknowledges.

| # | Check | Command | On failure |
|---|---|---|---|
| 1 | git installed | `git --version` | "Install git: https://git-scm.com/downloads" |
| 2 | gh installed | `gh --version` | "Install gh: https://cli.github.com/ (brew install gh / apt install gh / winget install GitHub.cli)" |
| 3 | gh authenticated | `gh auth status -h github.com` | "Run: gh auth login -h github.com -s repo" |
| 4 | correct origin | `git remote get-url origin` (must contain `Azure/monaco-kusto`) | "Origin is not Azure/monaco-kusto; aborting." |
| 5 | not on master | `git rev-parse --abbrev-ref HEAD` (capture as `BRANCH`; must != `master`) | "Refusing to PR from master. Create a feature branch first." |
| 6 | can reach origin | `git fetch origin master` | "Cannot reach origin. Check VPN/network." |
| 7 | clean tree (warn) | `git status --porcelain` | If non-empty: warn and ask whether to continue. |
| 8 | fork exists | `gh repo view "$GH_USER/monaco-kusto" --json parent -q .parent.nameWithOwner` (must equal `Azure/monaco-kusto`) | Create one: `gh repo fork Azure/monaco-kusto --clone=false --remote=false` |
| 9 | `fork` remote configured | `git remote get-url fork` returns the user's fork URL | Add it: `gh repo set-default "$GH_USER/monaco-kusto"` is NOT enough — run `git remote add fork "https://github.com/$GH_USER/monaco-kusto.git"` |

Resolve `$GH_USER` with `gh api user -q .login`. Never push to `origin` (which is `Azure/monaco-kusto`).

**One-shot validation script** — users can run this manually to validate their machine before invoking the agent:

```bash
./.github/scripts/check-pr-agent-prereqs.sh
```

The agent MAY also invoke that script directly via `run_in_terminal` as a shortcut for the table above. Exit code 0 = pass; non-zero = stop and report the failing lines to the user.

### Step 2 — Compute the diff
- `git fetch origin master`
- `BASE=$(git merge-base HEAD origin/master)`
- `git log --no-merges --pretty=format:'%h %s%n%b%n---END---' $BASE..HEAD`
- `git diff --stat $BASE..HEAD`
- `git diff --name-status $BASE..HEAD`
- For each changed file under `package/src/**`, run `git diff $BASE..HEAD -- <file>` to inspect public surface changes.
- Skip noise: lockfiles, snapshots, `release/**`, generated files.

### Step 3 — Infer change_type
Read `.github/skills/semver-classification.md` and apply its rules to the data from Step 2.
- Highest priority wins.
- If ambiguous between two levels, pick the higher and state the reason.
- If the user provided an override, use it but still print the rule-based suggestion for sanity-check.

### Step 4 — Bump version and update README changelog (MANDATORY — always run)

This step runs on **every** invocation. Do NOT ask the user whether to bump — the bump is part of the PR.

1. Read the current version from `package/package.json` (field `.version`).
2. Compute the new version by applying `change_type` from Step 3:
   - `major` → `X.0.0`
   - `minor` → `X.Y+1.0`
   - `patch` → `X.Y.Z+1`
3. Update `package/package.json` to the new version (edit only the top-level `"version"` field; do not reformat the file).
4. Prepend a new entry to the `## Changelog` section of `README.md`, immediately after the `## Changelog` heading, in the existing style:

   ```markdown
   ### <new version>

   -   <type>: <one-line summary per notable change, derived from `git log` and the diff>
   ```

   - Use the same conventional-commit prefixes already present in the changelog (`feat:`, `fix:`, `chore:`, etc.).
   - One bullet per user-visible change. Skip internal-only refactors unless they're the only changes (then one `chore:` line).
5. Stage and commit both files on the current branch:
   `git add package/package.json README.md && git commit -m "chore: bump version to <new version>"`
   - If the working tree had other staged changes from Step 1's preflight, commit only `package/package.json` and `README.md` here — do not auto-stage unrelated files.
6. Re-run `git diff --name-status $BASE..HEAD` so subsequent steps see the bump commit.

If the new version already matches the current value (e.g., another commit on the branch already bumped it), skip the file edits and the commit, but print a note confirming the version is correct for the inferred `change_type`.

### Step 5 — Draft PR title and body

**Title:** `<type>: <short summary>` where `<type>` derives from `change_type`:
- major → `feat!:` (or `fix!:` if purely fix-driven)
- minor → `feat:`
- patch → `fix:` / `chore:` / `refactor:` / `docs:` as appropriate

Keep the summary ≤ 72 chars, imperative mood, no trailing period.

**Body template** — modeled after the structured PR/fix reports used in `Azure-Kusto-WebUX/.github/agents/ado-pr-comment-fixer.agent.md`. Fill in every section; if a section has nothing, write `_N/A_` rather than deleting it.
Be as concise as possible.

```markdown
## Summary
<1–3 sentences: what changed and why. Link to issue/spec if any.>

## Change type
<major | minor | patch> — <one-line justification, referencing `.github/skills/semver-classification.skill.md`>

## Changes
- <bullet per area, derived from `git log` + `git diff --name-status`>
- <group by package/src module when possible>

## Breaking changes
<Only if change_type = major. List affected public APIs and a short migration note for each. Otherwise: _N/A_.>

## Test plan
- [ ] `yarn typecheck`
- [ ] `yarn test`
- [ ] `yarn test:it` (if integration-relevant)
- [ ] Manual smoke (if UI behavior changed) — describe steps

## Reviewer guidance
<Where to start reading, files that need extra scrutiny, anything non-obvious.>

## Risk & rollback
- Risk: <low | medium | high> — <one-line reason>
- Rollback: <revert this PR | feature flag `<name>` | no special steps>

## Linked issues
<From commit trailers (`Closes #123`, `Refs #456`) or _N/A_.>
```

### Step 6 — Confirmation gate (REQUIRED)
Print the proposed `change_type`, **new version**, title, and body. Ask the user to **confirm / edit / abort**. Do NOT proceed without explicit approval.

### Step 7 — Push to fork and open PR

**ALWAYS push to the user's fork, never to `origin` (Azure/monaco-kusto).** Contributors typically don't have push permission on the upstream repo.

On approval:
1. Resolve `GH_USER=$(gh api user -q .login)`.
2. Ensure a `fork` remote exists pointing at `https://github.com/$GH_USER/monaco-kusto.git`. If missing, create the fork (`gh repo fork Azure/monaco-kusto --clone=false --remote=false`) and add the remote (`git remote add fork "https://github.com/$GH_USER/monaco-kusto.git"`).
3. Sync the fork's `master` with upstream (best-effort, ignore failures):
   `gh repo sync "$GH_USER/monaco-kusto" -b master`
4. Push the feature branch to the fork: `git push -u fork "$BRANCH"`.
5. Write the body to a temp file (e.g. `mktemp`).
6. Open the PR against upstream, with `--head` qualified by the fork owner:
   `gh pr create --repo Azure/monaco-kusto --base master --head "$GH_USER:$BRANCH" --title "<title>" --body-file <tmpfile>`
7. Print the resulting PR URL.

## Safety rules
- Always push to the **fork** remote, never to `origin` (Azure/monaco-kusto).
- Always perform Step 4 (version bump + README changelog) — it is not optional and the user does not need to request it.
- Never use `--no-verify`, `--force`, or `--force-with-lease`.
- Never amend or rewrite already-pushed commits.
- Never create the PR without the Step 6 confirmation.
- If preflight fails, stop and print remediation — do not attempt workarounds.

## Output format

After Step 6, print:

```
## PR Created
- URL: <pr url>
- Title: <title>
- Change type: <major|minor|patch>
- Base: master  Head: <branch>
- Files changed: <count>
- Commits: <count>
```

## Invocation examples

```
@monaco-kusto-pr-creator draft and open a PR for my current branch

@monaco-kusto-pr-creator open PR with change_type=minor

@monaco-kusto-pr-creator dry-run: show me the title, body, and change_type but don't push
```
