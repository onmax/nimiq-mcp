#!/usr/bin/env node

import type { Provider } from '@nimiq/utils/fiat-api'
import type { CliConfig } from './utils.js'
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
import * as schemas from './schemas.js'
import { TOOL_DEFINITIONS } from './tool-definitions.js'
// Import shared modules
import { buildElicitationPrompt, createSnippet, parseArgs, validateInput, VERSION } from './utils.js'

export class NimiqMcpServer {
  public server: Server
  private rpcInitialized = false
  protected config: CliConfig
  private searchIndex: MiniSearch | null = null
  private cachedDocs: string | null = null

  constructor(config?: CliConfig) {
    this.config = config || parseArgs()

    this.server = new Server(
      {
        name: 'nimiq-mcp',
        version: VERSION,
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

  // Make this method public so it can be called from Worker
  public initializeRpc(): void {
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

  // Make this method public so it can be called from Worker
  public setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: TOOL_DEFINITIONS,
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
          case 'interactive_staking_calculator':
            return await this.handleInteractiveStakingCalculator(args)

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
    const validatedInput = validateInput(schemas.SupplyAtSchema, args)
    const { timestampMs, network } = validatedInput

    try {
      const supply = posSupplyAt(timestampMs, { network })
      const timestamp = new Date(timestampMs).toISOString()

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              timestampMs,
              timestamp,
              network,
              supply: {
                value: supply,
                unit: 'Luna',
                nim: supply / 100000, // Convert to NIM for readability
              },
              calculatedAt: new Date().toISOString(),
            }, null, 2),
          },
        ],
      }
    }
    catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to calculate supply at timestamp ${timestampMs}: ${error.message}`,
      )
    }
  }

  private async handleCalculateStakingRewards(args: any): Promise<any> {
    const validatedInput = validateInput(schemas.StakingRewardsSchema, args)
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
    const validatedInput = validateInput(schemas.PriceSchema, args)
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
    const validatedInput = validateInput(schemas.HeadSchema, args)
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
    const validatedInput = validateInput(schemas.BlockByNumberSchema, args)
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
    const validatedInput = validateInput(schemas.BlockByHashSchema, args)
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
    const validatedInput = validateInput(schemas.AccountSchema, args)
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
    const validatedInput = validateInput(schemas.AccountSchema, args)
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
    const validatedInput = validateInput(schemas.TransactionSchema, args)
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
    const validatedInput = validateInput(schemas.TransactionsByAddressSchema, args)
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
    const validatedInput = validateInput(schemas.ValidatorsSchema, args)
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
    const validatedInput = validateInput(schemas.ValidatorSchema, args)
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
    const validatedInput = validateInput(schemas.SlotsSchema, args)
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
    const validatedInput = validateInput(schemas.RpcMethodsSchema, args)
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
      const validatedInput = validateInput(schemas.SearchDocsSchema, args)
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
        snippet: createSnippet(result.content, query),
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

  private async handleInteractiveStakingCalculator(args: any): Promise<any> {
    try {
      const { amount, days, autoRestake, network = 'main-albatross' } = args

      // Check which parameters are missing and need elicitation
      const missingParams: string[] = []
      if (amount === undefined || amount === null)
        missingParams.push('amount')
      if (days === undefined || days === null)
        missingParams.push('days')
      if (autoRestake === undefined || autoRestake === null)
        missingParams.push('autoRestake')

      // If we have missing parameters, use elicitation to request them
      if (missingParams.length > 0) {
        const elicitationPrompt = buildElicitationPrompt(missingParams)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'elicitation_required',
                message: 'Some parameters are missing for the staking calculation. Please provide the following information:',
                missingParameters: missingParams,
                prompt: elicitationPrompt,
                currentParameters: { amount, days, autoRestake, network },
                example: 'You can call this tool again with: interactive_staking_calculator {"amount": 1000, "days": 365, "autoRestake": true}',
              }, null, 2),
            },
          ],
        }
      }

      // All parameters provided, calculate staking rewards
      const stakingArgs: any = { amount, days, autoRestake, network }

      // Get current staked supply ratio
      try {
        const supplyData = await this.getSupplyData()
        if (supplyData.circulating > 0) {
          stakingArgs.stakedSupplyRatio = supplyData.staking / supplyData.circulating
        }
      }
      catch {
        // Use default ratio if we can't fetch supply data
        stakingArgs.stakedSupplyRatio = 0.3 // Default 30% staked ratio
      }

      const rewards = calculateStakingRewards(stakingArgs)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'calculation_complete',
              parameters: {
                amount: `${amount} NIM`,
                stakingPeriod: `${days} days`,
                autoRestake: autoRestake ? 'Yes' : 'No',
                network,
                stakedSupplyRatio: `${(stakingArgs.stakedSupplyRatio * 100).toFixed(2)}%`,
              },
              results: {
                initialAmount: `${(rewards as any).amount || amount} NIM`,
                finalAmount: `${(rewards as any).finalAmount || 'N/A'} NIM`,
                totalRewards: `${(rewards as any).totalRewards || 'N/A'} NIM`,
                apr: `${((rewards as any).apr * 100 || 0).toFixed(2)}%`,
                apy: `${((rewards as any).apy * 100 || 0).toFixed(2)}%`,
              },
              calculatedAt: new Date().toISOString(),
            }, null, 2),
          },
        ],
      }
    }
    catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to calculate staking rewards: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  // Make this method public so it can be called from Worker
  public setupResourceHandlers(): void {
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
      const docsUrl = 'https://nimiq.com/developers/web-client/llms-full.txt'
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
      const docsUrl = 'https://www.nimiq.com/developers/protocol/llms-full.txt'
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
      const docsUrl = 'https://www.nimiq.com/developers/nodes/llms-full.txt'
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

    // Only set up process handlers if process is available (not in Workers)
    if (typeof process !== 'undefined' && process.on) {
      process.on('SIGINT', async () => {
        await this.server.close()
        process.exit(0)
      })
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('Nimiq MCP server running on stdio')
  }
}

// Start the server only if not in Cloudflare Workers environment and this is the main module
if (typeof process !== 'undefined' && process.argv && import.meta.url === `file://${process.argv[1]}`) {
  const server = new NimiqMcpServer()
  server.run().catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
}
