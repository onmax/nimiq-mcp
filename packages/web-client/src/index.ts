#!/usr/bin/env node

import process from 'node:process'
import { WebClientMcpServer } from './server.js'

const server = new WebClientMcpServer()
server.run().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
