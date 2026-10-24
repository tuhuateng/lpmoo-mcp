// SPDX-License-Identifier: MIT
import {
  generateLpSectionsInputSchema,
  getRecipeInputSchema,
  getRecipeOutputSchema,
  listTemplatesOutputSchema,
  mcpGenerateLpSectionsResultSchema,
  MCP_SECTION_TOOLS,
  type McpSectionToolName,
} from "./schema.js";
import { dispatchMcpStub, McpStubError } from "./stub.js";
import { z, ZodError } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { assertSectionJsonOnly, containsFullPageHtml, FullPageHtmlError } from "./html-guard.js";

const IMPLEMENTED = ["list_templates", "get_recipe", "generate_lp_sections"] as const satisfies readonly McpSectionToolName[];

const frozenNames = MCP_SECTION_TOOLS.map((tool) => tool.name);
if (
  frozenNames.length !== IMPLEMENTED.length ||
  frozenNames.some((name, index) => name !== IMPLEMENTED[index])
) {
  throw new Error("mcp_tool_surface_drift");
}

const inputSchemas = {
  list_templates: z.object({}),
  get_recipe: getRecipeInputSchema,
  generate_lp_sections: generateLpSectionsInputSchema,
} as const;

export type McpMode = "local" | "remote";

export function readMcpMode(env: Record<string, string | undefined>): McpMode | { error: string } {
  const raw = env.LPMOO_MCP_MODE?.trim().toLowerCase() ?? "";
  if (raw === "" || raw === "local" || raw === "stub") return "local";
  if (raw === "remote") return "remote";
  return { error: `unsupported_mcp_mode:${raw}` };
}

function toInputSchema(schema: z.ZodType) {
  const json = zodToJsonSchema(schema, { target: "jsonSchema7", $refStrategy: "none" });
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { type: "object" as const, additionalProperties: true };
  }
  const { $schema: _schema, ...rest } = json as { $schema?: string };
  return rest;
}

export function listMcpTools() {
  return MCP_SECTION_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: toInputSchema(inputSchemas[tool.name]),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  }));
}

export type ToolCallResult = {
  content: [{ type: "text"; text: string }];
  isError: boolean;
};

function toolError(message: string): ToolCallResult {
  const text = containsFullPageHtml(message) ? "full_page_html_rejected" : message;
  return { content: [{ type: "text", text }], isError: true };
}

function publicToolError(error: unknown) {
  if (error instanceof FullPageHtmlError) return "full_page_html_rejected";
  if (error instanceof McpStubError) return error.message;
  if (error instanceof ZodError) {
    const detail = error.issues
      .map((issue) => {
        const path = issue.path.join(".");
        return path ? `${path}: ${issue.message}` : issue.message;
      })
      .join("; ");
    return detail ? `invalid_arguments: ${detail}` : "invalid_arguments";
  }
  return "tool_failed";
}

function dispatchFrozenTool(name: string, args: unknown) {
  switch (name as McpSectionToolName) {
    case "list_templates": {
      inputSchemas.list_templates.parse(args ?? {});
      return listTemplatesOutputSchema.parse(dispatchMcpStub("list_templates"));
    }
    case "get_recipe": {
      const input = inputSchemas.get_recipe.parse(args ?? {});
      return getRecipeOutputSchema.parse(dispatchMcpStub("get_recipe", input));
    }
    case "generate_lp_sections": {
      const input = inputSchemas.generate_lp_sections.parse(args ?? {});
      return mcpGenerateLpSectionsResultSchema.parse(dispatchMcpStub("generate_lp_sections", input));
    }
    default:
      throw new McpStubError(`unknown_mcp_tool:${name}`);
  }
}

const REMOTE_UNAVAILABLE =
  "mcp_byo_bridge_pending: the SaaS BYO bridge is not wired. Unset LPMOO_MCP_MODE to use the offline local stub. This server does not read or send API tokens.";

/** Run one frozen tool. Local mode never touches the network. Remote mode refuses. */
export function callMcpTool(name: unknown, args: unknown, env: Record<string, string | undefined>): ToolCallResult {
  if (typeof name !== "string" || !name) return toolError("invalid_arguments: name is required");
  const mode = readMcpMode(env);
  if (typeof mode !== "string") return toolError(mode.error);
  if (mode === "remote") return toolError(REMOTE_UNAVAILABLE);
  try {
    const value = dispatchFrozenTool(name, args ?? {});
    assertSectionJsonOnly(value);
    return {
      content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
      isError: false,
    };
  } catch (error) {
    return toolError(publicToolError(error));
  }
}
