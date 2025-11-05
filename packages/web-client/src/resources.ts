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
