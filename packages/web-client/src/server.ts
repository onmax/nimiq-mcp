import process from 'node:process'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'
import MiniSearch from 'minisearch'
import { createSnippet, SearchDocsSchema, validateInput, VERSION } from 'nimiq-mcp-core'
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
