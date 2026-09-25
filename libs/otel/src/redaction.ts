/**
 * Keys whose value must never reach a log line: credentials, and anything that
 * carries Message content or personal data. Censored at any of the first three
 * nesting depths, which covers `req.headers.cookie`-style request objects.
 */
const SENSITIVE_KEYS = [
  'cookie',
  'authorization',
  'set-cookie',
  'apiKey',
  'api_key',
  'password',
  'secret',
  'email',
  'content',
  'prompt',
  'completion',
  'messages',
  'userMessage',
  'systemPrompt',
  'token',
  'tokens',
] as const;

/**
 * Flat dotted keys (OTel-style attributes). Pino redact paths use dots for
 * *nesting*, so `user.email` would only match `{ user: { email } }` — a flat
 * `"user.email"` key needs bracket notation to be matched at all.
 */
const SENSITIVE_FLAT_KEYS = [
  'http.request.header.cookie',
  'http.request.header.authorization',
  'http.response.header.set-cookie',
  'user.email',
  'user.name',
  'user.full_name',
  'gen_ai.prompt',
  'gen_ai.completion',
  'gen_ai.input.messages',
  'gen_ai.output.messages',
  'gen_ai.system_instructions',
  'nebula.message.content',
] as const;

const bracket = (key: string): string => `[${JSON.stringify(key)}]`;

const atEveryDepth = (key: string): string[] => {
  const segment = /^[A-Za-z_$][\w$]*$/.test(key) ? `.${key}` : bracket(key);
  const top = segment.startsWith('.') ? key : segment;
  return [top, `*${segment}`, `*.*${segment}`];
};

/** Pino `redact.paths`: every sensitive key at every depth, plus the flat ones. */
export const REDACT_PATHS: string[] = [
  ...SENSITIVE_KEYS.flatMap(atEveryDepth),
  ...SENSITIVE_FLAT_KEYS.map(bracket),
];

export const REDACT_CENSOR = '[Redacted]';
