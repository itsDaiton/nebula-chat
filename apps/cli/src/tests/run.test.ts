import { describe, expect, it } from 'vitest';
import packageJson from '#package.json' with { type: 'json' };
import { createHarness } from '@cli/test/harness';

describe('nebula', () => {
  it('lists its commands with examples on --help', async () => {
    const cli = await createHarness();

    const code = await cli.run('--help');

    expect(code).toBe(0);
    expect(cli.stdout()).toContain('Usage: nebula');
    expect(cli.stdout()).toMatch(/profile\s/);
    expect(cli.stdout()).toMatch(/log-level\s/);
    expect(cli.stdout()).toContain('Examples:');
    expect(cli.stdout()).toContain('nebula profile add local --url http://localhost:3000');
  });

  it('prints the package version on --version', async () => {
    const cli = await createHarness();

    const code = await cli.run('--version');

    expect(code).toBe(0);
    expect(cli.stdout().trim()).toBe(packageJson.version);
  });

  it('exits 2 with a message on stderr for an unknown command', async () => {
    const cli = await createHarness();

    const code = await cli.run('frobnicate');

    expect(code).toBe(2);
    expect(cli.stderr()).toContain("unknown command 'frobnicate'");
    expect(cli.stdout()).toBe('');
  });

  it('exits 2 with the help on stderr when no command is given', async () => {
    const cli = await createHarness();

    const code = await cli.run();

    expect(code).toBe(2);
    expect(cli.stderr()).toContain('Usage: nebula');
  });

  it('exits 2 for an unknown option', async () => {
    const cli = await createHarness();

    const code = await cli.run('profile', 'list', '--frob');

    expect(code).toBe(2);
    expect(cli.stderr()).toContain("unknown option '--frob'");
  });
});
