import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'
import { RpcMethodsSchema, SlotsSchema, validateInput, ValidatorSchema, ValidatorsSchema } from '@nimiq-mcp/core'
import { getActiveValidators, getBlockNumber, getEpochNumber, getPeerCount, getSlotAt, getValidatorByAddress, getValidators, isConsensusEstablished } from 'nimiq-rpc-client-ts/http'

export async function handleGetValidators(args: any, rpcUrl: string): Promise<any> {
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

  const network = rpcUrl.includes('testnet') ? 'testnet' : 'mainnet'
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

export async function handleGetValidator(args: any, rpcUrl: string): Promise<any> {
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
          network: rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
        }, null, 2),
      },
    ],
  }
}

export async function handleGetSlots(args: any, rpcUrl: string): Promise<any> {
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
            network: rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
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
            network: rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
          }, null, 2),
        },
      ],
    }
  }
}

export async function handleGetEpochNumber(_args: any, rpcUrl: string): Promise<any> {
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
          network: rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
        }, null, 2),
      },
    ],
  }
}

export async function handleGetNetworkInfo(_args: any, rpcUrl: string): Promise<any> {
  const [
    [peerSuccess, peerError, peerCount],
    [consensusSuccess, consensusError, consensusEstablished],
  ] = await Promise.all([
    getPeerCount({}),
    isConsensusEstablished({}),
  ])

  const networkInfo: any = {
    network: rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
    rpcUrl,
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

export async function handleGetRpcMethods(args: any): Promise<any> {
  const validatedInput = validateInput(RpcMethodsSchema, args)
  const { includeSchemas } = validatedInput

  try {
    const latestRelease = await getLatestNimiqRelease()
    const openRpcDoc = await downloadOpenRpcDocument(latestRelease.version)
    const methods = extractRpcMethods(openRpcDoc, includeSchemas ?? false)

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

async function getLatestNimiqRelease(): Promise<{ version: string, url: string }> {
  const response = await fetch('https://api.github.com/repos/nimiq/core-rs-albatross/releases/latest')

  if (!response.ok)
    throw new Error(`Failed to fetch latest release: ${response.status} ${response.statusText}`)

  const release = await response.json()

  return {
    version: release.tag_name,
    url: release.html_url,
  }
}

async function downloadOpenRpcDocument(version: string): Promise<any> {
  const downloadUrl = `https://github.com/nimiq/core-rs-albatross/releases/download/${version}/openrpc-document.json`

  const response = await fetch(downloadUrl)

  if (!response.ok)
    throw new Error(`Failed to download OpenRPC document: ${response.status} ${response.statusText}`)

  return await response.json()
}

function extractRpcMethods(openRpcDoc: any, includeSchemas: boolean): any[] {
  if (!openRpcDoc.methods || !Array.isArray(openRpcDoc.methods))
    throw new Error('Invalid OpenRPC document: methods not found')

  return openRpcDoc.methods.map((method: any) => {
    const extractedMethod: any = {
      name: method.name,
      description: method.description || '',
      tags: method.tags || [],
    }

    if (includeSchemas) {
      extractedMethod.params = method.params || []
      extractedMethod.result = method.result || null

      if (method.params && method.params.length > 0) {
        extractedMethod.parameterSummary = method.params.map((param: any) => ({
          name: param.name,
          type: param.schema?.type || 'unknown',
          required: param.required || false,
          description: param.description || param.schema?.description || '',
        }))
      }

      if (method.result) {
        extractedMethod.resultSummary = {
          name: method.result.name,
          type: method.result.schema?.type || 'unknown',
          description: method.result.description || method.result.schema?.description || '',
        }
      }
    }
    else {
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
