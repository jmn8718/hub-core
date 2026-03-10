# Git Committer

Commit pending changes in logical chunks with Conventional Commit messages.

## When to Use

After completing a feature, fix, or batch of related work, when `git status` shows uncommitted changes.

## Process

1. Run `git log --oneline -5` to match recent style.
2. Run `git status` and `git diff --stat` to survey changes.
3. Group files into logical chunks (one commit per purpose).
4. For each chunk:
   - Stage specific files by name (never `git add .`).
   - Write a Conventional Commit message.
   - Commit and re-check `git status`.
5. Push at end of session or when you have a meaningful batch ready.

## Chunking Rules

| Changes                                        | Commit together?               |
| ---------------------------------------------- | ------------------------------ |
| Backend API + service + schema for one feature | Yes                            |
| Frontend page + data types for one feature     | Yes                            |
| Unrelated config changes                       | Separate commit                |
| Redirects/removals from a consolidation        | Bundle with that consolidation |
| New third-party integration (client + service) | Yes                            |

Split test: if the subject needs "and" between unrelated things, split it.

## Commit Message Format

```txt
type(scope): concise imperative description

Optional body explaining WHY, not what.
```

### Allowed types in this repository

`feat`, `fix`, `refactor`, `chore`, `docs`, `test`

### Suggested scopes in this repository

`web`, `backend`, `repo`, or a focused area (for example `release`, `config`, `pwa`).

## Rules

- Subject line under 72 chars, imperative mood.
- Match repository commitlint rules.
- Do not require `Co-Authored-By` unless explicitly requested.
- Stage files by name; never use `git add .` or `git add -A`.
- Never amend unless explicitly asked.
- Never skip hooks (`--no-verify`).
- Keep commits focused and independently reviewable.

## Repository Adjustment

This is a monorepo; prefer precise scopes that match touched workspaces when useful (for example `app`, `webapp`, `api`, `db`, `clients`) while still following commitlint.
