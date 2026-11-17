import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type Lock = { skills: Record<string, { computedHash: string }> };
type SkillFile = { path: Buffer; content: Buffer };

const SKILLS_DIR = resolve(process.cwd(), '.claude/skills');
const LOCK_PATH = resolve(process.cwd(), 'skills-lock.json');

// Mirrors the `skills` CLI's hash, so a match means `npx skills@latest update` would change nothing.
const EXCLUDED_FILES = new Set(['metadata.json']);
const EXCLUDED_DIRS = new Set(['.git', '__pycache__', '__pypackages__']);

// Skills whose text must carry a repo edit: they're pinned to the patched hash, so an update that wipes
// the edit fails here. After re-applying the edit from git history, update the hash.
const PATCHED: Record<string, string> = {
  tdd: 'ad0aee73bb59a9c1ebadfce8e699cc2abb1f10c262739d1bf841ce88c6c6aa7d',
  'to-tickets': 'd8efd6b1824bee1868a96b37d26f7e2a1f3b2bb9ca7dbcaa4e8183e29be42f97',
};

const collect = (dir: string, prefix = ''): SkillFile[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return EXCLUDED_DIRS.has(entry.name) ? [] : collect(full, `${prefix}${entry.name}/`);
    }
    return EXCLUDED_FILES.has(entry.name)
      ? []
      : [{ path: Buffer.from(prefix + entry.name), content: readFileSync(full) }];
  });

const hashSkill = (dir: string): string => {
  const hash = createHash('sha256');
  for (const { path, content } of collect(dir).sort((a, b) => Buffer.compare(a.path, b.path))) {
    hash.update(path).update('\0').update(String(content.length)).update('\0').update(content);
  }
  return hash.digest('hex');
};

const main = (): void => {
  const lock = JSON.parse(readFileSync(LOCK_PATH, 'utf8')) as Lock;
  const problems: string[] = [];

  for (const name of readdirSync(SKILLS_DIR)) {
    if (lstatSync(join(SKILLS_DIR, name)).isSymbolicLink()) {
      problems.push(`${name} is a symlink (into the gitignored .agents/?): replace it with a copy`);
    }
  }

  for (const [name, { computedHash }] of Object.entries(lock.skills)) {
    const dir = join(SKILLS_DIR, name);
    let actual: string;
    try {
      actual = hashSkill(dir);
    } catch {
      problems.push(`${name} is in skills-lock.json but missing from .claude/skills`);
      continue;
    }
    const patched = PATCHED[name];
    if (patched && actual !== patched) {
      problems.push(`${name} lost its repo edit: re-apply it from git history (see CLAUDE.md)`);
    } else if (!patched && actual !== computedHash) {
      problems.push(`${name} differs from skills-lock.json: patch it via PATCHED or revert it`);
    }
  }

  if (problems.length) {
    process.stderr.write(`${problems.join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `Vendored skills match skills-lock.json (${Object.keys(lock.skills).length})\n`,
  );
};

main();
