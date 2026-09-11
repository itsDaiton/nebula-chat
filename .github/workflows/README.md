# CI workflows

## Build pipeline (`build.yml`)

All apps and libs are built by a single workflow, [`build.yml`](./build.yml):

- **`changes`** detects which packages a PR actually touched (via
  `dorny/paths-filter`) and emits a matrix of only those packages. Pushes to
  `main` and manual `workflow_dispatch` runs build **all** packages, so every
  SonarCloud project always gets a default-branch analysis.
- **`build`** runs the pipeline once per selected package as a matrix leg:
  ```
  install → lint → format check → typecheck → build → Sonar scan → quality gate → PR comment
  ```
  The Sonar steps are guarded on `SONAR_TOKEN`, so dependabot/fork PRs (which
  do not receive the secret) skip Sonar instead of failing — lint/typecheck/
  build still gate those PRs.
- **`ci-ok`** is a single gate job that always runs and passes iff `build`
  succeeded or was skipped.

### Branch protection

Because per-package legs only run when that package changed, their individual
checks won't appear on unrelated PRs. **Require `ci-ok`** as the status check
in branch protection (not the per-package leg names) so a PR is never blocked
waiting on a check that will never run.

## Adding a new lib or app

1. **Create a SonarCloud project** under the `itsdaiton` organization, e.g.
   key `itsDaiton_nebula-chat-<name>`. (`SONAR_TOKEN` is already a repo secret.)

2. In `build.yml`, add a **filter** under the `changes` job's
   "Detect changed packages" step:
   ```yaml
   <name>:
     - 'libs/<name>/**'   # or 'apps/<name>/**'
   ```
   (If it maps to a paths-filter id that isn't `client/server/db/langchain`,
   also add an `F_<NAME>` env var and an `if` line in "Compute build matrix".)

3. Add one entry to the `all` matrix list in "Compute build matrix":
   ```json
   {"id":"<name>","name":"nebula-chat-<name>","dir":"libs/<name>","filter":"@nebula-chat/<name>","lint":"libs/<name>/","key":"itsDaiton_nebula-chat-<name>","project":"Nebula-Chat-<Name>"}
   ```

That's it — the matrix picks up the new package automatically. Apps that need a
runtime secret (e.g. the server's `DATABASE_URL`) already have it in the job
`env`; add more there if a new package needs one.
