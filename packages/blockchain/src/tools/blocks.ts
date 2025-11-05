import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'
import { BlockByHashSchema, BlockByNumberSchema, HeadSchema, validateInput } from '@nimiq-mcp/core'
import { getBlockByHash, getBlockByNumber, getBlockNumber } from 'nimiq-rpc-client-ts/http'

export async function handleGetHead(args: any, rpcUrl: string): Promise<any> {
  const validatedInput = validateInput(HeadSchema, args)
  const { includeBody } = validatedInput

  const [blockNumberSuccess, blockNumberError, blockNumber] = await getBlockNumber()

  if (!blockNumberSuccess || !blockNumber) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get current block number: ${blockNumberError || 'Unknown error'}`,
    )
  }

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

  const network = rpcUrl.includes('testnet') ? 'testnet' : 'mainnet'

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

export async function handleGetBlockByNumber(args: any, rpcUrl: string): Promise<any> {
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
          network: rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
        }, null, 2),
      },
    ],
  }
}

export async function handleGetBlockByHash(args: any, rpcUrl: string): Promise<any> {
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
          network: rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
        }, null, 2),
      },
    ],
  }
}
