import { Buffer } from 'node:buffer';
import { existsSync, readFileSync } from 'node:fs';

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

type SonarIssueSearchResponse = {
  total?: number;
  paging?: {
    total?: number;
  };
};

type SonarQualityGateResponse = {
  projectStatus?: {
    conditions?: Array<{
      metricKey?: string;
      value?: string;
      actualValue?: string;
    }>;
  };
};

type GitHubIssueComment = {
  id: number;
  body?: string;
  user?: {
    type?: string;
  };
};

type RequiredEnv = {
  appName: string;
  projectKey: string;
  qualityGateStatus: string;
  sonarToken: string;
  githubToken: string;
  githubRepository: string;
  githubServerUrl: string;
  githubRunId: string;
  prNumber: number;
  reportPath: string;
};

const BADGE_BASE_URL = 'https://sonarsource.github.io/sonarcloud-github-static-resources/v2';
const STATUS_ICON_PASSED = `${BADGE_BASE_URL}/common/passed-16px.png`;
const STATUS_ICON_FAILED = `${BADGE_BASE_URL}/common/failed-16px.png`;
const STATUS_ICON_ACCEPTED = `${BADGE_BASE_URL}/common/accepted-16px.png`;

const formatCount = (value: number): string => (Number.isFinite(value) ? `${value}` : '0');

const formatPercent = (value: string | undefined): string => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toFixed(1)}%` : '0.0%';
};

const buildStatusTitle = (status: string, appName: string): string => {
  const statusText =
    status === 'PASSED' ? 'passed' : status === 'FAILED' ? 'failed' : status.toLowerCase();
  return `Quality Gate ${statusText} for ${appName}`;
};

const buildBadgeName = (status: string): string => {
  if (status === 'PASSED') return 'qg-passed-20px.png';
  if (status === 'FAILED') return 'qg-failed-20px.png';
  return 'qg-passed-20px.png';
};

const getRequiredEnv = (): RequiredEnv => {
  const get = (name: string): string => {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  };

  return {
    appName: get('APP_NAME'),
    projectKey: get('SONAR_PROJECT_KEY'),
    qualityGateStatus: process.env.SONAR_QUALITY_GATE_STATUS || 'UNKNOWN',
    sonarToken: get('SONAR_TOKEN'),
    githubToken: get('GITHUB_TOKEN'),
    githubRepository: get('GITHUB_REPOSITORY'),
    githubServerUrl: get('GITHUB_SERVER_URL'),
    githubRunId: get('GITHUB_RUN_ID'),
    prNumber: Number(get('PR_NUMBER')),
    reportPath: get('SONAR_REPORT_PATH'),
  };
};

const fetchJson = async <T>(url: string, headers: Record<string, string>): Promise<T | null> => {
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

const readDashboardUrl = (reportPath: string): string => {
  if (!existsSync(reportPath)) return '';
  const report = readFileSync(reportPath, 'utf8');
  const match = report.match(/^dashboardUrl=(.*)$/m);
  return match ? match[1].trim() : '';
};

const getMetricValue = (
  qualityGateData: SonarQualityGateResponse | null,
  metricKey: string,
): string => {
  const conditions = Array.isArray(qualityGateData?.projectStatus?.conditions)
    ? qualityGateData.projectStatus.conditions
    : [];
  const condition = conditions.find((item) => item.metricKey === metricKey);
  return condition?.actualValue ?? condition?.value ?? '';
};

const getTotal = (data: SonarIssueSearchResponse | null): number => {
  if (typeof data?.total === 'number') return data.total;
  if (typeof data?.paging?.total === 'number') return data.paging.total;
  return Number.NaN;
};

const githubRequest = async <T>(
  env: RequiredEnv,
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: JsonValue,
): Promise<T> => {
  const url = `https://api.github.com${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${env.githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`GitHub API ${method} ${path} failed: ${response.status} ${responseText}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
};

const postSonarComment = async (): Promise<void> => {
  const env = getRequiredEnv();
  const [owner, repo] = env.githubRepository.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${env.githubRepository}`);
  }

  const marker = `<!-- sonar-quality-gate:${env.appName} -->`;
  const status = env.qualityGateStatus;
  const icon = status === 'PASSED' ? '✅' : status === 'FAILED' ? '❌' : '⚠️';
  const statusTitle = buildStatusTitle(status, env.appName);
  const badgeName = buildBadgeName(status);

  const runUrl = `${env.githubServerUrl}/${owner}/${repo}/actions/runs/${env.githubRunId}`;
  const timestampDisplay = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const sonarAuth = `Basic ${Buffer.from(`${env.sonarToken}:`).toString('base64')}`;

  const dashboardUrl = readDashboardUrl(env.reportPath);

  const newIssuesUrl = `https://sonarcloud.io/project/issues?id=${env.projectKey}&pullRequest=${env.prNumber}&issueStatuses=OPEN,CONFIRMED&sinceLeakPeriod=true`;
  const acceptedIssuesUrl = `https://sonarcloud.io/project/issues?id=${env.projectKey}&pullRequest=${env.prNumber}&issueStatuses=ACCEPTED`;
  const hotspotsUrl = `https://sonarcloud.io/project/security_hotspots?id=${env.projectKey}&pullRequest=${env.prNumber}&issueStatuses=OPEN,CONFIRMED&sinceLeakPeriod=true`;
  const coverageUrl = `https://sonarcloud.io/component_measures?id=${env.projectKey}&pullRequest=${env.prNumber}&metric=new_coverage&view=list`;
  const duplicationUrl = `https://sonarcloud.io/component_measures?id=${env.projectKey}&pullRequest=${env.prNumber}&metric=new_duplicated_lines_density&view=list`;

  const sonarHeaders = { Authorization: sonarAuth };

  const [newIssuesData, acceptedIssuesData, hotspotsData, qualityGateData] = await Promise.all([
    fetchJson<SonarIssueSearchResponse>(
      `https://sonarcloud.io/api/issues/search?componentKeys=${env.projectKey}&pullRequest=${env.prNumber}&issueStatuses=OPEN,CONFIRMED&sinceLeakPeriod=true&ps=1`,
      sonarHeaders,
    ),
    fetchJson<SonarIssueSearchResponse>(
      `https://sonarcloud.io/api/issues/search?componentKeys=${env.projectKey}&pullRequest=${env.prNumber}&issueStatuses=ACCEPTED&ps=1`,
      sonarHeaders,
    ),
    fetchJson<SonarIssueSearchResponse>(
      `https://sonarcloud.io/api/hotspots/search?projectKey=${env.projectKey}&pullRequest=${env.prNumber}&ps=1`,
      sonarHeaders,
    ),
    fetchJson<SonarQualityGateResponse>(
      `https://sonarcloud.io/api/qualitygates/project_status?projectKey=${env.projectKey}&pullRequest=${env.prNumber}`,
      sonarHeaders,
    ),
  ]);

  const newIssuesCount = getTotal(newIssuesData);
  const acceptedIssuesCount = getTotal(acceptedIssuesData);
  const hotspotCount = getTotal(hotspotsData);

  const coverageText = formatPercent(getMetricValue(qualityGateData, 'new_coverage'));
  const duplicationText = formatPercent(
    getMetricValue(qualityGateData, 'new_duplicated_lines_density'),
  );

  const issueIcon =
    Number.isFinite(newIssuesCount) && newIssuesCount > 0 ? STATUS_ICON_FAILED : STATUS_ICON_PASSED;
  const hotspotIcon =
    Number.isFinite(hotspotCount) && hotspotCount > 0 ? STATUS_ICON_FAILED : STATUS_ICON_PASSED;

  const body = [
    marker,
    `## [![${statusTitle}](${BADGE_BASE_URL}/checks/QualityGateBadge/${badgeName})](${dashboardUrl || runUrl}) **${statusTitle}**`,
    '',
    'Issues',
    `![](${issueIcon}) [${formatCount(newIssuesCount)} New issues](${newIssuesUrl})`,
    `![](${STATUS_ICON_ACCEPTED}) [${formatCount(acceptedIssuesCount)} Accepted issues](${acceptedIssuesUrl})`,
    '',
    'Measures',
    `![](${hotspotIcon}) [${formatCount(hotspotCount)} Security Hotspots](${hotspotsUrl})`,
    `![](${STATUS_ICON_PASSED}) [${coverageText} Coverage on New Code](${coverageUrl})`,
    `![](${STATUS_ICON_PASSED}) [${duplicationText} Duplication on New Code](${duplicationUrl})`,
    '',
    `[See analysis details on SonarQube Cloud](${dashboardUrl || runUrl})`,
    '',
    `_${icon} App: ${env.appName} | Updated: ${timestampDisplay} | [Workflow run](${runUrl})_`,
  ].join('\n');

  const comments = await githubRequest<GitHubIssueComment[]>(
    env,
    'GET',
    `/repos/${owner}/${repo}/issues/${env.prNumber}/comments?per_page=100`,
  );

  const existing = comments.find(
    (comment) => comment.user?.type === 'Bot' && comment.body?.includes(marker),
  );

  if (existing) {
    await githubRequest(env, 'PATCH', `/repos/${owner}/${repo}/issues/comments/${existing.id}`, {
      body,
    });
  } else {
    await githubRequest(env, 'POST', `/repos/${owner}/${repo}/issues/${env.prNumber}/comments`, {
      body,
    });
  }
};

postSonarComment().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`Failed to post Sonar quality comment: ${message}\n`);
  process.exit(1);
});
