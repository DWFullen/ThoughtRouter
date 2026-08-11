import { test, expect } from '@playwright/test';

test('captures multi-thought message and previews candidates', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Drop your thought dump here...').fill('call electric utility tomorrow and buy shower curtain and research llc');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByRole('heading', { name: 'call electric utility tomorrow' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'buy shower curtain' })).toBeVisible();
  await page.getByRole('button', { name: 'Accept' }).first().click();
});
