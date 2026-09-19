// The Zod-validated env module parses at import time, so every value the server
// needs must exist before any module under test is loaded.
process.env['NODE_ENV'] ??= 'test';
process.env['DATABASE_URL'] ??= 'postgresql://test:test@localhost:5432/test';
process.env['REDIS_URL'] ??= 'redis://localhost:6379';
process.env['OPENAI_API_KEY'] ??= 'sk-test-key-not-used';
process.env['CORS_ORIGIN'] ??= 'http://localhost:5173';
// better-auth (M-6): env.ts requires these to parse. Route tests mock
// `@backend/auth`, so no real better-auth instance is built from them.
process.env['BETTER_AUTH_SECRET'] ??= 'test-better-auth-secret-not-used';
process.env['BETTER_AUTH_URL'] ??= 'http://localhost:3000';
// 'fatal' is the quietest level env.ts's Zod enum accepts — Pino's 'silent' is
// not in that union, and using it fails env parsing before any test runs.
process.env['LOG_LEVEL'] ??= 'fatal';
