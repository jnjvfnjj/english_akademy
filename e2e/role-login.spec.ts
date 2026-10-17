import { expect, test } from '@playwright/test';

test('login screen switches back and forth between teacher and administrator', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Вход администратора')).toBeVisible();
  await expect(page.getByRole('button', { name: /войти как администратор/i })).toBeVisible();

  await page.getByRole('button', { name: 'Преподаватель', exact: true }).click();
  await expect(page.getByText('Вход преподавателя')).toBeVisible();
  await expect(page.getByRole('button', { name: /войти как преподаватель/i })).toBeVisible();

  await page.getByRole('button', { name: 'Администратор', exact: true }).click();
  await expect(page.getByText('Вход администратора')).toBeVisible();
  await expect(page.getByRole('button', { name: /войти как администратор/i })).toBeVisible();
});
