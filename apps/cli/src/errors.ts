export const ExitCode = {
  Success: 0,
  Failure: 1,
  Usage: 2,
  Auth: 3,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

/** An error meant for the operator: its message goes to stderr as-is, and it picks the exit code. */
export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode: ExitCode = ExitCode.Failure,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export class UsageError extends CliError {
  constructor(message: string) {
    super(message, ExitCode.Usage);
    this.name = 'UsageError';
  }
}

export class AuthError extends CliError {
  constructor(message: string) {
    super(message, ExitCode.Auth);
    this.name = 'AuthError';
  }
}
