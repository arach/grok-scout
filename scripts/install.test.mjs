import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildScoutGrokMcpEntry,
  canStartScoutExecutable,
  getGrokMcpConfigPath,
  installGrokScout,
  resolveScoutLaunch,
  upsertScoutMcpServer,
} from "./install.mjs";

describe("buildScoutGrokMcpEntry", () => {
  it("builds a Cursor stdio MCP server entry", () => {
    assert.deepEqual(
      buildScoutGrokMcpEntry({
        command: "/tmp/scout",
        args: ["mcp", "--context-root", "${workspaceFolder}"],
      }),
      {
        type: "stdio",
        command: "/tmp/scout",
        args: ["mcp", "--context-root", "${workspaceFolder}"],
      },
    );
  });
});

describe("resolveScoutLaunch", () => {
  it("skips scout executables that fail to start", () => {
    const badBinDir = mkdtempSync(join(tmpdir(), "cursor-scout-bad-bin-"));
    const goodBinDir = mkdtempSync(join(tmpdir(), "cursor-scout-good-bin-"));
    const badScout = join(badBinDir, "scout");
    const goodScout = join(goodBinDir, "scout");

    writeFileSync(
      badScout,
      "#!/bin/sh\nprintf 'node cannot load bun: modules\\n' >&2\nexit 1\n",
    );
    writeFileSync(
      goodScout,
      "#!/bin/sh\nif [ \"$1\" = \"--help\" ]; then exit 0; fi\nexit 0\n",
    );
    chmodSync(badScout, 0o755);
    chmodSync(goodScout, 0o755);

    const launch = resolveScoutLaunch({
      PATH: `${badBinDir}:${goodBinDir}`,
    });

    assert.equal(canStartScoutExecutable(badScout, { PATH: badBinDir }), false);
    assert.deepEqual(launch, {
      command: goodScout,
      args: ["mcp", "--context-root", "${workspaceFolder}"],
    });
  });
});

describe("upsertScoutMcpServer", () => {
  it("adds scout while preserving other MCP servers", () => {
    const result = upsertScoutMcpServer(
      {
        mcpServers: {
          docs: {
            type: "stdio",
            command: "docs",
            args: [],
          },
        },
      },
      {
        type: "stdio",
        command: "scout",
        args: ["mcp"],
      },
    );

    assert.equal(result.changed, true);
    assert.deepEqual(result.config.mcpServers.docs, {
      type: "stdio",
      command: "docs",
      args: [],
    });
    assert.deepEqual(result.config.mcpServers.scout, {
      type: "stdio",
      command: "scout",
      args: ["mcp"],
    });
  });

  it("blocks replacing a different scout entry without force", () => {
    const result = upsertScoutMcpServer(
      {
        mcpServers: {
          scout: {
            type: "stdio",
            command: "/old/scout",
            args: ["mcp"],
          },
        },
      },
      {
        type: "stdio",
        command: "/new/scout",
        args: ["mcp"],
      },
    );

    assert.equal(result.changed, false);
    assert.equal(result.blocked, true);
  });

  it("treats portable and resolved scout commands as equivalent", () => {
    const result = upsertScoutMcpServer(
      {
        mcpServers: {
          scout: {
            type: "stdio",
            command: "scout",
            args: ["mcp", "--context-root", "${workspaceFolder}"],
          },
        },
      },
      {
        type: "stdio",
        command: "/Users/arach/.bun/bin/scout",
        args: ["mcp", "--context-root", "${workspaceFolder}"],
      },
    );

    assert.equal(result.changed, false);
    assert.equal(result.blocked, undefined);
  });
});

describe("installGrokScout", () => {
  it("writes project config", () => {
    const projectPath = mkdtempSync(join(tmpdir(), "cursor-scout-project-"));
    const result = installGrokScout({
      scope: "project",
      projectPath,
      launch: {
        command: "scout",
        args: ["mcp", "--context-root", "${workspaceFolder}"],
      },
    });

    const configPath = getGrokMcpConfigPath({ projectPath });
    const written = JSON.parse(readFileSync(configPath, "utf8"));

    assert.equal(result.status, "changed");
    assert.deepEqual(written.mcpServers.scout, {
      type: "stdio",
      command: "scout",
      args: ["mcp", "--context-root", "${workspaceFolder}"],
    });
  });

  it("preserves existing JSON when forced", () => {
    const projectPath = mkdtempSync(join(tmpdir(), "cursor-scout-project-"));
    const configPath = getGrokMcpConfigPath({ projectPath });
    mkdirSync(join(projectPath, ".cursor"), { recursive: true });
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          scout: {
            type: "stdio",
            command: "old",
            args: ["mcp"],
          },
          other: {
            type: "stdio",
            command: "other",
            args: [],
          },
        },
      }),
    );

    const result = installGrokScout({
      scope: "project",
      projectPath,
      force: true,
      launch: {
        command: "scout",
        args: ["mcp", "--context-root", "${workspaceFolder}"],
      },
    });
    const written = JSON.parse(readFileSync(configPath, "utf8"));

    assert.equal(result.status, "changed");
    assert.equal(written.mcpServers.other.command, "other");
    assert.equal(written.mcpServers.scout.command, "scout");
  });
});
