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
import MiniSearch from 'minisearch'
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
            description: 'Get information about all Nimiq validators',
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
            name: 'get_nimiq_web_client_docs',
            description: 'Get the complete Nimiq web-client documentation for LLMs',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_protocol_docs',
            description: 'Get the complete Nimiq protocol and learning documentation for LLMs',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
          {
            name: 'get_nimiq_validator_docs',
            description: 'Get the complete Nimiq validator and staking documentation for LLMs',
            inputSchema: {
              type: 'object',
              properties: {},
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

      try {
        this.initializeRpc()

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
          case 'get_nimiq_web_client_docs':
            return await this.handleGetWebClientDocs(args)
          case 'get_nimiq_protocol_docs':
            return await this.handleGetProtocolDocs(args)
          case 'get_nimiq_validator_docs':
            return await this.handleGetValidatorDocs(args)
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

  private async handleGetRpcMethods(args: any): Promise<any> {
    const { includeSchemas = false } = args

    try {
      // Get the latest release from GitHub API
      const latestRelease = await this.getLatestNimiqRelease()

      // Download the OpenRPC document
      const openRpcDoc = await this.downloadOpenRpcDocument(latestRelease.version)

      // Extract methods from the OpenRPC document
      const methods = this.extractRpcMethods(openRpcDoc, includeSchemas)

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

  private async handleGetWebClientDocs(_args: any): Promise<any> {
    try {
      const docsUrl = 'https://nimiq.com/developers/build/web-client/llms-full.txt'

      const response = await fetch(docsUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch web-client documentation: ${response.status} ${response.statusText}`)
      }

      const docsContent = await response.text()

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              source: docsUrl,
              downloadedAt: new Date().toISOString(),
              contentLength: docsContent.length,
              documentation: docsContent,
            }, null, 2),
          },
        ],
      }
    }
    catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get web-client documentation: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async handleGetProtocolDocs(_args: any): Promise<any> {
    try {
      const docsUrl = 'https://www.nimiq.com/developers/learn/llms-full.txt'

      const response = await fetch(docsUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch protocol documentation: ${response.status} ${response.statusText}`)
      }

      const docsContent = await response.text()

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              source: docsUrl,
              downloadedAt: new Date().toISOString(),
              contentLength: docsContent.length,
              documentation: docsContent,
            }, null, 2),
          },
        ],
      }
    }
    catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get protocol documentation: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async handleGetValidatorDocs(_args: any): Promise<any> {
    try {
      const docsUrl = 'https://www.nimiq.com/developers/validators/llms-full.txt'

      const response = await fetch(docsUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch validator documentation: ${response.status} ${response.statusText}`)
      }

      const docsContent = await response.text()

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              source: docsUrl,
              downloadedAt: new Date().toISOString(),
              contentLength: docsContent.length,
              documentation: docsContent,
            }, null, 2),
          },
        ],
      }
    }
    catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get validator documentation: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
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
      const { query, limit = 10 } = args

      if (!query || typeof query !== 'string') {
        throw new Error('Query parameter is required and must be a string')
      }

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
