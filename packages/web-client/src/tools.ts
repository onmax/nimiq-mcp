export const TOOL_DEFINITIONS = [
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
]
