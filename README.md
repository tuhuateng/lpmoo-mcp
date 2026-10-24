# @lpmoo/mcp

Public, MIT-licensed stdio MCP server for lpmoo's frozen Section JSON tools.

This repository is **only** the MCP interface: `list_templates`, `get_recipe`, and `generate_lp_sections`. The default path is an offline stub. It does not contain the lpmoo SaaS (canvas, accounts, billing), the Gene catalog, the Gola knowledge base, or campaign prompts. Those stay in the private monorepo.

`npx @lpmoo/mcp` is **not published**. Do not install that name. Use this public GitHub repository.

## Trust

| Does | Does not |
|------|----------|
| Advertise the three frozen tools and return Section JSON | Return a full HTML page (`<!DOCTYPE` / `<html` is rejected) |
| Run offline with no API key | Read or send `AGENT_API_KEY`, `LPMOO_API_TOKEN`, or any model key |
| Stay on stdout as newline-delimited JSON-RPC | Call the lpmoo API. `LPMOO_MCP_MODE=remote` returns `mcp_byo_bridge_pending` and does not use the network |

The SaaS bridge (`mcp_byo`) is not part of this package. Production lpmoo does not run this process.

## Install

Node 20+.

```bash
git clone https://github.com/tuhuateng/lpmoo-mcp.git
cd lpmoo-mcp
npm install
npm test
```

Anonymous clone of this repository is the supported install. `npm test` checks the tool list, schema-valid section output, HTML rejection, and a live stdio process.

### Cursor and Claude Desktop

`npx @lpmoo/mcp` does not exist. This `github:` spec installs **this** repository:

`~/.cursor/mcp.json`, a project `.cursor/mcp.json`, or Claude Desktop's `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lpmoo": {
      "command": "npx",
      "args": ["-y", "github:tuhuateng/lpmoo-mcp"]
    }
  }
}
```

Claude Desktop paths: macOS `~/Library/Application Support/Claude/claude_desktop_config.json`, Windows `%APPDATA%\Claude\claude_desktop_config.json`.

If a host prints npm's install log onto the MCP stdout channel, use a local checkout instead. Replace the path with your clone:

```json
{
  "mcpServers": {
    "lpmoo": {
      "command": "node",
      "args": [
        "/ABS/PATH/TO/lpmoo-mcp/bin/lpmoo-mcp.mjs"
      ]
    }
  }
}
```

The server prints nothing until it receives JSON-RPC. A quiet terminal is it waiting.

### Codex

`~/.codex/config.toml` (not `mcp.json`):

```toml
[mcp_servers.lpmoo]
command = "npx"
args = ["-y", "github:tuhuateng/lpmoo-mcp"]
```

Checkout fallback:

```toml
[mcp_servers.lpmoo]
command = "node"
args = ["/ABS/PATH/TO/lpmoo-mcp/bin/lpmoo-mcp.mjs"]
```

## Optional environment

| Variable | Default | Behavior |
|----------|---------|----------|
| `LPMOO_MCP_MODE` | `local` | `local` or `stub`: offline section stub. `remote`: tools return `mcp_byo_bridge_pending` and make no request. Any other value is rejected. |
| `LPMOO_API_TOKEN` | unset | Reserved. **This server never reads it.** |

## Tools

- `list_templates` — direction recipes. No model call.
- `get_recipe` — ordered section structure (`type`, title, job). No copy, no HTML.
- `generate_lp_sections` — ordered sections (`type`, `spec`, `rationale`) validated as Section JSON.

## Verify

Source of truth is <https://github.com/tuhuateng/lpmoo-mcp>. There is no `postinstall` script. Tool names are checked at startup against `MCP_SECTION_TOOLS` in `src/schema.ts`. Behavior is `src/stub.ts`.

## License

MIT. See [LICENSE](./LICENSE).
