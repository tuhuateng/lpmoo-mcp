// SPDX-License-Identifier: MIT
import { SERVER_INSTRUCTIONS, SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { callMcpTool, listMcpTools } from "./tools.js";

export type McpContext = {
  env: Record<string, string | undefined>;
};

type JsonRpcId = number | string | null;

type RpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string };
};

const PROTOCOL_FALLBACK = "2025-03-26";

function encode(value: RpcResponse) {
  return JSON.stringify(value);
}

function requestId(message: object): JsonRpcId | undefined {
  if (!Object.prototype.hasOwnProperty.call(message, "id")) return undefined;
  const id = (message as { id?: unknown }).id;
  if (typeof id === "string" || typeof id === "number" || id === null) return id;
  return null;
}

function failure(id: JsonRpcId, code: number, message: string): RpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function ok(id: JsonRpcId, result: unknown): RpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function protocolVersionOf(params: unknown) {
  const requested =
    params && typeof params === "object" && "protocolVersion" in params
      ? (params as { protocolVersion?: unknown }).protocolVersion
      : undefined;
  if (typeof requested === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requested)) return requested;
  return PROTOCOL_FALLBACK;
}

export function handleMcpMessage(message: unknown, ctx: McpContext): RpcResponse | null {
  if (Array.isArray(message) || !message || typeof message !== "object") {
    return failure(null, -32600, "Invalid Request");
  }
  const id = requestId(message);
  const record = message as { jsonrpc?: unknown; method?: unknown; params?: unknown };
  if (record.jsonrpc !== "2.0" || typeof record.method !== "string" || !record.method) {
    if (id === undefined) return null;
    return failure(id, -32600, "Invalid Request");
  }
  if (record.method.startsWith("notifications/")) return null;
  if (id === undefined) return null;

  switch (record.method) {
    case "initialize":
      return ok(id, {
        protocolVersion: protocolVersionOf(record.params),
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions: SERVER_INSTRUCTIONS,
      });
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: listMcpTools() });
    case "tools/call": {
      const params = record.params;
      const name = params && typeof params === "object" && "name" in params ? (params as { name?: unknown }).name : undefined;
      const args =
        params && typeof params === "object" && "arguments" in params
          ? (params as { arguments?: unknown }).arguments
          : {};
      return ok(id, callMcpTool(name, args, ctx.env));
    }
    default:
      return failure(id, -32601, "Method not found");
  }
}

/** One stdin line in, one stdout line out. Null means the server stays silent. */
export function handleMcpLine(line: string, ctx: McpContext): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const response = handleMcpMessage(JSON.parse(trimmed), ctx);
    return response ? encode(response) : null;
  } catch {
    return encode(failure(null, -32700, "Parse error"));
  }
}
