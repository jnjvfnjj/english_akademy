import { expect, test } from '@playwright/test';

const apiBaseUrl = 'http://127.0.0.1:8081/api';

test('teacher can log in and open their own profile', async ({ page, request }) => {
  const email = `teacher-${Date.now()}@e2e.school`;
  const password = 'TeacherPass123!';
  const admin = await request.post(`${apiBaseUrl}/auth/register/admin`, {
    data: {
      email: `admin-${Date.now()}@e2e.school`,
      password: 'AdminPass123!',
      name: 'E2E Profile Admin',
      registrationCode: 'e2e-only-registration-secret-2026'
    }
  });
  expect(admin.status()).toBe(201);
  const adminSession = await admin.json() as { token: string };
  const teacher = await request.post(`${apiBaseUrl}/admin/teachers`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
    data: { email, password, name: 'E2E Profile Teacher' }
  });
  expect(teacher.status()).toBe(201);

  await page.goto('/');
  await page.getByRole('button', { name: 'Преподаватель', exact: true }).click();
  await page.getByPlaceholder('name@school.com').fill(email);
  await page.getByPlaceholder('Введите пароль').fill(password);
  await page.getByRole('button', { name: /войти как преподаватель/i }).click();

  const profileTab = page.getByRole('tab', { name: 'Профиль' });
  await expect(profileTab).toBeVisible();
  await profileTab.click();
  await expect(page.getByText('Мой профиль')).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText('E2E Profile Teacher')).toBeVisible();
});
