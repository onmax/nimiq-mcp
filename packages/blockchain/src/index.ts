#!/usr/bin/env node
import process from 'node:process'
import { BlockchainMcpServer } from './server.js'

const server = new BlockchainMcpServer()
server.run().catch((error) => {
  console.error('Server error:', error)
  process.exit(1)
})
