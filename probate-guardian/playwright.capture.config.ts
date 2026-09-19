import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

const baseProject = baseConfig.projects?.[0] ?? { name: 'chromium', use: {} };

export default defineConfig({
  ...baseConfig,
  testDir: 'tests/capture',
  testMatch: '**/*.capture.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...baseConfig.use,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
  },
  projects: [
    {
      ...baseProject,
      use: {
        ...baseProject.use,
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        colorScheme: 'light',
      },
    },
  ],
});
