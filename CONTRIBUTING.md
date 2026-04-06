# Contributing to Payment Control

Thanks for your interest in contributing.

## Before You Start

1. Check existing issues and pull requests to avoid duplicates.
2. Open an issue first for significant changes so scope can be aligned early.
3. Keep changes practical and narrow.

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Before opening a PR:

```bash
npm run lint
npm run build
```

## Pull Request Guidelines

1. Use clear, focused PR titles and descriptions.
2. Explain what changed, why it changed, and how to validate it.
3. Link related issues (for example: `Closes #123`).
4. Include screenshots for UI changes when applicable.
5. Avoid unrelated refactors in the same PR.

## Scope and Quality Expectations

1. Preserve stable user flows unless the PR explicitly targets them.
2. Do not add speculative complexity.
3. Keep user-facing copy clear and concise.
4. Keep Russian UX quality intact where RU text is present.

## Security and Sensitive Data

1. Never commit secrets, tokens, or private credentials.
2. Security vulnerabilities must be reported via `SECURITY.md`, not public issues.

## Code of Conduct

By participating, you agree to follow [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
