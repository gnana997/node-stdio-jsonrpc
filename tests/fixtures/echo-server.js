#!/usr/bin/env node

/**
 * Simple JSON-RPC 2.0 server for testing
 * Reads JSON-RPC requests from stdin, writes responses to stdout
 */

import { createInterface } from 'node:readline';

// Create readline interface for stdin
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// Log to stderr (safe for stdio transport)
function log(...args) {
  console.error('[echo-server]', ...args);
}

// Send response to stdout
function sendResponse(response) {
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

// Handle JSON-RPC request
function handleRequest(request) {
  log('Received request:', request.method);

  const { id, method, params } = request;

  try {
    switch (method) {
      case 'echo':
        // Echo back the params
        if (id !== undefined) {
          sendResponse({
            jsonrpc: '2.0',
            id,
            result: params,
          });
        }
        break;

      case 'add':
        // Add two numbers
        if (typeof params === 'object' && params !== null) {
          const { a, b } = params;
          if (id !== undefined) {
            sendResponse({
              jsonrpc: '2.0',
              id,
              result: { sum: a + b },
            });
          }
        }
        break;

      case 'subtract':
        // Subtract two numbers
        if (typeof params === 'object' && params !== null) {
          const { a, b } = params;
          if (id !== undefined) {
            sendResponse({
              jsonrpc: '2.0',
              id,
              result: { difference: a - b },
            });
          }
        }
        break;

      case 'error':
        // Return an error
        if (id !== undefined) {
          sendResponse({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32000,
              message: 'Intentional error for testing',
            },
          });
        }
        break;

      case 'notify':
        // Send a notification back
        sendResponse({
          jsonrpc: '2.0',
          method: 'testNotification',
          params: { message: 'Hello from server' },
        });
        if (id !== undefined) {
          sendResponse({
            jsonrpc: '2.0',
            id,
            result: { notificationSent: true },
          });
        }
        break;

      case 'ping':
        // Simple ping/pong
        if (id !== undefined) {
          sendResponse({
            jsonrpc: '2.0',
            id,
            result: 'pong',
          });
        }
        break;

      default:
        // Method not found
        if (id !== undefined) {
          sendResponse({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: 'Method not found',
              data: { method },
            },
          });
        }
    }
  } catch (error) {
    log('Error handling request:', error);
    if (id !== undefined) {
      sendResponse({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}

// Process each line from stdin
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const request = JSON.parse(trimmed);
    handleRequest(request);
  } catch (error) {
    log('Error parsing request:', error);
  }
});

rl.on('close', () => {
  log('Input stream closed, exiting');
  process.exit(0);
});

log('Echo server started, waiting for requests...');
