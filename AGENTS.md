# AGENTS.md

Grok Scout is the Grok Bot / Grok-facing companion integration for OpenScout.

Keep this repository focused on host packaging:

- MCP configuration, installation helpers, docs, and host-specific guidance
  that make Grok Bot (and Cursor-hosted Grok agents) launch `scout mcp`.

Do not reimplement Scout broker tools here unless the host requires a
thin adapter. Prefer the canonical OpenScout MCP surface.

When documenting or testing usage, teach the same low-churn Scout flow:

1. Capability request (`projectPath` + optional `harness`)
2. Broker dispatch (let Scout choose/create the worker)
3. Durable handle (ref / flight / conversation / work / session)
4. Follow-up by that handle (`target:<name>` / `⌖name`)
5. Promote/pin a long-lived sibling only after the worker is known good

Do not train agents to guess generic names such as `claude.main` as a
preflight. Grok as `--harness grok` is orthogonal to this host package.
