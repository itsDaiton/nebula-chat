import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildStatusIcon,
  buildStatusTitle,
  conditionIcon,
  formatCount,
  formatPercent,
  getMetricValue,
  getTotal,
  postSonarComment,
  resolveOverallState,
  type QualitySignals,
} from './post-sonar-quality-comment';

const signals = (overrides: Partial<QualitySignals> = {}): QualitySignals => ({
  gateStatus: 'PASSED',
  newIssues: 0,
  hotspots: 0,
  ...overrides,
});

describe('resolveOverallState', () => {
  it('is clean when the gate passed with nothing outstanding', () => {
    expect(resolveOverallState(signals())).toBe('clean');
  });

  it('needs attention when the gate passed but new issues remain', () => {
    // The bug this guards: a passing gate used to render a plain green tick
    // while the Issues row below it showed a red marker.
    expect(resolveOverallState(signals({ newIssues: 1 }))).toBe('attention');
  });

  it('needs attention when security hotspots remain', () => {
    expect(resolveOverallState(signals({ hotspots: 2 }))).toBe('attention');
  });

  it('reports failed whenever the gate failed, regardless of counts', () => {
    expect(resolveOverallState(signals({ gateStatus: 'FAILED' }))).toBe('failed');
    expect(resolveOverallState(signals({ gateStatus: 'FAILED', newIssues: 0 }))).toBe('failed');
  });

  it('is unknown for an unrecognised gate status', () => {
    expect(resolveOverallState(signals({ gateStatus: 'UNKNOWN' }))).toBe('unknown');
  });

  it('is unknown when a count could not be fetched, rather than assuming clean', () => {
    expect(resolveOverallState(signals({ newIssues: Number.NaN }))).toBe('unknown');
    expect(resolveOverallState(signals({ hotspots: Number.NaN }))).toBe('unknown');
  });
});

describe('buildStatusIcon', () => {
  it('shows a tick only for a genuinely clean run', () => {
    expect(buildStatusIcon('clean')).toBe('✅');
  });

  it('shows the failure marker when findings are outstanding', () => {
    expect(buildStatusIcon('attention')).toBe('❌');
  });

  it('shows the failure marker when the gate failed', () => {
    expect(buildStatusIcon('failed')).toBe('❌');
  });

  it('shows a warning when the state could not be determined', () => {
    expect(buildStatusIcon('unknown')).toBe('⚠️');
  });

  it('never shows a tick unless the run is clean', () => {
    for (const state of ['attention', 'failed', 'unknown'] as const) {
      expect(buildStatusIcon(state), state).not.toBe('✅');
    }
  });
});

describe('buildStatusTitle', () => {
  it('states a clean pass plainly', () => {
    expect(buildStatusTitle('clean', 'nebula-chat-client', signals())).toBe(
      'Quality Gate passed for nebula-chat-client',
    );
  });

  it('still says the gate passed when findings remain, because it did', () => {
    const title = buildStatusTitle('attention', 'nebula-chat-client', signals({ newIssues: 1 }));

    expect(title).toContain('Quality Gate passed for nebula-chat-client');
  });

  it('names the outstanding issue count', () => {
    expect(buildStatusTitle('attention', 'app', signals({ newIssues: 1 }))).toContain(
      '1 new issue outstanding',
    );
  });

  it('pluralises counts', () => {
    expect(buildStatusTitle('attention', 'app', signals({ newIssues: 2 }))).toContain(
      '2 new issues',
    );
  });

  it('names hotspots too, and lists both when both are present', () => {
    const title = buildStatusTitle('attention', 'app', signals({ newIssues: 3, hotspots: 1 }));

    expect(title).toContain('3 new issues');
    expect(title).toContain('1 security hotspot');
  });

  it('omits a category with nothing outstanding', () => {
    expect(buildStatusTitle('attention', 'app', signals({ newIssues: 2 }))).not.toContain(
      'hotspot',
    );
  });

  it('says failed when the gate failed', () => {
    expect(buildStatusTitle('failed', 'app', signals({ gateStatus: 'FAILED' }))).toBe(
      'Quality Gate failed for app',
    );
  });

  it('flags an incomplete status rather than claiming a verdict', () => {
    const title = buildStatusTitle('unknown', 'app', signals({ newIssues: Number.NaN }));

    expect(title).toContain('status incomplete');
  });
});

describe('conditionIcon', () => {
  const gate = (metricKey: string, status: string) => ({
    projectStatus: { conditions: [{ metricKey, status }] },
  });

  it('marks a breached condition as failed', () => {
    expect(conditionIcon(gate('new_coverage', 'ERROR'), 'new_coverage')).toContain('failed');
  });

  it('marks a satisfied condition as passed', () => {
    expect(conditionIcon(gate('new_coverage', 'OK'), 'new_coverage')).toContain('passed');
  });

  it('passes a metric with no condition configured', () => {
    expect(conditionIcon(gate('other_metric', 'ERROR'), 'new_coverage')).toContain('passed');
  });

  it('passes when the gate response is unavailable', () => {
    expect(conditionIcon(null, 'new_coverage')).toContain('passed');
  });

  it('passes when the response carries no conditions array', () => {
    expect(conditionIcon({ projectStatus: {} }, 'new_coverage')).toContain('passed');
  });
});

describe('formatCount', () => {
  it('renders a count', () => {
    expect(formatCount(3)).toBe('3');
  });

  it('renders an unavailable count as zero rather than NaN', () => {
    expect(formatCount(Number.NaN)).toBe('0');
  });
});

describe('formatPercent', () => {
  it('renders one decimal place', () => {
    expect(formatPercent('82.456')).toBe('82.5%');
  });

  it('renders a missing value as zero', () => {
    expect(formatPercent(undefined)).toBe('0.0%');
    expect(formatPercent('not a number')).toBe('0.0%');
  });
});

describe('getTotal', () => {
  it('reads a top-level total', () => {
    expect(getTotal({ total: 4 })).toBe(4);
  });

  it('falls back to the paging total', () => {
    expect(getTotal({ paging: { total: 7 } })).toBe(7);
  });

  it('returns NaN when the response is unusable, so callers can tell', () => {
    expect(getTotal(null)).toBeNaN();
    expect(getTotal({})).toBeNaN();
  });
});

describe('getMetricValue', () => {
  it('prefers actualValue', () => {
    expect(
      getMetricValue(
        { projectStatus: { conditions: [{ metricKey: 'new_coverage', actualValue: '91.2' }] } },
        'new_coverage',
      ),
    ).toBe('91.2');
  });

  it('falls back to value', () => {
    expect(
      getMetricValue(
        { projectStatus: { conditions: [{ metricKey: 'new_coverage', value: '80' }] } },
        'new_coverage',
      ),
    ).toBe('80');
  });

  it('returns an empty string for an absent metric', () => {
    expect(getMetricValue(null, 'new_coverage')).toBe('');
  });
});

describe('postSonarComment', () => {
  const ENV = {
    APP_NAME: 'nebula-chat-client',
    SONAR_PROJECT_KEY: 'itsDaiton_nebula-chat-client',
    SONAR_TOKEN: 'sonar-token',
    GITHUB_TOKEN: 'gh-token',
    GITHUB_REPOSITORY: 'itsDaiton/nebula-chat',
    GITHUB_SERVER_URL: 'https://github.com',
    GITHUB_RUN_ID: '123',
    PR_NUMBER: '305',
    SONAR_REPORT_PATH: '/nonexistent/report-task.txt',
  };

  /**
   * Stubs every outbound call and returns the comment body that was posted.
   * Sonar counts are driven by `newIssues` / `hotspots`.
   */
  const renderComment = async ({
    gateStatus,
    newIssues,
    hotspots = 0,
  }: {
    gateStatus: string;
    newIssues: number;
    hotspots?: number;
  }): Promise<string> => {
    for (const [key, value] of Object.entries(ENV)) vi.stubEnv(key, value);
    vi.stubEnv('SONAR_QUALITY_GATE_STATUS', gateStatus);

    let postedBody = '';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
        const json = (data: unknown) => ({ ok: true, status: 200, json: async () => data });

        if (url.includes('api.github.com')) {
          if (init?.method === 'POST' || init?.method === 'PATCH') {
            postedBody = (JSON.parse(init.body ?? '{}') as { body?: string }).body ?? '';
            return json({});
          }
          return json([]); // no existing comment
        }
        if (url.includes('/api/issues/search')) {
          return json({ total: url.includes('ACCEPTED') ? 0 : newIssues });
        }
        if (url.includes('/api/hotspots/search')) return json({ total: hotspots });
        if (url.includes('/api/qualitygates/')) {
          return json({
            projectStatus: {
              conditions: [
                { metricKey: 'new_coverage', actualValue: '0.0', status: 'OK' },
                { metricKey: 'new_duplicated_lines_density', actualValue: '0.0', status: 'OK' },
              ],
            },
          });
        }
        return json({});
      }),
    );

    await postSonarComment();
    return postedBody;
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('shows a tick when the gate passed with nothing outstanding', async () => {
    const body = await renderComment({ gateStatus: 'PASSED', newIssues: 0 });

    expect(body).toContain('✅ App: nebula-chat-client');
    expect(body).toContain('**Quality Gate passed for nebula-chat-client**');
  });

  it('does not show a tick when the gate passed but issues remain', async () => {
    // The reported bug: this rendered "✅ ... Quality Gate passed" while the
    // Issues row directly above showed a red marker for 1 new issue.
    const body = await renderComment({ gateStatus: 'PASSED', newIssues: 1 });

    expect(body).not.toContain('✅');
    expect(body).toContain('❌ App: nebula-chat-client');
  });

  it('names the outstanding count in the header', async () => {
    const body = await renderComment({ gateStatus: 'PASSED', newIssues: 1 });

    expect(body).toContain('1 new issue outstanding');
  });

  it('keeps the gate verdict truthful even when flagging findings', async () => {
    const body = await renderComment({ gateStatus: 'PASSED', newIssues: 2 });

    expect(body).toContain('Quality Gate passed');
    expect(body).not.toContain('Quality Gate failed');
  });

  it('flags outstanding security hotspots the same way', async () => {
    const body = await renderComment({ gateStatus: 'PASSED', newIssues: 0, hotspots: 1 });

    expect(body).not.toContain('✅');
    expect(body).toContain('1 security hotspot outstanding');
  });

  it('shows the failure marker when the gate itself failed', async () => {
    const body = await renderComment({ gateStatus: 'FAILED', newIssues: 0 });

    expect(body).toContain('❌ App: nebula-chat-client');
    expect(body).toContain('**Quality Gate failed for nebula-chat-client**');
  });

  it('still carries the marker used to update the comment in place', async () => {
    const body = await renderComment({ gateStatus: 'PASSED', newIssues: 0 });

    expect(body.startsWith('<!-- sonar-quality-gate:nebula-chat-client -->')).toBe(true);
  });

  it('reports the issue counts it fetched', async () => {
    const body = await renderComment({ gateStatus: 'PASSED', newIssues: 3 });

    expect(body).toContain('[3 New issues]');
  });
});
