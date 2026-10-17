import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Walks local telemetry link by link, from the server's `.env` to what Grafana offers the
 * dashboard, and names the first broken one. `pnpm otel:doctor` from the repo root; see
 * docs/logging.md → Reading it in Grafana → Locally. Plain ASCII: Windows consoles mangle more.
 */

const GRAFANA = process.env.GRAFANA_URL ?? 'http://localhost:3001';
const SERVER_ENV = join(process.cwd(), 'apps/nebula-chat-server/.env');
const OTEL_BUILD = join(process.cwd(), 'libs/otel/dist/index.js');
const SERVER = 'nebula-chat-server';
const PROBE = 'nebula-chat-otel-doctor';

type Outcome = 'ok' | 'fail' | 'info';
type Datasource = { type: string; uid: string; name: string };

const failures: string[] = [];

const print = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

const report = (outcome: Outcome, what: string, fix?: string): void => {
  const tag = { ok: '  OK ', fail: 'FAIL ', info: 'INFO ' }[outcome];
  print(`${tag} ${what}`);
  if (fix) print(`      -> ${fix}`);
  if (outcome === 'fail') failures.push(fix ?? what);
};

const get = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${GRAFANA}${path}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${path}`);
  return (await res.json()) as T;
};

const readEnv = (file: string): Record<string, string> =>
  Object.fromEntries(
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line))
      .filter((match) => match !== null)
      .map((match) => [match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]),
  );

/** The logs URL the server exports to, or undefined when export is off. */
const checkServerEnv = (): string | undefined => {
  if (!existsSync(SERVER_ENV)) {
    report('fail', 'apps/nebula-chat-server/.env does not exist', 'copy it from .env.example');
    return undefined;
  }
  const env = readEnv(SERVER_ENV);
  const shared = env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const logsUrl = env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || (shared && `${shared}/v1/logs`);
  if (env.OTEL_LOGS_EXPORTER !== 'otlp' || !logsUrl) {
    report(
      'fail',
      'the server .env does not turn log export on',
      'uncomment OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 and OTEL_LOGS_EXPORTER=otlp, then restart the server',
    );
    return undefined;
  }
  report('ok', `the server .env exports logs to ${logsUrl}`);
  return logsUrl;
};

const checkBuild = (): void => {
  if (existsSync(OTEL_BUILD) && readFileSync(OTEL_BUILD, 'utf8').includes('otel.started')) {
    report('ok', 'libs/otel is built with log export');
  } else {
    report(
      'fail',
      'libs/otel is not built, or built before log export',
      'pnpm build:libs, then restart the server',
    );
  }
};

const checkGrafana = async (): Promise<boolean> => {
  try {
    await get('/api/health');
    report('ok', `Grafana answers at ${GRAFANA}`);
    return true;
  } catch (err) {
    report(
      'fail',
      `Grafana does not answer at ${GRAFANA} (${String(err)})`,
      'docker compose up -d otel-lgtm, and wait until it is healthy',
    );
    return false;
  }
};

/** Loki and Tempo as the dashboard's Logs and Traces pickers see them. */
const checkDatasources = async (): Promise<{ loki?: Datasource; tempo?: Datasource }> => {
  const pluginErrors =
    await get<Array<{ pluginId: string; errorCode: string }>>('/api/plugins/errors');
  for (const { pluginId, errorCode } of pluginErrors)
    report('info', `Grafana plugin ${pluginId} failed to load: ${errorCode}`);

  const settings = await get<{ datasources: Record<string, Datasource> }>('/api/frontend/settings');
  const offered = Object.values(settings.datasources);
  const loki = offered.find((ds) => ds.type === 'loki');
  const tempo = offered.find((ds) => ds.type === 'tempo');
  for (const [label, ds] of [
    ['Logs (Loki)', loki],
    ['Traces (Tempo)', tempo],
  ] as const) {
    if (ds) report('ok', `Grafana offers ${label}: "${ds.name}"`);
    else
      report(
        'fail',
        `Grafana offers the dashboard no ${label} datasource, so its picker is empty`,
        `docker compose up -d --force-recreate otel-lgtm; offered now: ${offered.map((d) => d.type).join(', ') || 'none'}`,
      );
  }
  for (const ds of [loki, tempo]) {
    if (!ds) continue;
    try {
      const health = await get<{ status: string; message: string }>(
        `/api/datasources/uid/${ds.uid}/health`,
      );
      report(health.status === 'OK' ? 'ok' : 'fail', `${ds.name} health: ${health.message}`);
    } catch (err) {
      report(
        'fail',
        `${ds.name} health check failed: ${String(err)}`,
        'docker compose restart otel-lgtm',
      );
    }
  }
  return { loki, tempo };
};

const lokiQuery = async (
  loki: Datasource,
  query: string,
  sinceMinutes: number,
): Promise<number> => {
  const params = new URLSearchParams({
    query,
    start: String((Date.now() - sinceMinutes * 60_000) * 1e6),
    limit: '1000',
  });
  const res = await get<{ data: { result: Array<{ values: unknown[] }> } }>(
    `/api/datasources/proxy/uid/${loki.uid}/loki/api/v1/query_range?${params}`,
  );
  return res.data.result.reduce((sum, stream) => sum + stream.values.length, 0);
};

/** Sends one line straight to the container and waits for Loki to hold it. */
const checkPipeline = async (logsUrl: string, loki: Datasource): Promise<void> => {
  const id = randomUUID();
  const record = {
    resourceLogs: [
      {
        resource: { attributes: [{ key: 'service.name', value: { stringValue: PROBE } }] },
        scopeLogs: [
          {
            scope: { name: 'otel-doctor' },
            logRecords: [
              {
                timeUnixNano: String(Date.now() * 1e6),
                severityNumber: 9,
                severityText: 'info',
                body: { stringValue: `otel doctor probe ${id}` },
              },
            ],
          },
        ],
      },
    ],
  };
  try {
    const res = await fetch(logsUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    report('ok', `${logsUrl} accepted a test line`);
  } catch (err) {
    report(
      'fail',
      `${logsUrl} refused a test line (${String(err)})`,
      'is otel-lgtm running with port 4318 published? docker compose ps',
    );
    return;
  }
  for (let attempt = 0; attempt < 15; attempt++) {
    if ((await lokiQuery(loki, `{service_name="${PROBE}"} |= "${id}"`, 5)) > 0) {
      report('ok', 'Loki stored the test line');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  report(
    'fail',
    'the test line never reached Loki',
    'docker compose logs otel-lgtm, and look for loki or otelcol errors',
  );
};

const checkServerData = async (loki: Datasource, tempo: Datasource | undefined): Promise<void> => {
  const lines = await lokiQuery(loki, `{service_name="${SERVER}"}`, 15);
  if (lines > 0) report('ok', `Loki holds ${lines} line(s) from ${SERVER} in the last 15 minutes`);
  else
    report(
      'fail',
      `Loki holds no line from ${SERVER} in the last 15 minutes`,
      'is the server running? It prints "otel.started" at boot when export is on; then use the app',
    );
  if (!tempo) return;
  const now = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams({
    q: `{resource.service.name="${SERVER}"}`,
    start: String(now - 900),
    end: String(now),
    limit: '20',
  });
  const traces = await get<{ traces?: unknown[] }>(
    `/api/datasources/proxy/uid/${tempo.uid}/api/search?${params}`,
  );
  const count = traces.traces?.length ?? 0;
  report(
    'info',
    `Tempo holds ${count === 20 ? '20+' : count} trace(s) from ${SERVER} in the last 15 minutes`,
    count === 0
      ? 'search lists a trace a few minutes after it arrives, and pnpm dev records none: build and start the server'
      : undefined,
  );
};

const main = async (): Promise<void> => {
  const logsUrl = checkServerEnv();
  checkBuild();
  if (await checkGrafana()) {
    const { loki, tempo } = await checkDatasources();
    if (loki) {
      await checkPipeline(logsUrl ?? 'http://localhost:4318/v1/logs', loki);
      await checkServerData(loki, tempo);
    }
  }
  print(
    failures.length === 0
      ? `\nEverything works: open ${GRAFANA} and pick "Last 15 minutes".`
      : `\nFirst thing to fix: ${failures[0]}`,
  );
  process.exitCode = failures.length === 0 ? 0 : 1;
};

main().catch((err: unknown) => {
  print(`FAIL  the check itself crashed: ${String(err)}`);
  process.exitCode = 1;
});
