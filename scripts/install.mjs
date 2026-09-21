#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HELP_FLAGS = new Set(["--help", "-h"]);
const DEFAULT_CONTEXT_ROOT = "${workspaceFolder}";

export function isExecutable(filePath) {
  if (!filePath) {
    return false;
  }

  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function resolveExecutableFromSearchPath(names, env = process.env) {
  return resolveExecutablesFromSearchPath(names, env)[0] ?? null;
}

export function resolveExecutablesFromSearchPath(names, env = process.env) {
  const pathEntries = (env.PATH ?? "").split(delimiter).filter(Boolean);
  const commonDirectories = [
    join(homedir(), ".local", "bin"),
    join(homedir(), ".bun", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
  ];
  const seen = new Set();
  const matches = [];

  for (const directory of [...pathEntries, ...commonDirectories]) {
    for (const name of names) {
      const candidate = join(directory, name);
      if (!seen.has(candidate) && isExecutable(candidate)) {
        seen.add(candidate);
        matches.push(candidate);
      }
    }
  }

  return matches;
}

export function canStartScoutExecutable(filePath, env = process.env) {
  const result = spawnSync(filePath, ["--help"], {
    env,
    encoding: "utf8",
    stdio: "pipe",
    timeout: 5000,
  });

  return !result.error && result.status === 0;
}

export function resolveScoutLaunch(env = process.env) {
  const explicitCandidates = [
    env.OPENSCOUT_CLI_BIN,
    env.SCOUT_CLI_BIN,
    env.OPENSCOUT_SCOUT_BIN,
    env.SCOUT_BIN,
  ];

  for (const candidate of explicitCandidates) {
    if (isExecutable(candidate)) {
      if (!canStartScoutExecutable(candidate, env)) {
        throw new Error(
          `Configured Scout CLI ${candidate} failed to start. ` +
            "Set OPENSCOUT_CLI_BIN to a Bun-backed @openscout/scout install.",
        );
      }
      return {
        command: candidate,
        args: ["mcp", "--context-root", DEFAULT_CONTEXT_ROOT],
      };
    }
  }

  for (const scout of resolveExecutablesFromSearchPath(["scout"], env)) {
    if (canStartScoutExecutable(scout, env)) {
      return {
        command: scout,
        args: ["mcp", "--context-root", DEFAULT_CONTEXT_ROOT],
      };
    }
  }

  const bunx = resolveExecutableFromSearchPath(["bunx"], env);
  if (bunx) {
    return {
      command: bunx,
      args: ["@openscout/scout", "mcp", "--context-root", DEFAULT_CONTEXT_ROOT],
    };
  }

  return {
    command: "scout",
    args: ["mcp", "--context-root", DEFAULT_CONTEXT_ROOT],
  };
}

export function buildScoutGrokMcpEntry(launch = resolveScoutLaunch()) {
  return {
    type: "stdio",
    command: launch.command,
    args: launch.args,
  };
}

function commandNamesMatch(existingCommand, nextCommand) {
  if (existingCommand === nextCommand) {
    return true;
  }

  const existingIsPortable = !existingCommand.includes("/");
  const nextIsPortable = !nextCommand.includes("/");

  return (
    (existingIsPortable && existingCommand === basename(nextCommand)) ||
    (nextIsPortable && nextCommand === basename(existingCommand))
  );
}

function scoutEntriesMatch(existing, entry) {
  return (
    existing &&
    typeof existing === "object" &&
    !Array.isArray(existing) &&
    existing.type === entry.type &&
    commandNamesMatch(String(existing.command ?? ""), String(entry.command ?? "")) &&
    JSON.stringify(existing.args ?? []) === JSON.stringify(entry.args ?? [])
  );
}

export function readJsonFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const raw = readFileSync(filePath, "utf8").trim();
  if (!raw) {
    return {};
  }

  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a JSON object.`);
  }

  return parsed;
}

export function upsertScoutMcpServer(config, entry, options = {}) {
  const next = structuredClone(config ?? {});
  if (!next.mcpServers || typeof next.mcpServers !== "object" || Array.isArray(next.mcpServers)) {
    next.mcpServers = {};
  }

  const existing = next.mcpServers.scout;

  if (scoutEntriesMatch(existing, entry)) {
    return {
      changed: false,
      config: next,
      reason: "Already have a matching scout MCP entry.",
    };
  }

  if (existing && !options.force) {
    return {
      changed: false,
      config: next,
      reason: "Already have a non-matching scout MCP entry. Re-run with --force to replace it.",
      blocked: true,
    };
  }

  next.mcpServers.scout = entry;
  return {
    changed: true,
    config: next,
    reason: existing ? "Replaced scout MCP entry." : "Installed scout MCP entry.",
  };
}

export function getGrokMcpConfigPath(options = {}) {
  if (options.projectPath) {
    return join(resolve(options.projectPath), ".cursor", "mcp.json");
  }

  return join(homedir(), ".cursor", "mcp.json");
}

function parseArgs(args) {
  const parsed = {
    dryRun: false,
    force: false,
    scope: "global",
    projectPath: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index] ?? "";
    if (!current || HELP_FLAGS.has(current)) {
      continue;
    }

    if (current === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }

    if (current === "--force") {
      parsed.force = true;
      continue;
    }

    if (current === "--global") {
      parsed.scope = "global";
      parsed.projectPath = null;
      continue;
    }

    if (current === "--project") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("missing value for --project");
      }
      parsed.scope = "project";
      parsed.projectPath = value;
      index += 1;
      continue;
    }

    if (current.startsWith("--project=")) {
      parsed.scope = "project";
      parsed.projectPath = current.slice("--project=".length);
      continue;
    }

    throw new Error(`unexpected argument: ${current}`);
  }

  return parsed;
}

function renderHelp() {
  return [
    "Usage: node scripts/install.mjs [--global | --project <path>] [--force] [--dry-run]",
    "",
    "Install OpenScout's MCP server into mcp.json for Grok Bot / Cursor.",
    "",
    "Examples:",
    "  node scripts/install.mjs --global",
    "  node scripts/install.mjs --project .",
    "  node scripts/install.mjs --global --dry-run",
  ].join("\n");
}

function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function installGrokScout(options = {}) {
  const configPath = getGrokMcpConfigPath({
    projectPath: options.scope === "project" ? options.projectPath : null,
  });
  const config = readJsonFile(configPath);
  const entry = buildScoutGrokMcpEntry(options.launch ?? resolveScoutLaunch(options.env ?? process.env));
  const result = upsertScoutMcpServer(config, entry, { force: options.force });

  if (result.blocked) {
    return {
      status: "blocked",
      configPath,
      detail: result.reason,
      config: result.config,
    };
  }

  if (options.dryRun) {
    return {
      status: result.changed ? "would_change" : "unchanged",
      configPath,
      detail: result.changed ? `Would write ${configPath}.` : result.reason,
      config: result.config,
    };
  }

  if (result.changed) {
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, formatJson(result.config));
  }

  return {
    status: result.changed ? "changed" : "unchanged",
    configPath,
    detail: result.reason,
    config: result.config,
  };
}

function main() {
  if (process.argv.slice(2).some((arg) => HELP_FLAGS.has(arg))) {
    console.log(renderHelp());
    return;
  }

  const options = parseArgs(process.argv.slice(2));
  const result = installGrokScout(options);

  if (result.status === "blocked") {
    console.error(result.detail);
    console.error(`Config: ${result.configPath}`);
    process.exitCode = 1;
    return;
  }

  console.log(result.detail);
  console.log(`Config: ${result.configPath}`);

  if (options.dryRun) {
    console.log(formatJson(result.config));
  }

  const cursorAgent = resolveExecutableFromSearchPath(["cursor-agent"], process.env);
  if (cursorAgent && !options.dryRun) {
    const list = spawnSync(cursorAgent, ["mcp", "list"], {
      encoding: "utf8",
      stdio: "pipe",
    });
    if (list.status === 0) {
      console.log("");
      console.log(list.stdout.trim());
    }
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath || basename(fileURLToPath(import.meta.url)) === basename(process.argv[1] ?? "")) {
  main();
}
