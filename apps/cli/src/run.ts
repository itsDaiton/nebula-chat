import { Command, CommanderError } from 'commander';
import packageJson from '#package.json' with { type: 'json' };
import { registerLogLevelCommands } from '@cli/commands/logLevel';
import { registerProfileCommands } from '@cli/commands/profile';
import { createContext, type GlobalOptions } from '@cli/context';
import { CliError, ExitCode } from '@cli/errors';

type Stream = { write: (chunk: string) => unknown; isTTY?: boolean };

/** Everything the CLI touches outside its own process state. `bin.ts` wires the real ones. */
export type Deps = {
  env: Record<string, string | undefined>;
  stdout: Stream;
  stderr: Stream;
  fetch: typeof globalThis.fetch;
  now: () => Date;
  homeDir: string;
};

const EXAMPLES = `
Examples:
  $ nebula profile add local --url http://localhost:3000
  $ nebula profile use local
  $ NEBULA_OPERATOR_TOKEN=… nebula log-level set redis debug --ttl 600
  $ nebula --profile prod --json profile list`;

const buildProgram = (deps: Deps) => {
  const program = new Command('nebula')
    .description('Operate a Nebula Chat deployment from the terminal.')
    .version(packageJson.version, '-V, --version', 'print the CLI version')
    .helpOption('-h, --help', 'show help for a command')
    .helpCommand(false)
    .option('--json', 'print exactly one JSON document to stdout')
    .option('-p, --profile <name>', 'the profile to use instead of the default one')
    .addHelpText('after', EXAMPLES)
    .showHelpAfterError('(run with --help for usage)')
    // Commander must not exit the process: `run` returns the exit code instead.
    .exitOverride()
    .configureOutput({
      writeOut: (text) => deps.stdout.write(text),
      writeErr: (text) => deps.stderr.write(text),
    });

  const ctx = createContext(deps, () => program.opts<GlobalOptions>());
  registerProfileCommands(program, ctx);
  registerLogLevelCommands(program, ctx);
  return program;
};

/** The whole CLI as one function: parses `argv`, runs the command and returns the exit code. */
export const run = async (argv: readonly string[], deps: Deps): Promise<number> => {
  try {
    await buildProgram(deps).parseAsync(argv, { from: 'user' });
    return ExitCode.Success;
  } catch (err) {
    // Commander has already written its own message (or the help/version) by now.
    if (err instanceof CommanderError) {
      return err.exitCode === 0 ? ExitCode.Success : ExitCode.Usage;
    }
    if (err instanceof CliError) {
      deps.stderr.write(`error: ${err.message}\n`);
      return err.exitCode;
    }
    deps.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
    return ExitCode.Failure;
  }
};
