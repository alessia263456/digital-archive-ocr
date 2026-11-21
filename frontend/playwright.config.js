import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';
const projects = [];

for (const [viewport, device] of [['desktop', 'Desktop Chrome'], ['mobile', 'Pixel 7']]) {
  for (const colorScheme of ['light', 'dark']) {
    projects.push({
      name: `${viewport}-${colorScheme}`,
      use: { ...devices[device], browserName: 'chromium', colorScheme },
    });
  }
}

export default defineConfig({
  testDir: './tests',
  projects,
  use: { baseURL },
  webServer: {
    command: 'vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: baseURL,
  },
});
