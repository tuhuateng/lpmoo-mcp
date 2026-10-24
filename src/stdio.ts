// SPDX-License-Identifier: MIT
import { createInterface } from "node:readline";
import { handleMcpLine } from "./protocol.js";

const input = createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
  terminal: false,
});

input.on("line", (line) => {
  let response: string | null = null;
  try {
    response = handleMcpLine(line, { env: process.env });
  } catch {
    process.stderr.write("lpmoo-mcp: internal error\n");
    response = JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: "Internal error" },
    });
  }
  if (response) process.stdout.write(`${response}\n`);
});

input.on("close", () => {
  process.exit(0);
});
