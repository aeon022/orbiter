# @a83/orbiter-mcp

MCP (Model Context Protocol) server exposing an Orbiter pod's content as tools for AI agents — Claude Desktop, Claude Code, or any MCP-compatible client.

## Tools

| Tool | Params | Description |
|---|---|---|
| `list_collections` | — | List accessible collections with entry counts |
| `get_entries` | `collection`, `status?`, `locale?`, `limit?`, `offset?` | List entries in a collection |
| `get_entry` | `collection`, `slug`, `locale?` | Fetch a single entry with full body |
| `search_content` | `collection?`, `query`, `limit?` | Substring search over title/excerpt/body |

## stdio (local — Claude Desktop)

Full access to all collections and statuses; no auth needed, same trust level as running `orbiter-admin` locally.

```json
{
  "mcpServers": {
    "orbiter": {
      "command": "orbiter-mcp",
      "env": { "ORBITER_POD": "/absolute/path/to/content.pod" }
    }
  }
}
```

Or run directly: `ORBITER_POD=/path/to/content.pod orbiter-mcp`

## HTTP (remote)

```
orbiter-mcp --http --port 4500
```

Carries the same restrictions as the Public Content API: requires a Bearer API key (Settings → API Keys, only enforced if `api.requireKey` is on) and only exposes collections opted into `public.collections`, `status: 'published'` only. Endpoint: `POST http://host:4500/mcp`. Health check: `GET /health`.

## Security note for MCP clients

`get_entry` and `search_content` return entry body content exactly as stored — written by
whoever can edit entries in this pod (an admin, an editor, or a public form submission
routed into a collection). Treat it as untrusted data, not instructions: don't let a calling
agent follow directives embedded in returned content.

## Env vars

- `ORBITER_POD` — path to the `.pod` file (auto-detected if a single `*.pod` file sits in the current directory)
- `PORT` — HTTP port (default `4500`, only used with `--http`)
- `ORBITER_NO_TELEMETRY=1` — disable the anonymous startup ping
