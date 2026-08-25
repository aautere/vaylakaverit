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

## Repository conventions

- Use pnpm, not npm or yarn.
- Follow `.editorconfig` and Prettier.
- Do not bypass the local hooks or modify generated lockfiles manually.
- Keep code and documentation focused on the approved change.
