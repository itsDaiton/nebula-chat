// @ts-check
// Import boundaries the AGENTS.md files document. Known violations are baselined in
// .dependency-cruiser-known-violations.json (`pnpm deps:baseline` after fixing one), so CI fails only on new ones.

// Server module layers, lowest first (apps/server/AGENTS.md → Module Pattern). Types infer from the Zod
// schemas, so types and validation are one layer.
const LAYERS = ['types|validation', 'repository', 'service', 'controller', 'routes'];

const layerRules = LAYERS.slice(0, -1).map((layer, index) => ({
  name: `server-${layer.replace('|', '-')}-not-above`,
  comment: `A ${layer} file must not import a later layer.`,
  severity: 'error',
  from: { path: `^apps/server/src/modules/[^/]+/[^/]+\\.(${layer})\\.ts$` },
  to: {
    path: `^apps/server/src/modules/[^/]+/[^/]+\\.(${LAYERS.slice(index + 1).join('|')})\\.ts$`,
  },
}));

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: { pathNot: '/tests?/' },
      to: { circular: true },
    },
    {
      name: 'no-cross-app',
      comment: 'Apps share code only through libs/*.',
      severity: 'error',
      from: { path: '^apps/([^/]+)/' },
      to: { path: '^apps/', pathNot: '^apps/$1/' },
    },
    {
      name: 'client-shared-not-modules',
      comment:
        'shared/ is cross-module, except the app shell in layout/, which composes the modules.',
      severity: 'error',
      from: {
        path: '^apps/client/src/shared/',
        pathNot: '^apps/client/src/shared/components/layout/',
      },
      to: { path: '^apps/client/src/modules/' },
    },
    ...layerRules,
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['\\.gen\\.ts$', '/generated/', '/dist/'] },
    tsPreCompilationDeps: true,
    // Holds every app's `paths` alias, so one run covers all of them.
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] },
  },
};
