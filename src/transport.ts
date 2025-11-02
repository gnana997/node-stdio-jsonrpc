import { type ChildProcess, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { Transport } from '@gnana997/node-jsonrpc/transport';
import type { StdioTransportConfig } from './types.js';

/**
 * Stdio Transport implementation for JSON-RPC over child process communication
 *
 * Implements the Transport interface from @gnana997/node-jsonrpc for stdio communication.
 * Spawns a child process and communicates via stdin/stdout using line-delimited JSON.
 *
 * @example
 * ```typescript
 * import { JSONRPCClient } from '@gnana997/node-jsonrpc';
 * import { StdioTransport } from 'node-stdio-jsonrpc';
 *
 * const transport = new StdioTransport({
 *   command: 'node',
 *   args: ['./server.js']
 * });
 *
 * const client = new JSONRPCClient({ transport });
 * await client.connect();
 * const result = await client.request('method', params);
 * ```
 */
export class StdioTransport extends EventEmitter implements Transport {
  private config: Required<Omit<StdioTransportConfig, 'cwd' | 'env'>> & {
    cwd: string;
    env: NodeJS.ProcessEnv;
  };
  private process: ChildProcess | null = null;
  private buffer = '';
  private connected = false;

  constructor(config: StdioTransportConfig) {
    super();
    this.config = {
      command: config.command,
      args: config.args ?? [],
      cwd: config.cwd ?? process.cwd(),
      env: config.env ?? process.env,
      connectionTimeout: config.connectionTimeout ?? 10000,
      debug: config.debug ?? false,
    };
  }

  /**
   * Connect to the server by spawning a child process
   */
  async connect(): Promise<void> {
    if (this.connected) {
      this.log('Already connected');
      return;
    }

    this.log('Spawning process:', this.config.command, this.config.args.join(' '));

    return new Promise((resolve, reject) => {
      let connectionDelay: NodeJS.Timeout | undefined;
      let timeout: NodeJS.Timeout | undefined;
      let settled = false;

      const resolveOnce = () => {
        if (settled) return;
        settled = true;
        this.connected = true;
        resolve();
      };

      const rejectOnce = (error: Error) => {
        if (settled) return;
        settled = true;
        this.connected = false;
        reject(error);
      };

      try {
        // Spawn child process with piped stdio
        const childProcess = spawn(this.config.command, this.config.args, {
          stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
          cwd: this.config.cwd,
          env: this.config.env,
          shell: false,
        });

        this.process = childProcess;

        // For stdio, connection is established when process spawns successfully
        // Give a small delay to catch immediate spawn errors
        connectionDelay = setTimeout(() => {
          // Check if process is still running
          if (
            !this.connected &&
            this.process === childProcess &&
            !childProcess.killed &&
            childProcess.exitCode === null
          ) {
            this.log('Connected to process (PID:', childProcess.pid, ')');
            resolveOnce();
          } else if (childProcess.exitCode !== null && !settled) {
            // Process exited before connection delay, reject
            const error = new Error(
              `Process exited immediately with code: ${childProcess.exitCode}`
            );
            rejectOnce(error);
          }
        }, 100);

        // Timeout for overall connection (catches slow spawn failures)
        timeout = setTimeout(() => {
          if (connectionDelay) clearTimeout(connectionDelay);
          this.cleanup();
          rejectOnce(new Error(`Connection timeout after ${this.config.connectionTimeout}ms`));
        }, this.config.connectionTimeout);

        // Handle stdout data (JSON-RPC messages)
        childProcess.stdout?.on('data', (data: Buffer) => {
          if (timeout) clearTimeout(timeout);
          if (connectionDelay) clearTimeout(connectionDelay);
          this.handleData(data);
        });

        // Handle stderr data (server logs)
        childProcess.stderr?.on('data', (data: Buffer) => {
          const message = data.toString().trim();
          if (message) {
            this.log('Server stderr:', message);
            this.emit('log', message);
          }
        });

        // Handle process errors
        childProcess.on('error', (error: Error) => {
          if (timeout) clearTimeout(timeout);
          if (connectionDelay) clearTimeout(connectionDelay);
          this.log('Process error:', error.message);

          // Only emit error event if already connected (otherwise we're rejecting the promise)
          if (settled && this.connected) {
            this.emit('error', error);
          }

          rejectOnce(error);
        });

        // Handle process exit
        childProcess.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
          if (timeout) clearTimeout(timeout);
          if (connectionDelay) clearTimeout(connectionDelay);
          this.log('Process closed with code:', code, 'signal:', signal);

          // If we're still connecting (not yet settled), reject with error
          if (!settled) {
            const error = new Error(
              `Process exited during connection with code: ${code}, signal: ${signal}`
            );
            rejectOnce(error);
          } else {
            // Already connected, just mark as disconnected and emit close
            this.connected = false;
            this.emit('close');
          }
        });

        childProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
          if (connectionDelay) clearTimeout(connectionDelay);
          this.log('Process exited with code:', code, 'signal:', signal);
          this.connected = false;
        });
      } catch (error) {
        if (timeout) clearTimeout(timeout);
        if (connectionDelay) clearTimeout(connectionDelay);
        rejectOnce(error as Error);
      }
    });
  }

  /**
   * Disconnect from the server by terminating the child process
   */
  async disconnect(): Promise<void> {
    if (!this.process) {
      return;
    }

    this.log('Disconnecting from process');
    this.cleanup();
  }

  /**
   * Send a message to the server via stdin
   * Messages are sent as line-delimited JSON
   */
  send(message: string): void {
    if (!this.process || !this.connected) {
      this.emit('error', new Error('Cannot send - not connected'));
      return;
    }

    try {
      this.log('Sending:', message);
      this.process.stdin?.write(`${message}\n`);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Check if connected to the server
   */
  isConnected(): boolean {
    return (
      this.connected &&
      this.process !== null &&
      this.process.exitCode === null &&
      !this.process.killed
    );
  }

  /**
   * Clean up process resources
   * @private
   */
  private cleanup(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
    this.connected = false;
    this.buffer = '';
  }

  /**
   * Handle incoming data from stdout
   * Implements line-delimited JSON framing
   * @private
   */
  private handleData(data: Buffer): void {
    this.buffer += data.toString();

    // Process complete JSON lines
    let newlineIndex = this.buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (line.length > 0) {
        this.log('Received:', line);
        this.emit('message', line);
      }

      newlineIndex = this.buffer.indexOf('\n');
    }
  }

  /**
   * Debug logging
   * @private
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[StdioTransport]', ...args);
    }
  }
}
