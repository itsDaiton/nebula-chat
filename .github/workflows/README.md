# CI workflows

## Build pipeline (`build.yml`)

All apps and libs are built by a single workflow, [`build.yml`](./build.yml):

- **`changes`** detects which packages a PR actually touched (via
  `dorny/paths-filter`) and emits a matrix of only those packages. Pushes to
  `main` and manual `workflow_dispatch` runs build **all** packages, so every
  SonarCloud project always gets a default-branch analysis.
  The Release Please PR (`release-please--branches--main`) builds nothing: it
  only bumps versions and changelogs, and its merge to `main` builds everything.
- **`build`** runs the pipeline once per selected package as a matrix leg:
  `install → lint → format check → typecheck → build → Sonar scan →
  quality gate → PR comment`. The Sonar steps are guarded on `SONAR_TOKEN`, so
  dependabot/fork PRs (which do not receive the secret) skip Sonar instead of
  failing — lint/typecheck/build still gate those PRs.
- **`build-result`** is a single gate job that always runs and passes iff every
  triggered `build` leg succeeded (or was skipped because no package changed).

### Branch protection

Require **`build-result`** as the status check in branch protection — it always
runs and reflects whether the build passed. Do **not** require the individual
per-package legs (`nebula-chat-db`, etc.): they only run when their package
changed, so a PR that skips that package would hang forever waiting on a check
that never reports.

## Adding a new lib or app

**1. Create a SonarCloud project** under the `itsdaiton` organization, e.g. key
`itsDaiton_nebula-chat-<name>`. (`SONAR_TOKEN` is already a repo secret.)

**2. Add a filter** under the `changes` job's "Detect changed packages" step in
`build.yml`:

```yaml
<name>:
  - 'libs/<name>/**' # or 'apps/<name>/**'
```

If it maps to a paths-filter id that isn't `client`/`server`/`db`,
also add an `F_<NAME>` env var and an `if` line in "Compute build matrix".

**3. Add one entry** to the `all` matrix list in "Compute build matrix":

```json
{
  "id": "<name>",
  "name": "nebula-chat-<name>",
  "dir": "libs/<name>",
  "filter": "@nebula-chat/<name>",
  "lint": "libs/<name>/",
  "key": "itsDaiton_nebula-chat-<name>",
  "project": "Nebula-Chat-<Name>"
}
```

The matrix picks up the new package automatically. Apps that need a
runtime secret (e.g. the server's `DATABASE_URL`) already have it in the job
`env`; add more there if a new package needs one.

**4. Add its release tag to every deploy workflow built from it.** When an app
gains a `workspace:*` dependency on a lib (directly or through another lib), add
`<component>-v*` (the lib's `component` in `release-please-config.json`) to that
app's `deploy-<app>.yml` `on.push.tags`. A new deployed app gets its own
`deploy-<app>.yml` named after its `apps/<app>` directory.
[`validate-deploy-triggers.yml`](./validate-deploy-triggers.yml) fails CI when a
tag is missing.

## Grafana dashboards (`deploy-grafana-dashboards.yml`)

[`deploy-grafana-dashboards.yml`](./deploy-grafana-dashboards.yml) uploads every
JSON in `grafana/dashboards/` to Grafana Cloud through its
`/api/dashboards/db` endpoint, overwriting the dashboard with the same `uid`. It
runs on pushes to `main` that touch `grafana/dashboards/**` or the workflow file,
and on `workflow_dispatch`. Runs queue rather than cancel, so merges apply in
order; the job summary lists each dashboard with its new version.

It needs the `GRAFANA_API_TOKEN` secret (an Editor service account token, not the
OTLP token) and the `GRAFANA_URL` variable; `GRAFANA_FOLDER_UID` is optional.
The job fails up front if either required value is empty. Setup steps:
[`docs/logging.md`](../../docs/logging.md) → "In production".
