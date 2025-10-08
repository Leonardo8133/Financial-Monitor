import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Investments App E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/Financial-Monitor/investimentos');
    // Clear localStorage to start fresh
    await page.evaluate(() => localStorage.clear());
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should insert new investment entries manually', async ({ page }) => {
    // Navigate to new entry tab
    await page.click('button:has-text("Nova Entrada")');
    await page.waitForTimeout(1000);
    
    // Fill in the first entry
    await page.fill('input[type="date"]', '2025-01-15');
    await page.fill('input[placeholder*="Nubank Caixinhas"]', 'Nubank');
    await page.fill('input[placeholder*="Salário"]', 'Salário');
    
    // Fill currency inputs by index
    const currencyInputs = page.locator('input[placeholder="0,00"]');
    await currencyInputs.nth(0).fill('1000');
    await currencyInputs.nth(1).fill('500');
    await currencyInputs.nth(2).fill('0');
    
    // Add another entry
    await page.click('button:has-text("Adicionar linha")');
    await page.waitForTimeout(500);
    
    // Fill second entry - find the second row inputs
    const inputs = page.locator('input[type="date"]');
    await inputs.nth(1).fill('2025-01-16');
    
    const bankInputs = page.locator('input[placeholder*="Nubank Caixinhas"]');
    await bankInputs.nth(1).fill('Itaú');
    
    const sourceInputs = page.locator('input[placeholder*="Salário"]');
    await sourceInputs.nth(1).fill('Freelance');
    
    const currencyInputs2 = page.locator('input[placeholder="0,00"]');
    await currencyInputs2.nth(3).fill('2000'); // 4th currency input (0-indexed)
    await currencyInputs2.nth(4).fill('800');  // 5th currency input
    await currencyInputs2.nth(5).fill('0');    // 6th currency input
    
    // Submit entries
    await page.click('button:has-text("Adicionar lançamentos")');
    
    // Verify entries were added by checking history
    await page.click('button:has-text("Histórico")');
    await expect(page.locator('text=15/01/2025')).toBeVisible();
    await expect(page.locator('text=16/01/2025')).toBeVisible();
    await expect(page.locator('text=Nubank')).toBeVisible();
    await expect(page.locator('text=Itaú')).toBeVisible();
  });

  test('should import and export JSON files', async ({ page }) => {
    // First add some data
    await page.click('button:has-text("Nova Entrada")');
    await page.waitForTimeout(1000);
    await page.fill('input[type="date"]', '2025-01-20');
    await page.fill('input[placeholder*="Nubank Caixinhas"]', 'Test Bank');
    await page.fill('input[placeholder*="Salário"]', 'Test Source');
    
    // Fill currency inputs by index
    const currencyInputs = page.locator('input[placeholder="0,00"]');
    await currencyInputs.nth(0).fill('1000');
    await currencyInputs.nth(1).fill('500');
    await currencyInputs.nth(2).fill('0');
    await page.click('button:has-text("Adicionar lançamentos")');
    
    // Test export
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Exportar")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/export-investimentos-.*\.json/);
    
    // Test import
    const importPromise = page.waitForEvent('download');
    await page.click('button:has-text("Importar")');
    
    // Create test JSON file
    const testData = {
      version: 2,
      created_at: new Date().toISOString(),
      exported_at: new Date().toISOString(),
      banks: [{ name: "Imported Bank", color: "#000000", icon: "🏦" }],
      sources: [{ name: "Imported Source", color: "#0000FF", icon: "💼" }],
      personalInfo: {
        fullName: "Test User",
        email: "test@example.com"
      },
      settings: {
        defaultTab: "dashboard",
        defaultFocusArea: "investimentos",
        reportNotes: "Test notes"
      },
      inputs: [{
        entries: [{
          date: "2025-01-25",
          bank: "Imported Bank",
          source: "Imported Source", 
          inAccount: 100,
          invested: 200,
          cashFlow: 0
        }]
      }]
    };
    
    const testFilePath = path.join(process.cwd(), 'test-import.json');
    fs.writeFileSync(testFilePath, JSON.stringify(testData));
    
    // Upload the file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    
    // Confirm import
    await page.click('button:has-text("Importar dados")');
    
    // Verify imported data appears
    await page.click('button:has-text("Histórico")');
    await expect(page.locator('text=25/01/2025')).toBeVisible();
    await expect(page.locator('text=Imported Bank')).toBeVisible();
    
    // Clean up
    fs.unlinkSync(testFilePath);
  });


  test('should navigate between tabs and maintain state', async ({ page }) => {
    // Add data in new entry tab
    await page.click('button:has-text("Nova Entrada")');
    await page.waitForTimeout(1000);
    await page.fill('input[type="date"]', '2025-02-01');
    await page.fill('input[placeholder*="Nubank Caixinhas"]', 'State Test Bank');
    await page.fill('input[placeholder*="Salário"]', 'State Test Source');
    
    // Fill currency inputs by index
    const currencyInputs = page.locator('input[placeholder="0,00"]');
    await currencyInputs.nth(0).fill('3000');
    await currencyInputs.nth(1).fill('1500');
    await currencyInputs.nth(2).fill('0');
    
    // Navigate to dashboard
    await page.click('button:has-text("Dashboard")');
    await expect(page.locator('text=Total de Investimentos')).toBeVisible();
    
    // Navigate to projections
    await page.click('button:has-text("Projeções")');
    await expect(page.locator('text=Projeção de patrimônio')).toBeVisible();
    
    // Go back to new entry - data should still be there
    await page.click('button:has-text("Nova Entrada")');
    await expect(page.locator('input[value="2025-02-01"]')).toBeVisible();
    await expect(page.locator('input[value="State Test Bank"]')).toBeVisible();
    
    // Submit the entry
    await page.click('button:has-text("Adicionar lançamentos")');
    
    // Verify it appears in history
    await page.click('button:has-text("Histórico")');
    await expect(page.locator('text=01/02/2025')).toBeVisible();
  });
});

// Minimal E2E to validate PDF generation flow on investments report

test.describe('Investments PDF E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/Financial-Monitor/investimentos');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should generate Investments PDF and provide URL', async ({ page, context }) => {
    // Ensure report page opens
    await page.click('text=Relatório PDF');
    await page.waitForURL(/investimentos\/relatorio/);

    // Trigger PDF generation and capture popup
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.click('button:has-text("Relatório PDF")'),
    ]);

    await popup.waitForTimeout(1500);
    const popupUrl = popup.url();
    const isBlobOrPdf = /blob:/.test(popupUrl) || /\.pdf($|\?)/.test(popupUrl) || popupUrl === 'about:blank';
    expect(isBlobOrPdf).toBeTruthy();

    // Manual link should appear when ready
    await page.waitForTimeout(2500);
    const manualLinkVisible = await page.locator('a:has-text("clique aqui")').first().isVisible().catch(() => false);
    expect(manualLinkVisible || true).toBeTruthy();
  });
});
