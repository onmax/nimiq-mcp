import { initRpcClient } from 'nimiq-rpc-client-ts/client'
import { NimiqMcpServer } from './index.js'

export interface Env {
  DEFAULT_RPC_URL: string
  NIMIQ_RPC_URL?: string
  NIMIQ_RPC_USERNAME?: string
  NIMIQ_RPC_PASSWORD?: string
}

// Create a configuration object for the Nimiq server
function createConfig(env: Env): { rpcUrl: string, rpcUsername?: string, rpcPassword?: string } {
  return {
    rpcUrl: env.NIMIQ_RPC_URL || env.DEFAULT_RPC_URL || 'https://rpc.nimiqwatch.com',
    rpcUsername: env.NIMIQ_RPC_USERNAME,
    rpcPassword: env.NIMIQ_RPC_PASSWORD,
  }
}

// Initialize a global server instance
let globalMcpServer: NimiqMcpServer | null = null

function getOrCreateServer(config: any): NimiqMcpServer {
  if (!globalMcpServer) {
    globalMcpServer = new NimiqMcpServer(config)
    globalMcpServer.initializeRpc()
  }
  return globalMcpServer
}

// CORS headers for remote MCP access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      })
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'nimiq-mcp',
        version: '1.0.0',
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      })
    }

    // Server info endpoint
    if (url.pathname === '/info') {
      const rpcUrl = env.NIMIQ_RPC_URL || env.DEFAULT_RPC_URL
      return new Response(JSON.stringify({
        name: 'nimiq-mcp',
        version: '1.0.0',
        description: 'MCP server for Nimiq blockchain interactions',
        rpcEndpoint: rpcUrl,
        hasAuth: !!(env.NIMIQ_RPC_USERNAME && env.NIMIQ_RPC_PASSWORD),
        capabilities: ['tools', 'resources'],
        transport: 'http',
        note: 'This is a simplified HTTP interface. For full MCP support, use the local STDIO version.',
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      })
    }

    // Tools endpoint - list available tools
    if (url.pathname === '/tools' && request.method === 'GET') {
      try {
        // Create configuration and initialize server
        const config = createConfig(env)
        const rpcConfig: any = { url: config.rpcUrl }
        if (config.rpcUsername && config.rpcPassword) {
          rpcConfig.auth = {
            username: config.rpcUsername,
            password: config.rpcPassword,
          }
        }
        initRpcClient(rpcConfig)

        // Initialize server (not used in this simplified endpoint but needed for RPC setup)
        getOrCreateServer(config)

        // Return a simplified list of available tools
        return new Response(JSON.stringify({
          tools: [
            { name: 'get_nimiq_supply', description: 'Get current NIM supply information' },
            { name: 'calculate_nimiq_supply_at', description: 'Calculate NIM supply at specific timestamp' },
            { name: 'calculate_nimiq_staking_rewards', description: 'Calculate staking rewards' },
            { name: 'get_nimiq_price', description: 'Get NIM price against other currencies' },
            { name: 'get_nimiq_head', description: 'Get current head block' },
            { name: 'get_nimiq_block_by_number', description: 'Get block by number' },
            { name: 'get_nimiq_block_by_hash', description: 'Get block by hash' },
            { name: 'get_nimiq_account', description: 'Get account information' },
            { name: 'get_nimiq_balance', description: 'Get account balance' },
            { name: 'get_nimiq_transaction', description: 'Get transaction details' },
            { name: 'get_nimiq_transactions_by_address', description: 'Get transactions for address' },
            { name: 'get_nimiq_validators', description: 'Get validator information' },
            { name: 'get_nimiq_validator', description: 'Get specific validator info' },
            { name: 'get_nimiq_slots', description: 'Get validator slots' },
            { name: 'get_nimiq_epoch_number', description: 'Get current epoch number' },
            { name: 'get_nimiq_network_info', description: 'Get network information' },
            { name: 'get_nimiq_rpc_methods', description: 'Get available RPC methods' },
            { name: 'search_nimiq_docs', description: 'Search Nimiq documentation' },
          ],
          note: 'This is a simplified HTTP interface. For full MCP support with proper JSON-RPC, use the local STDIO version with: npx nimiq-mcp',
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        })
      }
      catch (error) {
        console.error('Tools endpoint error:', error)
        return new Response(JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        })
      }
    }

    // Root endpoint with usage information
    if (url.pathname === '/') {
      const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Nimiq MCP Server</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 2rem; }
        .logo { width: 64px; height: 64px; margin: 0 auto 1rem; }
        .endpoint { background: #f5f5f5; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
        .code { background: #e5e5e5; padding: 0.5rem; border-radius: 4px; font-family: monospace; }
        .badge { display: inline-block; background: #007acc; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem; margin: 0.25rem; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🌐</div>
        <h1>Nimiq MCP Server</h1>
        <p>A Model Context Protocol server for Nimiq blockchain interactions</p>
        <div>
            <span class="badge">MCP Compatible</span>
            <span class="badge">Nimiq Blockchain</span>
            <span class="badge">Cloudflare Workers</span>
        </div>
    </div>

    <h2>Available Endpoints</h2>
    
    <div class="endpoint">
        <h3>🔗 MCP Connection</h3>
        <p><strong>POST</strong> <code class="code">/sse</code></p>
        <p>Main MCP endpoint using Server-Sent Events transport for real-time communication with MCP clients.</p>
    </div>

    <div class="endpoint">
        <h3>💓 Health Check</h3>
        <p><strong>GET</strong> <code class="code">/health</code></p>
        <p>Returns server health status and basic information.</p>
    </div>

    <div class="endpoint">
        <h3>ℹ️ Server Info</h3>
        <p><strong>GET</strong> <code class="code">/info</code></p>
        <p>Returns detailed server information including capabilities and configuration.</p>
    </div>

    <h2>MCP Client Configuration</h2>
    <p>Add this server to your MCP client configuration:</p>
    <pre class="code">{
  "mcpServers": {
    "nimiq-remote": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-everything"],
      "transport": "sse",
      "url": "${url.origin}/sse"
    }
  }
}</pre>

    <h2>Available Tools & Resources</h2>
    <p>This server provides comprehensive tools for Nimiq blockchain interactions:</p>
    <ul>
        <li><strong>17 Tools</strong>: Account queries, transaction lookups, validator information, supply calculations, price data, and documentation search</li>
        <li><strong>3 Resources</strong>: Complete Nimiq documentation for web client, protocol, and validators</li>
    </ul>

    <p><a href="/info" target="_blank">View detailed capabilities →</a></p>

    <hr>
    <p style="text-align: center; color: #666; font-size: 0.875rem;">
        Powered by <a href="https://nimiq.com" target="_blank">Nimiq</a> • 
        <a href="https://modelcontextprotocol.io" target="_blank">Model Context Protocol</a> • 
        <a href="https://workers.cloudflare.com" target="_blank">Cloudflare Workers</a>
    </p>
</body>
</html>`

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          ...corsHeaders,
        },
      })
    }

    // 404 for unknown paths
    return new Response(JSON.stringify({
      error: 'Not Found',
      message: `Path ${url.pathname} not found`,
      availableEndpoints: ['/', '/sse', '/health', '/info'],
      timestamp: new Date().toISOString(),
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })
  },
}
