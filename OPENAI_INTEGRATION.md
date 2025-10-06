# OpenAI Agents SDK Integration

This guide shows how to integrate the Nimiq MCP Server with OpenAI's Agents SDK.

## Overview

The Nimiq MCP Server is compatible with OpenAI's Agents SDK when run locally via `npx`.

> **⚠️ Important**: The remote Cloudflare Workers deployment (`https://nimiq-mcp.je-cf9.workers.dev`) does NOT currently support the MCP protocol. You must use the local deployment for OpenAI integration.

## Quick Start

### Local MCP Server Setup

First, start the local MCP server:

```bash
npx nimiq-mcp
```

This will start the MCP server with full protocol support on your local machine.

### Python Configuration

```python
from openai import OpenAI
# Note: Use local stdio transport, not HTTP/SSE for now

# Initialize OpenAI client
client = OpenAI(api_key="your-api-key")

# For local MCP servers, you'll need to configure stdio transport
# The HTTP/SSE remote endpoint is not yet supported

# Use with OpenAI Agent
agent = client.agents.create(
    model="gpt-5",  # or gpt-5-mini, gpt-5-nano
    tools=[{
        "type": "mcp",
        "server_label": "nimiq",
        "command": "npx",
        "args": ["nimiq-mcp"]
    }],
    instructions="""You are a helpful Nimiq ecosystem assistant with comprehensive access to:
    - Real-time blockchain data and analytics
    - Complete web client documentation and tutorials
    - Protocol specifications and validator guides
    - Full-text search across all Nimiq documentation""",
    reasoning_effort=3  # 1-5 scale, replaces temperature
)
```

### With Custom RPC Endpoint

If you're using a custom RPC endpoint with authentication:

```python
agent = client.agents.create(
    model="gpt-5",
    tools=[{
        "type": "mcp",
        "server_label": "nimiq",
        "command": "npx",
        "args": [
            "nimiq-mcp",
            "--rpc-url", "https://your-rpc.com",
            "--rpc-username", "your-username",
            "--rpc-password", "your-password"
        ]
    }],
    instructions="""...""",
    reasoning_effort=3
)
```

### TypeScript/JavaScript Configuration

```typescript
import { OpenAI } from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const agent = await client.agents.create({
  model: 'gpt-5', // or gpt-5-mini, gpt-5-nano
  tools: [
    {
      type: 'mcp',
      server_label: 'nimiq',
      command: 'npx',
      args: ['nimiq-mcp']
    }
  ],
  instructions: `You are a helpful Nimiq ecosystem assistant with comprehensive access to:
    - Real-time blockchain data and analytics
    - Complete web client documentation and tutorials
    - Protocol specifications and validator guides
    - Full-text search across all Nimiq documentation`,
  reasoning_effort: 3 // 1-5 scale, replaces temperature
})
```

## Configuration Options

> **Note**: Remote HTTP/SSE endpoints are not yet supported. Use local stdio transport with `npx nimiq-mcp`.

## Available Tools

The Nimiq MCP Server provides 18 comprehensive tools across multiple categories:

### Blockchain Data Tools

- `getHead` - Get current head block
- `getBlockByNumber` - Retrieve block by number
- `getBlockByHash` - Retrieve block by hash
- `getEpochNumber` - Get current epoch

### Blockchain Calculation Tools

- `getSupply` - Get circulating supply of NIM
- `calculateSupplyAt` - Calculate supply at specific time
- `calculateStakingRewards` - Calculate staking rewards
- `interactiveStakingCalculator` - Interactive calculator with elicitation
- `getPrice` - Get NIM price

### Account & Transaction Tools

- `getAccount` - Get account details
- `getBalance` - Get account balance
- `getTransaction` - Get transaction by hash
- `getTransactionsByAddress` - Get transaction history

### Validator Tools

- `getValidators` - Get all validators
- `getValidator` - Get specific validator
- `getSlots` - Get validator slots

### Network & Documentation Tools

- `getNetworkInfo` - Get network status
- `getRpcMethods` - Get available RPC methods
- `searchDocs` - Search Nimiq documentation

## Usage Examples

### Example 1: Check Account Balance

```python
response = client.agents.run(
    agent_id=agent.id,
    messages=[
        {
            "role": "user",
            "content": "What's the balance of NQ07 0000 0000 0000 0000 0000 0000 0000 0000?"
        }
    ]
)
print(response.content)
```

### Example 2: Get Block Information

```python
response = client.agents.run(
    agent_id=agent.id,
    messages=[
        {
            "role": "user",
            "content": "Get me the details of the latest block including transaction bodies"
        }
    ]
)
```

### Example 3: Calculate Staking Rewards

```python
response = client.agents.run(
    agent_id=agent.id,
    messages=[
        {
            "role": "user",
            "content": "Calculate staking rewards for 10,000 NIM staked for 365 days"
        }
    ]
)
```

### Example 4: Search Documentation

```python
response = client.agents.run(
    agent_id=agent.id,
    messages=[
        {
            "role": "user",
            "content": "Search the Nimiq docs for information about validator setup"
        }
    ]
)
```

## Local Development

For local testing, you can run the MCP server locally:

```bash
# Start local MCP server
npx nimiq-mcp
```

Then configure with local URL:

```python
nimiq_mcp = MCPServerStreamableHttp(
    name="Nimiq Blockchain (Local)",
    params={
        "url": "http://localhost:3000/sse",
        "timeout": 30
    }
)
```

## YAML Configuration

For projects using YAML configuration:

```yaml
# mcp_agent.config.yaml
servers:
  nimiq:
    url: https://nimiq-mcp.je-cf9.workers.dev/sse
    timeout: 30
    cache_tools_list: true
    max_retry_attempts: 3
```

## Best Practices

1. **Caching**: Enable `cache_tools_list` to reduce latency
2. **Timeouts**: Set appropriate timeouts (30s recommended for blockchain operations)
3. **Retry Logic**: Use automatic retries for network resilience
4. **Error Handling**: Handle MCP server errors gracefully
5. **Tool Selection**: Use specific tools rather than general queries for better performance

## Deployment Options

### Local Installation (Required for OpenAI)

Run locally via npx:

```bash
npx nimiq-mcp
```

**Benefits:**

- Full MCP protocol support
- Works with OpenAI Agents SDK
- Direct RPC connection
- Privacy
- Full control

### Remote Cloudflare Deployment (Not MCP Compatible Yet)

The remote deployment at `https://nimiq-mcp.je-cf9.workers.dev` provides simplified HTTP endpoints but does NOT support the MCP protocol yet:

- ✅ `/health` - Health check
- ✅ `/info` - Server information
- ✅ `/tools` - List available tools
- ❌ `/mcp` or `/sse` - Not implemented (requires Node.js-specific transport layer)

For MCP protocol support (OpenAI/ChatGPT integration), use the local `npx` version.

## Troubleshooting

### Connection Issues

- Verify the MCP server URL is accessible
- Check timeout settings (increase if needed)
- Enable retry logic with `max_retry_attempts`

### Tool Not Found

- Ensure `cache_tools_list` is enabled
- Verify the server is running: `curl https://nimiq-mcp.je-cf9.workers.dev/health`

### Authentication Errors

- For custom RPC endpoints, verify credentials in URL parameters
- Check Authorization headers are properly set

## Support

- **MCP Server Issues**: [GitHub Issues](https://github.com/onmax/nimiq-mcp/issues)
- **Nimiq Documentation**: [docs.nimiq.com](https://docs.nimiq.com)
- **OpenAI Agents SDK**: [OpenAI Platform Docs](https://platform.openai.com/docs)

## License

MIT License - see [LICENSE](./LICENSE) for details.
