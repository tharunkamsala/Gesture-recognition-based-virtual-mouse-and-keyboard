# Contributing to GestureFlow

Thank you for your interest in contributing! This document provides guidelines.

## Code of Conduct

Be respectful and inclusive. We welcome contributions from everyone.

## How to Contribute

### Reporting Bugs

1. Check existing issues first
2. Use the bug report template
3. Include: OS, Python/Node version, steps to reproduce

### Suggesting Features

1. Open an issue with the feature template
2. Describe the use case and proposed solution

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test` (frontend), `pytest` (backend)
5. Commit with conventional commits: `feat:`, `fix:`, `docs:`
6. Push and open a PR

## Development Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install -e ".[dev]"  # dev dependencies
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Code Style

### Python
- Follow PEP 8
- Use type hints
- Docstrings for public functions

### TypeScript
- ESLint + Prettier
- Prefer functional components
- Use TypeScript types (no `any`)

## Testing

### Backend
```bash
cd backend
pytest tests/ -v --cov=.
```

### Frontend
```bash
cd frontend
npm run test
npm run test:coverage
```

## Commit Messages

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

## Questions?

Open a discussion or issue. We're happy to help!
