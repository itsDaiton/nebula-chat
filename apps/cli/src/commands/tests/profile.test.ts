import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createHarness } from '@cli/test/harness';

describe('nebula profile', () => {
  describe('add', () => {
    it('saves the profile to $XDG_CONFIG_HOME/nebula-chat/config.json and makes the first one the default', async () => {
      const cli = await createHarness();

      const code = await cli.run('profile', 'add', 'local', '--url', 'http://localhost:3000');

      expect(code).toBe(0);
      expect(await cli.readConfig()).toEqual({
        defaultProfile: 'local',
        profiles: { local: { url: 'http://localhost:3000' } },
      });
      expect(cli.stdout()).toContain("Added profile 'local' (http://localhost:3000)");
    });

    it('falls back to ~/.config when XDG_CONFIG_HOME is unset', async () => {
      const cli = await createHarness({ env: { XDG_CONFIG_HOME: undefined } });

      await cli.run('profile', 'add', 'local', '--url', 'http://localhost:3000');

      expect(await cli.readConfig(join(cli.home, '.config', 'nebula-chat', 'config.json'))).toEqual(
        { defaultProfile: 'local', profiles: { local: { url: 'http://localhost:3000' } } },
      );
    });

    it('writes the config file readable by its owner only', async () => {
      const cli = await createHarness();

      await cli.run('profile', 'add', 'local', '--url', 'http://localhost:3000');

      expect((await stat(cli.configFile)).mode & 0o777).toBe(0o600);
    });

    it('keeps the existing default when another profile is added', async () => {
      const cli = await createHarness();
      await cli.run('profile', 'add', 'local', '--url', 'http://localhost:3000');

      await cli.run('profile', 'add', 'prod', '--url', 'https://api.nebula.example/');

      expect(await cli.readConfig()).toEqual({
        defaultProfile: 'local',
        profiles: {
          local: { url: 'http://localhost:3000' },
          prod: { url: 'https://api.nebula.example' },
        },
      });
    });

    it('replaces the URL of a profile that already exists', async () => {
      const cli = await createHarness();
      await cli.run('profile', 'add', 'local', '--url', 'http://localhost:3000');

      const code = await cli.run('profile', 'add', 'local', '--url', 'http://localhost:4000');

      expect(code).toBe(0);
      expect(await cli.readConfig()).toEqual({
        defaultProfile: 'local',
        profiles: { local: { url: 'http://localhost:4000' } },
      });
      expect(cli.stdout()).toContain("Updated profile 'local' (http://localhost:4000)");
    });

    it('prints the saved profile as JSON with --json', async () => {
      const cli = await createHarness();

      await cli.run('profile', 'add', 'local', '--url', 'http://localhost:3000', '--json');

      expect(JSON.parse(cli.stdout())).toEqual({
        name: 'local',
        url: 'http://localhost:3000',
        default: true,
      });
    });

    it('exits 2 without --url', async () => {
      const cli = await createHarness();

      const code = await cli.run('profile', 'add', 'local');

      expect(code).toBe(2);
      expect(cli.stderr()).toContain("required option '--url <url>' not specified");
    });

    it.each(['localhost:3000', 'not a url', 'ftp://files.example'])(
      'exits 2 for a URL that is not http(s): %s',
      async (url) => {
        const cli = await createHarness();

        const code = await cli.run('profile', 'add', 'local', '--url', url);

        expect(code).toBe(2);
        expect(cli.stderr()).toContain(`'${url}' is not an http(s) URL`);
      },
    );
  });

  describe('list', () => {
    it('prints an aligned table without colour when stdout is not a TTY', async () => {
      const cli = await createHarness();
      await cli.writeConfig({
        defaultProfile: 'prod',
        profiles: {
          local: { url: 'http://localhost:3000' },
          prod: { url: 'https://api.nebula.example' },
        },
      });

      const code = await cli.run('profile', 'list');

      expect(code).toBe(0);
      expect(cli.stdout()).toBe(
        [
          'NAME   URL                         DEFAULT',
          'local  http://localhost:3000',
          'prod   https://api.nebula.example  *',
          '',
        ].join('\n'),
      );
    });

    it('prints the header in bold on a TTY', async () => {
      const cli = await createHarness({ isTTY: true });
      await cli.writeConfig({ defaultProfile: 'local', profiles: { local: { url: 'http://a' } } });

      await cli.run('profile', 'list');

      expect(cli.stdout()).toContain('\u001b[1mNAME   URL       DEFAULT\u001b[22m');
    });

    it('prints no colour on a TTY when NO_COLOR is set', async () => {
      const cli = await createHarness({ isTTY: true, env: { NO_COLOR: '1' } });
      await cli.writeConfig({ defaultProfile: 'local', profiles: { local: { url: 'http://a' } } });

      await cli.run('profile', 'list');

      expect(cli.stdout()).not.toContain('\u001b[');
    });

    it('prints exactly one JSON document with --json', async () => {
      const cli = await createHarness();
      await cli.writeConfig({
        defaultProfile: 'prod',
        profiles: {
          local: { url: 'http://localhost:3000' },
          prod: { url: 'https://api.nebula.example' },
        },
      });

      await cli.run('--json', 'profile', 'list');

      expect(JSON.parse(cli.stdout())).toEqual([
        { name: 'local', url: 'http://localhost:3000', default: false },
        { name: 'prod', url: 'https://api.nebula.example', default: true },
      ]);
    });

    it('says how to add one when there are no profiles', async () => {
      const cli = await createHarness();

      const code = await cli.run('profile', 'list');

      expect(code).toBe(0);
      expect(cli.stdout()).toContain('No profiles yet. Add one with `nebula profile add');
    });

    it('prints an empty JSON array with --json when there are no profiles', async () => {
      const cli = await createHarness();

      await cli.run('profile', 'list', '--json');

      expect(JSON.parse(cli.stdout())).toEqual([]);
    });

    it('exits 1 with a clear message when the config file is not JSON', async () => {
      const cli = await createHarness();
      await mkdir(dirname(cli.configFile), { recursive: true });
      await writeFile(cli.configFile, '{ not json');

      const code = await cli.run('profile', 'list');

      expect(code).toBe(1);
      expect(cli.stderr()).toContain(`${cli.configFile} is not valid JSON`);
    });

    it('exits 1 with a clear message when the config file has the wrong shape', async () => {
      const cli = await createHarness();
      await cli.writeConfig({ profiles: { local: { url: 42 } } });

      const code = await cli.run('profile', 'list');

      expect(code).toBe(1);
      expect(cli.stderr()).toContain(`${cli.configFile} is not a valid config file`);
    });
    it('exits 1 when a hand-edited profile URL is not http(s)', async () => {
      const cli = await createHarness();
      await cli.writeConfig({ profiles: { local: { url: 'ftp://files.example' } } });

      const code = await cli.run('profile', 'list');

      expect(code).toBe(1);
      expect(cli.stderr()).toContain(`${cli.configFile} is not a valid config file`);
    });
  });

  describe('use', () => {
    it('makes the named profile the default', async () => {
      const cli = await createHarness();
      await cli.writeConfig({
        defaultProfile: 'local',
        profiles: { local: { url: 'http://localhost:3000' }, prod: { url: 'https://p' } },
      });

      const code = await cli.run('profile', 'use', 'prod');

      expect(code).toBe(0);
      expect(await cli.readConfig()).toMatchObject({ defaultProfile: 'prod' });
      expect(cli.stdout()).toContain("Now using profile 'prod' (https://p)");
    });

    it('exits 2 for an unknown profile and leaves the config alone', async () => {
      const cli = await createHarness();
      const config = { defaultProfile: 'local', profiles: { local: { url: 'http://a' } } };
      await cli.writeConfig(config);

      const code = await cli.run('profile', 'use', 'prod');

      expect(code).toBe(2);
      expect(cli.stderr()).toContain("Unknown profile 'prod'");
      expect(await cli.readConfig()).toEqual(config);
    });
  });
});
