import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StdioClient } from '../src/client.js';
import { waitForEvent } from './helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const echoServerPath = join(__dirname, 'fixtures', 'echo-server.js');

describe('StdioClient', () => {
  let client: StdioClient;

  afterEach(async () => {
    if (client?.isConnected()) {
      await client.disconnect();
    }
  });

  describe('constructor', () => {
    it('should create client with required config', () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });

      expect(client).toBeInstanceOf(StdioClient);
    });

    it('should accept all config options', () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
        cwd: process.cwd(),
        env: process.env,
        connectionTimeout: 5000,
        requestTimeout: 10000,
        debug: false,
      });

      expect(client).toBeInstanceOf(StdioClient);
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });

      await client.connect();

      expect(client.isConnected()).toBe(true);
    });

    it('should emit connected event', async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });

      const connectedPromise = waitForEvent(client, 'connected', 3000);

      await client.connect();
      await connectedPromise;

      expect(client.isConnected()).toBe(true);
    });
  });

  describe('request', () => {
    beforeEach(async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });
      await client.connect();
    });

    it('should send request and receive response', async () => {
      const result = await client.request('ping');

      expect(result).toBe('pong');
    });

    it('should send request with params', async () => {
      const params = { message: 'hello world' };
      const result = await client.request('echo', params);

      expect(result).toEqual(params);
    });

    it('should handle typed responses', async () => {
      interface AddResult {
        sum: number;
      }

      const result = await client.request<AddResult>('add', { a: 5, b: 3 });

      expect(result.sum).toBe(8);
    });

    it('should handle multiple concurrent requests', async () => {
      const results = await Promise.all([
        client.request('ping'),
        client.request('add', { a: 1, b: 2 }),
        client.request('subtract', { a: 10, b: 3 }),
      ]);

      expect(results[0]).toBe('pong');
      expect((results[1] as { sum: number }).sum).toBe(3);
      expect((results[2] as { difference: number }).difference).toBe(7);
    });

    it('should handle error responses', async () => {
      try {
        await client.request('error');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toHaveProperty('name', 'JSONRPCError');
        expect(error).toHaveProperty('code', -32000);
        expect(error).toHaveProperty('message');
      }
    });

    it('should handle method not found', async () => {
      await expect(client.request('nonexistent')).rejects.toThrow('Method not found');
    });

    it('should throw if not connected', async () => {
      const disconnectedClient = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });

      await expect(disconnectedClient.request('ping')).rejects.toThrow();
    });
  });

  describe('notify', () => {
    beforeEach(async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });
      await client.connect();
    });

    it('should send notification without waiting for response', () => {
      expect(() => {
        client.notify('ping');
      }).not.toThrow();
    });

    it('should send notification with params', () => {
      expect(() => {
        client.notify('log', { level: 'info', message: 'test' });
      }).not.toThrow();
    });
  });

  describe('notifications from server', () => {
    beforeEach(async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });
      await client.connect();
    });

    it('should receive notifications from server', async () => {
      const notificationPromise = waitForEvent<{ method: string; params?: unknown }>(
        client,
        'notification',
        3000
      );

      // Request that triggers a notification
      await client.request('notify');

      const notification = await notificationPromise;
      expect(notification).toBeDefined();
    });
  });

  describe('disconnect', () => {
    it('should disconnect cleanly', async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });

      await client.connect();
      expect(client.isConnected()).toBe(true);

      await client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it('should emit disconnected event', async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });

      await client.connect();

      const disconnectedPromise = waitForEvent(client, 'disconnected', 2000);
      await client.disconnect();
      await disconnectedPromise;
    });

    it('should be safe to disconnect when not connected', async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
      });

      await expect(client.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should emit error on connection failure', async () => {
      client = new StdioClient({
        command: 'nonexistent-command-xyz',
        args: [],
      });

      await expect(client.connect()).rejects.toThrow();
    });

    it('should handle process crashes gracefully', async () => {
      client = new StdioClient({
        command: 'node',
        args: ['-e', 'setTimeout(() => process.exit(1), 100)'],
      });

      const errorPromise = waitForEvent(client, 'disconnected', 3000);
      await client.connect();
      await errorPromise;

      expect(client.isConnected()).toBe(false);
    });
  });

  describe('server logs', () => {
    it('should capture server stderr output', async () => {
      client = new StdioClient({
        command: 'node',
        args: [echoServerPath],
        debug: true,
      });

      const logPromise = waitForEvent<string>(client, 'log', 3000);
      await client.connect();

      const logMessage = await logPromise;
      expect(logMessage).toBeTruthy();
      expect(typeof logMessage).toBe('string');
    });
  });
});
