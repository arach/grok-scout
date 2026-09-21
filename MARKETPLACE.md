# Marketplace submission

Status: **Submitted — awaiting Cursor review.**

Submitted September 21, 2026 through https://cursor.com/marketplace/publish.

- Publisher display name: OpenScout
- Requested publisher handle: `openscout`
- Plugin identifier: `grok-scout`
- Repository: https://github.com/arach/grok-scout
- Website: https://arach.github.io/grok-scout/
- Logo: https://raw.githubusercontent.com/arach/grok-scout/main/assets/logo.svg
- Hosted MCP endpoint: https://mcp.oscout.net
- Authentication: OAuth with GitHub sign-in and Scout consent

The application page confirmed: “Thanks for applying” and “We've received your submission.” It did not display an application ID or a public listing URL. Submission does not mean marketplace approval.

## Submitted description

Scout for Grok Bot connects Grok Bot to local coding agents through hosted MCP. Delegate coding and review work, exchange messages, and follow results. Uses OAuth with GitHub sign-in and explicit consent. Requires OpenScout and a provisioned online MCP bridge; setup is currently operator-assisted for local developer pilots. Packages an existing connector in active use for marketplace distribution.

## Verification

The hosted package configuration and referenced assets pass `bun run check`; all seven retained local installer tests pass. Public manifest, MCP config, logo, and connection guide are reachable. The live gateway publishes OAuth authorization-server metadata. The connector is already in use through custom MCP setup, as reported by the operator; installation through the unapproved marketplace listing has not been tested.

## Canonical page move

The connection guide now lives at https://openscout.app/grok/. The original GitHub Pages website URL submitted above redirects to that page. The publisher application remains the same; no duplicate submission was made.

## Next step

Wait for Cursor's review response. Address any reviewer feedback, then record the approved listing URL here. Do not submit a duplicate application or claim the plugin is listed before approval.
