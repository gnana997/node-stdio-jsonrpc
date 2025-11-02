import { EventEmitter } from 'node:events';
import { JSONRPCClient } from '@gnana997/node-jsonrpc/client';
import { StdioTransport } from './transport.js';
import type { StdioClientConfig, StdioClientEvents } from './types.js';

/**
 * JSON-RPC 2.0 client over stdio (child process)
 *
 * Provides a clean, developer-friendly API for communicating with JSON-RPC servers
 * running as child processes. Uses line-delimited JSON over stdin/stdout.
 *
 * @example
 * ```typescript
 * import { StdioClient } from 'node-stdio-jsonrpc';
 *
 * // Create client
 * const client = new StdioClient({
 *   command: 'node',
 *   args: ['./server.js'],
 *   debug: true
 * });
 *
 * // Connect and make requests
 * await client.connect();
 *
 * const result = await client.request('calculate', {
 *   operation: 'add',
 *   a: 5,
 *   b: 3
 * });
 * console.log('Result:', result); // 8
 *
 * // Listen for server notifications
 * client.on('notification', (method, params) => {
 *   console.log('Notification:', method, params);
 * });
 *
 * // Listen for server logs (stderr)
 * client.on('log', (message) => {
 *   console.log('Server log:', message);
 * });
 *
 * // Cleanup
 * await client.disconnect();
 * ```
 */
export class StdioClient extends EventEmitter<StdioClientEvents> {
  private config: Required<StdioClientConfig>;
  private transport: StdioTransport;
  private client: JSONRPCClient;

  constructor(config: StdioClientConfig) {
    super();

    this.config = {
      command: config.command,
      args: config.args ?? [],
      cwd: config.cwd ?? process.cwd(),
      env: config.env ?? process.env,
      connectionTimeout: config.connectionTimeout ?? 10000,
      requestTimeout: config.requestTimeout ?? 30000,
      debug: config.debug ?? false,
    };

    // Create stdio transport
    this.transport = new StdioTransport({
      command: this.config.command,
      args: this.config.args,
      cwd: this.config.cwd,
      env: this.config.env,
      connectionTimeout: this.config.connectionTimeout,
      debug: this.config.debug,
    });

    // Create JSON-RPC client using the transport
    this.client = new JSONRPCClient({
      transport: this.transport,
      requestTimeout: this.config.requestTimeout,
      debug: this.config.debug,
    });

    // Forward transport events
    this.transport.on('log', (message: string) => {
      this.emit('log', message);
    });

    this.transport.on('close', () => {
      this.emit('disconnected');
    });

    this.transport.on('error', (error: Error) => {
      this.emit('error', error);
    });

    // Setup event forwarding from JSON-RPC client
    this.setupEventForwarding();
  }

  /**
   * Connect to the server by spawning the child process
   */
  async connect(): Promise<void> {
    await this.client.connect();
    // Emit connected event after successful connection
    if (this.client.isConnected()) {
      this.emit('connected');
    }
  }

  /**
   * Disconnect from the server and terminate the child process
   */
  async disconnect(): Promise<void> {
    const wasConnected = this.client.isConnected();
    await this.client.disconnect();
    // Emit disconnected event after successful disconnection
    if (wasConnected) {
      this.emit('disconnected');
    }
  }

  /**
   * Send a JSON-RPC request and wait for the response
   *
   * @param method - The method name to call
   * @param params - The parameters to send (optional)
   * @returns The result from the server
   * @throws {JSONRPCError} If the server returns an error
   * @throws {Error} If the request times out or connection fails
   *
   * @example
   * ```typescript
   * // Simple request
   * const result = await client.request('echo', { message: 'hello' });
   *
   * // Request with type parameter
   * interface CalculateResult {
   *   result: number;
   * }
   *
   * const result = await client.request<CalculateResult>('calculate', {
   *   operation: 'add',
   *   a: 5,
   *   b: 3
   * });
   * console.log(result.result); // 8
   * ```
   */
  async request<TResult = unknown>(method: string, params?: unknown): Promise<TResult> {
    return await this.client.request<TResult>(method, params);
  }

  /**
   * Send a JSON-RPC notification (no response expected)
   *
   * @param method - The notification method name
   * @param params - The parameters to send (optional)
   *
   * @example
   * ```typescript
   * // Send a notification
   * client.notify('log', { level: 'info', message: 'Hello' });
   * ```
   */
  notify(method: string, params?: unknown): void {
    this.client.notify(method, params);
  }

  /**
   * Check if connected to the server
   */
  isConnected(): boolean {
    return this.client.isConnected();
  }

  /**
   * Setup event forwarding from the underlying JSON-RPC client
   * @private
   */
  private setupEventForwarding(): void {
    this.client.on('connected', () => {
      this.emit('connected');
    });

    this.client.on('disconnected', () => {
      this.emit('disconnected');
    });

    this.client.on('notification', (method: string, params?: unknown) => {
      this.emit('notification', method, params);
    });

    this.client.on('error', (error: Error) => {
      this.emit('error', error);
    });
  }
}
