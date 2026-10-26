import { expect, test } from '@playwright/test';

const apiBaseUrl = 'http://127.0.0.1:8081/api';
const adminRegistrationCode = 'e2e-only-registration-secret-2026';

test('administrator can review, disable, and restore a teacher account', async ({ page, request }) => {
  const suffix = Date.now();
  const adminEmail = `admin-${suffix}@e2e.school`;
  const teacherEmail = `teacher-${suffix}@e2e.school`;
  const teacherPassword = 'TeacherPass123!';
  const adminPassword = 'AdminPass123!';
  const adminRegistration = await request.post(`${apiBaseUrl}/auth/register/admin`, {
    data: {
      email: adminEmail,
      password: adminPassword,
      name: `E2E Admin ${suffix}`,
      registrationCode: adminRegistrationCode
    }
  });
  expect(adminRegistration.status()).toBe(201);
  const admin = await adminRegistration.json() as { token: string };

  const teacherCreation = await request.post(`${apiBaseUrl}/admin/teachers`, {
    headers: { Authorization: `Bearer ${admin.token}` },
    data: { email: teacherEmail, password: teacherPassword, name: `E2E Teacher ${suffix}` }
  });
  expect(teacherCreation.status()).toBe(201);

  const teachersResponse = await request.get(`${apiBaseUrl}/admin/teachers`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  expect(teachersResponse.ok()).toBeTruthy();
  const teachers = await teachersResponse.json() as Array<{ id: number; email: string; active: boolean }>;
  const teacher = teachers.find(account => account.email === teacherEmail);
  expect(teacher).toBeDefined();

  await page.goto('/');
  await page.getByPlaceholder('name@school.com').fill(adminEmail);
  await page.getByPlaceholder('Введите пароль').fill(adminPassword);
  await page.getByRole('button', { name: /войти как администратор/i }).click();
  const teachersTab = page.getByRole('tab', { name: 'Преподаватели' });
  await expect(teachersTab).toBeVisible();
  await teachersTab.click();

  const teacherCard = page.getByTestId(`teacher-card-${teacher!.id}`);
  await expect(teacherCard).toContainText(teacherEmail);
  await teacherCard.getByRole('button', { name: 'Отключить' }).click();
  await expect(teacherCard).toContainText('Доступ отключён');

  const disabledLogin = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email: teacherEmail, password: teacherPassword }
  });
  expect(disabledLogin.status()).toBe(401);

  await teacherCard.getByRole('button', { name: 'Восстановить' }).click();
  await expect(teacherCard).toContainText('Аккаунт активен');
  const restoredLogin = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email: teacherEmail, password: teacherPassword }
  });
  expect(restoredLogin.status()).toBe(200);
});
