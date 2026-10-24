// SPDX-License-Identifier: MIT
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};

export const SERVER_NAME = "lpmoo";
export const SERVER_VERSION = pkg.version;

/** Shown to the host on initialize. English, matching the frozen tool descriptions. */
export const SERVER_INSTRUCTIONS =
  "lpmoo section tools return Section JSON only. list_templates, get_recipe, and generate_lp_sections never return a full HTML page, never read API keys, and never call the network in the default local mode. The SaaS mcp_byo bridge is not attached. LPMOO_API_TOKEN is reserved and is not read.";
