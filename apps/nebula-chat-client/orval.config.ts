import { defineConfig } from 'orval';

export default defineConfig({
  nebulaChat: {
    input: {
      target: '../openapi/openapi.yaml',
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
      override: {
        mutator: {
          path: './src/libs/api/client.ts',
          name: 'axiosClient',
        },
        query: {
          useQuery: true,
          useSuspenseQuery: true,
          useMutation: true,
          signal: true,
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
