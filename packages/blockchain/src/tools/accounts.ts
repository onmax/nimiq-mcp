import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'
import { AccountSchema, TransactionsByAddressSchema, TransactionSchema, validateInput } from '@nimiq-mcp/core'
import { getAccountByAddress, getTransactionByHash, getTransactionsByAddress } from 'nimiq-rpc-client-ts/http'

export async function handleGetAccount(args: any, rpcUrl: string): Promise<any> {
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
          network: rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
        }, null, 2),
      },
    ],
  }
}

export async function handleGetBalance(args: any, rpcUrl: string): Promise<any> {
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
          balanceNIM: balance / 100000,
          network: rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
        }, null, 2),
      },
    ],
  }
}

export async function handleGetTransaction(args: any, rpcUrl: string): Promise<any> {
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
          network: rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
        }, null, 2),
      },
    ],
  }
}

export async function handleGetTransactionsByAddress(args: any, rpcUrl: string): Promise<any> {
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
          network: rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
        }, null, 2),
      },
    ],
  }
}
