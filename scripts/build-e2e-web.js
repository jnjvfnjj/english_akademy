const { spawnSync } = require('node:child_process');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function build(apiUrl) {
  const result = spawnSync(npm, ['run', 'build'], {
    shell: process.platform === 'win32',
    stdio: 'inherit',
    env: { ...process.env, EXPO_PUBLIC_API_URL: apiUrl }
  });
  if (result.error) {
    console.error(`Failed to build the web app: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

const localApiUrl = 'http://127.0.0.1:8081/api';
const productionApiUrl = 'https://english-akademy.fly.dev/api';
const testResult = build(localApiUrl);
if (testResult !== 0) {
  process.exit(testResult);
}

const playwright = spawnSync(
  process.execPath,
  [require.resolve('@playwright/test/cli'), 'test'],
  { stdio: 'inherit', env: process.env }
);
if (playwright.error) {
  console.error(`Failed to start Playwright: ${playwright.error.message}`);
}
const playwrightResult = playwright.status ?? 1;
const restoreResult = build(productionApiUrl);
process.exit(playwrightResult || restoreResult);
