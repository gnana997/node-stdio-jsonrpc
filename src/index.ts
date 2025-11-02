/**
 * node-stdio-jsonrpc
 *
 * TypeScript JSON-RPC 2.0 client over stdio (child process) - clean and developer-friendly
 *
 * @example
 * ```typescript
 * import { StdioClient } from 'node-stdio-jsonrpc';
 *
 * const client = new StdioClient({
 *   command: 'node',
 *   args: ['./server.js']
 * });
 *
 * await client.connect();
 * const result = await client.request('method', params);
 * await client.disconnect();
 * ```
 *
 * @packageDocumentation
 */

// Main client and transport
export { StdioClient } from './client.js';
export { StdioTransport } from './transport.js';

// Type definitions
export type { StdioClientConfig, StdioTransportConfig, StdioClientEvents } from './types.js';

// Re-export commonly used types from @gnana997/node-jsonrpc
export { JSONRPCError } from '@gnana997/node-jsonrpc';
export type {
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
  JSONRPCErrorResponse,
} from '@gnana997/node-jsonrpc';
