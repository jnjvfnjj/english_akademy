import { defineConfig, devices } from '@playwright/test';

const windows = process.platform === 'win32';
const adminRegistrationCode = 'e2e-only-registration-secret-2026';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    ...devices['Desktop Chrome'],
    headless: true
  },
  webServer: [
    {
      command: windows ? 'gradlew.bat bootRun' : './gradlew bootRun',
      url: 'http://127.0.0.1:8081/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        SERVER_PORT: '8081',
        DATABASE_URL: 'jdbc:h2:mem:english_school_e2e;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE',
        DATABASE_USER: 'sa',
        DATABASE_PASSWORD: '',
        DATABASE_DRIVER: 'org.h2.Driver',
        DATABASE_DIALECT: 'org.hibernate.dialect.H2Dialect',
        ADMIN_REGISTRATION_CODE: adminRegistrationCode,
        ADMIN_EMAIL: '',
        ADMIN_PASSWORD: ''
      }
    },
    {
      command: 'npm start',
      url: 'http://127.0.0.1:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    }
  ]
});
