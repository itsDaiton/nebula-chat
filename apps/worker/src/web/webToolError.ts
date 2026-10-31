export type WebToolErrorCode =
  | 'not-configured'
  | 'provider-error'
  | 'invalid-url'
  | 'blocked-url'
  | 'too-many-redirects'
  | 'too-large'
  | 'timeout'
  | 'http-error'
  | 'unsupported-content';

/** A web tool's expected failure: it goes back to the calling Agent as an error result, never fails the Run. */
export class WebToolError extends Error {
  constructor(
    readonly code: WebToolErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'WebToolError';
  }
}

/** The tool's own deadline, joined to the Run's signal; only the deadline becomes a typed timeout. */
export const withDeadline = async <T>(
  timeoutMs: number,
  parent: AbortSignal | undefined,
  work: (signal: AbortSignal) => Promise<T>,
): Promise<T> => {
  const deadline = AbortSignal.timeout(timeoutMs);
  try {
    return await work(parent ? AbortSignal.any([parent, deadline]) : deadline);
  } catch (err) {
    if (deadline.aborted && !parent?.aborted) {
      throw new WebToolError('timeout', `No answer within ${timeoutMs} ms.`);
    }
    throw err;
  }
};
