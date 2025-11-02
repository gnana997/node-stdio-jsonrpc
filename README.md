# node-stdio-jsonrpc

[![npm version](https://img.shields.io/npm/v/node-stdio-jsonrpc.svg)](https://www.npmjs.com/package/node-stdio-jsonrpc)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

**Clean, developer-friendly JSON-RPC 2.0 client over stdio (child process communication)**

Built on top of [`@gnana997/node-jsonrpc`](https://www.npmjs.com/package/@gnana997/node-jsonrpc) with a stdio transport layer for communicating with child processes using line-delimited JSON.

Perfect for building clients for:
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers
- Language servers (LSP)
- Custom stdio-based JSON-RPC services
- CLI tools with JSON-RPC interfaces

## Features

✨ **Clean API** - Simple, intuitive interface for stdio JSON-RPC communication
🚀 **TypeScript First** - Full type safety with generics
📦 **Dual Package** - ESM and CommonJS support
🔄 **Event-Driven** - Built on EventEmitter for notifications and logs
🛡️ **Robust** - Comprehensive error handling and process lifecycle management
🧪 **Well-Tested** - 47 tests with 81%+ coverage
📝 **Well-Documented** - Examples and TypeScript types included

## Installation

```bash
npm install node-stdio-jsonrpc
```

## Quick Start

```typescript
import { StdioClient } from 'node-stdio-jsonrpc';

// Create a client that spawns a child process
const client = new StdioClient({
  command: 'node',
  args: ['./your-jsonrpc-server.js'],
  debug: true, // Optional: enable debug logging
});

// Connect to the server
await client.connect();

// Make a request
const result = await client.request('yourMethod', { param: 'value' });
console.log('Result:', result);

// Send a notification (no response expected)
client.notify('log', { level: 'info', message: 'Hello' });

// Listen for server notifications
client.on('notification', (method, params) => {
  console.log(`Server notification: ${method}`, params);
});

// Disconnect when done
await client.disconnect();
```

## API Reference

### `StdioClient`

The main class for creating JSON-RPC clients over stdio.

#### Constructor

```typescript
new StdioClient(config: StdioClientConfig)
```

**Config Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `command` | `string` | *required* | Command to spawn (e.g., `'node'`, `'python'`) |
| `args` | `string[]` | `[]` | Arguments to pass to the command |
| `cwd` | `string` | `process.cwd()` | Working directory for the child process |
| `env` | `NodeJS.ProcessEnv` | `process.env` | Environment variables |
| `connectionTimeout` | `number` | `10000` | Connection timeout in milliseconds |
| `requestTimeout` | `number` | `30000` | Request timeout in milliseconds |
| `debug` | `boolean` | `false` | Enable debug logging |

#### Methods

##### `connect(): Promise<void>`

Spawns the child process and establishes the connection.

```typescript
await client.connect();
```

##### `disconnect(): Promise<void>`

Terminates the child process and cleans up resources.

```typescript
await client.disconnect();
```

##### `request<TResult>(method: string, params?: unknown): Promise<TResult>`

Sends a JSON-RPC request and waits for the response.

```typescript
interface CalculateResult {
  sum: number;
}

const result = await client.request<CalculateResult>('calculate', {
  operation: 'add',
  a: 5,
  b: 3,
});

console.log(result.sum); // 8
```

##### `notify(method: string, params?: unknown): void`

Sends a JSON-RPC notification (no response expected).

```typescript
client.notify('log', { level: 'info', message: 'Task completed' });
```

##### `isConnected(): boolean`

Checks if the client is currently connected.

```typescript
if (client.isConnected()) {
  console.log('Connected!');
}
```

#### Events

The client extends `EventEmitter` and emits the following events:

| Event | Parameters | Description |
|-------|------------|-------------|
| `connected` | `()` | Emitted when connection is established |
| `disconnected` | `()` | Emitted when disconnected from server |
| `notification` | `(method: string, params?: unknown)` | Server sent a notification |
| `error` | `(error: Error)` | An error occurred |
| `log` | `(message: string)` | Server wrote to stderr |

```typescript
client.on('connected', () => {
  console.log('Connected to server!');
});

client.on('disconnected', () => {
  console.log('Disconnected from server');
});

client.on('notification', (method, params) => {
  console.log(`Notification: ${method}`, params);
});

client.on('error', (error) => {
  console.error('Error:', error);
});

client.on('log', (message) => {
  console.log(`Server log: ${message}`);
});
```

### `StdioTransport`

Lower-level transport implementation. Usually you'll use `StdioClient`, but `StdioTransport` is available if you need direct control.

```typescript
import { StdioTransport } from 'node-stdio-jsonrpc/transport';
import { JSONRPCClient } from '@gnana997/node-jsonrpc';

const transport = new StdioTransport({
  command: 'node',
  args: ['./server.js'],
});

const client = new JSONRPCClient({ transport });
await client.connect();
```

## Examples

### Basic Example

```typescript
import { StdioClient } from 'node-stdio-jsonrpc';

const client = new StdioClient({
  command: 'node',
  args: ['./echo-server.js'],
});

await client.connect();

const response = await client.request('echo', { message: 'Hello, World!' });
console.log(response); // { message: 'Hello, World!' }

await client.disconnect();
```

### MCP Client Example

Perfect for connecting to Model Context Protocol servers:

```typescript
import { StdioClient } from 'node-stdio-jsonrpc';

const client = new StdioClient({
  command: 'npx',
  args: ['@modelcontextprotocol/server-filesystem', '~/Documents'],
  debug: true,
});

await client.connect();

// Initialize MCP session
const initResult = await client.request('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: { roots: { listChanged: true } },
  clientInfo: { name: 'my-client', version: '1.0.0' },
});

client.notify('notifications/initialized');

// List available tools
const { tools } = await client.request('tools/list');
console.log('Available tools:', tools);

await client.disconnect();
```

See the [MCP client example](./examples/mcp-client) for a complete implementation.

### Error Handling

```typescript
import { StdioClient, JSONRPCError } from 'node-stdio-jsonrpc';

const client = new StdioClient({
  command: 'node',
  args: ['./server.js'],
});

try {
  await client.connect();

  const result = await client.request('someMethod', { param: 'value' });
  console.log('Success:', result);

} catch (error) {
  if (error instanceof JSONRPCError) {
    console.error('JSON-RPC Error:', error.code, error.message);
  } else {
    console.error('Connection/Transport Error:', error);
  }
} finally {
  if (client.isConnected()) {
    await client.disconnect();
  }
}
```

### Using with TypeScript

```typescript
import { StdioClient } from 'node-stdio-jsonrpc';

// Define your request/response types
interface CalculateParams {
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  a: number;
  b: number;
}

interface CalculateResult {
  result: number;
}

const client = new StdioClient({
  command: 'node',
  args: ['./calculator-server.js'],
});

await client.connect();

// Type-safe requests
const result = await client.request<CalculateResult>('calculate', {
  operation: 'add',
  a: 10,
  b: 5,
} satisfies CalculateParams);

console.log(result.result); // TypeScript knows this is a number

await client.disconnect();
```

## Protocol

This library implements **JSON-RPC 2.0** over **stdio** (standard input/output) using **line-delimited JSON** framing:

- Each JSON message is on its own line
- Messages are terminated with `\n`
- stdin: Client → Server
- stdout: Server → Client (JSON-RPC messages)
- stderr: Server logs (not JSON-RPC)

### Message Format

**Request:**
```json
{"jsonrpc":"2.0","id":1,"method":"methodName","params":{"key":"value"}}
```

**Success Response:**
```json
{"jsonrpc":"2.0","id":1,"result":{"data":"value"}}
```

**Error Response:**
```json
{"jsonrpc":"2.0","id":1,"error":{"code":-32000,"message":"Error message"}}
```

**Notification (no id):**
```json
{"jsonrpc":"2.0","method":"notifyMethod","params":{"key":"value"}}
```

## Requirements

- Node.js 18 or higher
- TypeScript 5.x (if using TypeScript)

## Related Packages

- [`@gnana997/node-jsonrpc`](https://www.npmjs.com/package/@gnana997/node-jsonrpc) - Core JSON-RPC 2.0 implementation
- [`node-ipc-jsonrpc`](https://github.com/gnana997/ipc-jsonrpc) - JSON-RPC over IPC (Unix sockets / Windows named pipes)

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT © [gnana997](https://github.com/gnana997)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

---

**Built with ❤️ using TypeScript and [@gnana997/node-jsonrpc](https://www.npmjs.com/package/@gnana997/node-jsonrpc)**
