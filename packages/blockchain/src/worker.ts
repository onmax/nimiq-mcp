import { VERSION } from 'nimiq-mcp-core'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export async function handleBlockchainRequest(request: Request, env?: any): Promise<Response> {
  const url = new URL(request.url)

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  // Health check
  if (url.pathname === '/blockchain/health') {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'nimiq-mcp-blockchain',
      version: VERSION,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // Info endpoint
  if (url.pathname === '/blockchain/info' || url.pathname === '/blockchain') {
    const rpcUrl = env?.NIMIQ_RPC_URL || env?.DEFAULT_RPC_URL || 'https://rpc.nimiqwatch.com'
    return new Response(JSON.stringify({
      name: 'nimiq-mcp-blockchain',
      version: VERSION,
      description: 'MCP server for Nimiq blockchain data and RPC queries',
      rpcEndpoint: rpcUrl,
      hasAuth: !!(env?.NIMIQ_RPC_USERNAME && env?.NIMIQ_RPC_PASSWORD),
      capabilities: ['tools'],
      tools: [
        { name: 'query_blockchain', description: 'Query blockchain data (blocks, accounts, txs, validators, network)' },
        { name: 'calculate_blockchain', description: 'Calculate supply and staking rewards' },
        { name: 'get_nimiq_price', description: 'Get NIM price vs other currencies' },
      ],
      transport: 'http',
      note: 'For full MCP support, use the local STDIO version: npx nimiq-mcp-blockchain',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  return new Response(JSON.stringify({
    error: 'Not Found',
    message: `Path ${url.pathname} not found in blockchain`,
    availableEndpoints: ['/blockchain', '/blockchain/info', '/blockchain/health'],
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
