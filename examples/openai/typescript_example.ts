#!/usr/bin/env node
/**
 * Nimiq MCP Server - OpenAI Agents SDK Integration Example (TypeScript)
 *
 * This example demonstrates how to use the Nimiq MCP Server with OpenAI's Agents SDK
 * to query Nimiq blockchain data and ecosystem documentation using natural language.
 */

import process from 'node:process'

async function main(): Promise<void> {
  // Initialize OpenAI client
  const { OpenAI: OpenAIClient } = await import('openai')
  const client = new OpenAIClient({
    apiKey: process.env.OPENAI_API_KEY,
  })

  // Create agent with Nimiq MCP server
  const agent = await client.agents.create({
    model: 'gpt-5',
    tools: [
      {
        type: 'mcp',
        server_label: 'nimiq',
        server_url: 'https://nimiq-mcp.je-cf9.workers.dev/sse',
        require_approval: 'never',
      },
    ],
    instructions: `You are a helpful Nimiq ecosystem assistant with comprehensive access to:

**Blockchain Data:**
- Real-time account balances and transaction information
- Block and validator data
- Network statistics and supply information
- Staking rewards calculations

**Documentation & Learning Resources:**
- Complete Nimiq web client documentation and tutorials
- Protocol specifications and architecture guides
- Validator setup guides and best practices
- Full-text search across all Nimiq documentation

You can help users understand Nimiq's technology, build applications with the web client,
set up validators, analyze blockchain data, and learn about the Nimiq ecosystem.`,
    reasoning_effort: 3, // Medium reasoning effort (1-5 scale)
  })

  // eslint-disable-next-line no-console
  console.log('🚀 Nimiq MCP Agent Ready!\n')

  // Example queries
  const queries = [
    'What\'s the current block number?',
    'Get the balance of NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
    'Calculate staking rewards for 10,000 NIM staked for 365 days',
    'How many validators are currently active?',
    'Search the docs for information about the web client API',
  ]

  for (const query of queries) {
    // eslint-disable-next-line no-console
    console.log(`📝 Query: ${query}`)

    const response = await client.agents.run({
      agent_id: agent.id,
      messages: [
        {
          role: 'user',
          content: query,
        },
      ],
    })

    // eslint-disable-next-line no-console
    console.log(`💬 Response: ${response.content}\n`)
    // eslint-disable-next-line no-console
    console.log(`${'-'.repeat(80)}\n`)
  }

  // Interactive mode with readline
  const { default: readline } = await import('node:readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'You: ',
  })

  // eslint-disable-next-line no-console
  console.log('\n🔄 Entering interactive mode. Type \'exit\' to quit.\n')
  rl.prompt()

  rl.on('line', async (input: string) => {
    const userInput = input.trim()

    if (['exit', 'quit', 'q'].includes(userInput.toLowerCase())) {
      rl.close()
      return
    }

    if (userInput) {
      const response = await client.agents.run({
        agent_id: agent.id,
        messages: [
          {
            role: 'user',
            content: userInput,
          },
        ],
      })

      // eslint-disable-next-line no-console
      console.log(`Agent: ${response.content}\n`)
    }

    rl.prompt()
  })

  rl.on('close', () => {
    // eslint-disable-next-line no-console
    console.log('\n👋 Goodbye!')
    process.exit(0)
  })
}

main().catch(console.error)
