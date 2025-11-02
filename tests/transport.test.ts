import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StdioTransport } from '../src/transport.js';
import { delay, waitForEvent } from './helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const echoServerPath = join(__dirname, 'fixtures', 'echo-server.js');

describe('StdioTransport', () => {
  let transport: StdioTransport;

  afterEach(async () => {
    if (transport?.isConnected()) {
      await transport.disconnect();
    }
  });

  describe('constructor', () => {
    it('should create transport with required config', () => {
      transport = new StdioTransport({
        command: 'node',
        args: [echoServerPath],
      });

      expect(transport).toBeInstanceOf(StdioTransport);
    });

    it('should accept all config options', () => {
      transport = new StdioTransport({
        command: 'node',
        args: [echoServerPath],
        cwd: process.cwd(),
        env: process.env,
        connectionTimeout: 5000,
        debug: false,
      });

      expect(transport).toBeInstanceOf(StdioTransport);
    });
  });

  describe('connect', () => {
    it('should connect to child process successfully', async () => {
      transport = new StdioTransport({
        command: 'node',
        args: [echoServerPath],
      });

      await transport.connect();

      expect(transport.isConnected()).toBe(true);
    });

    it('should emit message event when receiving data', async () => {
      transport = new StdioTransport({
        command: 'node',
        args: [echoServerPath],
      });

      await transport.connect();

      const messagePromise = waitForEvent<string>(transport, 'message', 2000);

      // Send ping request
      transport.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }));

      const message = await messagePromise;
      expect(message).toBeTruthy();
      expect(message).toContain('"result":"pong"');
    });

    it('should connect even if process doesnt output data', async () => {
      transport = new StdioTransport({
        command: 'node',
        args: ['-e', 'setTimeout(() => process.exit(0), 200)'], // Process that doesn't output anything initially
        connectionTimeout: 500,
      });

      // For stdio, connection succeeds when process spawns, not when it writes data
      await expect(transport.connect()).resolves.toBeUndefined();
      expect(transport.isConnected()).toBe(true);

      // Clean up
      await transport.disconnect();
    });

    it('should not connect twice', async () => {
      transport = new StdioTransport({
        command: 'node',
        args: [echoServerPath],
      });

      await transport.connect();
      await transport.connect(); // Should be no-op

      expect(transport.isConnected()).toBe(true);
    });
  });

  describe('send', () => {
    beforeEach(async () => {
      transport = new StdioTransport({
        command: 'node',
        args: [echoServerPath],
      });
      await transport.connect();
    });

    it('should send messages to child process', async () => {
      const messagePromise = waitForEvent<string>(transport, 'message', 2000);

      transport.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }));

      const response = await messagePromise;
      const parsed = JSON.parse(response);

      expect(parsed.result).toBe('pong');
      expect(parsed.id).toBe(1);
    });

    it('should handle multiple messages', async () => {
      const messages: string[] = [];

      transport.on('message', (msg: string) => {
        messages.push(msg);
      });

      transport.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }));
      transport.send(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'ping' }));
      transport.send(JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'ping' }));

      await delay(500);

      expect(messages.length).toBe(3);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from child process', async () => {
      transport = new StdioTransport({
        command: 'node',
        args: [echoServerPath],
      });

      await transport.connect();
      expect(transport.isConnected()).toBe(true);

      await transport.disconnect();
      expect(transport.isConnected()).toBe(false);
    });

    it('should emit close event on disconnect', async () => {
      transport = new StdioTransport({
        command: 'node',
        args: [echoServerPath],
      });

      await transport.connect();

      const closePromise = waitForEvent(transport, 'close', 2000);
      await transport.disconnect();

      await closePromise;
    });

    it('should be safe to disconnect when not connected', async () => {
      transport = new StdioTransport({
        command: 'node',
        args: [echoServerPath],
      });

      await expect(transport.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should emit error when process fails to spawn', async () => {
      transport = new StdioTransport({
        command: 'nonexistent-command-xyz',
        args: [],
      });

      await expect(transport.connect()).rejects.toThrow();
    });

    it('should handle process exit gracefully', async () => {
      transport = new StdioTransport({
        command: 'node',
        args: ['-e', 'setTimeout(() => process.exit(0), 150)'], // Exit after connection establishes (100ms)
      });

      const closePromise = waitForEvent(transport, 'close', 2000);
      await transport.connect();
      expect(transport.isConnected()).toBe(true);
      await closePromise;

      expect(transport.isConnected()).toBe(false);
    });
  });

  describe('logging', () => {
    it('should emit log events for stderr output', async () => {
      transport = new StdioTransport({
        command: 'node',
        args: [echoServerPath],
        debug: true,
      });

      const logPromise = waitForEvent<string>(transport, 'log', 2000);
      await transport.connect();

      const logMessage = await logPromise;
      expect(logMessage).toBeTruthy();
    });
  });
});
