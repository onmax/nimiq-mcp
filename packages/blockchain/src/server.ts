import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { parseArgs, VERSION } from '@nimiq-mcp/core'
import { TOOL_DEFINITIONS } from './tool-definitions.js'
import {
  handleCalculateStakingRewards,
  handleCalculateSupplyAt,
  handleGetAccount,
  handleGetBalance,
  handleGetBlockByHash,
  handleGetBlockByNumber,
  handleGetEpochNumber,
  handleGetHead,
  handleGetNetworkInfo,
  handleGetNimPrice,
  handleGetRpcMethods,
  handleGetSlots,
  handleGetSupply,
  handleGetTransaction,
  handleGetTransactionsByAddress,
  handleGetValidator,
  handleGetValidators,
  handleInteractiveStakingCalculator,
} from './tools/index.js'

export class BlockchainMcpServer {
  private server: Server
  private rpcUrl: string

  constructor() {
    const config = parseArgs()
    this.rpcUrl = config.rpcUrl

    this.server = new Server(
      { name: 'nimiq-mcp-blockchain', version: VERSION },
      { capabilities: { tools: {} } },
    )

    this.setupHandlers()
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOL_DEFINITIONS,
    }))

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      switch (name) {
        case 'get_nimiq_supply':
          return await handleGetSupply(args)
        case 'calculate_nimiq_supply_at':
          return handleCalculateSupplyAt(args)
        case 'calculate_nimiq_staking_rewards':
          return await handleCalculateStakingRewards(args)
        case 'get_nimiq_price':
          return await handleGetNimPrice(args)
        case 'get_nimiq_head':
          return await handleGetHead(args, this.rpcUrl)
        case 'get_nimiq_block_by_number':
          return await handleGetBlockByNumber(args, this.rpcUrl)
        case 'get_nimiq_block_by_hash':
          return await handleGetBlockByHash(args, this.rpcUrl)
        case 'get_nimiq_account':
          return await handleGetAccount(args, this.rpcUrl)
        case 'get_nimiq_balance':
          return await handleGetBalance(args, this.rpcUrl)
        case 'get_nimiq_transaction':
          return await handleGetTransaction(args, this.rpcUrl)
        case 'get_nimiq_transactions_by_address':
          return await handleGetTransactionsByAddress(args, this.rpcUrl)
        case 'get_nimiq_validators':
          return await handleGetValidators(args, this.rpcUrl)
        case 'get_nimiq_validator':
          return await handleGetValidator(args, this.rpcUrl)
        case 'get_nimiq_slots':
          return await handleGetSlots(args, this.rpcUrl)
        case 'get_nimiq_epoch_number':
          return await handleGetEpochNumber(args, this.rpcUrl)
        case 'get_nimiq_network_info':
          return await handleGetNetworkInfo(args, this.rpcUrl)
        case 'get_nimiq_rpc_methods':
          return await handleGetRpcMethods(args)
        case 'interactive_staking_calculator':
          return await handleInteractiveStakingCalculator(args)
        default:
          throw new Error(`Unknown tool: ${name}`)
      }
    })
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
  }
}
