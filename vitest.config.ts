import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@defense/schema': '/Users/rohan/Development/RandomGithubRepos/defense-ai-analyst/packages/schema/src',
      '@defense/graph-store': '/Users/rohan/Development/RandomGithubRepos/defense-ai-analyst/packages/graph-store/src',
      '@defense/ingestion': '/Users/rohan/Development/RandomGithubRepos/defense-ai-analyst/packages/ingestion/src',
      '@defense/analyst': '/Users/rohan/Development/RandomGithubRepos/defense-ai-analyst/packages/analyst/src',
      '@defense/validation': '/Users/rohan/Development/RandomGithubRepos/defense-ai-analyst/packages/validation/src',
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'packages/**/tests/**/*.test.ts'],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
