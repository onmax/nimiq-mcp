#!/usr/bin/env python3
"""
Nimiq MCP Server - OpenAI Agents SDK Integration Example (Python)

This example demonstrates how to use the Nimiq MCP Server with OpenAI's Agents SDK
to query Nimiq blockchain data using natural language.
"""

import os
from openai import OpenAI
from mcp import MCPServerStreamableHttp

def main():
    # Initialize OpenAI client
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # Configure Nimiq MCP Server
    nimiq_mcp = MCPServerStreamableHttp(
        name="Nimiq Blockchain",
        params={
            "url": "https://nimiq-mcp.je-cf9.workers.dev/sse",
            "timeout": 30
        },
        cache_tools_list=True,  # Cache tools for better performance
        max_retry_attempts=3,  # Retry on network failures
        retry_backoff_seconds_base=2
    )

    # Create agent with Nimiq tools
    agent = client.agents.create(
        model="gpt-5",
        tools=[nimiq_mcp],
        instructions="""You are a helpful Nimiq ecosystem assistant with comprehensive access to:

        **Blockchain Data:**
        - Real-time account balances and transaction information
        - Block and validator data
        - Network statistics and supply information
        - Staking rewards calculations

        **Documentation & Learning Resources:**
        - Complete Nimiq web client documentation and tutorials
        - Protocol specifications and architecture guides
        - Validator setup guides and best practices
        - Full-text search across all Nimiq documentation

        You can help users understand Nimiq's technology, build applications with the web client,
        set up validators, analyze blockchain data, and learn about the Nimiq ecosystem.""",
        reasoning_effort=3  # Medium reasoning effort (1-5 scale)
    )

    print("🚀 Nimiq MCP Agent Ready!\n")

    # Example queries
    queries = [
        "What's the current block number?",
        "Get the balance of NQ07 0000 0000 0000 0000 0000 0000 0000 0000",
        "Calculate staking rewards for 10,000 NIM staked for 365 days",
        "How many validators are currently active?",
        "Search the docs for information about validator setup"
    ]

    for query in queries:
        print(f"📝 Query: {query}")

        response = client.agents.run(
            agent_id=agent.id,
            messages=[
                {
                    "role": "user",
                    "content": query
                }
            ]
        )

        print(f"💬 Response: {response.content}\n")
        print("-" * 80 + "\n")

    # Interactive mode
    print("\n🔄 Entering interactive mode. Type 'exit' to quit.\n")

    while True:
        user_input = input("You: ")

        if user_input.lower() in ['exit', 'quit', 'q']:
            break

        response = client.agents.run(
            agent_id=agent.id,
            messages=[
                {
                    "role": "user",
                    "content": user_input
                }
            ]
        )

        print(f"Agent: {response.content}\n")

if __name__ == "__main__":
    main()
