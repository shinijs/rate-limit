# Contributing to @shinijs/rate-limit

Thank you for your interest in contributing to `@shinijs/rate-limit`! We welcome contributions from the community.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [Coding Standards](#coding-standards)

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/rate-limit.git
   cd rate-limit
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/shinijs/rate-limit.git
   ```

## Development Setup

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 10.0.0

### Installation

```bash
# Install dependencies
pnpm install
```

### Available Scripts

```bash
# Build the project
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Lint code
pnpm lint

# Check linting without fixing
pnpm lint:check

# Format code
pnpm format

# Check formatting
pnpm format:check

# Type check
pnpm typecheck
```

## Making Changes

1. **Create a branch** from `master`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following our [coding standards](#coding-standards)

3. **Write or update tests** for your changes

4. **Ensure all checks pass**:
   ```bash
   pnpm lint:check
   pnpm format:check
   pnpm typecheck
   pnpm test:cov
   ```

5. **Commit your changes** using [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug"
   git commit -m "docs: update README"
   ```

## Pull Request Process

1. **Update your fork** with the latest changes:
   ```bash
   git checkout master
   git pull upstream master
   git push origin master
   ```

2. **Rebase your feature branch**:
   ```bash
   git checkout feature/your-feature-name
   git rebase master
   ```

3. **Push your changes**:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request** on GitHub:
   - Use a clear, descriptive title
   - Reference any related issues
   - Provide a detailed description of your changes
   - Ensure all CI checks pass

### PR Requirements

- ✅ All tests pass
- ✅ Code is properly formatted and linted
- ✅ TypeScript types are correct
- ✅ Tests have been added/updated
- ✅ Documentation has been updated (if needed)
- ✅ PR description is clear and detailed

## Reporting Issues

Before creating an issue, please:

1. **Check existing issues** to avoid duplicates
2. **Use the issue templates** when available
3. **Provide detailed information**:
   - Description of the issue
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment (Node.js version, OS, etc.)
   - Code examples or error messages

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Provide proper type annotations
- Avoid `any` types when possible
- Use interfaces for object shapes

### Code Style

- Follow the existing code style
- Use ESLint and Prettier (configured in the project)
- Run `pnpm lint` before committing
- Maximum line length: 100 characters (enforced by Prettier)

### Testing

- Write tests for all new features
- Maintain or improve test coverage
- Use descriptive test names
- Follow the existing test patterns

### Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update CHANGELOG.md via changesets

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Build process or auxiliary tool changes
- `perf:` - Performance improvements

Examples:
```
feat: add custom configuration option
fix: resolve module initialization issue
docs: update installation instructions
```

## Questions?

Feel free to:
- Open an issue for questions or discussions
- Reach out to maintainers
- Check existing issues and discussions

Thank you for contributing! 🎉

