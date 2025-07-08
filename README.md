<h1 align="center">
  <img alt="Nimiq MCP Server logo" loading="lazy" width="96" height="96" decoding="async" data-nimg="1" style="color:transparent" src="https://raw.githubusercontent.com/onmax/nimiq-mcp/refs/heads/main/.github/logo.svg" />
  </br>
  Nimiq MCP Server</h1>
<p align="center">
A Model Context Protocol (MCP) server for interacting with the <b>Nimiq blockchain</b>.
</p>
<br/>

<p align="center">
  <a href="https://www.npmjs.com/package/nimiq-mcp">
    <img src="https://img.shields.io/npm/v/nimiq-mcp.svg" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/nimiq-mcp">
    <img src="https://img.shields.io/npm/dm/nimiq-mcp.svg" alt="npm downloads" />
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

## Features

- 🚀 **Two deployment options**: Zero-setup remote access OR local installation
- 🔗 **Nimiq blockchain tools** for accounts, transactions, blocks, and validators
- ⚡ **Remote option**: No installation required - just add the URL to your MCP client
- 🔧 **Local option**: Full control with `npx nimiq-mcp`
- 🔒 **Read-only operations** (sending transactions not supported for security)

## Quick Start

Choose one of two options:

### Option 1: Remote Access

Add this to your MCP client configuration:

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

### Option 2: Local Installation

Add this to your MCP client configuration:

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

## Comparison

| Feature              | Remote Access                   | Local Installation           |
| -------------------- | ------------------------------- | ---------------------------- |
| **Setup**            | Zero installation required      | Requires Node.js/npm         |
| **Updates**          | Automatic                       | Manual (npx pulls latest)    |
| **Privacy**          | Requests go through our servers | Direct connection to RPC     |
| **Availability**     | Depends on our service uptime   | Depends on local environment |
| **Protocol Support** | SSE transport only              | Full MCP protocol support    |

### With Custom RPC Endpoint & Auth

<details>
<summary>Remote (SSE)</summary>

```json
{
  "mcpServers": {
    "nimiq": {
      "url": "https://nimiq-mcp.je-cf9.workers.dev/sse?rpc-url=https://your-rpc-endpoint.com&rpc-username=your-username&rpc-password=your-password",
      "transport": "sse"
    }
  }
}
```

</details>

<details>
<summary>Local (npx)</summary>

```json
{
  "mcpServers": {
    "nimiq": {
      "command": "npx",
      "args": [
        "nimiq-mcp",
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

| CLI Arguments               | URL Arguments             | Description                     | Default                      |
| --------------------------- | ------------------------- | ------------------------------- | ---------------------------- |
| `--rpc-url <url>`           | `rpc-url=<url>`           | Nimiq RPC endpoint URL          | `https://rpc.nimiqwatch.com` |
| `--rpc-username <username>` | `rpc-username=<username>` | RPC username for authentication | None                         |
| `--rpc-password <password>` | `rpc-password=<password>` | RPC password for authentication | None                         |
| `--help, -h`                | N/A                       | Show help message               | N/A                          |

## Available Tools and Resources

The MCP server provides comprehensive tools and resources for interacting with the Nimiq blockchain:

### Tools (17 available)

| Category                         | Tool                       | Description                                                    |
| -------------------------------- | -------------------------- | -------------------------------------------------------------- |
| **Blockchain Data Tools**        | `getHead`                  | Get the current head block of the Nimiq blockchain             |
|                                  | `getBlockByNumber`         | Retrieve a specific block by its number                        |
|                                  | `getBlockByHash`           | Retrieve a specific block by its hash                          |
|                                  | `getEpochNumber`           | Get the current epoch number                                   |
| **Blockchain Calculation Tools** | `getSupply`                | Get the current circulating supply of NIM                      |
|                                  | `calculateSupplyAt`        | Calculate the Nimiq PoS supply at a given time                 |
|                                  | `calculateStakingRewards`  | Calculates the potential wealth accumulation based on staking  |
|                                  | `getPrice`                 | Get the price of NIM against other currencies                  |
| **Account & Balance Tools**      | `getAccount`               | Get detailed account information by address                    |
|                                  | `getBalance`               | Get the balance of a specific account address                  |
| **Transaction Tools**            | `getTransaction`           | Get detailed transaction information by hash                   |
|                                  | `getTransactionsByAddress` | Get transaction history for a specific address                 |
| **Validator Tools**              | `getValidators`            | Get information about all active validators                    |
|                                  | `getValidator`             | Get detailed information about a specific validator            |
|                                  | `getSlots`                 | Get validator slot information for current or specific block   |
| **Network Tools**                | `getNetworkInfo`           | Get network status including peer count and consensus state    |
| **Documentation Tools**          | `getRpcMethods`            | Get all available RPC methods from the latest OpenRPC document |
|                                  | `searchDocs`               | Search through the Nimiq documentation using full-text search  |

### Resources (3 available)

| Category                    | Resource                  | Description                                                 |
| --------------------------- | ------------------------- | ----------------------------------------------------------- |
| **Documentation Resources** | `nimiq://docs/web-client` | Complete web-client documentation for LLMs                  |
|                             | `nimiq://docs/protocol`   | Complete Nimiq protocol and learning documentation for LLMs |
|                             | `nimiq://docs/validators` | Complete validator and staking documentation for LLMs       |

### Tool Parameters

Each tool accepts specific parameters:

- **Block tools**: `includeBody` (boolean) to include transaction details
- **Address tools**: `address` (string) for Nimiq addresses
- **Transaction tools**: `hash` (string) for transaction hashes, `max` (number) for limits
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
