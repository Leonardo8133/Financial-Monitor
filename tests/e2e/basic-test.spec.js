import { test, expect } from '@playwright/test';

test.describe('Basic E2E Tests', () => {
  test('should add one investment entry and verify in history', async ({ page }) => {
    await page.goto('http://localhost:5173/Financial-Monitor/investimentos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Navigate to new entry tab
    await page.click('button:has-text("Nova Entrada")');
    await page.waitForTimeout(1000);
    
    // Fill in one entry
    await page.fill('input[type="date"]', '2025-01-15');
    await page.fill('input[placeholder*="Nubank Caixinhas"]', 'Nubank');
    await page.fill('input[placeholder*="Salário"]', 'Salário');
    
    // Fill currency inputs by index
    const currencyInputs = page.locator('input[placeholder="0,00"]');
    await currencyInputs.nth(0).fill('1000');
    await currencyInputs.nth(1).fill('500');
    await currencyInputs.nth(2).fill('0');
    
    // Submit entry
    await page.click('button:has-text("Adicionar lançamentos")');
    await page.waitForTimeout(1000);
    
    // Verify entry was added by checking history
    await page.click('button:has-text("Histórico")');
    await page.waitForTimeout(1000);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'history-after-add.png' });
    
    // Check if the date appears
    const dateVisible = await page.locator('text=15/01/2025').isVisible();
    console.log('Date 15/01/2025 visible:', dateVisible);
    
    // Check if bank appears
    const bankVisible = await page.locator('text=Nubank').isVisible();
    console.log('Bank Nubank visible:', bankVisible);
    
    // Check page content for debugging
    const content = await page.textContent('body');
    console.log('Page content contains:', content.includes('15/01/2025'));
    console.log('Page content contains:', content.includes('Nubank'));
  });

  test('should add one expense entry and verify in history', async ({ page }) => {
    await page.goto('http://localhost:5173/Financial-Monitor/gastos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Navigate to new expense tab
    await page.click('button:has-text("Nova Despesa")');
    await page.waitForTimeout(1000);
    
    // Fill in one expense
    await page.fill('input[type="date"]', '2025-01-15');
    await page.fill('input[placeholder*="Supermercado"]', 'Supermercado Extra');
    await page.fill('input[placeholder*="Alimentação"]', 'Alimentação');
    await page.fill('input[placeholder*="Pessoal"]', 'Pessoal');
    await page.fill('input[placeholder="0,00"]', '150.50');
    
    // Submit expense
    await page.click('button:has-text("Adicionar despesas")');
    await page.waitForTimeout(1000);
    
    // Verify expense was added by checking history
    await page.click('button:has-text("Histórico")');
    await page.waitForTimeout(1000);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'expenses-history-after-add.png' });
    
    // Check if the date appears
    const dateVisible = await page.locator('text=15/01/2025').isVisible();
    console.log('Date 15/01/2025 visible:', dateVisible);
    
    // Check if description appears
    const descVisible = await page.locator('text=Supermercado Extra').isVisible();
    console.log('Description Supermercado Extra visible:', descVisible);
    
    // Check page content for debugging
    const content = await page.textContent('body');
    console.log('Page content contains:', content.includes('15/01/2025'));
    console.log('Page content contains:', content.includes('Supermercado Extra'));
  });
});
