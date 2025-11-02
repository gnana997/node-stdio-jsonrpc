# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-02

### Added

- Initial release of `node-stdio-jsonrpc`
- `StdioClient` class for JSON-RPC 2.0 communication over stdio (child processes)
- `StdioTransport` implementation for stdio-based communication
- Full TypeScript support with strict typing
- Dual package support (ESM and CommonJS)
- Event-driven architecture with typed events:
  - `connected` - Connection established
  - `disconnected` - Disconnected from server
  - `notification` - Server sent a notification
  - `error` - Error occurred
  - `log` - Server stderr output
- Comprehensive configuration options:
  - Custom command and arguments
  - Working directory and environment variables
  - Configurable timeouts (connection and request)
  - Debug logging mode
- Robust error handling:
  - Process spawn failures
  - Process crashes during connection
  - Request timeouts
  - JSON-RPC errors
- Process lifecycle management:
  - Graceful connection and disconnection
  - Automatic process cleanup
  - Exit code and signal tracking
- Line-delimited JSON framing for message parsing
- MCP (Model Context Protocol) client example
- Comprehensive test suite:
  - 47 tests with 81%+ code coverage
  - Unit tests for client and transport
  - Integration tests for end-to-end scenarios
  - Edge case and error scenario testing
- Complete documentation:
  - README with API reference and examples
  - MCP client example with detailed walkthrough
  - TypeScript type definitions
  - CONTRIBUTING guide

### Dependencies

- `@gnana997/node-jsonrpc` ^1.0.0 - Core JSON-RPC 2.0 implementation

### Development Dependencies

- TypeScript 5.7.2
- Vitest 4.0.6 for testing
- Biome 1.9.4 for linting and formatting
- tsup 8.5.0 for building

[0.1.0]: https://github.com/gnana997/node-stdio-jsonrpc/releases/tag/v0.1.0
