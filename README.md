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

- Nimiq blockchain tools for accounts, transactions, blocks, and validators
- Easy setup with npx
- Only read operations (sending transactions is not supported on purpose).

## Quick Start

Add this MCP server to your MCP client configuration:

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

### With Custom RPC Endpoint

```json
{
  "mcpServers": {
    "nimiq": {
      "command": "npx",
      "args": [
        "nimiq-mcp",
        "--rpc-url",
        "https://your-custom-rpc-endpoint.com"
      ]
    }
  }
}
```

### With Authentication

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

## Available CLI Arguments

- `--rpc-url <url>`: Nimiq RPC endpoint URL (default: `https://rpc.nimiqwatch.com`)
- `--rpc-username <username>`: RPC username for authentication (optional)
- `--rpc-password <password>`: RPC password for authentication (optional)
- `--help, -h`: Show help message

## Default Configuration

If no `--rpc-url` is provided, the server will use:

- **URL**: `https://rpc.nimiqwatch.com` (Free public Nimiq RPC service)
- **Authentication**: None (not required for public endpoint)

The default endpoint at [rpc.nimiqwatch.com](https://rpc.nimiqwatch.com/) provides free rate-limited access to a Nimiq node.

## Available Tools and Resources

The MCP server provides comprehensive tools and resources for interacting with the Nimiq blockchain:

### Tools (17 available)

Tools are for dynamic operations and computations:

### Blockchain Data Tools

- **`getHead`** - Get the current head block of the Nimiq blockchain
- **`getBlockByNumber`** - Retrieve a specific block by its number
- **`getBlockByHash`** - Retrieve a specific block by its hash
- **`getEpochNumber`** - Get the current epoch number

### Blockchain Calculation Tools

- **`getSupply`** - Get the current circulating supply of NIM
- **`calculateSupplyAt`** - Calculate the Nimiq PoS supply at a given time
- **`calculateStakingRewards`** - Calculates the potential wealth accumulation based on staking
- **`getPrice`** - Get the price of NIM against other currencies

### Account & Balance Tools

- **`getAccount`** - Get detailed account information by address
- **`getBalance`** - Get the balance of a specific account address

### Transaction Tools

- **`getTransaction`** - Get detailed transaction information by hash
- **`getTransactionsByAddress`** - Get transaction history for a specific address

### Validator Tools

- **`getValidators`** - Get information about all active validators
- **`getValidator`** - Get detailed information about a specific validator
- **`getSlots`** - Get validator slot information for current or specific block

### Network Tools

- **`getNetworkInfo`** - Get network status including peer count and consensus state

### Documentation Tools

- **`getRpcMethods`** - Get all available RPC methods from the latest OpenRPC document
- **`searchDocs`** - Search through the Nimiq documentation using full-text search

### Resources (3 available)

Resources provide static content that can be cached by MCP clients:

### Documentation Resources

- **`nimiq://docs/web-client`** - Complete web-client documentation for LLMs
- **`nimiq://docs/protocol`** - Complete Nimiq protocol and learning documentation for LLMs
- **`nimiq://docs/validators`** - Complete validator and staking documentation for LLMs

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

### In Claude Desktop

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

### With Custom Configuration

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

### In Other MCP Clients

The server follows the MCP specification and can be used with any MCP-compatible client by running:

```bash
npx nimiq-mcp
```

## Development

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

## Architecture

The MCP server is built using:

- **[@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)**: Official MCP SDK for TypeScript
- **[nimiq-rpc-client-ts](https://github.com/onmax/albatross-rpc-client-ts/)**: Fully typed Nimiq RPC client
- **[rpc.nimiqwatch.com](https://rpc.nimiqwatch.com/)**: Free public Nimiq RPC service
- **[Valibot](https://valibot.dev/)**: Runtime schema validation and type safety for all tool inputs
- **TypeScript**: For type safety and better development experience

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
