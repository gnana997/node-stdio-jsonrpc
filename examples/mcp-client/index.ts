#!/usr/bin/env node
/**
 * MCP Client Example
 *
 * Demonstrates how to use node-stdio-jsonrpc to connect to an MCP (Model Context Protocol) server.
 * MCP uses JSON-RPC 2.0 over stdio for communication.
 *
 * Usage:
 *   ts-node examples/mcp-client/index.ts <mcp-server-command> [...args]
 *
 * Example:
 *   ts-node examples/mcp-client/index.ts npx @modelcontextprotocol/server-filesystem ~/Documents
 */

import { StdioClient } from '../../src/client.js';

// MCP Protocol types
interface MCPInitializeParams {
  protocolVersion: string;
  capabilities: {
    roots?: { listChanged?: boolean };
    sampling?: Record<string, never>;
  };
  clientInfo: {
    name: string;
    version: string;
  };
}

interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: {
    logging?: Record<string, never>;
    prompts?: { listChanged?: boolean };
    resources?: { subscribe?: boolean; listChanged?: boolean };
    tools?: { listChanged?: boolean };
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

interface MCPListToolsResult {
  tools: MCPTool[];
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: ts-node examples/mcp-client/index.ts <mcp-server-command> [...args]');
    console.error('');
    console.error('Example:');
    console.error(
      '  ts-node examples/mcp-client/index.ts npx @modelcontextprotocol/server-filesystem ~/Documents'
    );
    process.exit(1);
  }

  const [command, ...serverArgs] = args;

  console.log('🚀 MCP Client Example');
  console.log('━'.repeat(50));
  console.log(`Command: ${command}`);
  console.log(`Args: ${serverArgs.join(' ')}`);
  console.log('');

  // Create stdio client
  const client = new StdioClient({
    command: command || 'node',
    args: serverArgs,
    debug: true, // Enable debug logging
  });

  // Listen for server notifications
  client.on('notification', (method: string, params?: unknown) => {
    console.log(`📨 Notification: ${method}`, params);
  });

  // Listen for server logs (stderr)
  client.on('log', (message: string) => {
    console.log(`📝 Server log: ${message}`);
  });

  // Listen for errors
  client.on('error', (error: Error) => {
    console.error(`❌ Error: ${error.message}`);
  });

  // Listen for disconnection
  client.on('disconnected', () => {
    console.log('🔌 Disconnected from server');
  });

  try {
    // 1. Connect to the MCP server
    console.log('🔗 Connecting to MCP server...');
    await client.connect();
    console.log('✅ Connected!');
    console.log('');

    // 2. Initialize the MCP session
    console.log('🤝 Initializing MCP session...');
    const initParams: MCPInitializeParams = {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: true },
      },
      clientInfo: {
        name: 'node-stdio-jsonrpc-example',
        version: '0.1.0',
      },
    };

    const initResult = await client.request<MCPInitializeResult>('initialize', initParams);
    console.log('✅ Initialized!');
    console.log('Server Info:', initResult.serverInfo);
    console.log('Capabilities:', JSON.stringify(initResult.capabilities, null, 2));
    console.log('');

    // 3. Send initialized notification
    client.notify('notifications/initialized');

    // 4. List available tools
    if (initResult.capabilities.tools) {
      console.log('🔧 Listing available tools...');
      const toolsResult = await client.request<MCPListToolsResult>('tools/list');
      console.log(`✅ Found ${toolsResult.tools.length} tool(s):`);

      for (const tool of toolsResult.tools) {
        console.log(`  • ${tool.name}: ${tool.description || 'No description'}`);
      }
      console.log('');
    }

    // 5. List available resources (if supported)
    if (initResult.capabilities.resources) {
      console.log('📚 Listing available resources...');
      try {
        const resourcesResult = await client.request<{
          resources: Array<{ uri: string; name?: string }>;
        }>('resources/list');
        console.log(`✅ Found ${resourcesResult.resources.length} resource(s):`);

        for (const resource of resourcesResult.resources.slice(0, 5)) {
          console.log(`  • ${resource.name || resource.uri}`);
        }

        if (resourcesResult.resources.length > 5) {
          console.log(`  ... and ${resourcesResult.resources.length - 5} more`);
        }
        console.log('');
      } catch (error) {
        console.log('⚠️  Resources not available');
        console.log('');
      }
    }

    // 6. Disconnect gracefully
    console.log('👋 Disconnecting...');
    await client.disconnect();
    console.log('✅ Disconnected successfully');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));

    if (client.isConnected()) {
      await client.disconnect();
    }

    process.exit(1);
  }
}

// Run the example
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
