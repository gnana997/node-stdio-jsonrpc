# MCP Client Example

This example demonstrates how to use `node-stdio-jsonrpc` to create a client for the **Model Context Protocol (MCP)**.

MCP is a protocol that uses JSON-RPC 2.0 over stdio to enable communication between AI applications and context providers (like file systems, databases, APIs, etc.).

## What This Example Does

This example client:

1. **Connects** to an MCP server via stdio
2. **Initializes** the MCP session with protocol negotiation
3. **Lists** available tools and resources from the server
4. **Disconnects** gracefully

## Prerequisites

- Node.js 18 or higher
- An MCP server to connect to

## Installation

```bash
# Install dependencies (from repository root)
npm install

# Build the package
npm run build
```

## Usage

### Basic Usage

```bash
npx tsx examples/mcp-client/index.ts <mcp-server-command> [...args]
```

### Quick Test with Mock Server

The example includes a mock MCP server for testing:

```bash
npx tsx examples/mcp-client/index.ts node examples/mcp-client/mock-mcp-server.js
```

This will connect to a mock server that responds to basic MCP methods (initialize, tools/list, resources/list).

### Example with MCP Filesystem Server

First, install an MCP server (e.g., the filesystem server):

```bash
npm install -g @modelcontextprotocol/server-filesystem
```

Then run the client:

```bash
npx tsx examples/mcp-client/index.ts npx @modelcontextprotocol/server-filesystem ~/Documents
```

### Example with Custom MCP Server

If you have a custom MCP server:

```bash
npx tsx examples/mcp-client/index.ts node path/to/your/mcp-server.js
```

## Expected Output

With the mock server:

```
🚀 MCP Client Example
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: node
Args: examples/mcp-client/mock-mcp-server.js

🔗 Connecting to MCP server...
📝 Server log: [mock-mcp-server] Mock MCP server started, waiting for requests...
✅ Connected!

🤝 Initializing MCP session...
📝 Server log: [mock-mcp-server] Received request: initialize
✅ Initialized!
Server Info: { name: 'mock-mcp-server', version: '1.0.0' }
Capabilities: {
  "logging": {},
  "prompts": {
    "listChanged": true
  },
  "resources": {
    "subscribe": true,
    "listChanged": true
  },
  "tools": {
    "listChanged": true
  }
}

🔧 Listing available tools...
📝 Server log: [mock-mcp-server] Received request: tools/list
✅ Found 3 tool(s):
  • echo: Echo back the input message
  • calculate: Perform basic arithmetic operations
  • get_time: Get the current server time

📚 Listing available resources...
📝 Server log: [mock-mcp-server] Received request: resources/list
✅ Found 3 resource(s):
  • Resource 1
  • Resource 2
  • Data JSON

👋 Disconnecting...
✅ Disconnected successfully
```

## Code Walkthrough

### 1. Create the Client

```typescript
import { StdioClient } from 'node-stdio-jsonrpc';

const client = new StdioClient({
  command: 'npx',
  args: ['@modelcontextprotocol/server-filesystem', '~/Documents'],
  debug: true,
});
```

### 2. Listen for Events

```typescript
client.on('notification', (method, params) => {
  console.log(`Notification: ${method}`, params);
});

client.on('log', (message) => {
  console.log(`Server log: ${message}`);
});

client.on('error', (error) => {
  console.error(`Error: ${error.message}`);
});
```

### 3. Connect and Initialize

```typescript
await client.connect();

const initResult = await client.request('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: { roots: { listChanged: true } },
  clientInfo: { name: 'my-client', version: '1.0.0' },
});

client.notify('notifications/initialized');
```

### 4. Make Requests

```typescript
const tools = await client.request('tools/list');
console.log('Available tools:', tools);

const resources = await client.request('resources/list');
console.log('Available resources:', resources);
```

### 5. Disconnect

```typescript
await client.disconnect();
```

## Learn More

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [node-stdio-jsonrpc Documentation](../../README.md)

## Extending This Example

You can extend this example to:

- **Call tools**: Use `tools/call` to execute tools on the server
- **Read resources**: Use `resources/read` to fetch resource contents
- **Handle prompts**: Use `prompts/list` and `prompts/get` for AI prompts
- **Subscribe to changes**: Listen for `notifications/resources/list_changed` and similar events

Example tool call:

```typescript
const result = await client.request('tools/call', {
  name: 'read_file',
  arguments: {
    path: '/path/to/file.txt',
  },
});
```
