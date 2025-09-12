import { describe, expect, it } from 'vitest'
import { TOOL_DEFINITIONS } from '../tool-definitions.js'

describe('tool Definitions', () => {
  describe('tOOL_DEFINITIONS', () => {
    it('should export an array of tool definitions', () => {
      expect(Array.isArray(TOOL_DEFINITIONS)).toBe(true)
      expect(TOOL_DEFINITIONS.length).toBeGreaterThan(0)
    })

    it('should have valid structure for all tools', () => {
      TOOL_DEFINITIONS.forEach((tool) => {
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('inputSchema')
        expect(typeof tool.name).toBe('string')
        expect(typeof tool.description).toBe('string')
        expect(typeof tool.inputSchema).toBe('object')
      })
    })

    it('should have unique tool names', () => {
      const names = TOOL_DEFINITIONS.map(tool => tool.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })

    it('should have proper schema structure', () => {
      TOOL_DEFINITIONS.forEach((tool) => {
        expect(tool.inputSchema).toHaveProperty('type', 'object')
        expect(tool.inputSchema).toHaveProperty('properties')
        expect(tool.inputSchema).toHaveProperty('additionalProperties', false)
      })
    })

    describe('specific tools', () => {
      it('should include get_nimiq_supply tool', () => {
        const tool = TOOL_DEFINITIONS.find(t => t.name === 'get_nimiq_supply')
        expect(tool).toBeDefined()
        expect(tool?.description).toContain('supply of NIM')
      })

      it('should include calculate_nimiq_staking_rewards tool', () => {
        const tool = TOOL_DEFINITIONS.find(t => t.name === 'calculate_nimiq_staking_rewards')
        expect(tool).toBeDefined()
        expect(tool?.description).toContain('staking')
        expect(tool?.inputSchema.properties).toHaveProperty('amount')
        expect(tool?.inputSchema.properties).toHaveProperty('days')
        expect(tool?.inputSchema.properties).toHaveProperty('autoRestake')
      })

      it('should include get_nimiq_price tool with required currencies', () => {
        const tool = TOOL_DEFINITIONS.find(t => t.name === 'get_nimiq_price')
        expect(tool).toBeDefined()
        expect(tool?.inputSchema.required).toContain('currencies')
        expect(tool?.inputSchema.properties?.provider?.enum).toEqual(['CryptoCompare', 'CoinGecko'])
      })

      it('should include search_nimiq_docs tool', () => {
        const tool = TOOL_DEFINITIONS.find(t => t.name === 'search_nimiq_docs')
        expect(tool).toBeDefined()
        expect(tool?.inputSchema.required).toContain('query')
        expect(tool?.inputSchema.properties?.limit?.default).toBe(10)
      })

      it('should include interactive_staking_calculator tool', () => {
        const tool = TOOL_DEFINITIONS.find(t => t.name === 'interactive_staking_calculator')
        expect(tool).toBeDefined()
        expect(tool?.description).toContain('Interactive staking')
        expect(tool?.inputSchema.properties?.network?.enum).toEqual(['main-albatross', 'test-albatross'])
        expect(tool?.inputSchema.properties?.network?.default).toBe('main-albatross')
      })

      it('should include blockchain query tools', () => {
        const blockchainTools = [
          'get_nimiq_head',
          'get_nimiq_block_by_number',
          'get_nimiq_block_by_hash',
          'get_nimiq_account',
          'get_nimiq_balance',
          'get_nimiq_transaction',
          'get_nimiq_transactions_by_address',
          'get_nimiq_validators',
          'get_nimiq_validator',
          'get_nimiq_slots',
          'get_nimiq_epoch_number',
          'get_nimiq_network_info',
          'get_nimiq_rpc_methods',
        ]

        blockchainTools.forEach((toolName) => {
          const tool = TOOL_DEFINITIONS.find(t => t.name === toolName)
          expect(tool).toBeDefined()
        })
      })
    })

    describe('tool parameter validation', () => {
      it('should have proper enum values for network parameters', () => {
        const toolsWithNetwork = TOOL_DEFINITIONS.filter(tool =>
          tool.inputSchema.properties?.network,
        )

        toolsWithNetwork.forEach((tool) => {
          expect(tool.inputSchema.properties?.network?.enum).toEqual(['main-albatross', 'test-albatross'])
          expect(tool.inputSchema.properties?.network?.default).toBe('main-albatross')
        })
      })

      it('should have boolean default values where appropriate', () => {
        const includeBodyTools = TOOL_DEFINITIONS.filter(tool =>
          tool.inputSchema.properties?.includeBody,
        )

        includeBodyTools.forEach((tool) => {
          expect(tool.inputSchema.properties?.includeBody?.type).toBe('boolean')
          expect(tool.inputSchema.properties?.includeBody?.default).toBe(false)
        })
      })

      it('should have numeric types for amount and days in staking tools', () => {
        const stakingTool = TOOL_DEFINITIONS.find(t => t.name === 'calculate_nimiq_staking_rewards')
        expect(stakingTool?.inputSchema.properties?.amount?.type).toBe('number')
        expect(stakingTool?.inputSchema.properties?.days?.type).toBe('number')
        expect(stakingTool?.inputSchema.properties?.amount?.default).toBe(1)
        expect(stakingTool?.inputSchema.properties?.days?.default).toBe(365)
      })
    })
  })
})
