import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  AccountSchema,
  BlockByHashSchema,
  BlockByNumberSchema,
  PriceSchema,
  StakingRewardsSchema,
  SupplyAtSchema,
  TransactionsByAddressSchema,
  TransactionSchema,
  ValidatorsSchema,
} from '../schemas.js'

describe('schemas', () => {
  describe('supplyAtSchema', () => {
    it('should validate correct input', () => {
      const input = { timestampMs: 1640995200000 }
      expect(() => v.parse(SupplyAtSchema, input)).not.toThrow()
    })

    it('should use default network value', () => {
      const input = { timestampMs: 1640995200000 }
      const result = v.parse(SupplyAtSchema, input)
      expect(result.network).toBe('main-albatross')
    })

    it('should accept valid network values', () => {
      const input = { timestampMs: 1640995200000, network: 'test-albatross' }
      const result = v.parse(SupplyAtSchema, input)
      expect(result.network).toBe('test-albatross')
    })

    it('should reject invalid network values', () => {
      const input = { timestampMs: 1640995200000, network: 'invalid-network' }
      expect(() => v.parse(SupplyAtSchema, input)).toThrow()
    })

    it('should require timestampMs', () => {
      const input = {}
      expect(() => v.parse(SupplyAtSchema, input)).toThrow()
    })
  })

  describe('stakingRewardsSchema', () => {
    it('should validate empty input with defaults', () => {
      const input = {}
      const result = v.parse(StakingRewardsSchema, input)
      expect(result.amount).toBe(1)
      expect(result.days).toBe(365)
      expect(result.autoRestake).toBe(true)
      expect(result.network).toBe('main-albatross')
      expect(result.fee).toBe(0)
    })

    it('should validate complete input', () => {
      const input = {
        stakedSupplyRatio: 0.5,
        amount: 1000,
        days: 180,
        autoRestake: false,
        network: 'test-albatross' as const,
        fee: 0.05,
      }
      const result = v.parse(StakingRewardsSchema, input)
      expect(result).toEqual(input)
    })

    it('should reject invalid network', () => {
      const input = { network: 'invalid-network' }
      expect(() => v.parse(StakingRewardsSchema, input)).toThrow()
    })

    it('should accept partial input', () => {
      const input = { amount: 500, days: 90 }
      const result = v.parse(StakingRewardsSchema, input)
      expect(result.amount).toBe(500)
      expect(result.days).toBe(90)
      expect(result.autoRestake).toBe(true) // default
    })
  })

  describe('priceSchema', () => {
    it('should validate correct input', () => {
      const input = { currencies: ['USD', 'EUR'] }
      const result = v.parse(PriceSchema, input)
      expect(result.currencies).toEqual(['USD', 'EUR'])
      expect(result.provider).toBe('CryptoCompare')
    })

    it('should accept valid provider', () => {
      const input = { currencies: ['BTC'], provider: 'CoinGecko' as const }
      const result = v.parse(PriceSchema, input)
      expect(result.provider).toBe('CoinGecko')
    })

    it('should reject invalid provider', () => {
      const input = { currencies: ['USD'], provider: 'InvalidProvider' }
      expect(() => v.parse(PriceSchema, input)).toThrow()
    })

    it('should require currencies array', () => {
      const input = {}
      expect(() => v.parse(PriceSchema, input)).toThrow()
    })

    it('should reject empty currencies array', () => {
      const input = { currencies: [] }
      expect(() => v.parse(PriceSchema, input)).not.toThrow()
    })
  })

  describe('blockByNumberSchema', () => {
    it('should validate correct input', () => {
      const input = { blockNumber: 12345 }
      const result = v.parse(BlockByNumberSchema, input)
      expect(result.blockNumber).toBe(12345)
      expect(result.includeBody).toBe(false)
    })

    it('should accept includeBody parameter', () => {
      const input = { blockNumber: 12345, includeBody: true }
      const result = v.parse(BlockByNumberSchema, input)
      expect(result.includeBody).toBe(true)
    })

    it('should require blockNumber', () => {
      const input = {}
      expect(() => v.parse(BlockByNumberSchema, input)).toThrow()
    })

    it('should reject non-numeric blockNumber', () => {
      const input = { blockNumber: 'invalid' }
      expect(() => v.parse(BlockByNumberSchema, input)).toThrow()
    })
  })

  describe('blockByHashSchema', () => {
    it('should validate correct input', () => {
      const input = { hash: 'abc123' }
      const result = v.parse(BlockByHashSchema, input)
      expect(result.hash).toBe('abc123')
      expect(result.includeBody).toBe(false)
    })

    it('should accept includeBody parameter', () => {
      const input = { hash: 'abc123', includeBody: true }
      const result = v.parse(BlockByHashSchema, input)
      expect(result.includeBody).toBe(true)
    })

    it('should require hash', () => {
      const input = {}
      expect(() => v.parse(BlockByHashSchema, input)).toThrow()
    })
  })

  describe('accountSchema', () => {
    it('should validate correct input', () => {
      const input = { address: 'NQ123456789' }
      const result = v.parse(AccountSchema, input)
      expect(result.address).toBe('NQ123456789')
      expect(result.withMetadata).toBe(false)
    })

    it('should accept withMetadata parameter', () => {
      const input = { address: 'NQ123456789', withMetadata: true }
      const result = v.parse(AccountSchema, input)
      expect(result.withMetadata).toBe(true)
    })

    it('should require address', () => {
      const input = {}
      expect(() => v.parse(AccountSchema, input)).toThrow()
    })
  })

  describe('transactionSchema', () => {
    it('should validate correct input', () => {
      const input = { hash: 'txhash123' }
      const result = v.parse(TransactionSchema, input)
      expect(result.hash).toBe('txhash123')
    })

    it('should require hash', () => {
      const input = {}
      expect(() => v.parse(TransactionSchema, input)).toThrow()
    })
  })

  describe('transactionsByAddressSchema', () => {
    it('should validate correct input with defaults', () => {
      const input = { address: 'NQ123456789' }
      const result = v.parse(TransactionsByAddressSchema, input)
      expect(result.address).toBe('NQ123456789')
      expect(result.max).toBe(100)
      expect(result.onlyConfirmed).toBe(true)
      expect(result.startAt).toBeUndefined()
    })

    it('should accept all optional parameters', () => {
      const input = {
        address: 'NQ123456789',
        max: 50,
        startAt: 'txhash456',
        onlyConfirmed: false,
      }
      const result = v.parse(TransactionsByAddressSchema, input)
      expect(result).toEqual(input)
    })

    it('should require address', () => {
      const input = {}
      expect(() => v.parse(TransactionsByAddressSchema, input)).toThrow()
    })
  })

  describe('validatorsSchema', () => {
    it('should validate empty input with defaults', () => {
      const input = {}
      const result = v.parse(ValidatorsSchema, input)
      expect(result.includeStakers).toBe(false)
    })

    it('should accept includeStakers parameter', () => {
      const input = { includeStakers: true }
      const result = v.parse(ValidatorsSchema, input)
      expect(result.includeStakers).toBe(true)
    })

    it('should accept all parameters', () => {
      const input = { includeStakers: true }
      expect(() => v.parse(ValidatorsSchema, input)).not.toThrow()
    })
  })
})
