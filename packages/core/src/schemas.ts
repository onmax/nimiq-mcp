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
