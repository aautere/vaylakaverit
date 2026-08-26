# Agent guide for this repository

## Language and communication

Answer the user in the language they use. Keep source code, technical identifiers, and repository
documentation in English.

Describe product work in plain language. Do not assume a framework, data store, hosting platform, or
authentication provider until the specification establishes a need for it.

## Product-first workflow

This repository is specification-driven. The application must not be implemented while its product
requirements are still undecided.

For every new capability or materially changed behaviour:

1. Create a change with `pnpm spec:new <change-name>`.
2. Write and review `proposal.md`, including scope and non-goals.
3. Do not change the proposal to `status: approved` until the user explicitly approves it in chat.
4. Write requirement deltas, `design.md`, and `tasks.md`.
5. Do not implement code until the user explicitly approves the task list.
6. Validate the artifacts with `pnpm spec:validate` before implementation and before closing work.

Small editorial fixes that do not alter user-visible behaviour may skip OpenSpec.

## Execution boundaries

- If the user names a task or task IDs, implement only that scope.
- If the user requests implementation after the proposal and task list have both been explicitly
  approved, start the first ready unchecked task when they do not name one.
- Do not start more than one OpenSpec task at a time unless the user explicitly authorizes parallel
  work.
- When delegating a task, do not overlap with the delegated scope. Do not begin another task while
  waiting unless the user explicitly approves parallel work.
- Perform only the validation required to complete the active task.
- After the active task has passed its required validation and has been committed and pushed, continue
  to the next ready unchecked task in the approved task list without waiting for the user to say
  “continue.” Stop when no task is ready, validation blocks completion, or the approved scope needs
  to change.

## Completion protocol

A task is not complete until its scoped changes have been committed and pushed.

1. Run only the active task's required validation.
2. Stage only files within the active task's approved scope.
3. Create a focused commit.
4. Push the commit to the tracked remote branch.
5. Verify the pushed commit with `git log -1` and `git status --short`.
6. Report the commit SHA and remote branch.

If commit or push fails:

- Mark the task as blocked, not complete.
- Report the exact blocking command and files.
- Do not bypass hooks, stage unrelated files, amend another task's commit, or claim the work is ready.

## Specification rules

- Use concise, kebab-case change names, such as `record-round-scores`.
- Every proposal states the problem, intended change, impact, and non-goals.
- Requirements use observable `SHALL` or `MUST` statements and include Given/When/Then scenarios.
- Record decisions and tradeoffs in `design.md`; do not hide product choices in implementation.
- Break `tasks.md` into small verifiable steps, ending with relevant testing and documentation.
- Treat each approved spec as the source of truth; update it when agreed behaviour changes.

## Engineering rules after implementation starts

- Preserve user data and make destructive actions explicit and reversible where practical.
- Validate external input at the boundary and surface meaningful errors.
- Add targeted tests for business rules, calculations, and non-trivial transformations.
- Keep secrets in local environment files only; never commit them.
- Run the smallest relevant checks before saying work is ready.
- After each validated, logical implementation slice, create and push a focused commit before
  starting the next slice. Do not let separate completed features accumulate in one uncommitted
  change set.

## Task completion

Complete only one explicitly approved OpenSpec task at a time. After its required validation passes,
identify every repository-relative path owned by that task and use the local completion helper:

```sh
~/.copilot/skills/vaylakaverit-completion/scripts/complete-task.sh \
  --message "type: concise completed task" \
  --scope path/owned/by-task
```

Provide one `--scope` per owned file or directory. The helper refuses out-of-scope changes, stages
only the supplied scope, commits with the Copilot co-author trailer, pushes to the tracked upstream,
and prints the resulting commit and status. If validation, commit, push, or verification fails, report
the task as blocked; never bypass hooks, amend, or commit unrelated work.

## Repository conventions

- Use pnpm, not npm or yarn.
- Follow `.editorconfig` and Prettier.
- Do not bypass the local hooks or modify generated lockfiles manually.
- Keep code and documentation focused on the approved change.
