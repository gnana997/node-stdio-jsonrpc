#!/usr/bin/env node
/**
 * Mock MCP Server for testing the MCP client example
 *
 * This is a minimal MCP (Model Context Protocol) server implementation
 * that responds to basic MCP methods for demonstration purposes.
 */

import readline from 'node:readline';

// Create readline interface for line-delimited JSON
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// Server info
const SERVER_INFO = {
  name: 'mock-mcp-server',
  version: '1.0.0',
};

// Mock capabilities
const CAPABILITIES = {
  logging: {},
  prompts: { listChanged: true },
  resources: { subscribe: true, listChanged: true },
  tools: { listChanged: true },
};

// Mock tools
const TOOLS = [
  {
    name: 'echo',
    description: 'Echo back the input message',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message to echo' },
      },
      required: ['message'],
    },
  },
  {
    name: 'calculate',
    description: 'Perform basic arithmetic operations',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['operation', 'a', 'b'],
    },
  },
  {
    name: 'get_time',
    description: 'Get the current server time',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Mock resources
const RESOURCES = [
  { uri: 'file:///mock/resource1.txt', name: 'Resource 1', description: 'First mock resource' },
  { uri: 'file:///mock/resource2.txt', name: 'Resource 2', description: 'Second mock resource' },
  { uri: 'file:///mock/data.json', name: 'Data JSON', description: 'Mock JSON data' },
];

// Log to stderr (not stdout, which is reserved for JSON-RPC)
function log(...args) {
  console.error('[mock-mcp-server]', ...args);
}

// Send JSON-RPC response
function sendResponse(id, result) {
  const response = {
    jsonrpc: '2.0',
    id,
    result,
  };
  console.log(JSON.stringify(response));
}

// Send JSON-RPC error
function sendError(id, code, message) {
  const response = {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
    },
  };
  console.log(JSON.stringify(response));
}

// Send notification
function sendNotification(method, params) {
  const notification = {
    jsonrpc: '2.0',
    method,
    params,
  };
  console.log(JSON.stringify(notification));
}

// Handle JSON-RPC request
function handleRequest(request) {
  log('Received request:', request.method);

  const { id, method, params } = request;

  switch (method) {
    case 'initialize':
      sendResponse(id, {
        protocolVersion: params.protocolVersion || '2024-11-05',
        capabilities: CAPABILITIES,
        serverInfo: SERVER_INFO,
      });
      break;

    case 'tools/list':
      sendResponse(id, {
        tools: TOOLS,
      });
      break;

    case 'resources/list':
      sendResponse(id, {
        resources: RESOURCES,
      });
      break;

    case 'prompts/list':
      sendResponse(id, {
        prompts: [{ name: 'greeting', description: 'A friendly greeting prompt' }],
      });
      break;

    case 'ping':
      sendResponse(id, { status: 'ok', timestamp: Date.now() });
      break;

    case 'tools/call': {
      // Mock tool execution
      const { name, arguments: args } = params;
      if (name === 'echo') {
        sendResponse(id, { content: [{ type: 'text', text: args.message }] });
      } else if (name === 'get_time') {
        sendResponse(id, { content: [{ type: 'text', text: new Date().toISOString() }] });
      } else {
        sendError(id, -32601, `Tool not found: ${name}`);
      }
      break;
    }

    default:
      sendError(id, -32601, `Method not found: ${method}`);
  }
}

// Handle notifications (no response)
function handleNotification(notification) {
  log('Received notification:', notification.method);
  // Notifications don't require a response
}

// Main message handler
rl.on('line', (line) => {
  try {
    const message = JSON.parse(line);

    // Check if it's a request (has id) or notification (no id)
    if ('id' in message) {
      handleRequest(message);
    } else {
      handleNotification(message);
    }
  } catch (error) {
    log('Error parsing message:', error.message);
    // Send parse error for invalid JSON
    console.log(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
        },
      })
    );
  }
});

// Handle process signals
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down...');
  process.exit(0);
});

log('Mock MCP server started, waiting for requests...');
