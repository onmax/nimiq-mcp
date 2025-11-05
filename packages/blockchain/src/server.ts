import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { parseArgs, VERSION } from 'nimiq-mcp-core'
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
        case 'query_blockchain':
          return await this.handleQueryBlockchain(args)
        case 'calculate_blockchain':
          return await this.handleCalculateBlockchain(args)
        case 'get_nimiq_price':
          return await handleGetNimPrice(args)
        default:
          throw new Error(`Unknown tool: ${name}`)
      }
    })
  }

  private async handleQueryBlockchain(args: any): Promise<any> {
    const { operation } = args

    switch (operation) {
      case 'get_head':
        return await handleGetHead(args, this.rpcUrl)
      case 'get_block_by_number':
        return await handleGetBlockByNumber(args, this.rpcUrl)
      case 'get_block_by_hash':
        return await handleGetBlockByHash(args, this.rpcUrl)
      case 'get_account':
        return await handleGetAccount(args, this.rpcUrl)
      case 'get_balance':
        return await handleGetBalance(args, this.rpcUrl)
      case 'get_transaction':
        return await handleGetTransaction(args, this.rpcUrl)
      case 'get_transactions_by_address':
        return await handleGetTransactionsByAddress(args, this.rpcUrl)
      case 'get_validators':
        return await handleGetValidators(args, this.rpcUrl)
      case 'get_validator':
        return await handleGetValidator(args, this.rpcUrl)
      case 'get_slots':
        return await handleGetSlots(args, this.rpcUrl)
      case 'get_epoch_number':
        return await handleGetEpochNumber(args, this.rpcUrl)
      case 'get_network_info':
        return await handleGetNetworkInfo(args, this.rpcUrl)
      case 'get_rpc_methods':
        return await handleGetRpcMethods(args)
      default:
        throw new Error(`Unknown query operation: ${operation}`)
    }
  }

  private async handleCalculateBlockchain(args: any): Promise<any> {
    const { operation } = args

    switch (operation) {
      case 'get_supply':
        return await handleGetSupply(args)
      case 'calculate_supply_at':
        return handleCalculateSupplyAt(args)
      case 'calculate_staking_rewards':
        return await handleCalculateStakingRewards(args)
      case 'interactive_staking_calculator':
        return await handleInteractiveStakingCalculator(args)
      default:
        throw new Error(`Unknown calculation operation: ${operation}`)
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
  }
}
