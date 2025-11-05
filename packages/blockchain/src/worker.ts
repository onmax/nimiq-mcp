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
        { name: 'get_nimiq_supply', description: 'Get current NIM supply' },
        { name: 'calculate_nimiq_supply_at', description: 'Calculate supply at timestamp' },
        { name: 'calculate_nimiq_staking_rewards', description: 'Calculate staking rewards' },
        { name: 'interactive_staking_calculator', description: 'Interactive staking calculator' },
        { name: 'get_nimiq_price', description: 'Get NIM price' },
        { name: 'get_nimiq_head', description: 'Get head block' },
        { name: 'get_nimiq_block_by_number', description: 'Get block by number' },
        { name: 'get_nimiq_block_by_hash', description: 'Get block by hash' },
        { name: 'get_nimiq_account', description: 'Get account info' },
        { name: 'get_nimiq_balance', description: 'Get account balance' },
        { name: 'get_nimiq_transaction', description: 'Get transaction details' },
        { name: 'get_nimiq_transactions_by_address', description: 'Get transactions by address' },
        { name: 'get_nimiq_validators', description: 'Get validator information' },
        { name: 'get_nimiq_validator', description: 'Get specific validator' },
        { name: 'get_nimiq_slots', description: 'Get validator slots' },
        { name: 'get_nimiq_epoch_number', description: 'Get epoch number' },
        { name: 'get_nimiq_network_info', description: 'Get network info' },
        { name: 'get_nimiq_rpc_methods', description: 'Get RPC methods' },
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
