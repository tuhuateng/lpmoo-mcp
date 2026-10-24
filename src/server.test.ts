import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  MCP_SECTION_TOOLS,
  mcpGenerateLpSectionsResultSchema,
} from "./schema.js";
import { getSectionRecipe, listSectionTemplates, stubGenerateLpSections } from "./stub.js";
import { SERVER_INSTRUCTIONS, SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { handleMcpLine } from "./protocol.js";

const snippets = JSON.parse(readFileSync(new URL("../install-snippets.json", import.meta.url), "utf8")) as {
  installCommand: string;
  mcpJson: string;
  codexToml: string;
  launchPath: string;
};

const secretEnv = {
  AGENT_ROUTE: "deepseek",
  AGENT_API_KEY: "sk-test-should-not-leak",
  AGENT_MCP_URL: "http://127.0.0.1:9/mcp",
  LPMOO_API_TOKEN: "super-secret-token",
};

function rpc(line: string, env: Record<string, string | undefined> = {}) {
  const encoded = handleMcpLine(line, { env });
  assert.equal(typeof encoded, "string");
  return JSON.parse(encoded as string) as {
    id?: number | string | null;
    result?: {
      protocolVersion?: string;
      instructions?: string;
      serverInfo?: { name?: string; version?: string };
      tools?: Array<{ name: string; description: string; inputSchema: { type?: string; properties?: Record<string, unknown>; $schema?: string }; annotations?: { readOnlyHint?: boolean; openWorldHint?: boolean } }>;
      content?: Array<{ type: string; text: string }>;
      isError?: boolean;
    };
    error?: { code: number; message: string };
  };
}

function call(name: string, args?: unknown, env?: Record<string, string | undefined>) {
  return rpc(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name, arguments: args ?? {} },
    }),
    env,
  );
}

function toolText(response: ReturnType<typeof call>) {
  const text = response.result?.content?.[0]?.text;
  assert.equal(typeof text, "string");
  return text as string;
}

describe("lpmoo stdio MCP", () => {
  it("advertises only the frozen section tools", () => {
    const init = rpc(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } },
      }),
    );
    assert.equal(init.result?.protocolVersion, "2025-06-18");
    assert.equal(init.result?.serverInfo?.name, SERVER_NAME);
    assert.equal(init.result?.serverInfo?.version, SERVER_VERSION);
    assert.equal(init.result?.instructions, SERVER_INSTRUCTIONS);
    assert.equal(handleMcpLine(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }), { env: {} }), null);

    const listed = rpc(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }));
    const tools = listed.result?.tools ?? [];
    assert.deepEqual(
      tools.map((tool) => tool.name),
      MCP_SECTION_TOOLS.map((tool) => tool.name),
    );
    for (const frozen of MCP_SECTION_TOOLS) {
      const tool = tools.find((item) => item.name === frozen.name);
      assert.ok(tool);
      assert.equal(tool.description, frozen.description);
      assert.equal(tool.inputSchema.type, "object");
      assert.equal(tool.inputSchema.$schema, undefined);
      assert.equal(tool.annotations?.readOnlyHint, true);
      assert.equal(tool.annotations?.openWorldHint, false);
    }
    const generate = tools.find((tool) => tool.name === "generate_lp_sections");
    assert.ok(generate?.inputSchema.properties?.brief);

    const missing = rpc(JSON.stringify({ jsonrpc: "2.0", id: 9, method: "resources/list" }));
    assert.equal(missing.error?.code, -32601);
    const ping = rpc(JSON.stringify({ jsonrpc: "2.0", id: 4, method: "ping" }));
    assert.deepEqual(ping.result, {});
  });

  it("returns schema-valid section JSON from the frozen stub and ignores model credentials", () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => {
      throw new Error("network_disabled");
    };
    try {
      const templates = call("list_templates", {}, secretEnv);
      assert.equal(templates.result?.isError, false);
      assert.deepEqual(JSON.parse(toolText(templates)), listSectionTemplates());

      const recipe = call("get_recipe", { recipeId: "beauty_salon" }, secretEnv);
      assert.equal(recipe.result?.isError, false);
      const recipeJson = JSON.parse(toolText(recipe));
      assert.deepEqual(recipeJson, getSectionRecipe("beauty_salon"));
      assert.equal("spec" in (recipeJson.sections[0] ?? {}), false);

      const brief = {
        industry: "beauty",
        direction: "beauty_salon",
        strategyText: "美容サロンの体験予約LP",
      };
      const generated = call(
        "generate_lp_sections",
        { brief, trendSummary: { summary: "初回体験の検索が増えている", asOf: "2026-10-24" } },
        secretEnv,
      );
      assert.equal(generated.result?.isError, false);
      const text = toolText(generated);
      assert.equal(text.includes("sk-test-should-not-leak"), false);
      assert.equal(text.includes("super-secret-token"), false);
      assert.equal(text.includes("<html"), false);
      assert.equal(text.includes("<!DOCTYPE"), false);
      const parsed = mcpGenerateLpSectionsResultSchema.parse(JSON.parse(text));
      assert.deepEqual(parsed, stubGenerateLpSections({ brief, trendSummary: { summary: "初回体験の検索が増えている", asOf: "2026-10-24" } }));
      assert.equal(parsed.recipeId, "beauty_salon");
      assert.equal(parsed.sections[0]?.spec.copy.headline, "初回体験で、肌の調子を整える。");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects unknown tools, invalid arguments, full-page HTML, and the unwired remote mode", () => {
    const unknown = call("emit_html_page");
    assert.equal(unknown.result?.isError, true);
    assert.equal(toolText(unknown), "unknown_mcp_tool:emit_html_page");

    const invalid = call("generate_lp_sections", {});
    assert.equal(invalid.result?.isError, true);
    assert.match(toolText(invalid), /^invalid_arguments:/);

    const html = call("generate_lp_sections", {
      brief: { direction: "saas" },
      trendSummary: { summary: "<html><body>secret-page</body></html>" },
    });
    assert.equal(html.result?.isError, true);
    const htmlText = toolText(html);
    assert.equal(htmlText, "full_page_html_rejected");
    assert.equal(htmlText.includes("secret-page"), false);

    const remote = call("list_templates", {}, { LPMOO_MCP_MODE: "remote", LPMOO_API_TOKEN: "super-secret-token" });
    assert.equal(remote.result?.isError, true);
    const remoteText = toolText(remote);
    assert.match(remoteText, /mcp_byo_bridge_pending/);
    assert.equal(remoteText.includes("super-secret-token"), false);

    const badMode = call("list_templates", {}, { LPMOO_MCP_MODE: "deepseek" });
    assert.equal(badMode.result?.isError, true);
    assert.match(toolText(badMode), /unsupported_mcp_mode:deepseek/);
  });

  it("keeps the server source free of model clients and install hooks", () => {
    const sources = ["constants.ts", "html-guard.ts", "tools.ts", "protocol.ts", "stdio.ts", "index.ts", "schema.ts", "stub.ts"];
    for (const name of sources) {
      const source = readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
      assert.equal(source.includes("AGENT_API_KEY"), false, name);
      assert.equal(source.includes("AGENT_ROUTE"), false, name);
      assert.equal(source.includes("AGENT_MCP_URL"), false, name);
      assert.equal(source.includes("fetch("), false, name);
      assert.equal(source.includes("deepseek"), false, name);
      assert.equal(source.includes("nanoapi"), false, name);
      if (name === "stdio.ts") {
        assert.match(source, /process\.env/);
      } else {
        assert.equal(source.includes("process.env"), false, name);
      }
    }
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      license?: string;
      private?: boolean;
      scripts?: Record<string, string>;
    };
    assert.equal(pkg.license, "MIT");
    assert.equal(pkg.private, false);
    for (const hook of ["preinstall", "install", "postinstall", "prepare"]) {
      assert.equal(pkg.scripts?.[hook], undefined);
    }
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    assert.ok(readme.includes(snippets.installCommand));
    assert.ok(readme.includes(snippets.mcpJson));
    assert.ok(readme.includes(snippets.codexToml.trim()));
    assert.match(readme, /npx @lpmoo\/mcp/);
    assert.match(readme, /mcp_byo/);
    assert.match(readme, /github\.com\/tuhuateng\/lpmoo-mcp/);
    assert.equal(readme.includes("github.com/tuhuateng/lpmoo.git"), false);
    for (const name of sources) {
      const source = readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
      assert.equal(source.includes("@lpmoo/"), false, name);
      assert.equal(source.toLowerCase().includes("gola"), false, name);
    }
  });

  it("speaks newline JSON-RPC on stdio without printing secrets", async () => {
    const bin = fileURLToPath(new URL("../bin/lpmoo-mcp.mjs", import.meta.url));
    const child = spawn(process.execPath, [bin], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...secretEnv, LPMOO_MCP_MODE: "local" },
    });
    let stderr = "";
    let buffer = "";
    const waiters: Array<(value: unknown) => void> = [];
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      let index = buffer.indexOf("\n");
      while (index >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        index = buffer.indexOf("\n");
        if (!line) continue;
        const waiter = waiters.shift();
        assert.ok(waiter, `unexpected stdout: ${line}\nstderr: ${stderr}`);
        waiter(JSON.parse(line));
      }
    });
    const request = (message: unknown) =>
      new Promise((resolve, reject) => {
        if (child.exitCode !== null || child.signalCode !== null) {
          reject(new Error(`mcp process already exited code=${child.exitCode} signal=${child.signalCode}\nstderr: ${stderr}`));
          return;
        }
        const timer = setTimeout(() => reject(new Error(`timeout\nstderr: ${stderr}`)), 15000);
        const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
          clearTimeout(timer);
          reject(new Error(`mcp process exited early code=${code} signal=${signal}\nstderr: ${stderr}`));
        };
        child.once("exit", onExit);
        waiters.push((value) => {
          clearTimeout(timer);
          child.removeListener("exit", onExit);
          resolve(value);
        });
        child.stdin.write(`${JSON.stringify(message)}\n`);
      });

    try {
      const init = (await request({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "stdio", version: "0" } },
      })) as { result?: { serverInfo?: { name?: string } } };
      assert.equal(init.result?.serverInfo?.name, "lpmoo");
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
      const listed = (await request({ jsonrpc: "2.0", id: 2, method: "tools/list" })) as {
        result?: { tools?: Array<{ name: string }> };
      };
      assert.deepEqual(
        listed.result?.tools?.map((tool) => tool.name),
        ["list_templates", "get_recipe", "generate_lp_sections"],
      );
      const generated = (await request({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "generate_lp_sections",
          arguments: { brief: { direction: "beauty_salon" } },
        },
      })) as { result?: { isError?: boolean; content?: Array<{ text: string }> } };
      assert.equal(generated.result?.isError, false);
      const text = generated.result?.content?.[0]?.text ?? "";
      const parsed = mcpGenerateLpSectionsResultSchema.parse(JSON.parse(text));
      assert.equal(parsed.recipeId, "beauty_salon");
      assert.equal(text.includes("sk-test-should-not-leak"), false);
      assert.equal(text.includes("super-secret-token"), false);
      assert.equal(stderr.includes("sk-test-should-not-leak"), false);
      assert.equal(stderr.includes("super-secret-token"), false);
      assert.equal(snippets.launchPath, "bin/lpmoo-mcp.mjs");
    } finally {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
  });
});
