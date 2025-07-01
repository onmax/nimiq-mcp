#!/usr/bin/env node

import type { Provider } from '@nimiq/utils/fiat-api'
import process from 'node:process'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { CryptoCurrency, FiatCurrency, getExchangeRates } from '@nimiq/utils/fiat-api'
import { calculateStakingRewards } from '@nimiq/utils/rewards-calculator'
import { posSupplyAt } from '@nimiq/utils/supply-calculator'
import MiniSearch from 'minisearch'
import { initRpcClient } from 'nimiq-rpc-client-ts/client'
import {
  getAccountByAddress,
  getActiveValidators,
  getBlockByHash,
  getBlockByNumber,
  getBlockNumber,
  getEpochNumber,
  getPeerCount,
  getSlotAt,
  getTransactionByHash,
  getTransactionsByAddress,
  getValidatorByAddress,
  getValidators,
  isConsensusEstablished,
} from 'nimiq-rpc-client-ts/http'
import * as v from 'valibot'

interface CliConfig {
  rpcUrl: string
  rpcUsername?: string
  rpcPassword?: string
}

// Valibot schemas for input validation
const SupplyAtSchema = v.object({
  timestampMs: v.pipe(v.number(), v.description('The timestamp in milliseconds at which to calculate the PoS supply')),
  network: v.optional(v.pipe(v.picklist(['main-albatross', 'test-albatross']), v.description('The network name')), 'main-albatross'),
})

const StakingRewardsSchema = v.object({
  stakedSupplyRatio: v.optional(v.pipe(v.number(), v.description('The ratio of the total staked cryptocurrency to the total supply. If not provided, the current staked ratio will be used instead.'))),
  amount: v.optional(v.pipe(v.number(), v.description('The initial amount of cryptocurrency staked, in NIM')), 1),
  days: v.optional(v.pipe(v.number(), v.description('The number of days the cryptocurrency is staked')), 365),
  autoRestake: v.optional(v.pipe(v.boolean(), v.description('Indicates whether the staking rewards are restaked')), true),
  network: v.optional(v.pipe(v.picklist(['main-albatross', 'test-albatross']), v.description('The network name')), 'main-albatross'),
  fee: v.optional(v.pipe(v.number(), v.description('The fee percentage that the pool charges for staking')), 0),
})

const PriceSchema = v.object({
  currencies: v.pipe(v.array(v.string()), v.description('An array of currency tickers to get the price against (e.g., ["USD", "EUR", "BTC"])')),
  provider: v.optional(v.pipe(v.picklist(['CryptoCompare', 'CoinGecko']), v.description('The provider to use for fetching prices')), 'CryptoCompare'),
})

const BlockByNumberSchema = v.object({
  blockNumber: v.pipe(v.number(), v.description('The block number to retrieve')),
  includeBody: v.optional(v.pipe(v.boolean(), v.description('Whether to include the block body with transactions')), false),
})

const BlockByHashSchema = v.object({
  hash: v.pipe(v.string(), v.description('The block hash to retrieve')),
  includeBody: v.optional(v.pipe(v.boolean(), v.description('Whether to include the block body with transactions')), false),
})

const AccountSchema = v.object({
  address: v.pipe(v.string(), v.description('The Nimiq address to get account information for')),
  withMetadata: v.optional(v.pipe(v.boolean(), v.description('Whether to include additional metadata')), false),
})

const TransactionSchema = v.object({
  hash: v.pipe(v.string(), v.description('The transaction hash to retrieve')),
})

const TransactionsByAddressSchema = v.object({
  address: v.pipe(v.string(), v.description('The Nimiq address to get transactions for')),
  max: v.optional(v.pipe(v.number(), v.description('Maximum number of transactions to return')), 100),
  startAt: v.optional(v.pipe(v.string(), v.description('Transaction hash to start at, used for paging'))),
  onlyConfirmed: v.optional(v.pipe(v.boolean(), v.description('Whether to only return confirmed transactions')), true),
})

const ValidatorsSchema = v.object({
  includeStakers: v.optional(v.pipe(v.boolean(), v.description('Whether to include staker information for each validator')), false),
  onlyActive: v.optional(v.pipe(v.boolean(), v.description('If true, returns only active validators. If false, returns all validators.')), true),
})

const ValidatorSchema = v.object({
  address: v.pipe(v.string(), v.description('The validator address to get information for')),
})

const SlotsSchema = v.object({
  blockNumber: v.optional(v.pipe(v.number(), v.description('Block number to get slots for (optional, defaults to current)'))),
})

const HeadSchema = v.object({
  includeBody: v.optional(v.pipe(v.boolean(), v.description('Whether to include the block body with transactions')), false),
})

const RpcMethodsSchema = v.object({
  includeSchemas: v.optional(v.pipe(v.boolean(), v.description('Whether to include parameter and result schemas for each method')), false),
})

const SearchDocsSchema = v.object({
  query: v.pipe(v.string(), v.description('The search query to find relevant documentation sections. Use 2-4 specific keywords for best results (e.g., "transaction fee", "validator rewards", "web client setup")')),
  limit: v.optional(v.pipe(v.number(), v.description('Maximum number of search results to return (default: 10)')), 10),
})

// Utility function for validating inputs with Valibot
function validateInput<T>(schema: v.GenericSchema<T>, input: unknown): T {
  try {
    const result = v.parse(schema, input)
    return result
  }
  catch (error) {
    if (v.isValiError(error)) {
      const issues = v.flatten(error.issues)
      const errorMessages = Object.entries(issues.nested || {}).map(([key, value]) =>
        `${key}: ${Array.isArray(value) ? value.join(', ') : value}`,
      )
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid input parameters: ${errorMessages.join('; ')}`,
      )
    }
    throw new McpError(ErrorCode.InvalidParams, 'Invalid input parameters')
  }
}

// Parse CLI arguments
function parseArgs(): CliConfig {
  const args = process.argv.slice(2)
  const config: CliConfig = {
    rpcUrl: 'https://rpc.nimiqwatch.com',
    rpcUsername: undefined,
    rpcPassword: undefined,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--rpc-url':
        config.rpcUrl = args[++i]
        break
      case '--rpc-username':
        config.rpcUsername = args[++i]
        break
      case '--rpc-password':
        config.rpcPassword = args[++i]
        break
      case '--help':
      case '-h':
        console.error(`
Nimiq MCP Server

Usage: nimiq-mcp [options]

Options:
  --rpc-url <url>         Nimiq RPC endpoint URL (default: https://rpc.nimiqwatch.com)
  --rpc-username <user>   RPC username for authentication (optional)
  --rpc-password <pass>   RPC password for authentication (optional)
  --help, -h              Show this help message

Examples:
  nimiq-mcp
  nimiq-mcp --rpc-url https://rpc.nimiqwatch.com
  nimiq-mcp --rpc-url https://localhost:8648 --rpc-username user --rpc-password pass
`)
        process.exit(0)
        break
    }
  }

  return config
}

class NimiqMcpServer {
  private server: Server
  private rpcInitialized = false
  private config: CliConfig
  private searchIndex: MiniSearch | null = null
  private cachedDocs: string | null = null

  constructor() {
    this.config = parseArgs()

    this.server = new Server(
      {
        name: 'nimiq-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    )

    this.setupToolHandlers()
    this.setupResourceHandlers()
    this.setupErrorHandling()
  }

  private initializeRpc(): void {
    if (this.rpcInitialized)
      return

    const config: any = { url: this.config.rpcUrl }
    if (this.config.rpcUsername && this.config.rpcPassword) {
      config.auth = {
        username: this.config.rpcUsername,
        password: this.config.rpcPassword,
      }
    }

    initRpcClient(config)
    this.rpcInitialized = true
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_nimiq_supply',
            description: 'Get the current supply of NIM. Returns an object with the following supply fields: total, vested, burned, max, initial, staking, minted, circulating, and mined. All values are in Luna (1 NIM = 100,000 Luna).',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
          {
            name: 'calculate_nimiq_supply_at',
            description: 'Calculate the Nimiq PoS supply at a given time',
            inputSchema: {
              type: 'object',
              properties: {
                timestampMs: {
                  type: 'number',
                  description: 'The timestamp in milliseconds at which to calculate the PoS supply',
                },
                network: {
                  type: 'string',
                  enum: ['main-albatross', 'test-albatross'],
                  description: 'The network name',
                  default: 'main-albatross',
                },
              },
              required: ['timestampMs'],
              additionalProperties: false,
            },
          },
          {
            name: 'calculate_nimiq_staking_rewards',
            description: 'Calculates the potential wealth accumulation based on staking. If `stakedSupplyRatio` is not provided, the current staked ratio will be used instead.',
            inputSchema: {
              type: 'object',
              properties: {
                stakedSupplyRatio: {
                  type: 'number',
                  description: 'The ratio of the total staked cryptocurrency to the total supply. If not provided, the current staked ratio will be used instead.',
                },
                amount: {
                  type: 'number',
                  description: 'The initial amount of cryptocurrency staked, in NIM',
                  default: 1,
                },
                days: {
                  type: 'number',
                  description: 'The number of days the cryptocurrency is staked',
                  default: 365,
                },
                autoRestake: {
                  type: 'boolean',
                  description: 'Indicates whether the staking rewards are restaked',
                  default: true,
                },
                network: {
                  type: 'string',
                  enum: ['main-albatross', 'test-albatross'],
                  description: 'The network name',
                  default: 'main-albatross',
                },
                fee: {
                  type: 'number',
                  description: 'The fee percentage that the pool charges for staking',
                  default: 0,
                },
              },
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_price',
            description: 'Get the price of NIM against other currencies',
            inputSchema: {
              type: 'object',
              properties: {
                currencies: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'An array of currency tickers to get the price against (e.g., ["USD", "EUR", "BTC"])',
                },
                provider: {
                  type: 'string',
                  enum: ['CryptoCompare', 'CoinGecko'],
                  description: 'The provider to use for fetching prices',
                  default: 'CryptoCompare',
                },
              },
              required: ['currencies'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_head',
            description: 'Get the current head block of the Nimiq blockchain',
            inputSchema: {
              type: 'object',
              properties: {
                includeBody: {
                  type: 'boolean',
                  description: 'Whether to include the block body with transactions',
                  default: false,
                },
              },
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_block_by_number',
            description: 'Get a Nimiq block by its number',
            inputSchema: {
              type: 'object',
              properties: {
                blockNumber: {
                  type: 'number',
                  description: 'The block number to retrieve',
                },
                includeBody: {
                  type: 'boolean',
                  description: 'Whether to include the block body with transactions',
                  default: false,
                },
              },
              required: ['blockNumber'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_block_by_hash',
            description: 'Get a Nimiq block by its hash',
            inputSchema: {
              type: 'object',
              properties: {
                hash: {
                  type: 'string',
                  description: 'The block hash to retrieve',
                },
                includeBody: {
                  type: 'boolean',
                  description: 'Whether to include the block body with transactions',
                  default: false,
                },
              },
              required: ['hash'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_account',
            description: 'Get Nimiq account information by address',
            inputSchema: {
              type: 'object',
              properties: {
                address: {
                  type: 'string',
                  description: 'The Nimiq address to get account information for',
                },
                withMetadata: {
                  type: 'boolean',
                  description: 'Whether to include additional metadata',
                  default: false,
                },
              },
              required: ['address'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_balance',
            description: 'Get the balance of a Nimiq account',
            inputSchema: {
              type: 'object',
              properties: {
                address: {
                  type: 'string',
                  description: 'The Nimiq address to get balance for',
                },
                withMetadata: {
                  type: 'boolean',
                  description: 'Whether to include additional metadata',
                  default: false,
                },
              },
              required: ['address'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_transaction',
            description: 'Get Nimiq transaction details by hash',
            inputSchema: {
              type: 'object',
              properties: {
                hash: {
                  type: 'string',
                  description: 'The transaction hash to retrieve',
                },
              },
              required: ['hash'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_transactions_by_address',
            description: 'Get Nimiq transactions for a specific address',
            inputSchema: {
              type: 'object',
              properties: {
                address: {
                  type: 'string',
                  description: 'The Nimiq address to get transactions for',
                },
                max: {
                  type: 'number',
                  description: 'Maximum number of transactions to return',
                  default: 100,
                },
                startAt: {
                  type: 'string',
                  description: 'Transaction hash to start at, used for paging',
                },
                onlyConfirmed: {
                  type: 'boolean',
                  description: 'Whether to only return confirmed transactions',
                  default: true,
                },
              },
              required: ['address'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_validators',
            description: 'Get information about Nimiq validators. By default, it returns only active validators.',
            inputSchema: {
              type: 'object',
              properties: {
                includeStakers: {
                  type: 'boolean',
                  description: 'Whether to include staker information for each validator',
                  default: false,
                },
                onlyActive: {
                  type: 'boolean',
                  description: 'If true, returns only active validators. If false, returns all validators.',
                  default: true,
                },
              },
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_validator',
            description: 'Get Nimiq validator information by address',
            inputSchema: {
              type: 'object',
              properties: {
                address: {
                  type: 'string',
                  description: 'The validator address to get information for',
                },
              },
              required: ['address'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_slots',
            description: 'Get Nimiq validator slots information',
            inputSchema: {
              type: 'object',
              properties: {
                blockNumber: {
                  type: 'number',
                  description: 'Block number to get slots for (optional, defaults to current)',
                },
              },
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_epoch_number',
            description: 'Get the current Nimiq epoch number',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_network_info',
            description: 'Get Nimiq network information including peer count and sync status',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_rpc_methods',
            description: 'Get all available Nimiq RPC methods from the latest OpenRPC document',
            inputSchema: {
              type: 'object',
              properties: {
                includeSchemas: {
                  type: 'boolean',
                  description: 'Whether to include parameter and result schemas for each method',
                  default: false,
                },
              },
              additionalProperties: false,
            },
          },

          {
            name: 'search_nimiq_docs',
            description: 'Search through the Nimiq documentation using full-text search. For best results, use specific keywords rather than full sentences (e.g., "validator staking" instead of "how do I stake with a validator")',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query to find relevant documentation sections. Use 2-4 specific keywords for best results (e.g., "transaction fee", "validator rewards", "web client setup")',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of search results to return (default: 10)',
                  default: 10,
                },
              },
              required: ['query'],
              additionalProperties: false,
            },
          },
        ],
      }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      // The get_nimiq_supply tool doesn't need RPC, so we handle it before the initialization.
      if (name === 'get_nimiq_supply')
        return await this.handleGetSupply(args)
      if (name === 'calculate_nimiq_supply_at')
        return this.handleCalculateSupplyAt(args)
      if (name === 'calculate_nimiq_staking_rewards')
        return await this.handleCalculateStakingRewards(args)
      if (name === 'get_nimiq_price')
        return this.handleGetNimPrice(args)

      this.initializeRpc()

      try {
        switch (name) {
          case 'get_nimiq_head':
            return await this.handleGetHead(args)
          case 'get_nimiq_block_by_number':
            return await this.handleGetBlockByNumber(args)
          case 'get_nimiq_block_by_hash':
            return await this.handleGetBlockByHash(args)
          case 'get_nimiq_account':
            return await this.handleGetAccount(args)
          case 'get_nimiq_balance':
            return await this.handleGetBalance(args)
          case 'get_nimiq_transaction':
            return await this.handleGetTransaction(args)
          case 'get_nimiq_transactions_by_address':
            return await this.handleGetTransactionsByAddress(args)
          case 'get_nimiq_validators':
            return await this.handleGetValidators(args)
          case 'get_nimiq_validator':
            return await this.handleGetValidator(args)
          case 'get_nimiq_slots':
            return await this.handleGetSlots(args)
          case 'get_nimiq_epoch_number':
            return await this.handleGetEpochNumber(args)
          case 'get_nimiq_network_info':
            return await this.handleGetNetworkInfo(args)
          case 'get_nimiq_rpc_methods':
            return await this.handleGetRpcMethods(args)

          case 'search_nimiq_docs':
            return await this.handleSearchDocs(args)

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`,
            )
        }
      }
      catch (error) {
        if (error instanceof McpError) {
          throw error
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    })
  }

  private async getSupplyData(): Promise<any> {
    const response = await fetch('https://nim.sh/stats/supply.json')
    if (!response.ok)
      throw new Error(`Failed to fetch supply data: ${response.statusText}`)

    return response.json()
  }

  private async handleGetSupply(_args: any): Promise<any> {
    try {
      const data = await this.getSupplyData()
      return {
        ...data,
        updatedAt: new Date().toISOString(),
      }
    }
    catch (error: any) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Error fetching supply data: ${error.message}`,
      )
    }
  }

  private handleCalculateSupplyAt(args: any): any {
    const validatedInput = validateInput(SupplyAtSchema, args)
    const { timestampMs, network } = validatedInput
    const supply = posSupplyAt(timestampMs, { network })
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            timestampMs,
            network,
            supply,
          }, null, 2),
        },
      ],
    }
  }

  private async handleCalculateStakingRewards(args: any): Promise<any> {
    const validatedInput = validateInput(StakingRewardsSchema, args)
    const newArgs = { ...validatedInput }

    if (newArgs.stakedSupplyRatio === undefined || newArgs.stakedSupplyRatio === null) {
      try {
        const supplyData = await this.getSupplyData()
        if (supplyData.circulating > 0) {
          newArgs.stakedSupplyRatio = supplyData.staking / supplyData.circulating
        }
        else {
          // Fallback or error if total supply is 0
          throw new Error('Circulating supply is zero, cannot calculate staking ratio.')
        }
      }
      catch (error: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to fetch supply data to calculate staking ratio: ${error.message}`,
        )
      }
    }

    const rewards = calculateStakingRewards(newArgs as any)
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(rewards, null, 2),
        },
      ],
    }
  }

  private async handleGetNimPrice(args: any): Promise<any> {
    const validatedInput = validateInput(PriceSchema, args)
    const { currencies, provider } = validatedInput
    const typedProvider = provider as Provider
    const vsCurrencies = currencies.map((c: string) => c.toUpperCase())

    // Separate crypto and fiat currencies
    const cryptoCurrencies = vsCurrencies.filter((c: string) => c in CryptoCurrency) as CryptoCurrency[]
    const fiatCurrencies = vsCurrencies.filter((c: string) => c in FiatCurrency) as FiatCurrency[]

    try {
      const cryptoRates: { nim?: Record<string, number | undefined> } = cryptoCurrencies.length > 0
        ? await getExchangeRates([CryptoCurrency.NIM], cryptoCurrencies, typedProvider)
        : {}

      const fiatRates: { nim?: Record<string, number | undefined> } = fiatCurrencies.length > 0
        // The type from the library is not correct, we cast to any to make it work
        ? await getExchangeRates([CryptoCurrency.NIM], fiatCurrencies as any, typedProvider)
        : {}

      const rates = { ...(cryptoRates.nim || {}), ...(fiatRates.nim || {}) }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              nimPrice: rates,
              provider,
              updatedAt: new Date().toISOString(),
            }, null, 2),
          },
        ],
      }
    }
    catch (error: any) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Error fetching NIM price: ${error.message}`,
      )
    }
  }

  private async handleGetHead(args: any): Promise<any> {
    const validatedInput = validateInput(HeadSchema, args)
    const { includeBody } = validatedInput

    // Get the current block number (head)
    const [blockNumberSuccess, blockNumberError, blockNumber] = await getBlockNumber()

    if (!blockNumberSuccess || !blockNumber) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get current block number: ${blockNumberError || 'Unknown error'}`,
      )
    }

    // Get the head block details
    const [blockSuccess, blockError, headBlock] = await getBlockByNumber(
      { blockNumber, includeBody },
      {},
    )

    if (!blockSuccess || !headBlock) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get head block: ${blockError || 'Unknown error'}`,
      )
    }

    // Determine network based on RPC URL
    const network = this.config.rpcUrl.includes('testnet') ? 'testnet' : 'mainnet'

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            blockNumber,
            block: headBlock,
            timestamp: new Date().toISOString(),
            network,
          }, null, 2),
        },
      ],
    }
  }

  private async handleGetBlockByNumber(args: any): Promise<any> {
    const validatedInput = validateInput(BlockByNumberSchema, args)
    const { blockNumber, includeBody } = validatedInput

    const [success, error, block] = await getBlockByNumber(
      { blockNumber, includeBody },
      {},
    )

    if (!success || !block) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get block ${blockNumber}: ${error || 'Unknown error'}`,
      )
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            blockNumber,
            block,
            network: this.config.rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
          }, null, 2),
        },
      ],
    }
  }

  private async handleGetBlockByHash(args: any): Promise<any> {
    const validatedInput = validateInput(BlockByHashSchema, args)
    const { hash, includeBody } = validatedInput

    const [success, error, block] = await getBlockByHash(
      { hash, includeBody: includeBody || false },
      {},
    )

    if (!success || !block) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get block ${hash}: ${error || 'Unknown error'}`,
      )
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            hash,
            block,
            network: this.config.rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
          }, null, 2),
        },
      ],
    }
  }

  private async handleGetAccount(args: any): Promise<any> {
    const validatedInput = validateInput(AccountSchema, args)
    const { address, withMetadata } = validatedInput

    const params: any = {}
    if (withMetadata !== undefined)
      params.withMetadata = withMetadata

    const [success, error, account] = await getAccountByAddress({ address }, params)

    if (!success || !account) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get account ${address}: ${error || 'Unknown error'}`,
      )
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            address,
            account,
            network: this.config.rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
          }, null, 2),
        },
      ],
    }
  }

  private async handleGetBalance(args: any): Promise<any> {
    const validatedInput = validateInput(AccountSchema, args)
    const { address, withMetadata } = validatedInput

    const params: any = {}
    if (withMetadata !== undefined)
      params.withMetadata = withMetadata

    const [success, error, account] = await getAccountByAddress({ address }, params)

    if (!success || !account) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get account for ${address}: ${error || 'Unknown error'}`,
      )
    }

    const balance = account.balance || 0

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            address,
            balance,
            balanceNIM: balance / 100000, // Convert Luna to NIM
            network: this.config.rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
          }, null, 2),
        },
      ],
    }
  }

  private async handleGetTransaction(args: any): Promise<any> {
    const validatedInput = validateInput(TransactionSchema, args)
    const { hash } = validatedInput

    const [success, error, transaction] = await getTransactionByHash({ hash }, {})

    if (!success || !transaction) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get transaction ${hash}: ${error || 'Unknown error'}`,
      )
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            hash,
            transaction,
            network: this.config.rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
          }, null, 2),
        },
      ],
    }
  }

  private async handleGetTransactionsByAddress(args: any): Promise<any> {
    const validatedInput = validateInput(TransactionsByAddressSchema, args)
    const { address, max, startAt, onlyConfirmed } = validatedInput

    const params: any = { address, max }
    if (startAt)
      params.startAt = startAt
    if (onlyConfirmed !== undefined)
      params.onlyConfirmed = onlyConfirmed

    const [success, error, transactions] = await getTransactionsByAddress(
      params,
      {},
    )

    if (!success || !transactions) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get transactions for ${address}: ${error || 'Unknown error'}`,
      )
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            address,
            transactionCount: Array.isArray(transactions) ? transactions.length : 0,
            transactions,
            network: this.config.rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
          }, null, 2),
        },
      ],
    }
  }

  private async handleGetValidators(args: any): Promise<any> {
    const validatedInput = validateInput(ValidatorsSchema, args)
    const { includeStakers, onlyActive } = validatedInput

    const params: any = {}
    if (includeStakers !== undefined)
      params.includeStakers = includeStakers

    const [success, error, rpcValidators] = onlyActive
      ? await getActiveValidators(params)
      : await getValidators(params)

    if (!success || !rpcValidators) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get validators: ${error || 'Unknown error'}`,
      )
    }

    const network = this.config.rpcUrl.includes('testnet') ? 'testnet' : 'mainnet'
    const apiUrl = `https://validators-api-${network}.pages.dev/api/v1/validators`
    let mergedValidators = rpcValidators
    let apiError: string | null = null

    try {
      const apiResponse = await fetch(apiUrl)
      if (apiResponse.ok) {
        const apiValidators = await apiResponse.json()
        if (Array.isArray(apiValidators)) {
          const apiValidatorsMap = new Map(apiValidators.map(v => [v.address, v]))
          mergedValidators = rpcValidators.map((rpcValidator: any) => {
            const apiData = apiValidatorsMap.get(rpcValidator.address)
            return apiData ? { ...rpcValidator, ...apiData } : rpcValidator
          })
        }
      }
      else {
        apiError = `Failed to fetch from validators API: ${apiResponse.statusText}`
      }
    }
    catch (e: any) {
      apiError = `Error fetching from validators API: ${e.message}`
    }

    const response: any = {
      validatorCount: Array.isArray(mergedValidators) ? mergedValidators.length : 0,
      validators: mergedValidators,
      network,
    }

    if (apiError)
      response.apiWarning = apiError

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    }
  }

  private async handleGetValidator(args: any): Promise<any> {
    const validatedInput = validateInput(ValidatorSchema, args)
    const { address } = validatedInput

    const [success, error, validator] = await getValidatorByAddress({ address }, {})

    if (!success || !validator) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get validator ${address}: ${error || 'Unknown error'}`,
      )
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            address,
            validator,
            network: this.config.rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
          }, null, 2),
        },
      ],
    }
  }

  private async handleGetSlots(args: any): Promise<any> {
    const validatedInput = validateInput(SlotsSchema, args)
    const { blockNumber } = validatedInput

    if (!blockNumber) {
      const [blockNumSuccess, blockNumError, currentBlockNumber] = await getBlockNumber()
      if (!blockNumSuccess || !currentBlockNumber) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to get current block number: ${blockNumError || 'Unknown error'}`,
        )
      }

      const [success, error, slot] = await getSlotAt({ blockNumber: currentBlockNumber }, {})

      if (!success || !slot) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to get slot at current block: ${error || 'Unknown error'}`,
        )
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              blockNumber: currentBlockNumber,
              slot,
              network: this.config.rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
            }, null, 2),
          },
        ],
      }
    }
    else {
      const [success, error, slot] = await getSlotAt({ blockNumber }, {})

      if (!success || !slot) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to get slot at block ${blockNumber}: ${error || 'Unknown error'}`,
        )
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              blockNumber,
              slot,
              network: this.config.rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
            }, null, 2),
          },
        ],
      }
    }
  }

  private async handleGetEpochNumber(_args: any): Promise<any> {
    const [success, error, epochNumber] = await getEpochNumber({})

    if (!success || epochNumber === undefined) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get epoch number: ${error || 'Unknown error'}`,
      )
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            epochNumber,
            network: this.config.rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
          }, null, 2),
        },
      ],
    }
  }

  private async handleGetNetworkInfo(_args: any): Promise<any> {
    const [
      [peerSuccess, peerError, peerCount],
      [consensusSuccess, consensusError, consensusEstablished],
    ] = await Promise.all([
      getPeerCount({}),
      isConsensusEstablished({}),
    ])

    const networkInfo: any = {
      network: this.config.rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
      rpcUrl: this.config.rpcUrl,
    }

    if (peerSuccess && peerCount !== undefined) {
      networkInfo.peerCount = peerCount
    }
    else {
      networkInfo.peerCountError = peerError
    }

    if (consensusSuccess && consensusEstablished !== undefined) {
      networkInfo.consensusEstablished = consensusEstablished
    }
    else {
      networkInfo.consensusError = consensusError
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(networkInfo, null, 2),
        },
      ],
    }
  }

  private async handleGetRpcMethods(args: any): Promise<any> {
    const validatedInput = validateInput(RpcMethodsSchema, args)
    const { includeSchemas } = validatedInput

    try {
      // Get the latest release from GitHub API
      const latestRelease = await this.getLatestNimiqRelease()

      // Download the OpenRPC document
      const openRpcDoc = await this.downloadOpenRpcDocument(latestRelease.version)

      // Extract methods from the OpenRPC document
      const methods = this.extractRpcMethods(openRpcDoc, includeSchemas ?? false)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              version: latestRelease.version,
              releaseUrl: latestRelease.url,
              downloadedAt: new Date().toISOString(),
              methodCount: methods.length,
              methods,
            }, null, 2),
          },
        ],
      }
    }
    catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get RPC methods: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async getLatestNimiqRelease(): Promise<{ version: string, url: string }> {
    const response = await fetch('https://api.github.com/repos/nimiq/core-rs-albatross/releases/latest')

    if (!response.ok) {
      throw new Error(`Failed to fetch latest release: ${response.status} ${response.statusText}`)
    }

    const release = await response.json()

    return {
      version: release.tag_name,
      url: release.html_url,
    }
  }

  private async downloadOpenRpcDocument(version: string): Promise<any> {
    const downloadUrl = `https://github.com/nimiq/core-rs-albatross/releases/download/${version}/openrpc-document.json`

    const response = await fetch(downloadUrl)

    if (!response.ok) {
      throw new Error(`Failed to download OpenRPC document: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  private extractRpcMethods(openRpcDoc: any, includeSchemas: boolean): any[] {
    if (!openRpcDoc.methods || !Array.isArray(openRpcDoc.methods)) {
      throw new Error('Invalid OpenRPC document: methods not found')
    }

    return openRpcDoc.methods.map((method: any) => {
      const extractedMethod: any = {
        name: method.name,
        description: method.description || '',
        tags: method.tags || [],
      }

      if (includeSchemas) {
        extractedMethod.params = method.params || []
        extractedMethod.result = method.result || null

        // Add parameter details for better understanding
        if (method.params && method.params.length > 0) {
          extractedMethod.parameterSummary = method.params.map((param: any) => ({
            name: param.name,
            type: param.schema?.type || 'unknown',
            required: param.required || false,
            description: param.description || param.schema?.description || '',
          }))
        }

        // Add result details
        if (method.result) {
          extractedMethod.resultSummary = {
            name: method.result.name,
            type: method.result.schema?.type || 'unknown',
            description: method.result.description || method.result.schema?.description || '',
          }
        }
      }
      else {
        // Simplified view - just show parameter names and types
        if (method.params && method.params.length > 0) {
          extractedMethod.parameters = method.params.map((param: any) => ({
            name: param.name,
            type: param.schema?.type || 'unknown',
            required: param.required || false,
          }))
        }

        if (method.result) {
          extractedMethod.returns = method.result.schema?.type || 'unknown'
        }
      }

      return extractedMethod
    })
  }

  private async initializeSearchIndex(): Promise<void> {
    if (this.searchIndex && this.cachedDocs) {
      return // Already initialized
    }

    try {
      const docsUrl = 'https://nimiq.com/developers/llms-full.txt'
      const response = await fetch(docsUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch documentation: ${response.status} ${response.statusText}`)
      }

      const docsContent = await response.text()
      this.cachedDocs = docsContent

      // Split the documentation into sections for better search results
      const sections = this.splitIntoSections(docsContent)

      // Initialize MiniSearch
      this.searchIndex = new MiniSearch({
        fields: ['title', 'content'], // fields to index for full-text search
        storeFields: ['title', 'content', 'section'], // fields to return with search results
        searchOptions: {
          boost: { title: 2 }, // boost title matches
          fuzzy: 0.2, // allow some typos
        },
      })

      // Add sections to the search index
      this.searchIndex.addAll(sections)
    }
    catch (error) {
      throw new Error(`Failed to initialize search index: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private splitIntoSections(content: string): Array<{ id: string, title: string, content: string, section: string }> {
    // Split content by major sections (lines starting with # or ##)
    const lines = content.split('\n')
    const sections: Array<{ id: string, title: string, content: string, section: string }> = []
    let currentSection = ''
    let currentTitle = 'Introduction'
    let currentContent: string[] = []
    let sectionCounter = 0

    for (const line of lines) {
      // Check if it's a heading (# or ##)
      if (line.match(/^#+\s+/)) {
        // Save previous section if it has content
        if (currentContent.length > 0) {
          sections.push({
            id: `section_${sectionCounter++}`,
            title: currentTitle,
            content: currentContent.join('\n').trim(),
            section: currentSection,
          })
          currentContent = []
        }

        // Start new section
        currentTitle = line.replace(/^#+\s+/, '').trim()
        currentSection = currentTitle
      }
      else {
        currentContent.push(line)
      }
    }

    // Add the last section
    if (currentContent.length > 0) {
      sections.push({
        id: `section_${sectionCounter}`,
        title: currentTitle,
        content: currentContent.join('\n').trim(),
        section: currentSection,
      })
    }

    return sections
  }

  private async handleSearchDocs(args: any): Promise<any> {
    try {
      const validatedInput = validateInput(SearchDocsSchema, args)
      const { query, limit } = validatedInput

      // Initialize search index if not already done
      await this.initializeSearchIndex()

      if (!this.searchIndex) {
        throw new Error('Search index not initialized')
      }

      // Perform the search
      const searchResults = this.searchIndex.search(query).slice(0, limit)

      // Format results for MCP response
      const formattedResults = searchResults.map(result => ({
        title: result.title,
        content: result.content,
        section: result.section,
        score: result.score,
        // Include a snippet of the content around matches
        snippet: this.createSnippet(result.content, query),
      }))

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query,
              totalResults: searchResults.length,
              results: formattedResults,
              searchedAt: new Date().toISOString(),
            }, null, 2),
          },
        ],
      }
    }
    catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to search documentation: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private createSnippet(content: string, query: string, maxLength: number = 200): string {
    const words = content.toLowerCase().split(/\s+/)
    const queryWords = query.toLowerCase().split(/\s+/)

    // Find the first occurrence of any query word
    let startIndex = -1
    for (let i = 0; i < words.length; i++) {
      if (queryWords.some(qWord => words[i].includes(qWord))) {
        startIndex = Math.max(0, i - 10) // Start 10 words before the match
        break
      }
    }

    if (startIndex === -1) {
      // No direct match found, return beginning of content
      startIndex = 0
    }

    // Get a snippet around the match
    const snippetWords = words.slice(startIndex, startIndex + 40) // About 40 words
    let snippet = snippetWords.join(' ')

    // Truncate if too long
    if (snippet.length > maxLength) {
      snippet = `${snippet.substring(0, maxLength)}...`
    }

    return snippet
  }

  private setupResourceHandlers(): void {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'nimiq://docs/web-client',
            mimeType: 'application/json',
            name: 'Nimiq Web Client Documentation',
            description: 'Complete documentation for the Nimiq web client, including APIs, examples, and best practices',
          },
          {
            uri: 'nimiq://docs/protocol',
            mimeType: 'application/json',
            name: 'Nimiq Protocol Documentation',
            description: 'Complete Nimiq protocol and learning documentation covering consensus, transactions, and architecture',
          },
          {
            uri: 'nimiq://docs/validators',
            mimeType: 'application/json',
            name: 'Nimiq Validator Documentation',
            description: 'Complete documentation for Nimiq validators and staking, including setup guides and rewards',
          },
        ],
      }
    })

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params

      switch (uri) {
        case 'nimiq://docs/web-client':
          return await this.readWebClientDocsResource()
        case 'nimiq://docs/protocol':
          return await this.readProtocolDocsResource()
        case 'nimiq://docs/validators':
          return await this.readValidatorDocsResource()
        default:
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Unknown resource URI: ${uri}`,
          )
      }
    })
  }

  private async readWebClientDocsResource(): Promise<any> {
    try {
      const docsUrl = 'https://nimiq.com/developers/build/web-client/llms-full.txt'
      const response = await fetch(docsUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch web-client documentation: ${response.status} ${response.statusText}`)
      }

      const docsContent = await response.text()

      return {
        contents: [
          {
            uri: 'nimiq://docs/web-client',
            mimeType: 'text/plain',
            text: docsContent,
          },
        ],
      }
    }
    catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read web-client documentation: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async readProtocolDocsResource(): Promise<any> {
    try {
      const docsUrl = 'https://www.nimiq.com/developers/learn/llms-full.txt'
      const response = await fetch(docsUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch protocol documentation: ${response.status} ${response.statusText}`)
      }

      const docsContent = await response.text()

      return {
        contents: [
          {
            uri: 'nimiq://docs/protocol',
            mimeType: 'text/plain',
            text: docsContent,
          },
        ],
      }
    }
    catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read protocol documentation: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async readValidatorDocsResource(): Promise<any> {
    try {
      const docsUrl = 'https://www.nimiq.com/developers/validators/llms-full.txt'
      const response = await fetch(docsUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch validator documentation: ${response.status} ${response.statusText}`)
      }

      const docsContent = await response.text()

      return {
        contents: [
          {
            uri: 'nimiq://docs/validators',
            mimeType: 'text/plain',
            text: docsContent,
          },
        ],
      }
    }
    catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read validator documentation: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error)
    }

    process.on('SIGINT', async () => {
      await this.server.close()
      process.exit(0)
    })
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('Nimiq MCP server running on stdio')
  }
}

// Start the server
const server = new NimiqMcpServer()
server.run().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
