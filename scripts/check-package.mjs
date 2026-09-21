import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const manifest = read(".cursor-plugin/plugin.json");
assert.match(manifest.name, /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
for (const path of [manifest.mcpServers, manifest.logo]) {
  assert.equal(typeof path, "string");
  assert.ok(!path.startsWith("/") && !path.split("/").includes(".."));
  assert.ok(existsSync(resolve(root, path)), `Missing package asset: ${path}`);
}
const config = read(manifest.mcpServers);
assert.deepEqual(config, { mcpServers: { scout: { url: "https://mcp.oscout.net" } } },
  "Marketplace configuration must use hosted OAuth without local commands or embedded credentials");
assert.equal(manifest.license, read("package.json").license);
console.log("Hosted MCP package and assets validated.");
