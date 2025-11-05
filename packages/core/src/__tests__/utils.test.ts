import * as v from 'valibot'
import { afterEach, describe, expect, it } from 'vitest'
import { buildElicitationPrompt, createSnippet, parseArgs, validateInput, VERSION } from '../utils.js'

describe('utils', () => {
  describe('validateInput', () => {
    const testSchema = v.object({
      name: v.string(),
      age: v.number(),
    })

    it('should validate correct input', () => {
      const input = { name: 'John', age: 30 }
      const result = validateInput(testSchema, input)
      expect(result).toEqual(input)
    })

    it('should throw Error for invalid input', () => {
      const input = { name: 'John', age: 'thirty' }
      expect(() => validateInput(testSchema, input)).toThrow(Error)
      expect(() => validateInput(testSchema, input)).toThrow('Invalid input')
    })

    it('should throw Error with specific field errors', () => {
      const input = { name: 123, age: 'thirty' }
      try {
        validateInput(testSchema, input)
      }
      catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Invalid input')
      }
    })
  })

  describe('parseArgs', () => {
    const originalArgv = process.argv
    const originalEnv = { ...process.env }

    afterEach(() => {
      process.argv = originalArgv
      process.env = originalEnv
    })

    it('should return default config with no arguments', () => {
      delete process.env.NIMIQ_RPC_URL
      process.argv = ['node', 'script.js']
      const config = parseArgs()
      expect(config.rpcUrl).toBe('https://seed1.pos.nimiq-testnet.com:8648')
    })

    it('should parse custom RPC URL', () => {
      process.argv = ['node', 'script.js', '--rpc-url', 'https://custom.rpc.com']
      const config = parseArgs()
      expect(config.rpcUrl).toBe('https://custom.rpc.com')
    })

    it('should parse RPC credentials', () => {
      process.argv = ['node', 'script.js', '--rpc-username', 'user', '--rpc-password', 'pass']
      const config = parseArgs()
      expect(config.rpcUsername).toBe('user')
      expect(config.rpcPassword).toBe('pass')
    })

    it('should parse all options together', () => {
      process.argv = [
        'node',
        'script.js',
        '--rpc-url',
        'https://test.rpc.com',
        '--rpc-username',
        'testuser',
        '--rpc-password',
        'testpass',
      ]
      const config = parseArgs()
      expect(config).toEqual({
        rpcUrl: 'https://test.rpc.com',
        rpcUsername: 'testuser',
        rpcPassword: 'testpass',
      })
    })
  })

  describe('createSnippet', () => {
    const testContent = 'This is a sample document with some important information about testing and development'

    it('should create snippet with query match', () => {
      const snippet = createSnippet(testContent, 'testing')
      expect(snippet).toContain('testing')
      expect(snippet.length).toBeLessThanOrEqual(203) // maxLength + "..."
    })

    it('should create snippet from beginning when no match', () => {
      const snippet = createSnippet(testContent, 'nonexistent')
      expect(snippet).toContain('This is a sample document')
    })

    it('should respect maxLength parameter when no match', () => {
      const snippet = createSnippet(testContent, 'nonexistent', 50)
      expect(snippet.length).toBeLessThanOrEqual(54) // 50 + "..."
    })

    it('should handle empty content', () => {
      const snippet = createSnippet('', 'test')
      expect(snippet).toBe('...')
    })

    it('should handle multiple query words', () => {
      const snippet = createSnippet(testContent, 'important development')
      expect(snippet).toContain('important')
    })
  })

  describe('buildElicitationPrompt', () => {
    it('should build prompt for amount', () => {
      const prompt = buildElicitationPrompt(['amount'])
      expect(prompt).toContain('How much NIM would you like to stake?')
    })

    it('should build prompt for days', () => {
      const prompt = buildElicitationPrompt(['days'])
      expect(prompt).toContain('For how many days do you want to stake?')
    })

    it('should build prompt for autoRestake', () => {
      const prompt = buildElicitationPrompt(['autoRestake'])
      expect(prompt).toContain('Would you like to automatically restake rewards?')
    })

    it('should build prompt for multiple parameters', () => {
      const prompt = buildElicitationPrompt(['amount', 'days', 'autoRestake'])
      expect(prompt).toContain('How much NIM')
      expect(prompt).toContain('how many days')
      expect(prompt).toContain('automatically restake')
    })

    it('should handle empty array', () => {
      const prompt = buildElicitationPrompt([])
      expect(prompt).toBe('')
    })

    it('should handle unknown parameters', () => {
      const prompt = buildElicitationPrompt(['unknown', 'amount'])
      expect(prompt).toContain('How much NIM')
      expect(prompt).toContain('Please provide unknown')
    })
  })

  describe('vERSION', () => {
    it('should export a version string', () => {
      expect(typeof VERSION).toBe('string')
      expect(VERSION).toBeTruthy()
    })
  })
})
