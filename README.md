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
nvm install 22
nvm use 22
node --version # must print v22.x
pnpm install --frozen-lockfile
pnpm preview
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

## Local preview

The local preview starts the PWA and in-memory API without Azure credentials. Use Node.js 22:

```bash
nvm use 22
pnpm preview
```

`pnpm preview` invokes `scripts/with-node22.sh`, which selects an already-installed Node 22 runtime
(including the standard `nvm` location) even if the invoking shell is on a newer Node version. It
never installs Node. If it cannot find Node 22, run `nvm install 22 && nvm use 22` first.

The web application is served at <http://127.0.0.1:5173> and the API at
<http://127.0.0.1:7071>. The API defaults to `ROUND_STORE=preview`, so no Azure configuration is
required locally. To use Cosmos DB in a deployed environment, set `ROUND_STORE=cosmos`,
`COSMOS_ENDPOINT`, `COSMOS_DATABASE_ID`, and `COSMOS_CONTAINER_ID`. The API authenticates to
Cosmos with `DefaultAzureCredential`; configure the Function App's managed identity with Cosmos
data-plane access rather than a connection key.

The API always uses guest sessions. A player provides a display name, and the browser stores an
opaque credential for that browser profile; no password, email address, App Store account, Apple
identity, or provider credential is required. The service expires an unused guest credential after
180 days. **Clear data on this device** revokes its credential and clears pending local scores
without changing shared rounds. **Delete guest data** also anonymizes the guest in shared rounds and
cannot be undone.

Preview also defaults to `ROUND_UPDATE_TRANSPORT=preview`. Joined browser sessions receive round
updates by polling the authoritative snapshot once per second, without Azure credentials. Production
uses `ROUND_UPDATE_TRANSPORT=web-pubsub`, `WEB_PUBSUB_ENDPOINT`, and `WEB_PUBSUB_HUB`; the Function
App obtains Azure Web PubSub tokens and publishes only to `round:<round-id>` groups after verifying
the caller is a participant. Assign the Function App managed identity the Azure Web PubSub service
role required to generate client tokens and send group messages. Invitation links and QR codes are
join routes only: they do not disclose a round snapshot or provide a live connection until the
guest has joined the round.

### Browser E2E

Run the local two-browser preview flow with:

```bash
nvm use 22
pnpm e2e
```

The test starts `pnpm preview` with Node 22 and uses two iPhone 13-sized Chromium contexts. It
creates a round, follows the copied local join link, starts a side game, verifies a tied hole,
corrects a score, and reviews completed history. The PWA manifest configures standalone display;
installation itself still requires manual verification on physical iPhone Safari. Created rounds
also display the opaque invitation URL as a QR code. The join screen can scan it with a supported
mobile camera or accept a pasted link; the latter keeps local browser E2E independent of camera
permissions. It uses preview storage, guest identities, and polling only; Azure credentials are
not required. On a new machine, install the local Chromium binary once with
`pnpm exec playwright install chromium`.

## Azure and production caveats

Local preview does not validate an Azure deployment. Before production release, manually verify
guest-session expiry and clear/delete recovery, Azure managed-identity permissions for Cosmos DB and
Web PubSub, deployed PWA installation and updates on physical iPhone Safari, Azure monitoring and
alerts, and GitHub branch protections/required checks. Never place credentials or production data in
this repository.

## License

MIT. See `LICENSE`.
