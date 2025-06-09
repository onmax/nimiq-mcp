#!/usr/bin/env node

import process from 'node:process'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'
import { initRpcClient } from 'nimiq-rpc-client-ts/client'
import {
  getAccountByAddress,
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

interface CliConfig {
  rpcUrl: string
  rpcUsername?: string
  rpcPassword?: string
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

Usage: nimiq-mcp-server [options]

Options:
  --rpc-url <url>         Nimiq RPC endpoint URL (default: https://rpc.nimiqwatch.com)
  --rpc-username <user>   RPC username for authentication (optional)
  --rpc-password <pass>   RPC password for authentication (optional)
  --help, -h              Show this help message

Examples:
  nimiq-mcp-server
  nimiq-mcp-server --rpc-url https://rpc.nimiqwatch.com
  nimiq-mcp-server --rpc-url https://localhost:8648 --rpc-username user --rpc-password pass
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

  constructor() {
    this.config = parseArgs()

    this.server = new Server(
      {
        name: 'nimiq-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    )

    this.setupToolHandlers()
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
            name: 'getHead',
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
            name: 'getBlockByNumber',
            description: 'Get a block by its number',
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
            name: 'getBlockByHash',
            description: 'Get a block by its hash',
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
            name: 'getAccount',
            description: 'Get account information by address',
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
            name: 'getBalance',
            description: 'Get the balance of an account',
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
            name: 'getTransaction',
            description: 'Get transaction details by hash',
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
            name: 'getTransactionsByAddress',
            description: 'Get transactions for a specific address',
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
            name: 'getValidators',
            description: 'Get information about all validators',
            inputSchema: {
              type: 'object',
              properties: {
                includeStakers: {
                  type: 'boolean',
                  description: 'Whether to include staker information for each validator',
                  default: false,
                },
              },
              additionalProperties: false,
            },
          },
          {
            name: 'getValidator',
            description: 'Get validator information by address',
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
            name: 'getSlots',
            description: 'Get validator slots information',
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
            name: 'getEpochNumber',
            description: 'Get the current epoch number',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
          {
            name: 'getNetworkInfo',
            description: 'Get network information including peer count and sync status',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
        ],
      }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        this.initializeRpc()

        switch (name) {
          case 'getHead':
            return await this.handleGetHead(args)
          case 'getBlockByNumber':
            return await this.handleGetBlockByNumber(args)
          case 'getBlockByHash':
            return await this.handleGetBlockByHash(args)
          case 'getAccount':
            return await this.handleGetAccount(args)
          case 'getBalance':
            return await this.handleGetBalance(args)
          case 'getTransaction':
            return await this.handleGetTransaction(args)
          case 'getTransactionsByAddress':
            return await this.handleGetTransactionsByAddress(args)
          case 'getValidators':
            return await this.handleGetValidators(args)
          case 'getValidator':
            return await this.handleGetValidator(args)
          case 'getSlots':
            return await this.handleGetSlots(args)
          case 'getEpochNumber':
            return await this.handleGetEpochNumber(args)
          case 'getNetworkInfo':
            return await this.handleGetNetworkInfo(args)

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

  private async handleGetHead(args: any): Promise<any> {
    const includeBody = args?.includeBody ?? false

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
    const { blockNumber, includeBody = false } = args

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
    const { hash, includeBody = false } = args

    const [success, error, block] = await getBlockByHash(
      { hash, includeBody },
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
    const { address, withMetadata = false } = args

    const params: any = {}
    if (withMetadata !== undefined)
      params.withMetadata = withMetadata

    const [success, error, account] = await getAccountByAddress(address, params)

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
    const { address, withMetadata = false } = args

    const params: any = {}
    if (withMetadata !== undefined)
      params.withMetadata = withMetadata

    const [success, error, account] = await getAccountByAddress(address, params)

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
    const { hash } = args

    const [success, error, transaction] = await getTransactionByHash(hash, {})

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
    const { address, max = 100, startAt, onlyConfirmed = true } = args

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
    const { includeStakers = false } = args

    const params: any = {}
    if (includeStakers !== undefined)
      params.includeStakers = includeStakers

    const [success, error, validators] = await getValidators(params)

    if (!success || !validators) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get validators: ${error || 'Unknown error'}`,
      )
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            validatorCount: Array.isArray(validators) ? validators.length : 0,
            validators,
            network: this.config.rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
          }, null, 2),
        },
      ],
    }
  }

  private async handleGetValidator(args: any): Promise<any> {
    const { address } = args

    const [success, error, validator] = await getValidatorByAddress(address, {})

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
    const { blockNumber } = args

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
