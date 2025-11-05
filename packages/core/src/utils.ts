import process from 'node:process'
import * as v from 'valibot'

export const VERSION = '1.0.0'

export interface CliConfig {
  rpcUrl: string
  rpcUsername?: string
  rpcPassword?: string
}

export function parseArgs(): CliConfig {
  const args = process.argv.slice(2)
  const config: CliConfig = {
    rpcUrl: process.env.NIMIQ_RPC_URL || 'https://seed1.pos.nimiq-testnet.com:8648',
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--rpc-url' && args[i + 1]) {
      config.rpcUrl = args[i + 1]
      i++
    }
    else if (args[i] === '--rpc-username' && args[i + 1]) {
      config.rpcUsername = args[i + 1]
      i++
    }
    else if (args[i] === '--rpc-password' && args[i + 1]) {
      config.rpcPassword = args[i + 1]
      i++
    }
  }

  if (process.env.NIMIQ_RPC_USERNAME)
    config.rpcUsername = process.env.NIMIQ_RPC_USERNAME
  if (process.env.NIMIQ_RPC_PASSWORD)
    config.rpcPassword = process.env.NIMIQ_RPC_PASSWORD

  return config
}

export function validateInput<T extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  schema: T,
  input: unknown,
): v.InferOutput<T> {
  const result = v.safeParse(schema, input)
  if (!result.success) {
    throw new Error(`Invalid input: ${result.issues.map(i => i.message).join(', ')}`)
  }
  return result.output
}

export function createSnippet(content: string, query: string, maxLength = 200): string {
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerContent.indexOf(lowerQuery)

  if (index === -1)
    return `${content.slice(0, maxLength)}...`

  const start = Math.max(0, index - 50)
  const end = Math.min(content.length, index + query.length + 150)
  let snippet = content.slice(start, end)

  if (start > 0)
    snippet = `...${snippet}`
  if (end < content.length)
    snippet = `${snippet}...`

  return snippet
}

export function buildElicitationPrompt(missingParams: string[]): string {
  const prompts: Record<string, string> = {
    amount: 'How much NIM would you like to stake? (e.g., 1000)',
    days: 'For how many days do you want to stake? (e.g., 365)',
    autoRestake: 'Would you like to automatically restake rewards? (yes/no)',
  }

  return missingParams.map(param => prompts[param] || `Please provide ${param}`).join('\n')
}
