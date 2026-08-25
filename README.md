# Väyläkaverit

Väyläkaverit is an iPhone-first shared golf-game application. The product is intentionally not
implemented until its requirements, design, and delivery tasks have been agreed through OpenSpec.

## Working agreement

1. Start a capability with `pnpm spec:new <change-name>`.
2. Complete the proposal and review it together.
3. Mark the proposal approved only after an explicit user approval in chat.
4. Add the design, requirement deltas, and tasks.
5. Build only after the task list has been approved.

## Setup

```bash
corepack enable
pnpm install
pnpm check
```

## Useful commands

| Command                       | Purpose                                        |
| ----------------------------- | ---------------------------------------------- |
| `pnpm spec:new <change-name>` | Create an OpenSpec change with a proposal      |
| `pnpm spec:validate`          | Validate committed specs and in-flight changes |
| `pnpm harness:test`           | Test the OpenSpec change wrapper               |
| `pnpm format`                 | Format tracked project files                   |
| `pnpm check`                  | Run all currently applicable quality gates     |

See `AGENTS.md` for the working rules and `openspec/config.yaml` for the specification workflow.

## License

MIT. See `LICENSE`.
