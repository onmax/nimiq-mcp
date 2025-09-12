import * as v from 'valibot'

// Input validation schemas using Valibot
export const SupplyAtSchema = v.object({
  timestampMs: v.pipe(v.number(), v.description('The timestamp in milliseconds at which to calculate the PoS supply')),
  network: v.optional(v.pipe(v.picklist(['main-albatross', 'test-albatross']), v.description('The network name')), 'main-albatross'),
})

export const StakingRewardsSchema = v.object({
  stakedSupplyRatio: v.optional(v.pipe(v.number(), v.description('The ratio of the total staked cryptocurrency to the total supply. If not provided, the current staked ratio will be used instead.'))),
  amount: v.optional(v.pipe(v.number(), v.description('The initial amount of cryptocurrency staked, in NIM')), 1),
  days: v.optional(v.pipe(v.number(), v.description('The number of days the cryptocurrency is staked')), 365),
  autoRestake: v.optional(v.pipe(v.boolean(), v.description('Indicates whether the staking rewards are restaked')), true),
  network: v.optional(v.pipe(v.picklist(['main-albatross', 'test-albatross']), v.description('The network name')), 'main-albatross'),
  fee: v.optional(v.pipe(v.number(), v.description('The fee percentage that the pool charges for staking')), 0),
})

export const PriceSchema = v.object({
  currencies: v.pipe(v.array(v.string()), v.description('An array of currency tickers to get the price against (e.g., ["USD", "EUR", "BTC"])')),
  provider: v.optional(v.pipe(v.picklist(['CryptoCompare', 'CoinGecko']), v.description('The provider to use for fetching prices')), 'CryptoCompare'),
})

export const BlockByNumberSchema = v.object({
  blockNumber: v.pipe(v.number(), v.description('The block number to retrieve')),
  includeBody: v.optional(v.pipe(v.boolean(), v.description('Whether to include the block body with transactions')), false),
})

export const BlockByHashSchema = v.object({
  hash: v.pipe(v.string(), v.description('The block hash to retrieve')),
  includeBody: v.optional(v.pipe(v.boolean(), v.description('Whether to include the block body with transactions')), false),
})

export const AccountSchema = v.object({
  address: v.pipe(v.string(), v.description('The Nimiq address to get account information for')),
  withMetadata: v.optional(v.pipe(v.boolean(), v.description('Whether to include additional metadata')), false),
})

export const TransactionSchema = v.object({
  hash: v.pipe(v.string(), v.description('The transaction hash to retrieve')),
})

export const TransactionsByAddressSchema = v.object({
  address: v.pipe(v.string(), v.description('The Nimiq address to get transactions for')),
  max: v.optional(v.pipe(v.number(), v.description('Maximum number of transactions to return')), 100),
  startAt: v.optional(v.pipe(v.string(), v.description('Transaction hash to start at, used for paging'))),
  onlyConfirmed: v.optional(v.pipe(v.boolean(), v.description('Whether to only return confirmed transactions')), true),
})

export const ValidatorsSchema = v.object({
  includeStakers: v.optional(v.pipe(v.boolean(), v.description('Whether to include staker information for each validator')), false),
  onlyActive: v.optional(v.pipe(v.boolean(), v.description('If true, returns only active validators. If false, returns all validators.')), true),
})

export const ValidatorSchema = v.object({
  address: v.pipe(v.string(), v.description('The validator address to get information for')),
})

export const SlotsSchema = v.object({
  blockNumber: v.optional(v.pipe(v.number(), v.description('Block number to get slots for (optional, defaults to current)'))),
})

export const HeadSchema = v.object({
  includeBody: v.optional(v.pipe(v.boolean(), v.description('Whether to include the block body with transactions')), false),
})

export const RpcMethodsSchema = v.object({
  includeSchemas: v.optional(v.pipe(v.boolean(), v.description('Whether to include parameter and result schemas for each method')), false),
})

export const SearchDocsSchema = v.object({
  query: v.pipe(v.string(), v.description('The search query to find relevant documentation sections. Use 2-4 specific keywords for best results (e.g., "transaction fee", "validator rewards", "web client setup")')),
  limit: v.optional(v.pipe(v.number(), v.description('Maximum number of search results to return (default: 10)')), 10),
})

// JSON Schema definitions for structured tool outputs
export const SupplyResponseSchema = {
  type: 'object',
  properties: {
    total: { type: 'number', description: 'Total supply in Luna' },
    vested: { type: 'number', description: 'Vested supply in Luna' },
    burned: { type: 'number', description: 'Burned supply in Luna' },
    max: { type: 'number', description: 'Maximum supply in Luna' },
    initial: { type: 'number', description: 'Initial supply in Luna' },
    staking: { type: 'number', description: 'Currently staked supply in Luna' },
    minted: { type: 'number', description: 'Minted supply in Luna' },
    circulating: { type: 'number', description: 'Circulating supply in Luna' },
    mined: { type: 'number', description: 'Mined supply in Luna' },
    updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
  },
  required: ['total', 'vested', 'burned', 'max', 'initial', 'staking', 'minted', 'circulating', 'mined', 'updatedAt'],
  additionalProperties: false,
}

export const BlockResponseSchema = {
  type: 'object',
  properties: {
    blockNumber: { type: 'number', description: 'Block number' },
    block: {
      type: 'object',
      properties: {
        hash: { type: 'string', description: 'Block hash' },
        number: { type: 'number', description: 'Block number' },
        timestamp: { type: 'number', description: 'Block timestamp' },
        parentHash: { type: 'string', description: 'Parent block hash' },
        type: { type: 'string', description: 'Block type (micro/macro)' },
        producer: {
          type: 'object',
          properties: {
            slotNumber: { type: 'number', description: 'Validator slot number' },
            validator: { type: 'string', description: 'Validator address' },
          },
          additionalProperties: false,
        },
      },
      required: ['hash', 'number', 'timestamp', 'parentHash', 'type'],
      additionalProperties: false,
    },
    timestamp: { type: 'string', format: 'date-time', description: 'Response timestamp' },
    network: { type: 'string', enum: ['mainnet', 'testnet'], description: 'Network type' },
  },
  required: ['blockNumber', 'block', 'timestamp', 'network'],
  additionalProperties: false,
}

export const AccountResponseSchema = {
  type: 'object',
  properties: {
    address: { type: 'string', description: 'Account address' },
    account: {
      type: 'object',
      properties: {
        balance: { type: 'number', description: 'Account balance in Luna' },
        type: { type: 'string', description: 'Account type' },
        staker: { description: 'Staker information if applicable' },
        validator: { description: 'Validator information if applicable' },
      },
      required: ['balance'],
      additionalProperties: true,
    },
    network: { type: 'string', enum: ['mainnet', 'testnet'], description: 'Network type' },
  },
  required: ['address', 'account', 'network'],
  additionalProperties: false,
}

export const PriceResponseSchema = {
  type: 'object',
  properties: {
    content: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', const: 'text' },
          text: { type: 'string', description: 'JSON string containing price data' },
        },
        required: ['type', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['content'],
  additionalProperties: false,
}

export const StakingRewardsResponseSchema = {
  type: 'object',
  properties: {
    content: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', const: 'text' },
          text: { type: 'string', description: 'JSON string containing staking rewards calculation' },
        },
        required: ['type', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['content'],
  additionalProperties: false,
}

export const SearchResponseSchema = {
  type: 'object',
  properties: {
    content: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', const: 'text' },
          text: { type: 'string', description: 'JSON string containing search results' },
        },
        required: ['type', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['content'],
  additionalProperties: false,
}
