import { defineConfig } from 'orval';

export default defineConfig({
  nebulaChat: {
    input: {
      target: '../../openapi/openapi.yaml',
      filters: {
        mode: 'exclude',
        tags: ['Chat'],
      },
    },
    output: {
      mode: 'tags-split',
      target: './src/libs/api/generated/endpoints.ts',
      schemas: './src/libs/api/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      prettier: true,
      indexFiles: true,
      // MSW handlers and response factories are generated from the same spec as
      // the client, so a test mocks the API the backend actually documents
      // instead of a hand-written URL string (ADR-0008).
      mock: {
        generators: [
          {
            type: 'msw',
            // Orval delays mocked responses by default, which only slows down
            // every test that awaits one.
            delay: false,
          },
        ],
      },
      override: {
        mutator: {
          path: './src/libs/api/client.ts',
          name: 'axiosClient',
        },
        // `useQuery`/`useMutation` are left to Orval's verb defaults (GET → query,
        // everything else → mutation): setting either globally forces every
        // operation into that shape, which generated the GETs as mutations.
        // Non-suspense hooks keep the skeleton-on-`isPending` pattern (ADR-0012).
        query: {
          useSuspenseQuery: false,
          signal: true,
        },
        operations: {
          // The sidebar pages through conversations by cursor.
          listConversations: {
            query: {
              useInfinite: true,
              useInfiniteQueryParam: 'cursor',
            },
          },
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
