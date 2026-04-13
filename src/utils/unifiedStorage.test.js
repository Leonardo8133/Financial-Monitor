import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  UNIFIED_LS_KEY,
  ensureUnifiedDefaults,
  importUnifiedData,
  migrateToUnifiedStorage,
} from './unifiedStorage.js';

class MockFileReader {
  readAsText(file) {
    queueMicrotask(() => {
      if (file.shouldFail) {
        this.onerror?.(new Error('read failed'));
        return;
      }

      this.onload?.({ target: { result: file.content } });
    });
  }
}

describe('unifiedStorage', () => {
  const originalFileReader = global.FileReader;

  beforeEach(() => {
    localStorage.clear();
    global.FileReader = MockFileReader;
  });

  afterEach(() => {
    localStorage.clear();
    global.FileReader = originalFileReader;
  });

  it('repairs invalid nested values when ensuring defaults', () => {
    const normalized = ensureUnifiedDefaults({
      investimentos: {
        entries: 'bad',
        banks: [{ name: 'Nubank', color: 42 }, { color: '#fff' }],
        sources: [{ name: 'Pessoal', icon: 1 }],
        personalInfo: { fullName: 123 },
        settings: { defaultFocusArea: 9 },
        createdAt: 'invalid-date',
      },
      gastos: {
        expenses: [null, { id: '1', value: -20 }],
        categories: [{ name: 'Moradia', color: '#111' }, {}],
        sources: 'bad',
        personalInfo: { householdSize: '3' },
        settings: { monthlyBudget: '1500', currency: 10 },
        descriptionCategoryMappings: [{ keyword: 'uber', categories: ['Transporte', '', 4] }, { keyword: '', categories: ['x'] }],
        ignoredDescriptions: ['foo', '', 9],
      },
      version: 2,
    });

    expect(normalized.investimentos.entries).toEqual([]);
    expect(normalized.investimentos.banks).toEqual([{ name: 'Nubank', color: '', icon: '' }]);
    expect(normalized.investimentos.sources).toEqual([{ name: 'Pessoal', color: '', icon: '' }]);
    expect(normalized.investimentos.personalInfo.fullName).toBe('');
    expect(normalized.investimentos.settings.defaultFocusArea).toBe('investimentos');
    expect(normalized.gastos.expenses).toEqual([{ id: '1', value: -20 }]);
    expect(normalized.gastos.personalInfo.householdSize).toBe(3);
    expect(normalized.gastos.settings.monthlyBudget).toBe(1500);
    expect(normalized.gastos.settings.currency).toBe('BRL');
    expect(normalized.gastos.descriptionCategoryMappings).toEqual([
      { keyword: 'uber', categories: ['Transporte'], exactMatch: false },
    ]);
    expect(normalized.gastos.ignoredDescriptions).toEqual(['foo']);
    expect(normalized.version).toBe('1.0.0');
  });

  it('sanitizes an existing unified payload during migration', async () => {
    localStorage.setItem(
      UNIFIED_LS_KEY,
      JSON.stringify({
        investimentos: {
          entries: [{ id: 'i1' }],
          banks: [{ name: 'XP', color: '#000', icon: 'x' }, { icon: '?' }],
          sources: [{ name: 'Pessoal' }],
        },
        gastos: {
          expenses: [{ id: 'e1', value: -10 }],
          categories: [{ name: 'Moradia' }],
          sources: [{ name: 'Casa' }],
          descriptionCategoryMappings: [{ keyword: 'uber', categories: ['Transporte'] }],
          ignoredDescriptions: ['ifood'],
          settings: { monthlyBudget: '900' },
        },
      })
    );

    const migrated = await migrateToUnifiedStorage();
    const stored = JSON.parse(localStorage.getItem(UNIFIED_LS_KEY));

    expect(migrated.investimentos.banks).toEqual([{ name: 'XP', color: '#000', icon: 'x' }]);
    expect(migrated.gastos.settings.monthlyBudget).toBe(900);
    expect(stored).toEqual(migrated);
  });

  it('migrates legacy investment and expense data before initializing defaults', async () => {
    localStorage.setItem(
      'financial-monitor-investments-v1',
      JSON.stringify({
        entries: [{ id: 'legacy-investment', invested: 100 }],
        banks: [{ name: 'Banco Antigo' }],
        sources: [{ name: 'Salario' }],
      })
    );
    localStorage.setItem(
      'financial-monitor-expenses-v1',
      JSON.stringify({
        expenses: [{ id: 'legacy-expense', value: -35 }],
        categories: [{ name: 'Moradia' }],
        sources: [{ name: 'Casa' }],
      })
    );

    const migrated = await migrateToUnifiedStorage();

    expect(migrated.investimentos.entries).toEqual([{ id: 'legacy-investment', invested: 100 }]);
    expect(migrated.gastos.expenses).toEqual([{ id: 'legacy-expense', value: -35 }]);
    expect(migrated.investimentos.banks).toEqual([{ name: 'Banco Antigo', color: '', icon: '' }]);
    expect(migrated.gastos.sources).toEqual([{ name: 'Casa', color: '', icon: '' }]);
  });

  it('rejects invalid imports and normalizes valid ones before saving', async () => {
    await expect(importUnifiedData({ content: JSON.stringify({ foo: 'bar' }) })).rejects.toThrow(
      'Arquivo não contém estrutura unificada válida'
    );

    const imported = await importUnifiedData({
      content: JSON.stringify({
        investimentos: {
          entries: [{ id: 'i1' }],
          banks: [{ name: 'Nu' }],
          sources: [{ name: 'Pessoal' }],
        },
        gastos: {
          expenses: [{ id: 'e1', value: -12 }],
          categories: [{ name: 'Moradia' }],
          sources: [{ name: 'Casa' }],
          descriptionCategoryMappings: [{ keyword: 'uber', categories: ['Transporte'] }],
          ignoredDescriptions: ['netflix'],
        },
      }),
    });

    expect(imported.investimentos.banks).toEqual([{ name: 'Nu', color: '', icon: '' }]);
    expect(imported.gastos.settings.currency).toBe('BRL');
    expect(JSON.parse(localStorage.getItem(UNIFIED_LS_KEY))).toEqual(imported);
  });
});