# Grok Scout

Grok Scout packages OpenScout for **Grok Bot**, **Grok CLI / ACP**, and Cursor
hosts that run Grok agents — through the same MCP configuration surface Cursor
already uses.

The repository is named `grok-scout`; the MCP server name is `scout`. The host
launches OpenScout's existing stdio MCP server:

```bash
scout mcp
```

This repo does not implement a second Scout MCP server. It provides the Grok-facing
host packaging, config, docs, and install helpers. Grok is also a first-class
OpenScout **harness** (`--harness grok` / `grok-acp`); this package is the
host-side bridge so Grok sessions can talk *to* the broker, not only be
launched *by* it.

## Why this exists

OpenScout already launches Grok as a harness. Claude, Codex, Cursor, pi, and
Hermes each also ship a thin host package. Grok Scout is that missing package:
discoverable install + docs so Grok Bot / Grok agents get Scout MCP the same
way Cursor Scout does.

## Routing model

Prefer OpenScout's canonical MCP `ask` tool. For fresh work, pass `projectPath`
plus optional `harness` and let the broker choose or create the worker. Use
`targetSessionId` only for exact prior-context continuity. Do not guess generic
names such as `claude.main`; continue with the broker-returned
ref/flight/conversation/work/session handle.

Example MCP ask shape:

```json
{
  "projectPath": "/Users/you/dev/openscout",
  "harness": "grok",
  "body": "Review the Grok harness adapter.",
  "replyMode": "notify"
}
```

Website: <https://arach.github.io/grok-scout/>

Repository: <https://github.com/arach/grok-scout>

## Included Surfaces

- `.cursor/mcp.json`: project-level MCP config for local testing (Grok Bot and Cursor share this shape)
- `scripts/install.mjs`: installer for global `~/.cursor/mcp.json` or project `.cursor/mcp.json`
- `docs/index.html`: static project page for GitHub Pages

## Prerequisites

- Grok Bot, Cursor, or another host that reads Cursor-style `mcp.json`
- OpenScout installed and set up locally
- A running Scout broker
- `scout` on `PATH`, or Bun available so the installer can fall back to
  `bunx @openscout/scout`

Recommended local setup:

```bash
bun add -g @openscout/scout
scout setup
scout doctor
```

## Install Globally

From this repository:

```bash
bun run install:global
```

That writes or updates:

```text
~/.cursor/mcp.json
```

with a `scout` MCP server entry. Grok Bot and Cursor both use this config path
today.

To preview the write:

```bash
bun run install:global -- --dry-run
```

To replace an existing non-matching `scout` entry:

```bash
bun run install:global -- --force
```

## Install Into A Project

```bash
bun run install:project
```

Writes `.cursor/mcp.json` in the current project.

## Verify

```bash
scout doctor
# In Grok Bot / Cursor, confirm the scout MCP tools are listed (ask, send, who, …)
```

## Related

- [OpenScout](https://openscout.app) — local broker
- [Cursor Scout](https://github.com/arach/cursor-scout) — same MCP packaging for Cursor-first docs
- [Host integrations](https://openscout.app/docs/integrations) — full map

## Notes

- Events and MCP notifications only arrive while the host keeps the MCP server
  connected.
- Durable Scout flights and messages remain the source of truth across hosts.
- Grok as an *execution* harness (`scout ask --harness grok`) is separate from
  this host package; both are part of the Grok ↔ Scout story.
