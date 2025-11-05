<h1 align="center">
  <img alt="Nimiq MCP Servers logo" loading="lazy" width="96" height="96" decoding="async" data-nimg="1" style="color:transparent" src="https://raw.githubusercontent.com/onmax/nimiq-mcp/refs/heads/main/.github/logo.svg" />
  </br>
  Nimiq MCP Servers</h1>
<p align="center">
Model Context Protocol (MCP) servers for the <b>Nimiq blockchain</b> and documentation.
</p>
<br/>

<p align="center">
  <a href="https://www.npmjs.com/package/nimiq-mcp-blockchain">
    <img src="https://img.shields.io/npm/v/nimiq-mcp-blockchain.svg" alt="blockchain version" />
  </a>
  <a href="https://www.npmjs.com/package/nimiq-mcp-web-client">
    <img src="https://img.shields.io/npm/v/nimiq-mcp-web-client.svg" alt="web-client version" />
  </a>
  <a href="https://github.com/onmax/nimiq-mcp/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/onmax/nimiq-mcp.svg" alt="License" />
  </a>
  <a href="https://modelcontextprotocol.io">
    <img src="https://img.shields.io/badge/MCP-Compatible-blue.svg" alt="MCP Compatible" />
  </a>
  <a href="https://nimiq.dev">
    <img src="https://img.shields.io/badge/Nimiq-Blockchain-orange.svg" alt="Nimiq Blockchain" />
  </a>

  <p align="center">
    <a href="https://modelcontextprotocol.io">
      📖 Model Context Protocol
    </a>
  </p>
</p>

## Overview

**v1.0.0** introduces a modular monorepo architecture with two specialized MCP servers:

- **🌐 Web Client Server** (`nimiq-mcp-web-client`): Documentation search and resources
- **⛓️ Blockchain Server** (`nimiq-mcp-blockchain`): RPC queries, accounts, validators, calculations

## Features

- 🚀 **Two deployment options**: Remote Worker OR local STDIO
- 📦 **Modular architecture**: Use one or both servers as needed
- 🔗 **4 tools total**: 3 blockchain tools (with 17 operations) + 1 documentation search tool
- 🤖 **MCP protocol**: Full compliance with latest specification
- 💬 **Interactive tools**: Elicitation support for guided UX
- ⚡ **Remote option**: Cloudflare Worker with routing
- 🔧 **Local option**: Dedicated CLI for each server
- 🔍 **Documentation search**: Full-text search through Nimiq docs
- 📊 **Calculations**: Supply, staking rewards, price data
- 🔒 **Read-only**: No transaction sending for security
- ✅ **Input validation**: Comprehensive Valibot schema validation

## Quick Start

### Option 1: Remote Access (Cloudflare Worker)

Access both servers via web endpoints:

```json
{
  "mcpServers": {
    "nimiq-web-client": {
      "url": "https://nimiq-mcp.je-cf9.workers.dev/web-client",
      "transport": "http"
    },
    "nimiq-blockchain": {
      "url": "https://nimiq-mcp.je-cf9.workers.dev/blockchain",
      "transport": "http"
    }
  }
}
```

### Option 2: Local Installation (STDIO)

Use dedicated CLIs for each server:

```json
{
  "mcpServers": {
    "nimiq-web-client": {
      "command": "npx",
      "args": ["nimiq-mcp-web-client"]
    },
    "nimiq-blockchain": {
      "command": "npx",
      "args": ["nimiq-mcp-blockchain"]
    }
  }
}
```

## Comparison

| Feature          | Remote (Worker)   | Local (STDIO)    |
| ---------------- | ----------------- | ---------------- |
| **Setup**        | Zero installation | Requires Node.js |
| **Updates**      | Automatic         | Manual (npx)     |
| **Privacy**      | Via Worker        | Direct RPC       |
| **Availability** | Worker uptime     | Local env        |
| **Protocol**     | HTTP transport    | Full MCP support |

### With Custom RPC (Blockchain Server Only)

<details>
<summary>Local CLI</summary>

```json
{
  "mcpServers": {
    "nimiq-blockchain": {
      "command": "npx",
      "args": [
        "nimiq-mcp-blockchain",
        "--rpc-url",
        "https://your-rpc-endpoint.com",
        "--rpc-username",
        "your-username",
        "--rpc-password",
        "your-password"
      ]
    }
  }
}
```

</details>

## Available Arguments

**Blockchain Server Only:**

| Argument                | Description        | Default                      |
| ----------------------- | ------------------ | ---------------------------- |
| `--rpc-url <url>`       | Nimiq RPC endpoint | `https://rpc.nimiqwatch.com` |
| `--rpc-username <user>` | RPC auth username  | None                         |
| `--rpc-password <pass>` | RPC auth password  | None                         |
| `--help, -h`            | Show help          | N/A                          |

**Web Client Server:** No arguments needed

## Available Tools and Resources

### 🌐 Web Client Server (`nimiq-mcp-web-client`)

**1 Tool:**

- `search_nimiq_docs` - Full-text search through Nimiq documentation

**3 Resources:**

- `nimiq://docs/web-client` - Web client documentation
- `nimiq://docs/protocol` - Protocol & learning docs
- `nimiq://docs/validators` - Validator & staking docs

### ⛓️ Blockchain Server (`nimiq-mcp-blockchain`)

**3 Consolidated Tools:**

#### 1. `query_blockchain`

Query blockchain data by specifying an `operation`:

**Block operations:**

- `get_head` - Get current head block
- `get_block_by_number` - Get block by number (requires `blockNumber`)
- `get_block_by_hash` - Get block by hash (requires `hash`)
- `get_epoch_number` - Get current epoch number

**Account operations:**

- `get_account` - Get account info (requires `address`)
- `get_balance` - Get account balance (requires `address`)

**Transaction operations:**

- `get_transaction` - Get transaction by hash (requires `hash`)
- `get_transactions_by_address` - Get transactions by address (requires `address`)

**Validator operations:**

- `get_validators` - Get all validators
- `get_validator` - Get specific validator (requires `address`)
- `get_slots` - Get validator slots (optional `blockNumber`)

**Network operations:**

- `get_network_info` - Get network status
- `get_rpc_methods` - Get available RPC methods

#### 2. `calculate_blockchain`

Perform calculations by specifying an `operation`:

**Supply operations:**

- `get_supply` - Get current NIM supply
- `calculate_supply_at` - Calculate supply at timestamp (requires `timestampMs`)

**Staking operations:**

- `calculate_staking_rewards` - Calculate staking rewards
- `interactive_staking_calculator` - Interactive calculator with elicitation

#### 3. `get_nimiq_price`

Get NIM price against other currencies (requires `currencies` array)

### Tool Parameters

Each tool uses an `operation` parameter to specify the action, plus operation-specific parameters:

- **Documentation tools**: `includeSchemas` (boolean) for `getRpcMethods` to include detailed parameter/result schemas
- **Search tools**: `query` (string) for search terms, `limit` (number) to control result count

### Resource Access

Resources are accessed via their URI and don't require parameters:

- **Documentation resources**: Access via `nimiq://docs/web-client`, `nimiq://docs/protocol`, or `nimiq://docs/validators`
- Content is returned as plain text for optimal LLM consumption
- MCP clients can cache resource content for improved performance

### Example Responses

#### Supply Data Response

```json
{
  "total": 210000000000000,
  "vested": 0,
  "burned": 0,
  "max": 210000000000000,
  "initial": 25200000000000,
  "staking": 100000000000,
  "minted": 1000000000,
  "circulating": 25200000000000,
  "mined": 0,
  "updatedAt": "2025-01-20T12:00:00.000Z"
}
```

#### Block Data Response

```json
{
  "blockNumber": 21076071,
  "block": {
    "hash": "90e2ba0a831eec477bca1a26ba8c5e2b3162b5d042667828c4db0f735247d41e",
    "number": 21076071,
    "timestamp": 1749486768481,
    "parentHash": "b4fae3fc846ac13bfc62aa502c8683e25e92616d987f3f642b9cb57da73b6392",
    "type": "micro",
    "producer": {
      "slotNumber": 305,
      "validator": "NQ51 LM8E Q8LS 53TX GGDG 26M4 VX4Y XRE2 8JDT"
    }
  },
  "timestamp": "2025-06-09T16:32:49.055Z",
  "network": "mainnet"
}
```

#### Search Documentation Response

```json
{
  "query": "validator staking",
  "totalResults": 3,
  "results": [
    {
      "title": "Validator Setup",
      "content": "To become a validator in Nimiq, you need to stake NIM tokens...",
      "section": "Validators",
      "score": 0.95,
      "snippet": "...validator in Nimiq, you need to stake NIM tokens and run validator software..."
    },
    {
      "title": "Staking Rewards",
      "content": "Validators earn rewards for producing blocks and validating transactions...",
      "section": "Economics",
      "score": 0.87,
      "snippet": "...earn rewards for producing blocks and validating transactions. Staking rewards..."
    }
  ],
  "searchedAt": "2025-01-20T12:00:00.000Z"
}
```

## Usage Examples

### Claude Desktop Configuration

**Option 1: Remote (Zero Setup)**

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nimiq": {
      "url": "https://nimiq-mcp.je-cf9.workers.dev/sse",
      "transport": "sse"
    }
  }
}
```

**Option 2: Local Installation**

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nimiq": {
      "command": "npx",
      "args": ["nimiq-mcp"]
    }
  }
}
```

### With Custom Local Configuration

```json
{
  "mcpServers": {
    "nimiq": {
      "command": "npx",
      "args": [
        "nimiq-mcp",
        "--rpc-url",
        "https://rpc.nimiqwatch.com"
      ]
    }
  }
}
```

### In Web Applications

Access the remote server directly via HTTP:

```javascript
// Connect to the remote MCP server
const mcpClient = new SSEClientTransport(
  new URL('https://nimiq-mcp.je-cf9.workers.dev/sse')
)
```

### In Other MCP Clients

The server follows the MCP specification and can be used with any MCP-compatible client:

**Local installation:**

```bash
npx nimiq-mcp
```

**Remote access:**

- **Tools Endpoint**: `https://nimiq-mcp.je-cf9.workers.dev/tools`
- **Info Endpoint**: `https://nimiq-mcp.je-cf9.workers.dev/info`
- **Health Check**: `https://nimiq-mcp.je-cf9.workers.dev/health`
- **Web Interface**: `https://nimiq-mcp.je-cf9.workers.dev/`

## Development

### Local Development

```bash
# Install dependencies
pnpm install

# Run linting
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Build for production
pnpm run build

# Test the server manually
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

### Cloudflare Workers Development

```bash
# Install dependencies including Wrangler
pnpm install

# Start local development server
pnpm run dev:worker

# Build and test worker deployment
pnpm run build:worker

# Deploy to Cloudflare
pnpm run deploy
```

### Deployment to Cloudflare Workers

See the complete [Deployment Guide](DEPLOYMENT.md) for detailed instructions.

**Quick deployment steps:**

1. **Set up Cloudflare account and get API token**
2. **Configure GitHub secrets** (for automatic deployment):
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. **Push to main branch** - automatic deployment via GitHub Actions
4. **Configure production secrets** (optional):
   ```bash
   wrangler secret put NIMIQ_RPC_URL
   wrangler secret put NIMIQ_RPC_USERNAME
   wrangler secret put NIMIQ_RPC_PASSWORD
   ```

The worker will be available at: `https://nimiq-mcp.je-cf9.workers.dev`

## Architecture

The MCP server is built using:

- **[@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)**: Official MCP SDK for TypeScript
- **[nimiq-rpc-client-ts](https://github.com/onmax/albatross-rpc-client-ts/)**: Fully typed Nimiq RPC client
- **[rpc.nimiqwatch.com](https://rpc.nimiqwatch.com/)**: Free public Nimiq RPC service
- **[Valibot](https://valibot.dev/)**: Runtime schema validation and type safety for all tool inputs
- **[Cloudflare Workers](https://workers.cloudflare.com/)**: Edge compute platform for remote deployment
- **TypeScript**: For type safety and better development experience

### MCP 2025-06-18 Protocol Features

This server implements the latest Model Context Protocol specification (2025-06-18) with enhanced features:

- **Elicitation Support**: Interactive tools can request additional information from users during execution
- **Enhanced Input Validation**: Comprehensive schema validation with detailed error messages
- **Structured Tool Responses**: JSON Schema definitions for better LLM comprehension
- **Improved Error Handling**: Standardized error responses with proper MCP error codes
- **Protocol Version Compliance**: Full support for the latest MCP specification requirements

### Deployment Options

**Local Deployment (STDIO Transport)**

- Runs as a local process communicating via stdin/stdout
- Best for desktop applications and local development
- Zero network configuration required
- Inherently secure (no network exposure)

**Remote Deployment (SSE Transport)**

- Deployed on Cloudflare Workers edge network
- Accessible from anywhere via HTTPS
- Supports multiple concurrent clients
- Built-in security, rate limiting, and global CDN
- Automatic scaling and high availability

### Input Validation

The server uses **Valibot** for comprehensive input validation on all tools, providing:

- **Runtime Type Safety**: All tool inputs are validated against strict schemas
- **Descriptive Error Messages**: Clear validation errors with field-level details
- **Type Inference**: Automatic TypeScript type inference from Valibot schemas
- **Default Values**: Automatic application of default values for optional parameters
- **Enum Validation**: Strict validation of allowed values for parameters like network types

Example validation:

```typescript
const StakingRewardsSchema = v.object({
  amount: v.optional(v.pipe(v.number(), v.description('Initial amount staked in NIM')), 1),
  days: v.optional(v.pipe(v.number(), v.description('Number of days staked')), 365),
  network: v.optional(v.pipe(v.picklist(['main-albatross', 'test-albatross']), v.description('Network name')), 'main-albatross'),
})
```

## Error Handling

The server includes comprehensive error handling:

- RPC connection errors
- Rate limit handling
- Invalid parameters
- Network timeouts
- Graceful shutdown on SIGINT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
