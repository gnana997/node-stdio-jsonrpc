import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { JSONRPCError } from '@gnana997/node-jsonrpc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StdioClient } from '../src/client.js';
import { delay, waitForEvent } from './helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const echoServerPath = join(__dirname, 'fixtures', 'echo-server.js');

describe('Integration Tests', () => {
  let client: StdioClient;

  afterEach(async () => {
    if (client?.isConnected()) {
      await client.disconnect();
    }
  });

  describe('End-to-End Communication', () => {
    it('should handle complete lifecycle', async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });

      // Connect
      await client.connect();
      expect(client.isConnected()).toBe(true);

      // Make request
      const pingResult = await client.request('ping');
      expect(pingResult).toBe('pong');

      // Make request with params
      const echoResult = await client.request('echo', { test: 'data' });
      expect(echoResult).toEqual({ test: 'data' });

      // Send notification
      client.notify('log', { message: 'test' });

      // Disconnect
      await client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it('should handle multiple sequential requests', async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });

      await client.connect();

      for (let i = 0; i < 10; i++) {
        const result = await client.request('add', { a: i, b: 1 });
        expect((result as { sum: number }).sum).toBe(i + 1);
      }

      await client.disconnect();
    });

    it('should handle rapid concurrent requests', async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });

      await client.connect();

      const promises = Array.from({ length: 20 }, (_, i) => client.request('add', { a: i, b: i }));

      const results = await Promise.all(promises);

      results.forEach((result, i) => {
        expect((result as { sum: number }).sum).toBe(i + i);
      });

      await client.disconnect();
    });
  });

  describe('Error Scenarios', () => {
    beforeEach(async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });
      await client.connect();
    });

    it('should handle JSON-RPC errors', async () => {
      try {
        await client.request('error');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toHaveProperty('name', 'JSONRPCError');
        expect(error).toHaveProperty('code', -32000);
        expect(error).toHaveProperty('message');
        expect((error as JSONRPCError).message).toContain('Intentional error');
      }
    });

    it('should handle method not found', async () => {
      try {
        await client.request('nonexistent-method');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toHaveProperty('name', 'JSONRPCError');
        expect(error).toHaveProperty('code', -32601);
        expect(error).toHaveProperty('message');
        expect((error as JSONRPCError).message).toContain('Method not found');
      }
    });

    it('should continue working after errors', async () => {
      // Trigger an error
      await expect(client.request('error')).rejects.toThrow();

      // Should still work
      const result = await client.request('ping');
      expect(result).toBe('pong');
    });
  });

  describe('Server Notifications', () => {
    it('should receive notifications from server', async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });

      await client.connect();

      const notifications: Array<{ method: string; params?: unknown }> = [];

      client.on('notification', (method: string, params?: unknown) => {
        notifications.push({ method, params });
      });

      // Trigger notification
      await client.request('notify');

      // Wait for notification to be received
      await delay(500);

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0]?.method).toBe('testNotification');
      expect(notifications[0]?.params).toEqual({ message: 'Hello from server' });

      await client.disconnect();
    });
  });

  describe('Server Logs', () => {
    it('should capture and emit server stderr output', async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
        debug: true,
      });

      const logs: string[] = [];

      client.on('log', (message: string) => {
        logs.push(message);
      });

      await client.connect();

      // Make a request to ensure server is active
      await client.request('ping');

      // Wait a bit for logs
      await delay(500);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((log) => log.includes('echo-server'))).toBe(true);

      await client.disconnect();
    });
  });

  describe('Process Lifecycle', () => {
    it('should handle server process exit', async () => {
      client = new StdioClient({
        command: 'node',
        args: ['-e', 'setTimeout(() => process.exit(0), 500)'],
      });

      const disconnectedPromise = waitForEvent(client, 'disconnected', 3000);

      await client.connect();
      expect(client.isConnected()).toBe(true);

      await disconnectedPromise;
      expect(client.isConnected()).toBe(false);
    });

    it('should connect to valid process that stays alive', async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
        connectionTimeout: 1000,
      });

      // Process stays alive, connection should succeed
      await client.connect();
      expect(client.isConnected()).toBe(true);

      // Verify it works
      const result = await client.request('ping');
      expect(result).toBe('pong');

      await client.disconnect();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed operations (requests, notifications, errors)', async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });

      await client.connect();

      const notifications: string[] = [];
      client.on('notification', (method: string) => {
        notifications.push(method);
      });

      // Send notification
      client.notify('log', { message: 'test' });

      // Make successful request
      const result1 = await client.request('ping');
      expect(result1).toBe('pong');

      // Trigger error
      await expect(client.request('error')).rejects.toThrow();

      // Send another notification
      client.notify('log', { message: 'test2' });

      // Make another successful request
      const result2 = await client.request('add', { a: 10, b: 5 });
      expect((result2 as { sum: number }).sum).toBe(15);

      // Trigger server notification
      await client.request('notify');
      await delay(200);

      expect(notifications.length).toBeGreaterThan(0);

      await client.disconnect();
    });

    it('should handle large payloads', async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });

      await client.connect();

      // Create a large object
      const largeData = {
        array: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: 'A'.repeat(100),
        })),
      };

      const result = await client.request('echo', largeData);
      expect(result).toEqual(largeData);

      await client.disconnect();
    });

    it('should handle requests with various data types', async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });

      await client.connect();

      // String
      const str = await client.request('echo', 'hello');
      expect(str).toBe('hello');

      // Number
      const num = await client.request('echo', 42);
      expect(num).toBe(42);

      // Boolean
      const bool = await client.request('echo', true);
      expect(bool).toBe(true);

      // Array
      const arr = await client.request('echo', [1, 2, 3]);
      expect(arr).toEqual([1, 2, 3]);

      // Object
      const obj = await client.request('echo', { a: 1, b: { c: 2 } });
      expect(obj).toEqual({ a: 1, b: { c: 2 } });

      // Null
      const nullVal = await client.request('echo', null);
      expect(nullVal).toBe(null);

      await client.disconnect();
    });
  });
});
