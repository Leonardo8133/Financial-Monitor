import { test, expect } from '@playwright/test';

// This test guarantees that on first visit (empty localStorage),
// the app loads defaults from public/configuracoes-padrao.json.
test('loads default configurations on first visit', async ({ page }) => {
  // Start clean on app origin, then reload
  await page.goto('http://localhost:5173/Financial-Monitor/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // First app load on investimentos
  await page.goto('http://localhost:5173/Financial-Monitor/investimentos');

  // Wait until unified data is initialized in localStorage
  await page.waitForFunction(() => !!localStorage.getItem('financial-monitor-unified-v1'));

  // Inspect localStorage unified state
  const unified = await page.evaluate(() => {
    const raw = localStorage.getItem('financial-monitor-unified-v1');
    return raw ? JSON.parse(raw) : null;
  });

  expect(unified).toBeTruthy();
  expect(Array.isArray(unified.investimentos?.banks)).toBeTruthy();
  expect(unified.investimentos.banks.length).toBeGreaterThan(0);
  expect(Array.isArray(unified.gastos?.categories)).toBeTruthy();
  expect(unified.gastos.categories.length).toBeGreaterThan(0);

  // Sanity check against known item from defaults
  const bankNames = unified.investimentos.banks.map(b => b.name);
  expect(bankNames).toContain('Nubank');

  const categoryNames = unified.gastos.categories.map(c => c.name);
  expect(categoryNames).toContain('Moradia');

  // New checks: mappings and ignored descriptions from defaults
  expect(Array.isArray(unified.gastos.descriptionCategoryMappings)).toBeTruthy();
  expect(unified.gastos.descriptionCategoryMappings.length).toBeGreaterThan(10);
  expect(Array.isArray(unified.gastos.ignoredDescriptions)).toBeTruthy();
  expect(unified.gastos.ignoredDescriptions.length).toBeGreaterThan(3);
});


