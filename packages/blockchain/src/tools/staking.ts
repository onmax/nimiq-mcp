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
