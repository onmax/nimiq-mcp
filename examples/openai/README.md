# OpenAI Agents SDK Examples

These examples demonstrate how to integrate the Nimiq MCP Server with OpenAI's Agents SDK.

## Prerequisites

- OpenAI API key
- Python 3.8+ (for Python example) or Node.js 18+ (for TypeScript example)

## Python Example

### Installation

```bash
pip install openai mcp
```

### Usage

```bash
export OPENAI_API_KEY="your-api-key"
python python_example.py
```

### Features

- Demonstrates MCP server configuration with retry logic
- Shows example queries for blockchain data and documentation
- Includes interactive mode for custom queries

## TypeScript Example

### Installation

```bash
npm install openai
# or
pnpm add openai
```

### Usage

```bash
export OPENAI_API_KEY="your-api-key"
npx tsx typescript_example.ts
```

### Features

- Shows hosted MCP tool configuration
- Demonstrates blockchain queries and documentation search
- Includes interactive readline interface

## Example Queries

Both examples include these sample queries:

1. **Current Block Number**: "What's the current block number?"
2. **Account Balance**: "Get the balance of NQ07 0000 0000 0000 0000 0000 0000 0000 0000"
3. **Staking Calculation**: "Calculate staking rewards for 10,000 NIM staked for 365 days"
4. **Validator Info**: "How many validators are currently active?"
5. **Documentation Search**: "Search the docs for information about the web client API"

## GPT-5 Configuration

These examples use GPT-5 with the following configuration:

- **Model**: `gpt-5` (or variants: `gpt-5-nano`, `gpt-5-mini`)
- **Reasoning Effort**: 3 (medium, scale 1-5)
- **Tools**: Nimiq MCP Server via HTTP/SSE transport

## Available MCP Tools

The Nimiq MCP Server provides 18 tools across multiple categories:

### Blockchain Data

- Account balances and information
- Block data (by number or hash)
- Transaction history
- Network statistics

### Calculations

- Supply calculations
- Staking rewards calculator
- Price data

### Validators

- Validator information
- Slot assignments
- Active validator lists

### Documentation

- Full-text documentation search
- RPC method documentation
- Protocol guides and tutorials

## Customization

### Using Different GPT-5 Variants

```python
# Use GPT-5 Mini for faster responses
agent = client.agents.create(
    model="gpt-5-mini",
    reasoning_effort=2,
    # ...
)

# Use GPT-5 with high reasoning for complex queries
agent = client.agents.create(
    model="gpt-5",
    reasoning_effort=5,
    # ...
)
```

### Custom RPC Endpoint

```python
nimiq_mcp = MCPServerStreamableHttp(
    name="Nimiq Blockchain",
    params={
        "url": "https://nimiq-mcp.je-cf9.workers.dev/sse?rpc-url=https://your-rpc.com",
        "timeout": 30
    }
)
```

### Local Development

To use a local MCP server:

```python
nimiq_mcp = MCPServerStreamableHttp(
    name="Nimiq Blockchain (Local)",
    params={
        "url": "http://localhost:3000/sse",
        "timeout": 30
    }
)
```

## Troubleshooting

### Connection Issues

- Verify the MCP server URL is accessible: `curl https://nimiq-mcp.je-cf9.workers.dev/health`
- Check your network connectivity
- Increase timeout if needed

### API Key Issues

- Ensure `OPENAI_API_KEY` environment variable is set
- Verify your OpenAI account has access to GPT-5

### Tool Execution Errors

- Check the error message for specific tool failures
- Verify input parameters match the tool's schema
- Review the full documentation at [OPENAI_INTEGRATION.md](../../OPENAI_INTEGRATION.md)

## Learn More

- [OpenAI Agents SDK Documentation](https://platform.openai.com/docs)
- [Nimiq MCP Server Documentation](../../README.md)
- [Full OpenAI Integration Guide](../../OPENAI_INTEGRATION.md)
- [Nimiq Developer Docs](https://docs.nimiq.com)
