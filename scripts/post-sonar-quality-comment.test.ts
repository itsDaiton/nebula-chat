import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildMeasureLabel,
  buildOverallCoverageLabel,
  buildStatusIcon,
  buildStatusTitle,
  conditionIcon,
  formatCount,
  formatPercent,
  getMetricValue,
  getTotal,
  hasCondition,
  isMetricPresent,
  measureIcon,
  parseLcovLineCoverage,
  postSonarComment,
  readOverallCoverage,
  resolveOverallState,
  type QualitySignals,
} from './post-sonar-quality-comment';

/**
 * Writes `<root>/coverage/lcov.info` and returns the report-task.txt path the
 * script is given, so the derivation from scan metadata to lcov is exercised
 * rather than assumed.
 */
const packageWithCoverage = (lcov: string): { reportPath: string; cleanup: () => void } => {
  const root = mkdtempSync(join(tmpdir(), 'sonar-coverage-'));
  mkdirSync(join(root, 'coverage'), { recursive: true });
  mkdirSync(join(root, '.scannerwork'), { recursive: true });
  writeFileSync(join(root, 'coverage', 'lcov.info'), lcov);
  return {
    reportPath: join(root, '.scannerwork', 'report-task.txt'),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
};

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

const gate = (metricKey: string, status: string) => ({
  projectStatus: { conditions: [{ metricKey, status }] },
});

describe('conditionIcon', () => {
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

describe('isMetricPresent', () => {
  it('accepts a numeric value, including a genuine zero', () => {
    expect(isMetricPresent('0')).toBe(true);
    expect(isMetricPresent('91.2')).toBe(true);
  });

  it('rejects an absent or unparseable value', () => {
    // Number('') is 0, which is why absent and zero have to be told apart.
    expect(isMetricPresent(undefined)).toBe(false);
    expect(isMetricPresent('')).toBe(false);
    expect(isMetricPresent('   ')).toBe(false);
    expect(isMetricPresent('not a number')).toBe(false);
  });
});

describe('buildMeasureLabel', () => {
  it('renders the measure when Sonar reported one', () => {
    expect(buildMeasureLabel('91.24', 'Coverage on New Code', 'absent')).toBe(
      '91.2% Coverage on New Code',
    );
  });

  it('renders a real zero as zero, not as absent', () => {
    expect(buildMeasureLabel('0', 'Coverage on New Code', 'absent')).toBe(
      '0.0% Coverage on New Code',
    );
  });

  it('says the measure does not apply instead of showing a misleading 0.0%', () => {
    expect(buildMeasureLabel(undefined, 'Coverage on New Code', 'No new lines to cover')).toBe(
      'No new lines to cover',
    );
  });
});

describe('parseLcovLineCoverage', () => {
  it('sums LH over LF across every record', () => {
    const lcov = ['SF:a.ts', 'LF:10', 'LH:8', 'end_of_record', 'SF:b.ts', 'LF:10', 'LH:10'].join(
      '\n',
    );

    expect(parseLcovLineCoverage(lcov)).toBeCloseTo(90, 5);
  });

  it('reports NaN when nothing is coverable, which is not 0% covered', () => {
    expect(parseLcovLineCoverage('')).toBeNaN();
    expect(parseLcovLineCoverage('SF:a.ts\nLF:0\nLH:0\nend_of_record')).toBeNaN();
  });

  it('ignores the records it does not understand', () => {
    expect(parseLcovLineCoverage('TN:\nFNF:3\nFNH:1\nLF:4\nLH:1\nBRF:2')).toBeCloseTo(25, 5);
  });
});

describe('readOverallCoverage', () => {
  it('reads the lcov report sitting beside the scan metadata', () => {
    const { reportPath, cleanup } = packageWithCoverage('SF:a.ts\nLF:4\nLH:3\nend_of_record\n');

    try {
      expect(readOverallCoverage(reportPath)).toBeCloseTo(75, 5);
    } finally {
      cleanup();
    }
  });

  it('reports NaN when no report was written', () => {
    expect(readOverallCoverage('/nonexistent/.scannerwork/report-task.txt')).toBeNaN();
  });
});

describe('buildOverallCoverageLabel', () => {
  it('renders one decimal place', () => {
    expect(buildOverallCoverageLabel(97.66)).toBe('97.7% Coverage on Overall Code');
  });

  it('says so when the number could not be determined', () => {
    expect(buildOverallCoverageLabel(Number.NaN)).toBe('Coverage on Overall Code unavailable');
  });
});

describe('hasCondition', () => {
  it('finds a condition the gate reported', () => {
    expect(hasCondition(gate('new_coverage', 'OK'), 'new_coverage')).toBe(true);
  });

  it('is false when the gate reported no such condition', () => {
    expect(hasCondition(gate('other_metric', 'OK'), 'new_coverage')).toBe(false);
    expect(hasCondition(null, 'new_coverage')).toBe(false);
  });
});

describe('measureIcon', () => {
  it('defers to the gate condition when there is one', () => {
    expect(measureIcon(gate('coverage', 'ERROR'), 'coverage', 99)).toContain('failed');
    expect(measureIcon(gate('coverage', 'OK'), 'coverage', 10)).toContain('passed');
  });

  it('judges a locally computed value against the 80% bar', () => {
    expect(measureIcon(null, 'coverage', 80)).toContain('passed');
    expect(measureIcon(null, 'coverage', 79.9)).toContain('failed');
  });

  it('renders a value it does not have as neither pass nor fail', () => {
    expect(measureIcon(null, 'new_coverage', Number.NaN)).toContain('accepted');
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
  const DEFAULT_CONDITIONS = [
    { metricKey: 'new_coverage', actualValue: '0.0', status: 'OK' },
    { metricKey: 'new_duplicated_lines_density', actualValue: '0.0', status: 'OK' },
  ];

  const renderComment = async ({
    gateStatus,
    newIssues,
    hotspots = 0,
    conditions = DEFAULT_CONDITIONS,
    reportPath = ENV.SONAR_REPORT_PATH,
  }: {
    gateStatus: string;
    newIssues: number;
    hotspots?: number;
    conditions?: Array<{ metricKey: string; actualValue?: string; status: string }>;
    reportPath?: string;
  }): Promise<string> => {
    for (const [key, value] of Object.entries(ENV)) vi.stubEnv(key, value);
    vi.stubEnv('SONAR_QUALITY_GATE_STATUS', gateStatus);
    vi.stubEnv('SONAR_REPORT_PATH', reportPath);

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
          return json({ projectStatus: { conditions } });
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

  it('reports overall coverage from the lcov report the test run wrote', async () => {
    // The reported gap: the comment showed only new-code coverage, so a suite
    // at 97.7% looked like it had none.
    const { reportPath, cleanup } = packageWithCoverage(
      'SF:a.ts\nLF:1000\nLH:977\nend_of_record\n',
    );

    try {
      const body = await renderComment({ gateStatus: 'PASSED', newIssues: 0, reportPath });

      expect(body).toContain('97.7% Coverage on Overall Code');
    } finally {
      cleanup();
    }
  });

  it('marks overall coverage below the bar as a failure', async () => {
    const { reportPath, cleanup } = packageWithCoverage('SF:a.ts\nLF:100\nLH:50\nend_of_record\n');

    try {
      const body = await renderComment({ gateStatus: 'PASSED', newIssues: 0, reportPath });

      expect(body).toContain('50.0% Coverage on Overall Code');
      expect(body).toMatch(/failed-16px\.png\) \[50\.0% Coverage on Overall Code/);
    } finally {
      cleanup();
    }
  });

  it('prefers the gate\u2019s own overall coverage when it reports one', async () => {
    const { reportPath, cleanup } = packageWithCoverage('SF:a.ts\nLF:100\nLH:50\nend_of_record\n');

    try {
      const body = await renderComment({
        gateStatus: 'PASSED',
        newIssues: 0,
        reportPath,
        conditions: [
          ...DEFAULT_CONDITIONS,
          { metricKey: 'coverage', actualValue: '88.4', status: 'OK' },
        ],
      });

      expect(body).toContain('88.4% Coverage on Overall Code');
    } finally {
      cleanup();
    }
  });

  it('says overall coverage is unavailable rather than inventing a number', async () => {
    const body = await renderComment({ gateStatus: 'PASSED', newIssues: 0 });

    expect(body).toContain('Coverage on Overall Code unavailable');
  });

  it('says there is nothing to cover when the gate omits the new-code condition', async () => {
    // A PR touching only coverage-excluded files has no new coverable lines;
    // Number('') is 0, so this used to render a misleading 0.0% shortfall.
    const body = await renderComment({
      gateStatus: 'PASSED',
      newIssues: 0,
      conditions: [{ metricKey: 'new_duplicated_lines_density', actualValue: '0.0', status: 'OK' }],
    });

    expect(body).toContain('No new lines to cover');
    expect(body).not.toContain('0.0% Coverage on New Code');
  });

  it('still renders a genuine zero on new code as zero', async () => {
    const body = await renderComment({ gateStatus: 'PASSED', newIssues: 0 });

    expect(body).toContain('0.0% Coverage on New Code');
  });
});
