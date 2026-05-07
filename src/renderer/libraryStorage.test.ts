import { describe, expect, it } from 'vitest';
import {
  FAVORITE_IDS_STORAGE_KEY,
  TRANSLATION_HISTORY_STORAGE_KEY,
  loadFavoriteIds,
  loadHistoryEntries,
  saveFavoriteIds,
  saveHistoryEntries
} from './libraryStorage';

function createStorage(initialValues: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initialValues));

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  };
}

describe('library storage', () => {
  it('loads persisted history entries with normalized labels', () => {
    const storage = createStorage({
      [TRANSLATION_HISTORY_STORAGE_KEY]: JSON.stringify([
        {
          id: '1',
          createdAt: '18:20',
          provider: 'openai-compatible',
          sourceText: '用户名称',
          translatedText: 'userName',
          targetLanguage: 'en-US',
          translationFormat: 'java-camel-case'
        }
      ])
    });

    expect(loadHistoryEntries(storage)).toEqual([
      {
        id: '1',
        createdAt: '18:20',
        provider: 'openai-compatible',
        sourceText: '用户名称',
        translatedText: 'userName',
        targetLanguage: 'en-US',
        targetLabel: '英语',
        translationFormat: 'java-camel-case',
        formatLabel: 'Java 驼峰命名'
      }
    ]);
  });

  it('ignores damaged history storage', () => {
    expect(loadHistoryEntries(createStorage({ [TRANSLATION_HISTORY_STORAGE_KEY]: '{bad json' }))).toEqual([]);
  });

  it('saves history entries and favorite ids', () => {
    const storage = createStorage();
    const entry = {
      id: '1',
      createdAt: '18:20',
      provider: 'mock' as const,
      sourceText: 'hello',
      translatedText: '你好',
      targetLanguage: 'zh-CN',
      targetLabel: '简体中文',
      translationFormat: 'plain' as const,
      formatLabel: '普通翻译'
    };

    saveHistoryEntries([entry], storage);
    saveFavoriteIds(['1', '1', '2'], storage);

    expect(loadHistoryEntries(storage)).toHaveLength(1);
    expect(loadFavoriteIds(storage)).toEqual(['1', '2']);
    expect(storage.getItem(FAVORITE_IDS_STORAGE_KEY)).toBe('["1","2"]');
  });
});
