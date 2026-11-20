import { REDACT_CENSOR } from './redaction';

// OpenAI (`sk-`, `sk-proj-`) and Anthropic (`sk-ant-`) keys; providers echo them truncated or masked with `*` or `.`.
const KEY_SHAPE = /\bsk-[\w*.-]{3,}/g;

/** Replaces key-shaped strings and every exact `knownValues` entry in free text with the censor token. */
export const scrubSecrets = (text: string, knownValues: readonly string[] = []): string => {
  const exact = knownValues.reduce(
    (scrubbed, value) => (value ? scrubbed.split(value).join(REDACT_CENSOR) : scrubbed),
    text,
  );
  return exact.replace(KEY_SHAPE, REDACT_CENSOR);
};
