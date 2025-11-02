# Contributing to node-stdio-jsonrpc

Thank you for your interest in contributing to `node-stdio-jsonrpc`! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Git

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/gnana997/node-stdio-jsonrpc.git
cd node-stdio-jsonrpc
```

3. Install dependencies:

```bash
npm install
```

4. Build the project:

```bash
npm run build
```

5. Run tests to verify everything works:

```bash
npm test
```

## Development Workflow

### Available Scripts

```bash
# Development
npm run build          # Build ESM, CJS, and type definitions
npm run typecheck      # Run TypeScript type checking
npm run lint           # Check code with Biome
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Biome

# Testing
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report

# Pre-publish
npm run prepublishOnly # Run build and tests (automatically)
```

### Making Changes

1. Create a new branch for your feature or bugfix:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bugfix-name
```

2. Make your changes, following the [coding standards](#coding-standards)

3. Add tests for your changes

4. Run linting and tests:

```bash
npm run lint
npm test
npm run typecheck
```

5. Commit your changes following the [commit guidelines](#commit-guidelines)

6. Push your branch and create a pull request

## Project Structure

```
node-stdio-jsonrpc/
├── src/                    # Source code
│   ├── client.ts          # StdioClient implementation
│   ├── transport.ts       # StdioTransport implementation
│   ├── types.ts           # TypeScript type definitions
│   └── index.ts           # Public API exports
├── tests/                 # Test files
│   ├── client.test.ts     # Client tests
│   ├── transport.test.ts  # Transport tests
│   ├── integration.test.ts # Integration tests
│   ├── helpers.ts         # Test utilities
│   └── fixtures/          # Test fixtures
│       └── echo-server.js # Echo server for testing
├── examples/              # Usage examples
│   └── mcp-client/        # MCP client example
├── dist/                  # Build output (gitignored)
└── coverage/              # Coverage reports (gitignored)
```

## Testing

### Writing Tests

- Place tests in the `tests/` directory
- Use descriptive test names that explain the scenario
- Follow the AAA pattern: Arrange, Act, Assert
- Test both happy paths and error cases
- Aim for high coverage (80%+ for all metrics)

### Test Example

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StdioClient } from '../src/client.js';

describe('StdioClient', () => {
  let client: StdioClient;

  afterEach(async () => {
    if (client?.isConnected()) {
      await client.disconnect();
    }
  });

  it('should connect successfully', async () => {
    // Arrange
    client = new StdioClient({
      command: 'node',
      args: ['./tests/fixtures/echo-server.js'],
    });

    // Act
    await client.connect();

    // Assert
    expect(client.isConnected()).toBe(true);
  });
});
```

### Running Specific Tests

```bash
# Run a specific test file
npx vitest run tests/client.test.ts

# Run tests matching a pattern
npx vitest run -t "should connect"
```

### Coverage Requirements

The project maintains the following coverage thresholds:

- **Statements**: 80%
- **Branches**: 65%
- **Functions**: 75%
- **Lines**: 80%

All pull requests should maintain or improve these thresholds.

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Provide explicit types for function parameters and return values
- Use interfaces for object shapes
- Avoid `any` - use `unknown` if type is truly unknown
- Use generics for reusable, type-safe code

### Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting:

- **Indentation**: 2 spaces
- **Line width**: 100 characters
- **Quotes**: Single quotes
- **Semicolons**: Always
- **Trailing commas**: ES5 style
- **Arrow function parentheses**: Always

Run `npm run lint:fix` to automatically fix most style issues.

### Naming Conventions

- **Classes**: PascalCase (`StdioClient`, `StdioTransport`)
- **Interfaces**: PascalCase (`StdioClientConfig`, `StdioTransportConfig`)
- **Functions/Methods**: camelCase (`connect()`, `disconnect()`)
- **Variables**: camelCase (`connectionTimeout`, `requestTimeout`)
- **Constants**: UPPER_SNAKE_CASE (if truly constant)
- **Private members**: Prefix with underscore (`private _buffer`)
- **Type parameters**: Single uppercase letter or PascalCase (`T`, `TResult`)

### Error Handling

- Use `try/catch` for async operations
- Provide descriptive error messages
- Include error context (what was being attempted)
- Don't swallow errors - log or re-throw
- Use custom error classes when appropriate

### Comments and Documentation

- Use JSDoc for public APIs
- Include `@param`, `@returns`, `@throws` tags
- Provide usage examples in comments
- Explain *why*, not *what* (code should be self-documenting)
- Update documentation when changing behavior

Example:

```typescript
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
 * const result = await client.request('echo', { message: 'hello' });
 * ```
 */
async request<TResult>(method: string, params?: unknown): Promise<TResult>
```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring (no functional changes)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, tooling, dependencies

### Examples

```bash
feat(client): add support for connection retry logic

Implement exponential backoff retry mechanism for failed connections.
Configurable via maxRetries and retryDelay options.

Closes #42

---

fix(transport): prevent memory leak in message buffering

Clear buffer after processing messages to prevent unbounded growth.

---

docs(readme): add MCP client usage example

---

test(client): add tests for error scenarios

Add tests for connection failures, timeouts, and process crashes.
```

## Pull Request Process

1. **Before submitting**:
   - Update documentation if you've changed APIs
   - Add tests for new features or bug fixes
   - Ensure all tests pass: `npm test`
   - Ensure linting passes: `npm run lint`
   - Ensure type checking passes: `npm run typecheck`
   - Update CHANGELOG.md if appropriate

2. **Create the PR**:
   - Use a descriptive title (following conventional commits)
   - Provide a clear description of what changed and why
   - Reference any related issues
   - Include screenshots/examples if relevant

3. **After submitting**:
   - Respond to review comments promptly
   - Make requested changes in new commits (don't force push during review)
   - Mark conversations as resolved when addressed
   - Request re-review after making changes

4. **Merging**:
   - Maintainers will merge approved PRs
   - PRs will be squashed and merged
   - Your commits will be condensed into one with a clean message

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the bug
2. **Reproduction**: Minimal code to reproduce the issue
3. **Expected behavior**: What you expected to happen
4. **Actual behavior**: What actually happened
5. **Environment**:
   - Node.js version (`node --version`)
   - Package version
   - Operating system

### Feature Requests

For feature requests:

1. **Use case**: Describe the problem you're trying to solve
2. **Proposed solution**: Your suggested approach
3. **Alternatives**: Other solutions you've considered
4. **Additional context**: Any other relevant information

## Questions?

If you have questions about contributing:

- Open a discussion on GitHub
- Check existing issues and pull requests
- Review the README and examples

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
