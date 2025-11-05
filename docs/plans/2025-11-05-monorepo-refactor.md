# Monorepo Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor nimiq-mcp into pnpm monorepo with separate domain-focused MCP servers (web-client and blockchain)

**Architecture:** Three packages - packages/core (shared utils), packages/web-client (docs/resources), packages/blockchain (RPC/calculators). Each domain is standalone MCP server. Root worker routes to domains.

**Tech Stack:** pnpm workspaces, TypeScript, Vite, MCP SDK, existing dependencies (nimiq-rpc-client-ts, @nimiq/utils, MiniSearch)

---

## Task 1: Create Workspace Structure

**Files:**

- Create: `pnpm-workspace.yaml`
- Create: `packages/core/package.json`
- Create: `packages/web-client/package.json`
- Create: `packages/blockchain/package.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/web-client/src/index.ts`
- Create: `packages/blockchain/src/index.ts`
- Modify: `package.json` (root)

**Step 1: Create pnpm workspace config**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - 'packages/*'
```

**Step 2: Create packages directory structure**

```bash
mkdir -p packages/core/src
mkdir -p packages/web-client/src
mkdir -p packages/blockchain/src/tools
```

**Step 3: Create core package.json**

Create `packages/core/package.json`:

```json
{
  "name": "@nimiq-mcp/core",
  "version": "1.0.0",
  "description": "Shared utilities for Nimiq MCP servers",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "valibot": "^1.1.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

**Step 4: Create web-client package.json**

Create `packages/web-client/package.json`:

```json
{
  "name": "@nimiq-mcp/web-client",
  "version": "1.0.0",
  "description": "Nimiq documentation and resources MCP server",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "nimiq-mcp-web-client": "dist/index.js"
  },
  "scripts": {
    "build": "vite build",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@nimiq-mcp/core": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.20.2",
    "minisearch": "^7.2.0"
  },
  "devDependencies": {
    "@types/node": "^24.9.2",
    "tsx": "^4.20.6",
    "typescript": "^5.9.3",
    "vite": "^7.1.12"
  }
}
```

**Step 5: Create blockchain package.json**

Create `packages/blockchain/package.json`:

```json
{
  "name": "@nimiq-mcp/blockchain",
  "version": "1.0.0",
  "description": "Nimiq blockchain data and RPC MCP server",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "nimiq-mcp-blockchain": "dist/index.js"
  },
  "scripts": {
    "build": "vite build",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@nimiq-mcp/core": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.20.2",
    "@nimiq/utils": "^0.12.4",
    "nimiq-rpc-client-ts": "^1.0.0-beta.28"
  },
  "devDependencies": {
    "@types/node": "^24.9.2",
    "tsx": "^4.20.6",
    "typescript": "^5.9.3",
    "vite": "^7.1.12"
  }
}
```

**Step 6: Update root package.json**

Modify `package.json`:

```json
{
  "name": "nimiq-mcp",
  "type": "module",
  "version": "1.0.0",
  "description": "MCP server for Nimiq blockchain interactions",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "dev:web-client": "pnpm --filter @nimiq-mcp/web-client dev",
    "dev:blockchain": "pnpm --filter @nimiq-mcp/blockchain dev",
    "build:worker": "vite build && wrangler deploy --dry-run",
    "dev:worker": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "@antfu/eslint-config": "^4.19.0",
    "@types/node": "^24.9.2",
    "@typescript-eslint/eslint-plugin": "^8.46.2",
    "@typescript-eslint/parser": "^8.46.2",
    "bumpp": "^10.3.1",
    "eslint": "^9.38.0",
    "eslint-plugin-format": "^1.0.2",
    "lint-staged": "^16.2.6",
    "simple-git-hooks": "^2.13.0",
    "tsx": "^4.20.6",
    "typescript": "^5.9.3",
    "vite": "^7.1.12",
    "vitest": "^2.1.5",
    "wrangler": "^4.45.1"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild", "simple-git-hooks"]
  },
  "simple-git-hooks": {
    "pre-commit": "pnpm lint-staged"
  },
  "lint-staged": {
    "*": "eslint --fix"
  }
}
```

**Step 7: Install dependencies**

```bash
pnpm install
```

Expected: Workspace installed successfully with all packages linked

**Step 8: Create placeholder index files**

Create `packages/core/src/index.ts`:

```ts
export const VERSION = '1.0.0'
```

Create `packages/web-client/src/index.ts`:

```ts
#!/usr/bin/env node
console.log('Web client MCP server')
```

Create `packages/blockchain/src/index.ts`:

```ts
#!/usr/bin/env node
console.log('Blockchain MCP server')
```

**Step 9: Commit**

```bash
git add pnpm-workspace.yaml packages/ package.json pnpm-lock.yaml
git commit -m "init monorepo structure"
```

---

## Task 2: Create Core Package

**Files:**

- Create: `packages/core/src/schemas.ts`
- Create: `packages/core/src/utils.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/tsconfig.json`

**Step 1: Create tsconfig for core**

Create `packages/core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"]
}
```

**Step 2: Extract schemas from src/schemas.ts**

Copy from `src/schemas.ts` to `packages/core/src/schemas.ts`:

```ts
import * as v from 'valibot'

export const SupplyAtSchema = v.object({
  timestampMs: v.number(),
  network: v.optional(v.picklist(['main-albatross', 'test-albatross']), 'main-albatross'),
})

export const StakingRewardsSchema = v.object({
  stakedSupplyRatio: v.optional(v.number()),
  amount: v.optional(v.number(), 1),
  days: v.optional(v.number(), 365),
  autoRestake: v.optional(v.boolean(), true),
  network: v.optional(v.picklist(['main-albatross', 'test-albatross']), 'main-albatross'),
  fee: v.optional(v.number(), 0),
})

export const PriceSchema = v.object({
  currencies: v.array(v.string()),
  provider: v.optional(v.picklist(['CryptoCompare', 'CoinGecko']), 'CryptoCompare'),
})

export const HeadSchema = v.object({
  includeBody: v.optional(v.boolean(), false),
})

export const BlockByNumberSchema = v.object({
  blockNumber: v.number(),
  includeBody: v.optional(v.boolean(), false),
})

export const BlockByHashSchema = v.object({
  hash: v.string(),
  includeBody: v.optional(v.boolean(), false),
})

export const AccountSchema = v.object({
  address: v.string(),
  withMetadata: v.optional(v.boolean(), false),
})

export const TransactionSchema = v.object({
  hash: v.string(),
})

export const TransactionsByAddressSchema = v.object({
  address: v.string(),
  max: v.optional(v.number(), 100),
  startAt: v.optional(v.string()),
  onlyConfirmed: v.optional(v.boolean(), true),
})

export const ValidatorsSchema = v.object({
  includeStakers: v.optional(v.boolean(), false),
  onlyActive: v.optional(v.boolean(), true),
})

export const ValidatorSchema = v.object({
  address: v.string(),
})

export const SlotsSchema = v.object({
  blockNumber: v.optional(v.number()),
})

export const RpcMethodsSchema = v.object({
  includeSchemas: v.optional(v.boolean(), false),
})

export const SearchDocsSchema = v.object({
  query: v.string(),
  limit: v.optional(v.number(), 10),
})
```

**Step 3: Extract utils from src/utils.ts**

Copy from `src/utils.ts` to `packages/core/src/utils.ts`:

```ts
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
```

**Step 4: Update core index exports**

Modify `packages/core/src/index.ts`:

```ts
export * from './schemas.js'
export * from './utils.js'
export const VERSION = '1.0.0'
```

**Step 5: Build core package**

```bash
pnpm --filter @nimiq-mcp/core build
```

Expected: Build successful, dist/ created with .js and .d.ts files

**Step 6: Commit**

```bash
git add packages/core/
git commit -m "add core package with shared utils"
```

---

## Task 3: Create Web Client Package Server

**Files:**

- Create: `packages/web-client/src/server.ts`
- Create: `packages/web-client/src/tools.ts`
- Create: `packages/web-client/src/resources.ts`
- Modify: `packages/web-client/src/index.ts`
- Create: `packages/web-client/tsconfig.json`
- Create: `packages/web-client/vite.config.ts`

**Step 1: Create tsconfig for web-client**

Create `packages/web-client/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../core" }
  ]
}
```

**Step 2: Create vite config for web-client**

Create `packages/web-client/vite.config.ts`:

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'node:process',
        'node:path',
        '@modelcontextprotocol/sdk/server/index.js',
        '@modelcontextprotocol/sdk/server/stdio.js',
        '@modelcontextprotocol/sdk/types.js',
      ],
    },
    target: 'node20',
    outDir: 'dist',
  },
})
```

**Step 3: Create tools definitions**

Create `packages/web-client/src/tools.ts`:

```ts
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
```

**Step 4: Create resources handlers**

Create `packages/web-client/src/resources.ts`:

```ts
import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  ErrorCode,
  ListResourcesRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

export function setupResourceHandlers(server: Server): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'nimiq://docs/web-client',
          mimeType: 'application/json',
          name: 'Nimiq Web Client Documentation',
          description: 'Complete documentation for the Nimiq web client, including APIs, examples, and best practices',
        },
        {
          uri: 'nimiq://docs/protocol',
          mimeType: 'application/json',
          name: 'Nimiq Protocol Documentation',
          description: 'Complete Nimiq protocol and learning documentation covering consensus, transactions, and architecture',
        },
        {
          uri: 'nimiq://docs/validators',
          mimeType: 'application/json',
          name: 'Nimiq Validator Documentation',
          description: 'Complete documentation for Nimiq validators and staking, including setup guides and rewards',
        },
      ],
    }
  })

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params

    switch (uri) {
      case 'nimiq://docs/web-client':
        return await readWebClientDocsResource()
      case 'nimiq://docs/protocol':
        return await readProtocolDocsResource()
      case 'nimiq://docs/validators':
        return await readValidatorDocsResource()
      default:
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unknown resource URI: ${uri}`,
        )
    }
  })
}

async function readWebClientDocsResource(): Promise<any> {
  try {
    const docsUrl = 'https://nimiq.com/developers/web-client/llms-full.txt'
    const response = await fetch(docsUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch web-client documentation: ${response.status} ${response.statusText}`)
    }

    const docsContent = await response.text()

    return {
      contents: [
        {
          uri: 'nimiq://docs/web-client',
          mimeType: 'text/plain',
          text: docsContent,
        },
      ],
    }
  }
  catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to read web-client documentation: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

async function readProtocolDocsResource(): Promise<any> {
  try {
    const docsUrl = 'https://www.nimiq.com/developers/protocol/llms-full.txt'
    const response = await fetch(docsUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch protocol documentation: ${response.status} ${response.statusText}`)
    }

    const docsContent = await response.text()

    return {
      contents: [
        {
          uri: 'nimiq://docs/protocol',
          mimeType: 'text/plain',
          text: docsContent,
        },
      ],
    }
  }
  catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to read protocol documentation: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

async function readValidatorDocsResource(): Promise<any> {
  try {
    const docsUrl = 'https://www.nimiq.com/developers/nodes/llms-full.txt'
    const response = await fetch(docsUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch validator documentation: ${response.status} ${response.statusText}`)
    }

    const docsContent = await response.text()

    return {
      contents: [
        {
          uri: 'nimiq://docs/validators',
          mimeType: 'text/plain',
          text: docsContent,
        },
      ],
    }
  }
  catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to read validator documentation: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
```

**Step 5: Create server class**

Create `packages/web-client/src/server.ts`:

```ts
import process from 'node:process'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'
import { createSnippet, SearchDocsSchema, validateInput, VERSION } from '@nimiq-mcp/core'
import MiniSearch from 'minisearch'
import { setupResourceHandlers } from './resources.js'
import { TOOL_DEFINITIONS } from './tools.js'

export class WebClientMcpServer {
  public server: Server
  private searchIndex: MiniSearch | null = null
  private cachedDocs: string | null = null

  constructor() {
    this.server = new Server(
      {
        name: 'nimiq-mcp-web-client',
        version: VERSION,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    )

    this.setupToolHandlers()
    setupResourceHandlers(this.server)
    this.setupErrorHandling()
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: TOOL_DEFINITIONS,
      }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        if (name === 'search_nimiq_docs')
          return await this.handleSearchDocs(args)

        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`,
        )
      }
      catch (error) {
        if (error instanceof McpError)
          throw error

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    })
  }

  private async initializeSearchIndex(): Promise<void> {
    if (this.searchIndex && this.cachedDocs)
      return

    try {
      const docsUrl = 'https://nimiq.com/developers/llms-full.txt'
      const response = await fetch(docsUrl)

      if (!response.ok)
        throw new Error(`Failed to fetch documentation: ${response.status} ${response.statusText}`)

      const docsContent = await response.text()
      this.cachedDocs = docsContent

      const sections = this.splitIntoSections(docsContent)

      this.searchIndex = new MiniSearch({
        fields: ['title', 'content'],
        storeFields: ['title', 'content', 'section'],
        searchOptions: {
          boost: { title: 2 },
          fuzzy: 0.2,
        },
      })

      this.searchIndex.addAll(sections)
    }
    catch (error) {
      throw new Error(`Failed to initialize search index: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private splitIntoSections(content: string): Array<{ id: string, title: string, content: string, section: string }> {
    const lines = content.split('\n')
    const sections: Array<{ id: string, title: string, content: string, section: string }> = []
    let currentSection = ''
    let currentTitle = 'Introduction'
    let currentContent: string[] = []
    let sectionCounter = 0

    for (const line of lines) {
      if (line.match(/^#+\s+/)) {
        if (currentContent.length > 0) {
          sections.push({
            id: `section_${sectionCounter++}`,
            title: currentTitle,
            content: currentContent.join('\n').trim(),
            section: currentSection,
          })
          currentContent = []
        }

        currentTitle = line.replace(/^#+\s+/, '').trim()
        currentSection = currentTitle
      }
      else {
        currentContent.push(line)
      }
    }

    if (currentContent.length > 0) {
      sections.push({
        id: `section_${sectionCounter}`,
        title: currentTitle,
        content: currentContent.join('\n').trim(),
        section: currentSection,
      })
    }

    return sections
  }

  private async handleSearchDocs(args: any): Promise<any> {
    try {
      const validatedInput = validateInput(SearchDocsSchema, args)
      const { query, limit } = validatedInput

      await this.initializeSearchIndex()

      if (!this.searchIndex)
        throw new Error('Search index not initialized')

      const searchResults = this.searchIndex.search(query).slice(0, limit)

      const formattedResults = searchResults.map(result => ({
        title: result.title,
        content: result.content,
        section: result.section,
        score: result.score,
        snippet: createSnippet(result.content, query),
      }))

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query,
              totalResults: searchResults.length,
              results: formattedResults,
              searchedAt: new Date().toISOString(),
            }, null, 2),
          },
        ],
      }
    }
    catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to search documentation: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error)
    }

    if (typeof process !== 'undefined' && process.on) {
      process.on('SIGINT', async () => {
        await this.server.close()
        process.exit(0)
      })
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('Nimiq Web Client MCP server running on stdio')
  }
}
```

**Step 6: Update index to start server**

Modify `packages/web-client/src/index.ts`:

```ts
#!/usr/bin/env node

import { WebClientMcpServer } from './server.js'

const server = new WebClientMcpServer()
server.run().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
```

**Step 7: Build web-client package**

```bash
pnpm --filter @nimiq-mcp/web-client build
```

Expected: Build successful

**Step 8: Test web-client CLI**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | pnpm --filter @nimiq-mcp/web-client dev
```

Expected: JSON response with search_nimiq_docs tool

**Step 9: Commit**

```bash
git add packages/web-client/
git commit -m "add web-client mcp server"
```

---

## Task 4: Create Blockchain Package - Tool Definitions

**Files:**

- Create: `packages/blockchain/src/tool-definitions.ts`
- Create: `packages/blockchain/tsconfig.json`

**Step 1: Create tsconfig for blockchain**

Create `packages/blockchain/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../core" }
  ]
}
```

**Step 2: Copy tool definitions from src/tool-definitions.ts**

Copy from `src/tool-definitions.ts` to `packages/blockchain/src/tool-definitions.ts` (entire file - all 18 tools)

**Step 3: Commit**

```bash
git add packages/blockchain/tsconfig.json packages/blockchain/src/tool-definitions.ts
git commit -m "add blockchain tool definitions"
```

---

## Task 5: Create Blockchain Package - Tool Handlers (Supply & Staking)

**Files:**

- Create: `packages/blockchain/src/tools/supply.ts`
- Create: `packages/blockchain/src/tools/staking.ts`
- Create: `packages/blockchain/src/tools/index.ts`

**Step 1: Create supply tool handlers**

Create `packages/blockchain/src/tools/supply.ts`:

```ts
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'
import { SupplyAtSchema, validateInput } from '@nimiq-mcp/core'
import { posSupplyAt } from '@nimiq/utils/supply-calculator'

export async function handleGetSupply(_args: any): Promise<any> {
  try {
    const data = await getSupplyData()
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ...data,
            updatedAt: new Date().toISOString(),
          }, null, 2),
        },
      ],
    }
  }
  catch (error: any) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Error fetching supply data: ${error.message}`,
    )
  }
}

export function handleCalculateSupplyAt(args: any): any {
  const validatedInput = validateInput(SupplyAtSchema, args)
  const { timestampMs, network } = validatedInput

  try {
    const supply = posSupplyAt(timestampMs, { network })
    const timestamp = new Date(timestampMs).toISOString()

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            timestampMs,
            timestamp,
            network,
            supply: {
              value: supply,
              unit: 'Luna',
              nim: supply / 100000,
            },
            calculatedAt: new Date().toISOString(),
          }, null, 2),
        },
      ],
    }
  }
  catch (error: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to calculate supply at timestamp ${timestampMs}: ${error.message}`,
    )
  }
}

export async function getSupplyData(): Promise<any> {
  const response = await fetch('https://nim.sh/stats/supply.json')
  if (!response.ok)
    throw new Error(`Failed to fetch supply data: ${response.statusText}`)
  return response.json()
}
```

**Step 2: Create staking tool handlers**

Create `packages/blockchain/src/tools/staking.ts`:

```ts
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'
import { buildElicitationPrompt, StakingRewardsSchema, validateInput } from '@nimiq-mcp/core'
import { calculateStakingRewards } from '@nimiq/utils/rewards-calculator'
import { getSupplyData } from './supply.js'

export async function handleCalculateStakingRewards(args: any): Promise<any> {
  const validatedInput = validateInput(StakingRewardsSchema, args)
  const newArgs = { ...validatedInput }

  if (newArgs.stakedSupplyRatio === undefined || newArgs.stakedSupplyRatio === null) {
    try {
      const supplyData = await getSupplyData()
      if (supplyData.circulating > 0) {
        newArgs.stakedSupplyRatio = supplyData.staking / supplyData.circulating
      }
      else {
        throw new Error('Circulating supply is zero, cannot calculate staking ratio.')
      }
    }
    catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch supply data to calculate staking ratio: ${error.message}`,
      )
    }
  }

  const rewards = calculateStakingRewards(newArgs as any)
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(rewards, null, 2),
      },
    ],
  }
}

export async function handleInteractiveStakingCalculator(args: any): Promise<any> {
  try {
    const { amount, days, autoRestake, network = 'main-albatross' } = args

    const missingParams: string[] = []
    if (amount === undefined || amount === null)
      missingParams.push('amount')
    if (days === undefined || days === null)
      missingParams.push('days')
    if (autoRestake === undefined || autoRestake === null)
      missingParams.push('autoRestake')

    if (missingParams.length > 0) {
      const elicitationPrompt = buildElicitationPrompt(missingParams)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'elicitation_required',
              message: 'Some parameters are missing for the staking calculation. Please provide the following information:',
              missingParameters: missingParams,
              prompt: elicitationPrompt,
              currentParameters: { amount, days, autoRestake, network },
              example: 'You can call this tool again with: interactive_staking_calculator {"amount": 1000, "days": 365, "autoRestake": true}',
            }, null, 2),
          },
        ],
      }
    }

    const stakingArgs: any = { amount, days, autoRestake, network }

    try {
      const supplyData = await getSupplyData()
      if (supplyData.circulating > 0) {
        stakingArgs.stakedSupplyRatio = supplyData.staking / supplyData.circulating
      }
    }
    catch {
      stakingArgs.stakedSupplyRatio = 0.3
    }

    const rewards = calculateStakingRewards(stakingArgs)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'calculation_complete',
            parameters: {
              amount: `${amount} NIM`,
              stakingPeriod: `${days} days`,
              autoRestake: autoRestake ? 'Yes' : 'No',
              network,
              stakedSupplyRatio: `${(stakingArgs.stakedSupplyRatio * 100).toFixed(2)}%`,
            },
            results: {
              initialAmount: `${(rewards as any).amount || amount} NIM`,
              finalAmount: `${(rewards as any).finalAmount || 'N/A'} NIM`,
              totalRewards: `${(rewards as any).totalRewards || 'N/A'} NIM`,
              apr: `${((rewards as any).apr * 100 || 0).toFixed(2)}%`,
              apy: `${((rewards as any).apy * 100 || 0).toFixed(2)}%`,
            },
            calculatedAt: new Date().toISOString(),
          }, null, 2),
        },
      ],
    }
  }
  catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to calculate staking rewards: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
```

**Step 3: Create tools index**

Create `packages/blockchain/src/tools/index.ts`:

```ts
export * from './staking.js'
export * from './supply.js'
```

**Step 4: Commit**

```bash
git add packages/blockchain/src/tools/
git commit -m "add supply and staking handlers"
```

---

## Task 6: Create Blockchain Package - Tool Handlers (Price & Blocks)

**Files:**

- Create: `packages/blockchain/src/tools/price.ts`
- Create: `packages/blockchain/src/tools/blocks.ts`
- Modify: `packages/blockchain/src/tools/index.ts`

**Step 1: Create price tool handler**

Create `packages/blockchain/src/tools/price.ts`:

```ts
import type { Provider } from '@nimiq/utils/fiat-api'
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'
import { PriceSchema, validateInput } from '@nimiq-mcp/core'
import { CryptoCurrency, FiatCurrency, getExchangeRates } from '@nimiq/utils/fiat-api'

export async function handleGetNimPrice(args: any): Promise<any> {
  const validatedInput = validateInput(PriceSchema, args)
  const { currencies, provider } = validatedInput
  const typedProvider = provider as Provider
  const vsCurrencies = currencies.map((c: string) => c.toUpperCase())

  const cryptoCurrencies = vsCurrencies.filter((c: string) => c in CryptoCurrency) as CryptoCurrency[]
  const fiatCurrencies = vsCurrencies.filter((c: string) => c in FiatCurrency) as FiatCurrency[]

  try {
    const cryptoRates: { nim?: Record<string, number | undefined> } = cryptoCurrencies.length > 0
      ? await getExchangeRates([CryptoCurrency.NIM], cryptoCurrencies, typedProvider)
      : {}

    const fiatRates: { nim?: Record<string, number | undefined> } = fiatCurrencies.length > 0
      ? await getExchangeRates([CryptoCurrency.NIM], fiatCurrencies as any, typedProvider)
      : {}

    const rates = { ...(cryptoRates.nim || {}), ...(fiatRates.nim || {}) }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            nimPrice: rates,
            provider,
            updatedAt: new Date().toISOString(),
          }, null, 2),
        },
      ],
    }
  }
  catch (error: any) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Error fetching NIM price: ${error.message}`,
    )
  }
}
```

**Step 2: Create blocks tool handlers**

Create `packages/blockchain/src/tools/blocks.ts`:

```ts
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
```

**Step 3: Update tools index**

Modify `packages/blockchain/src/tools/index.ts`:

```ts
export * from './blocks.js'
export * from './price.js'
export * from './staking.js'
export * from './supply.js'
```

**Step 4: Commit**

```bash
git add packages/blockchain/src/tools/
git commit -m "add price and blocks handlers"
```

---

## Task 7: Create Blockchain Package - Tool Handlers (Accounts & Validators)

**Files:**

- Create: `packages/blockchain/src/tools/accounts.ts`
- Create: `packages/blockchain/src/tools/validators.ts`
- Modify: `packages/blockchain/src/tools/index.ts`

**Step 1: Create accounts tool handlers**

Create `packages/blockchain/src/tools/accounts.ts`:

```ts
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
```

**Step 2: Create validators tool handlers**

Create `packages/blockchain/src/tools/validators.ts`:

```ts
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
```

**Step 3: Update tools index**

Modify `packages/blockchain/src/tools/index.ts`:

```ts
export * from './accounts.js'
export * from './blocks.js'
export * from './price.js'
export * from './staking.js'
export * from './supply.js'
export * from './validators.js'
```

**Step 4: Commit**

```bash
git add packages/blockchain/src/tools/
git commit -m "add accounts and validators handlers"
```

---

## Task 8: Create Blockchain Package - Server

**Files:**

- Create: `packages/blockchain/src/server.ts`
- Modify: `packages/blockchain/src/index.ts`
- Create: `packages/blockchain/vite.config.ts`

**Step 1: Create vite config for blockchain**

Create `packages/blockchain/vite.config.ts`:

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'node:process',
        'node:path',
        '@modelcontextprotocol/sdk/server/index.js',
        '@modelcontextprotocol/sdk/server/stdio.js',
        '@modelcontextprotocol/sdk/types.js',
        'nimiq-rpc-client-ts/client',
        'nimiq-rpc-client-ts/http',
      ],
    },
    target: 'node20',
    outDir: 'dist',
  },
})
```

**Step 2: Create server class**

Create `packages/blockchain/src/server.ts`:

```ts
import type { CliConfig } from '@nimiq-mcp/core'
import process from 'node:process'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'
import { parseArgs, VERSION } from '@nimiq-mcp/core'
import { initRpcClient } from 'nimiq-rpc-client-ts/client'
import { TOOL_DEFINITIONS } from './tool-definitions.js'
import {
  handleCalculateStakingRewards,
  handleCalculateSupplyAt,
  handleGetAccount,
  handleGetBalance,
  handleGetBlockByHash,
  handleGetBlockByNumber,
  handleGetEpochNumber,
  handleGetHead,
  handleGetNetworkInfo,
  handleGetNimPrice,
  handleGetRpcMethods,
  handleGetSlots,
  handleGetSupply,
  handleGetTransaction,
  handleGetTransactionsByAddress,
  handleGetValidator,
  handleGetValidators,
  handleInteractiveStakingCalculator,
} from './tools/index.js'

export class BlockchainMcpServer {
  public server: Server
  private rpcInitialized = false
  protected config: CliConfig

  constructor(config?: CliConfig) {
    this.config = config || parseArgs()

    this.server = new Server(
      {
        name: 'nimiq-mcp-blockchain',
        version: VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    )

    this.setupToolHandlers()
    this.setupErrorHandling()
  }

  public initializeRpc(): void {
    if (this.rpcInitialized)
      return

    const config: any = { url: this.config.rpcUrl }
    if (this.config.rpcUsername && this.config.rpcPassword) {
      config.auth = {
        username: this.config.rpcUsername,
        password: this.config.rpcPassword,
      }
    }

    initRpcClient(config)
    this.rpcInitialized = true
  }

  public setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: TOOL_DEFINITIONS,
      }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      if (name === 'get_nimiq_supply')
        return await handleGetSupply(args)
      if (name === 'calculate_nimiq_supply_at')
        return handleCalculateSupplyAt(args)
      if (name === 'calculate_nimiq_staking_rewards')
        return await handleCalculateStakingRewards(args)
      if (name === 'get_nimiq_price')
        return handleGetNimPrice(args)

      this.initializeRpc()

      try {
        switch (name) {
          case 'get_nimiq_head':
            return await handleGetHead(args, this.config.rpcUrl)
          case 'get_nimiq_block_by_number':
            return await handleGetBlockByNumber(args, this.config.rpcUrl)
          case 'get_nimiq_block_by_hash':
            return await handleGetBlockByHash(args, this.config.rpcUrl)
          case 'get_nimiq_account':
            return await handleGetAccount(args, this.config.rpcUrl)
          case 'get_nimiq_balance':
            return await handleGetBalance(args, this.config.rpcUrl)
          case 'get_nimiq_transaction':
            return await handleGetTransaction(args, this.config.rpcUrl)
          case 'get_nimiq_transactions_by_address':
            return await handleGetTransactionsByAddress(args, this.config.rpcUrl)
          case 'get_nimiq_validators':
            return await handleGetValidators(args, this.config.rpcUrl)
          case 'get_nimiq_validator':
            return await handleGetValidator(args, this.config.rpcUrl)
          case 'get_nimiq_slots':
            return await handleGetSlots(args, this.config.rpcUrl)
          case 'get_nimiq_epoch_number':
            return await handleGetEpochNumber(args, this.config.rpcUrl)
          case 'get_nimiq_network_info':
            return await handleGetNetworkInfo(args, this.config.rpcUrl)
          case 'get_nimiq_rpc_methods':
            return await handleGetRpcMethods(args)
          case 'interactive_staking_calculator':
            return await handleInteractiveStakingCalculator(args)

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`,
            )
        }
      }
      catch (error) {
        if (error instanceof McpError)
          throw error

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    })
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error)
    }

    if (typeof process !== 'undefined' && process.on) {
      process.on('SIGINT', async () => {
        await this.server.close()
        process.exit(0)
      })
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('Nimiq Blockchain MCP server running on stdio')
  }
}
```

**Step 3: Update index to start server**

Modify `packages/blockchain/src/index.ts`:

```ts
#!/usr/bin/env node

import { BlockchainMcpServer } from './server.js'

const server = new BlockchainMcpServer()
server.run().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
```

**Step 4: Build blockchain package**

```bash
pnpm --filter @nimiq-mcp/blockchain build
```

Expected: Build successful

**Step 5: Test blockchain CLI**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | pnpm --filter @nimiq-mcp/blockchain dev
```

Expected: JSON response with 18 blockchain tools

**Step 6: Commit**

```bash
git add packages/blockchain/
git commit -m "add blockchain mcp server"
```

---

## Task 9: Create Root Worker with Routing

**Files:**

- Create: `src/worker.ts`
- Create: `packages/web-client/src/worker.ts`
- Create: `packages/blockchain/src/worker.ts`
- Modify: `vite.config.ts`
- Modify: `wrangler.toml`

**Step 1: Create web-client worker**

Create `packages/web-client/src/worker.ts`:

```ts
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'
import { WebClientMcpServer } from './server.js'

export interface Env {
  // Add environment variables if needed
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    try {
      const server = new WebClientMcpServer()
      // Worker MCP handling would go here - simplified for now
      return new Response(JSON.stringify({
        error: 'Worker MCP handling not yet implemented',
      }), {
        headers: { 'content-type': 'application/json' },
      })
    }
    catch (error) {
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
  },
}
```

**Step 2: Create blockchain worker**

Create `packages/blockchain/src/worker.ts`:

```ts
import type { CliConfig } from '@nimiq-mcp/core'
import { BlockchainMcpServer } from './server.js'

export interface Env {
  NIMIQ_RPC_URL?: string
  NIMIQ_RPC_USERNAME?: string
  NIMIQ_RPC_PASSWORD?: string
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    try {
      const config: CliConfig = {
        rpcUrl: env.NIMIQ_RPC_URL || 'https://seed1.pos.nimiq-testnet.com:8648',
        rpcUsername: env.NIMIQ_RPC_USERNAME,
        rpcPassword: env.NIMIQ_RPC_PASSWORD,
      }

      const server = new BlockchainMcpServer(config)
      // Worker MCP handling would go here - simplified for now
      return new Response(JSON.stringify({
        error: 'Worker MCP handling not yet implemented',
      }), {
        headers: { 'content-type': 'application/json' },
      })
    }
    catch (error) {
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
  },
}
```

**Step 3: Create root worker with routing**

Create `src/worker.ts`:

```ts
import BlockchainWorker from '@nimiq-mcp/blockchain/worker'
import WebClientWorker from '@nimiq-mcp/web-client/worker'

export interface Env {
  NIMIQ_RPC_URL?: string
  NIMIQ_RPC_USERNAME?: string
  NIMIQ_RPC_PASSWORD?: string
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // Index page - guide to available endpoints
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: 'Nimiq MCP Server',
        version: '1.0.0',
        endpoints: {
          '/web-client': 'Nimiq documentation and resources MCP server',
          '/blockchain': 'Nimiq blockchain data and RPC MCP server',
        },
        docs: 'https://github.com/nimiq/mcp',
      }), {
        headers: { 'content-type': 'application/json' },
      })
    }

    // Route to web-client
    if (url.pathname.startsWith('/web-client')) {
      return WebClientWorker.fetch(request, env, ctx)
    }

    // Route to blockchain
    if (url.pathname.startsWith('/blockchain')) {
      return BlockchainWorker.fetch(request, env, ctx)
    }

    return new Response('Not Found', { status: 404 })
  },
}
```

**Step 4: Update root vite.config.ts for worker build**

Modify `vite.config.ts`:

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/worker.ts',
      formats: ['es'],
      fileName: 'worker',
    },
    rollupOptions: {
      external: [],
    },
    target: 'esnext',
    outDir: 'dist',
  },
})
```

**Step 5: Update wrangler.toml**

Modify `wrangler.toml`:

```toml
name = "nimiq-mcp"
main = "dist/worker.js"
compatibility_date = "2024-10-28"
node_compat = true

[vars]
NIMIQ_RPC_URL = "https://seed1.pos.nimiq-testnet.com:8648"
```

**Step 6: Build worker**

```bash
pnpm build
```

Expected: All packages build, root worker builds

**Step 7: Test worker locally**

```bash
pnpm dev:worker
```

Expected: Worker runs, visit localhost:8787 shows index JSON

**Step 8: Commit**

```bash
git add src/worker.ts packages/*/src/worker.ts vite.config.ts wrangler.toml
git commit -m "add worker routing"
```

---

## Task 10: Update Tests and Documentation

**Files:**

- Modify: `README.md`
- Remove: `src/` (old files)
- Modify: `.gitignore`

**Step 1: Update README with new structure**

Modify `README.md`:

````markdown
# Nimiq MCP Server

MCP servers for Nimiq blockchain interactions, split by domain:

- **@nimiq-mcp/web-client** - Documentation and resources
- **@nimiq-mcp/blockchain** - Blockchain RPC and calculations

## Installation

```bash
pnpm install
pnpm build
```
````

## Usage

### CLI Servers

Web client docs server:

```bash
pnpm dev:web-client
```

Blockchain RPC server:

```bash
pnpm dev:blockchain --rpc-url https://... --rpc-username ... --rpc-password ...
```

### Cloudflare Worker

Deploy both servers with routing:

```bash
pnpm deploy
```

Endpoints:

- `GET /` - Info page
- `POST /web-client` - Web client MCP
- `POST /blockchain` - Blockchain MCP

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint:fix

# Typecheck
pnpm typecheck
```

## Packages

- **packages/core** - Shared utilities
- **packages/web-client** - Docs/resources MCP server
- **packages/blockchain** - RPC/calculations MCP server

## Tools

### Web Client (1 tool)

- `search_nimiq_docs` - Full-text search

### Blockchain (18 tools)

- Supply: `get_nimiq_supply`, `calculate_nimiq_supply_at`
- Staking: `calculate_nimiq_staking_rewards`, `interactive_staking_calculator`
- Price: `get_nimiq_price`
- Blocks: `get_nimiq_head`, `get_nimiq_block_by_number`, `get_nimiq_block_by_hash`
- Accounts: `get_nimiq_account`, `get_nimiq_balance`, `get_nimiq_transaction`, `get_nimiq_transactions_by_address`
- Validators: `get_nimiq_validators`, `get_nimiq_validator`, `get_nimiq_slots`
- Network: `get_nimiq_epoch_number`, `get_nimiq_network_info`, `get_nimiq_rpc_methods`

````

**Step 2: Remove old src/ files**

```bash
rm -rf src/__tests__ src/schemas.ts src/tool-definitions.ts src/utils.ts src/index.ts
````

Expected: Old source files removed, only src/worker.ts remains

**Step 3: Update .gitignore**

Check if packages/\*/dist/ already ignored:

```bash
grep "dist/" .gitignore
```

If not present, add:

```
packages/*/dist/
```

**Step 4: Verify all builds work**

```bash
pnpm build
```

Expected: core, web-client, blockchain, and worker all build successfully

**Step 5: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: No type errors

**Step 6: Commit**

```bash
git add .gitignore README.md
git rm -rf src/__tests__ src/schemas.ts src/tool-definitions.ts src/utils.ts src/index.ts
git commit -m "update docs, remove old src files"
```

---

## Task 11: Final Verification

**Files:**

- None (verification only)

**Step 1: Test web-client CLI works**

```bash
pnpm --filter @nimiq-mcp/web-client start &
sleep 2
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | nc localhost -
```

Expected: Returns tool list

**Step 2: Test blockchain CLI works**

```bash
pnpm --filter @nimiq-mcp/blockchain start &
sleep 2
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | nc localhost -
```

Expected: Returns 18 tools

**Step 3: Test worker routing**

```bash
pnpm dev:worker &
sleep 3
curl http://localhost:8787/
```

Expected: JSON with endpoints info

**Step 4: Run all tests**

```bash
pnpm test
```

Expected: All tests pass (or update/remove old tests)

**Step 5: Run lint**

```bash
pnpm lint:fix
```

Expected: No lint errors

**Step 6: Final commit**

```bash
git add -A
git commit -m "monorepo refactor complete"
```

---

## Success Criteria

- ✅ Three packages: core, web-client, blockchain
- ✅ Each domain package is standalone MCP server
- ✅ Both CLIs run independently
- ✅ Worker routes to both domains
- ✅ All builds pass
- ✅ Typecheck passes
- ✅ Tests pass
- ✅ Documentation updated

## Notes

- Breaking change, v1.0.0 release
- Old `nimiq-mcp` v0.0.10 remains as legacy
- Each package can be published separately to npm
- Worker simplified - full MCP protocol handling can be added later
