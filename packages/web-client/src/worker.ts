import { VERSION } from 'nimiq-mcp-core'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export async function handleWebClientRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  // Health check
  if (url.pathname === '/web-client/health') {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'nimiq-mcp-web-client',
      version: VERSION,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // Info endpoint
  if (url.pathname === '/web-client/info' || url.pathname === '/web-client') {
    return new Response(JSON.stringify({
      name: 'nimiq-mcp-web-client',
      version: VERSION,
      description: 'MCP server for Nimiq documentation and web client resources',
      capabilities: ['tools', 'resources'],
      tools: [{ name: 'search_nimiq_docs', description: 'Search Nimiq documentation' }],
      resources: ['nimiq://docs/web-client', 'nimiq://docs/protocol', 'nimiq://docs/validators'],
      transport: 'http',
      note: 'For full MCP support, use the local STDIO version: npx nimiq-mcp-web-client',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  return new Response(JSON.stringify({
    error: 'Not Found',
    message: `Path ${url.pathname} not found in web-client`,
    availableEndpoints: ['/web-client', '/web-client/info', '/web-client/health'],
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
