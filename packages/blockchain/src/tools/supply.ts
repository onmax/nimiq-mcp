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
