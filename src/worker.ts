import { handleBlockchainRequest } from '@nimiq-mcp/blockchain/worker'
import { VERSION } from '@nimiq-mcp/core'
import { handleWebClientRequest } from '@nimiq-mcp/web-client/worker'

export interface Env {
  DEFAULT_RPC_URL: string
  NIMIQ_RPC_URL?: string
  NIMIQ_RPC_USERNAME?: string
  NIMIQ_RPC_PASSWORD?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders })
    }

    // Route to web-client MCP server
    if (url.pathname.startsWith('/web-client')) {
      return handleWebClientRequest(request)
    }

    // Route to blockchain MCP server
    if (url.pathname.startsWith('/blockchain')) {
      return handleBlockchainRequest(request, env)
    }

    // Health check for root
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'nimiq-mcp',
        version: VERSION,
        servers: ['web-client', 'blockchain'],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Root landing page
    if (url.pathname === '/') {
      const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Nimiq MCP Servers</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; line-height: 1.6; background: #f9fafb; }
        .header { text-align: center; margin-bottom: 3rem; }
        .logo { width: 80px; height: 80px; margin: 0 auto 1rem; }
        .servers { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
        .server-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .server-card h3 { margin-top: 0; color: #1f2937; }
        .server-card p { color: #6b7280; margin: 0.5rem 0; }
        .server-card a { display: inline-block; margin-top: 1rem; padding: 0.5rem 1rem; background: #1f70c1; color: white; text-decoration: none; border-radius: 6px; }
        .server-card a:hover { background: #1e5fa0; }
        .badge { display: inline-block; background: #1f70c1; color: white; padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.875rem; margin: 0.25rem; }
        .footer { text-align: center; margin-top: 3rem; color: #6b7280; font-size: 0.875rem; }
        .footer a { color: #1f70c1; text-decoration: none; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">
            <img src="https://raw.githubusercontent.com/onmax/nimiq-mcp/refs/heads/main/.github/logo.svg" alt="Nimiq Logo" width="80" height="80" />
        </div>
        <h1>Nimiq MCP Servers</h1>
        <p>Model Context Protocol servers for Nimiq blockchain interactions</p>
        <div>
            <span class="badge">MCP v1.0.0</span>
            <span class="badge">Nimiq Albatross</span>
            <span class="badge">Cloudflare Workers</span>
        </div>
    </div>

    <div class="servers">
        <div class="server-card">
            <h3>🌐 Web Client Server</h3>
            <p><strong>Documentation & Resources</strong></p>
            <p>Search Nimiq documentation, access web client guides, protocol specs, and validator information.</p>
            <ul style="color: #6b7280; font-size: 0.9rem;">
                <li>1 tool: search_nimiq_docs</li>
                <li>3 resources: web-client, protocol, validators</li>
            </ul>
            <a href="/web-client">View Details →</a>
        </div>

        <div class="server-card">
            <h3>⛓️ Blockchain Server</h3>
            <p><strong>RPC Queries & Calculations</strong></p>
            <p>Query blockchain data, check balances, get validator info, calculate staking rewards, and fetch NIM prices.</p>
            <ul style="color: #6b7280; font-size: 0.9rem;">
                <li>18 tools: accounts, blocks, validators, supply, staking, price</li>
                <li>Direct RPC integration</li>
            </ul>
            <a href="/blockchain">View Details →</a>
        </div>
    </div>

    <h2 style="text-align: center; margin-top: 3rem;">MCP Client Setup</h2>
    <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h3>Local STDIO (Recommended)</h3>
        <p>For full MCP support, use the local STDIO versions:</p>
        <pre style="background: #f3f4f6; padding: 1rem; border-radius: 6px; overflow-x: auto;"><code>npx nimiq-mcp-web-client
npx nimiq-mcp-blockchain</code></pre>

        <h3 style="margin-top: 2rem;">Remote HTTP (Web Interface)</h3>
        <p>Access via web endpoints:</p>
        <ul>
            <li><strong>Web Client:</strong> <code>${url.origin}/web-client</code></li>
            <li><strong>Blockchain:</strong> <code>${url.origin}/blockchain</code></li>
        </ul>
    </div>

    <div class="footer">
        <p>
            Powered by <a href="https://nimiq.com" target="_blank">Nimiq</a> •
            <a href="https://modelcontextprotocol.io" target="_blank">MCP</a> •
            <a href="https://workers.cloudflare.com" target="_blank">Cloudflare Workers</a>
        </p>
        <p style="margin-top: 0.5rem;">
            <a href="/health">Health Check</a> •
            <a href="https://github.com/onmax/nimiq-mcp" target="_blank">GitHub</a>
        </p>
    </div>
</body>
</html>`

      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html', ...corsHeaders },
      })
    }

    // 404 for unknown paths
    return new Response(JSON.stringify({
      error: 'Not Found',
      message: `Path ${url.pathname} not found`,
      availableEndpoints: ['/', '/health', '/web-client', '/blockchain'],
      timestamp: new Date().toISOString(),
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  },
}
