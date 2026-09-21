# Agent Instructions

Scout for Grok Bot is OpenScout's hosted MCP connector package for the Grok Bot / Cursor marketplace.

Keep this repository focused on host packaging. The marketplace package is `.cursor-plugin/plugin.json` plus root `mcp.json`, using `https://mcp.oscout.net` over HTTP with OAuth. Never embed tokens or bridge credentials.

The existing `.cursor/mcp.json` and `scripts/install.mjs` are optional local Cursor stdio helpers. They do not configure the cloud-hosted Grok Bot connector. Keep that distinction explicit in documentation.

Scout owns the broker tools and records; do not reimplement them here. For fresh asks, use `projectPath` plus optional `harness`. Follow up using the returned ref/flight/conversation/work/session handle. Use `messages_send` only for one-way updates. Do not guess generic agent names.

The hosted connector requires a provisioned online bridge; provisioning is operator-assisted for current high-trust local developer pilots. Do not claim self-service bridge provisioning or enterprise readiness. Grok as an execution harness is separate from this package.

Use `bun run check` to validate the package and local installer. Use only the Action Browser MCP tools for browser verification; close the browser claim when finished.
