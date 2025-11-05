// Tool definitions for the MCP server
export const TOOL_DEFINITIONS = [
  {
    name: 'query_blockchain',
    description: 'Query Nimiq blockchain data including blocks, accounts, transactions, validators, and network information. Use the operation parameter to specify what to query.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: [
            'get_head',
            'get_block_by_number',
            'get_block_by_hash',
            'get_account',
            'get_balance',
            'get_transaction',
            'get_transactions_by_address',
            'get_validators',
            'get_validator',
            'get_slots',
            'get_epoch_number',
            'get_network_info',
            'get_rpc_methods',
          ],
          description: 'The blockchain query operation to perform',
        },
        // Block operations
        blockNumber: {
          type: 'number',
          description: 'Block number (for get_block_by_number, get_slots)',
        },
        hash: {
          type: 'string',
          description: 'Block or transaction hash (for get_block_by_hash, get_transaction)',
        },
        includeBody: {
          type: 'boolean',
          description: 'Include block body with transactions (for block operations)',
          default: false,
        },
        // Account operations
        address: {
          type: 'string',
          description: 'Nimiq address (for get_account, get_balance, get_transactions_by_address, get_validator)',
        },
        withMetadata: {
          type: 'boolean',
          description: 'Include additional metadata (for account operations)',
          default: false,
        },
        // Transaction operations
        max: {
          type: 'number',
          description: 'Maximum number of transactions to return (for get_transactions_by_address)',
          default: 100,
        },
        startAt: {
          type: 'string',
          description: 'Transaction hash to start at for paging (for get_transactions_by_address)',
        },
        onlyConfirmed: {
          type: 'boolean',
          description: 'Only return confirmed transactions (for get_transactions_by_address)',
          default: true,
        },
        // Validator operations
        includeStakers: {
          type: 'boolean',
          description: 'Include staker information for validators (for get_validators)',
          default: false,
        },
        onlyActive: {
          type: 'boolean',
          description: 'Only return active validators (for get_validators)',
          default: true,
        },
        // RPC methods
        includeSchemas: {
          type: 'boolean',
          description: 'Include parameter and result schemas (for get_rpc_methods)',
          default: false,
        },
      },
      required: ['operation'],
      additionalProperties: false,
    },
  },
  {
    name: 'calculate_blockchain',
    description: 'Perform calculations related to Nimiq supply and staking rewards. Use the operation parameter to specify what to calculate.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: [
            'get_supply',
            'calculate_supply_at',
            'calculate_staking_rewards',
            'interactive_staking_calculator',
          ],
          description: 'The calculation operation to perform',
        },
        // Supply at timestamp
        timestampMs: {
          type: 'number',
          description: 'Timestamp in milliseconds (for calculate_supply_at)',
        },
        network: {
          type: 'string',
          enum: ['main-albatross', 'test-albatross'],
          description: 'The network name',
          default: 'main-albatross',
        },
        // Staking rewards
        stakedSupplyRatio: {
          type: 'number',
          description: 'Ratio of total staked to total supply (for calculate_staking_rewards)',
        },
        amount: {
          type: 'number',
          description: 'Initial amount to stake in NIM (for staking calculations)',
          default: 1,
        },
        days: {
          type: 'number',
          description: 'Number of days to stake (for staking calculations)',
          default: 365,
        },
        autoRestake: {
          type: 'boolean',
          description: 'Whether to automatically restake rewards (for staking calculations)',
          default: true,
        },
        fee: {
          type: 'number',
          description: 'Pool fee percentage (for calculate_staking_rewards)',
          default: 0,
        },
      },
      required: ['operation'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_nimiq_price',
    description: 'Get the current price of NIM against other currencies (fiat and crypto)',
    inputSchema: {
      type: 'object',
      properties: {
        currencies: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Array of currency tickers to get price against (e.g., ["USD", "EUR", "BTC"])',
        },
        provider: {
          type: 'string',
          enum: ['CryptoCompare', 'CoinGecko'],
          description: 'Price data provider',
          default: 'CryptoCompare',
        },
      },
      required: ['currencies'],
      additionalProperties: false,
    },
  },
]
