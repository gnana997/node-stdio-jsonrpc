/**
 * Configuration for StdioTransport
 */
export interface StdioTransportConfig {
  /**
   * Command to execute (e.g., 'node', 'python', 'deno')
   */
  command: string;

  /**
   * Command-line arguments (e.g., ['./server.js', '--debug'])
   * @default []
   */
  args?: string[];

  /**
   * Working directory for the child process
   * @default process.cwd()
   */
  cwd?: string;

  /**
   * Environment variables for the child process
   * @default process.env
   */
  env?: NodeJS.ProcessEnv;

  /**
   * Connection timeout in milliseconds
   * @default 10000
   */
  connectionTimeout?: number;

  /**
   * Enable debug logging to stderr
   * @default false
   */
  debug?: boolean;
}

/**
 * Configuration for StdioClient
 */
export interface StdioClientConfig extends StdioTransportConfig {
  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  requestTimeout?: number;
}

/**
 * Events emitted by StdioClient
 */
export interface StdioClientEvents {
  /**
   * Emitted when successfully connected to the server
   */
  connected: [];

  /**
   * Emitted when disconnected from the server
   */
  disconnected: [];

  /**
   * Emitted when a notification is received from the server
   */
  notification: [method: string, params?: unknown];

  /**
   * Emitted when an error occurs
   */
  error: [error: Error];

  /**
   * Emitted when the server writes to stderr
   */
  log: [message: string];
}
