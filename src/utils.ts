import process from 'node:process'
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'
import * as v from 'valibot'

// Declare the global version variable defined by Vite
declare const __VERSION__: string

// Export version defined at build time
export const VERSION = __VERSION__

export interface CliConfig {
  rpcUrl: string
  rpcUsername?: string
  rpcPassword?: string
}

// Utility function for validating inputs with Valibot
export function validateInput<T>(schema: v.GenericSchema<T>, input: unknown): T {
  try {
    const result = v.parse(schema, input)
    return result
  }
  catch (error) {
    if (v.isValiError(error)) {
      const issues = v.flatten(error.issues)
      const errorMessages = Object.entries(issues.nested || {}).map(([key, value]) =>
        `${key}: ${Array.isArray(value) ? value.join(', ') : value}`,
      )
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid input parameters: ${errorMessages.join('; ')}`,
      )
    }
    throw new McpError(ErrorCode.InvalidParams, 'Invalid input parameters')
  }
}

// Parse CLI arguments
export function parseArgs(): CliConfig {
  // In Cloudflare Workers, process.argv is undefined, so return default config
  if (typeof process === 'undefined' || !process.argv) {
    return {
      rpcUrl: 'https://rpc.nimiqwatch.com',
      rpcUsername: undefined,
      rpcPassword: undefined,
    }
  }

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

// Utility to create snippet from content for search results
export function createSnippet(content: string, query: string, maxLength = 200): string {
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

// Build elicitation prompt for interactive tools
export function buildElicitationPrompt(missingParams: string[]): string {
  const prompts: string[] = []

  if (missingParams.includes('amount')) {
    prompts.push('• Amount to stake (e.g., 1000 NIM)')
  }

  if (missingParams.includes('days')) {
    prompts.push('• Staking period in days (e.g., 365 for one year)')
  }

  if (missingParams.includes('autoRestake')) {
    prompts.push('• Whether to automatically restake rewards (true/false)')
  }

  return `Please provide the following:\n${prompts.join('\n')}`
}
