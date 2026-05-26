---
name: semver-classification
description: Rules for choosing the next version bump (major/minor/patch) for monaco-kusto based on a git diff and commit messages. Use when creating a release, drafting a PR, or updating CHANGELOG.
---

# Version bump decision

Highest priority wins. If uncertain between two levels, pick the higher one and explain why.

## MAJOR

-   Breaking API changes
-   Removing or renaming public interfaces (exports from `package/src/monaco.contribution.ts` and re-exports)
-   Behavior changes that can break existing consumers
-   Changes requiring code updates by downstream users

## MINOR

-   New features
-   New schema entities (e.g., Graph, Function extensions)
-   Additive API changes (non-breaking)
-   New capabilities in language service (completion, parsing, etc.)

## PATCH

-   Bug fixes (`fix:`)
-   Test fixes
-   Refactors with no behavior change
-   Internal cleanup or performance improvements
-   Docs/build/deps bumps with no API surface change

## Signals to inspect

-   `git diff $BASE..HEAD -- package/src/**` for public surface changes
-   `git log $BASE..HEAD` for conventional-commit prefixes and `BREAKING CHANGE` trailers
-   `package/package.json` (current version) and `CHANGELOG.md` (prior style)
