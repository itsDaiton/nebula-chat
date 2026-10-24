/**
 * Keys whose value must never reach a log line (credentials, Message content, personal data), censored at any of the first three nesting depths.
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
 * Flat dotted keys (OTel-style): Pino redact paths treat dots as nesting, so `user.email` needs bracket notation to match.
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
