import type { Provider } from '@nimiq/utils/fiat-api'
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'
import { CryptoCurrency, FiatCurrency, getExchangeRates } from '@nimiq/utils/fiat-api'
import { PriceSchema, validateInput } from 'nimiq-mcp-core'

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
