#!/usr/bin/env node
// SPDX-License-Identifier: MIT
/**
 * Stdio entry for the lpmoo MCP server.
 * stdout is reserved for JSON-RPC. This file does not write to stdout.
 * tsx is resolved from this file so the host cwd does not matter.
 */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(here, "../src/stdio.ts");
const require = createRequire(import.meta.url);

let tsxCli;
try {
  tsxCli = require.resolve("tsx/cli");
} catch (error) {
  const message = error instanceof Error ? error.message : "tsx_missing";
  process.stderr.write(`lpmoo-mcp: tsx is not installed (${message}). Run npm install in this repository.\n`);
  process.exit(1);
}

const child = spawn(process.execPath, [tsxCli, entry], {
  stdio: "inherit",
  env: process.env,
  windowsHide: true,
});

function stop(signal) {
  if (!child.killed) child.kill(signal);
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

child.on("error", (error) => {
  process.stderr.write(`lpmoo-mcp: ${error.message}\n`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
