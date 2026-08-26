# Implementation Tasks

- [x] 1. Add explicit local-preview, shared-development-guest, and production runtime configuration
      rules, with configuration tests that prevent guest mode in production.
- [x] 2. Configure the published development API to use Cosmos-backed rounds and polling while
      retaining device-local guest identities; retain local in-memory preview behaviour.
- [x] 3. Add durable-store API integration coverage for a creator and a separate guest joining the
      same unstarted invitation across an API-instance boundary.
- [x] 4. Update the invitation loading, unavailable-link, offline, and join-conflict UI feedback to
      match the approved UX and Finnish copy records, with targeted UI tests.
- [x] 5. Document the distinction between local preview and shared public-development testing, then
      run the relevant formatting, type, unit, integration, and OpenSpec validation.
- [ ] 6. Perform the planned two-device published-development UX review and record the evidence and
      outcome before closing the change.
