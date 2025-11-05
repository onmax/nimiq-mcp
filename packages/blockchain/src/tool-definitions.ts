// Tool definitions for the MCP server
export const TOOL_DEFINITIONS = [
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
    description: 'Calculate the Nimiq PoS supply at a given time. Returns the calculated supply for the specified timestamp and network.',
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
    name: 'interactive_staking_calculator',
    description: 'Interactive staking rewards calculator that guides users through the calculation process by asking for missing parameters when needed. Supports elicitation for better user experience.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Initial amount to stake in NIM (optional - will be requested if not provided)',
        },
        days: {
          type: 'number',
          description: 'Number of days to stake (optional - will be requested if not provided)',
        },
        autoRestake: {
          type: 'boolean',
          description: 'Whether to automatically restake rewards (optional - will be requested if not provided)',
        },
        network: {
          type: 'string',
          enum: ['main-albatross', 'test-albatross'],
          description: 'Network to calculate for',
          default: 'main-albatross',
        },
      },
      additionalProperties: false,
    },
  },
]
