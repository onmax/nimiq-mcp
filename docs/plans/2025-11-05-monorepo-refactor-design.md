# Monorepo Refactor Design

**Date:** 2025-11-05
**Status:** Approved

## Overview

Refactor nimiq-mcp into pnpm monorepo with separate domain-focused MCP servers. Breaking change - fresh structure optimized for maintainability and deployment flexibility.

## Goals

- Split tools by domain: web-client (docs/resources) and blockchain (RPC/calculators)
- Each domain = standalone MCP server (CLI + Worker)
- Shared core utilities for DRY
- Single Worker deployment with routing to domain servers
- Clean separation, independent operation

## Architecture: Separate MCP Servers

Each domain package is complete MCP server with own tools, handlers, server class. Root Worker routes to appropriate domain. Core provides shared utilities only.

## Project Structure

```
nimiq-mcp/
├── packages/
│   ├── core/               # Shared utilities, schemas, base helpers
│   │   ├── src/
│   │   │   ├── schemas.ts       # Valibot schemas
│   │   │   ├── utils.ts         # parseArgs, validateInput, etc.
│   │   │   └── index.ts
│   │   └── package.json
│   ├── web-client/         # Docs & resources MCP server
│   │   ├── src/
│   │   │   ├── index.ts         # MCP server entry (CLI)
│   │   │   ├── worker.ts        # Worker entry
│   │   │   ├── tools.ts         # search_nimiq_docs tool
│   │   │   └── resources.ts     # Resource handlers
│   │   └── package.json
│   └── blockchain/         # RPC + calculators MCP server
│       ├── src/
│       │   ├── index.ts         # MCP server entry (CLI)
│       │   ├── worker.ts        # Worker entry
│       │   ├── tools/           # Tool implementations
│       │   │   ├── supply.ts
│       │   │   ├── staking.ts
│       │   │   ├── blocks.ts
│       │   │   ├── accounts.ts
│       │   │   ├── validators.ts
│       │   │   └── index.ts
│       │   └── tool-definitions.ts
│       └── package.json
├── src/
│   └── worker.ts           # Root Worker with routing
├── wrangler.toml           # Cloudflare Worker config
├── package.json            # Root workspace config
└── pnpm-workspace.yaml
```

## Package Details

### packages/core

**Purpose:** Shared utilities, no MCP server logic

**Exports:**

- `validateInput(schema, args)` - Valibot validation helper
- `parseArgs()` - CLI argument parsing
- `createSnippet(content, query)` - Search result snippets
- `buildElicitationPrompt(params)` - Interactive tool prompts
- Shared schemas if overlap exists

**Dependencies:** valibot, minimal utils

### packages/web-client

**Purpose:** Nimiq documentation and resources MCP server

**Tools:**

- `search_nimiq_docs` - Full-text search via MiniSearch

**Resources:**

- `nimiq://docs/web-client` - Web client docs from llms-full.txt
- `nimiq://docs/protocol` - Protocol docs from llms-full.txt
- `nimiq://docs/validators` - Validator docs from llms-full.txt

**Dependencies:** @nimiq-mcp/core, @modelcontextprotocol/sdk, minisearch

**Bin:** `nimiq-mcp-web-client`

### packages/blockchain

**Purpose:** Nimiq blockchain RPC and calculations MCP server

**Tools (18 total):**

_Supply:_

- `get_nimiq_supply`
- `calculate_nimiq_supply_at`

_Staking:_

- `calculate_nimiq_staking_rewards`
- `interactive_staking_calculator`

_Price:_

- `get_nimiq_price`

_Blocks:_

- `get_nimiq_head`
- `get_nimiq_block_by_number`
- `get_nimiq_block_by_hash`

_Accounts:_

- `get_nimiq_account`
- `get_nimiq_balance`
- `get_nimiq_transaction`
- `get_nimiq_transactions_by_address`

_Validators:_

- `get_nimiq_validators`
- `get_nimiq_validator`
- `get_nimiq_slots`

_Network:_

- `get_nimiq_epoch_number`
- `get_nimiq_network_info`
- `get_nimiq_rpc_methods`

**Dependencies:** @nimiq-mcp/core, @modelcontextprotocol/sdk, nimiq-rpc-client-ts, @nimiq/utils

**Bin:** `nimiq-mcp-blockchain`

**Config:** RPC URL/auth via CLI args or env vars

## Entry Points

### CLI Usage

Two independent CLI servers:

```bash
# Web client docs server
nimiq-mcp-web-client

# Blockchain RPC server
nimiq-mcp-blockchain --rpc-url https://... --rpc-username ... --rpc-password ...
```

Each CLI runs standalone MCP server on stdio. User chooses which domain(s) to configure in Claude Desktop / other MCP clients.

### Worker Deployment

Single Worker at root with routing:

**File:** `src/worker.ts`

```ts
import { BlockchainWorker } from '@nimiq-mcp/blockchain/worker'
import { WebClientWorker } from '@nimiq-mcp/web-client/worker'

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // Index - guide to endpoints
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: 'Nimiq MCP Server',
        version: '1.0.0',
        endpoints: {
          '/web-client': 'Nimiq documentation and resources MCP server',
          '/blockchain': 'Nimiq blockchain data and RPC MCP server'
        },
        docs: 'https://github.com/nimiq/mcp'
      }), {
        headers: { 'content-type': 'application/json' }
      })
    }

    // Route to domain servers
    if (url.pathname.startsWith('/web-client')) {
      return WebClientWorker.fetch(request, env, ctx)
    }

    if (url.pathname.startsWith('/blockchain')) {
      return BlockchainWorker.fetch(request, env, ctx)
    }

    return new Response('Not Found', { status: 404 })
  }
}
```

**Endpoints:**

- `GET /` - Info page pointing to available endpoints
- `POST /web-client` - Web client MCP server
- `POST /blockchain` - Blockchain MCP server

**Deployment:** Single `wrangler deploy`, one Worker, routes internally

## Build & Development

### Workspace Setup

**pnpm-workspace.yaml:**

```yaml
packages:
  - 'packages/*'
```

**Root package.json:**

```json
{
  "name": "nimiq-mcp",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "dev:web-client": "pnpm --filter @nimiq-mcp/web-client dev",
    "dev:blockchain": "pnpm --filter @nimiq-mcp/blockchain dev",
    "deploy": "wrangler deploy"
  }
}
```

### Build Process

- Each package builds to own `dist/`
- TypeScript project references for fast incremental builds
- `pnpm build` at root builds all packages in dependency order
- Vite for bundling (existing setup)

### Scripts

**Core package:**

- `build` - Compile TypeScript

**Domain packages:**

- `dev` - Run CLI server with tsx
- `build` - Bundle for distribution
- `start` - Run built CLI

**Root:**

- `build` - Build all packages
- `dev:web-client` / `dev:blockchain` - Run domain servers
- `deploy` - Deploy Worker to Cloudflare

## Publishing

Three npm packages:

- `@nimiq-mcp/core` - Shared utilities
- `@nimiq-mcp/web-client` - Web client MCP server
- `@nimiq-mcp/blockchain` - Blockchain MCP server

Users install what they need. Root can also publish as `nimiq-mcp` with all packages as dependencies for convenience.

## Migration Notes

Breaking change - no migration path needed. Fresh start with clean structure. Old `nimiq-mcp` v0.0.10 remains as legacy. New structure starts at v1.0.0.

## Benefits

- **Domain separation:** Each concern isolated, easier to maintain
- **Deployment flexibility:** Use CLI for one/both domains, Worker serves both
- **Clean dependencies:** Only import what's needed per domain
- **Scalability:** Easy to add new domains (e.g., packages/wallet)
- **Testing:** Test domains independently
- **Bundle size:** Worker can tree-shake unused domains if needed

## Open Questions

None - design approved.
