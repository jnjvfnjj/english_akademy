import { expect, test } from '@playwright/test';

const apiBaseUrl = 'http://127.0.0.1:8081/api';

test('teacher can log in and open their own profile', async ({ page, request }) => {
  const email = `teacher-${Date.now()}@e2e.school`;
  const password = 'TeacherPass123!';
  const registration = await request.post(`${apiBaseUrl}/auth/register`, {
    data: { email, password, name: 'E2E Profile Teacher' }
  });
  expect(registration.status()).toBe(201);

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
