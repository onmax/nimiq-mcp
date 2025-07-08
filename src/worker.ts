import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { initRpcClient } from 'nimiq-rpc-client-ts/client'
import { NimiqMcpServer } from './index.js'

export interface Env {
  DEFAULT_RPC_URL: string
  NIMIQ_RPC_URL?: string
  NIMIQ_RPC_USERNAME?: string
  NIMIQ_RPC_PASSWORD?: string
}

interface RequestWithCf extends Request {
  cf?: any
}

// Create a configuration object for the Nimiq server
function createConfig(env: Env) {
  return {
    rpcUrl: env.NIMIQ_RPC_URL || env.DEFAULT_RPC_URL || 'https://rpc.nimiqwatch.com',
    rpcUsername: env.NIMIQ_RPC_USERNAME,
    rpcPassword: env.NIMIQ_RPC_PASSWORD,
  }
}

// Simple wrapper to adapt the server for HTTP transport
class CloudflareNimiqMcpServer {
  private mcpServer: NimiqMcpServer
  
  constructor(config: any) {
    this.mcpServer = new NimiqMcpServer(config)
  }

  // Get the underlying server for connections
  getServer(): Server {
    return this.mcpServer.server
  }

  // Initialize RPC with the provided config
  initializeRpc(): void {
    this.mcpServer.initializeRpc()
  }
}

// CORS headers for remote MCP access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export default {
  async fetch(request: RequestWithCf, env: Env): Promise<Response> {
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
        service: 'nimiq-mcp-server',
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
        name: 'nimiq-mcp-server',
        version: '1.0.0',
        description: 'MCP server for Nimiq blockchain interactions',
        rpcEndpoint: rpcUrl,
        hasAuth: !!(env.NIMIQ_RPC_USERNAME && env.NIMIQ_RPC_PASSWORD),
        capabilities: ['tools', 'resources'],
        transport: 'sse',
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      })
    }

    // Main MCP endpoint (SSE connection)
    if (url.pathname === '/sse') {
      try {
        // Create configuration from environment variables
        const config = createConfig(env)
        
        // Initialize the MCP server with environment configuration
        const mcpServerWrapper = new CloudflareNimiqMcpServer(config)
        
        // Initialize RPC client with environment config
        const rpcConfig: any = { url: config.rpcUrl }
        if (config.rpcUsername && config.rpcPassword) {
          rpcConfig.auth = {
            username: config.rpcUsername,
            password: config.rpcPassword,
          }
        }
        initRpcClient(rpcConfig)

        // Initialize the RPC connection
        mcpServerWrapper.initializeRpc()

        // Get the server instance
        const server = mcpServerWrapper.getServer()

        // Create SSE transport for HTTP-based MCP communication
        const transport = new SSEServerTransport('/message', request)
        
        // Connect the server to the transport
        await server.connect(transport)
        
        // Return the SSE response
        return transport.response
      } catch (error) {
        console.error('MCP Server error:', error)
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

    // Message endpoint for SSE transport
    if (url.pathname === '/message' && request.method === 'POST') {
      try {
        // This endpoint handles POST messages from SSE clients
        // Note: In a production environment, you'd need to maintain
        // session state to route messages to the correct transport
        
        return new Response(JSON.stringify({
          error: 'Message endpoint requires active SSE session',
          message: 'Please establish SSE connection first at /sse',
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        })
      } catch (error) {
        console.error('Message endpoint error:', error)
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