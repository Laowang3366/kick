import { describe, expect, it, vi } from 'vitest';
import { translateText } from './translator';

describe('translateText', () => {
  it('returns a deterministic mock translation without network access', async () => {
    await expect(
      translateText({
        text: 'Hello world',
        targetLanguage: 'zh-CN',
        provider: { type: 'mock' }
      })
    ).resolves.toEqual({
      provider: 'mock',
      sourceText: 'Hello world',
      translatedText: '你好，世界',
      targetLanguage: 'zh-CN'
    });
  });

  it('translates a single hello into Chinese with the mock provider', async () => {
    await expect(
      translateText({
        text: 'hello',
        targetLanguage: 'zh-CN',
        provider: { type: 'mock' }
      })
    ).resolves.toMatchObject({
      sourceText: 'hello',
      translatedText: '你好',
      targetLanguage: 'zh-CN'
    });
  });

  it('returns a clear mock-provider message when no local demo translation exists', async () => {
    await expect(
      translateText({
        text: 'unlisted phrase',
        targetLanguage: 'zh-CN',
        provider: { type: 'mock' }
      })
    ).resolves.toMatchObject({
      translatedText: '离线示例引擎没有这段文本的示例译文，请切换到兼容接口并填写接口配置。'
    });
  });

  it('trims input before sending it to an OpenAI-compatible provider', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Bonjour' } }]
      })
    });

    await translateText({
      text: '  Good morning  ',
      targetLanguage: 'fr-FR',
      provider: {
        type: 'openai-compatible',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'secret',
        model: 'gpt-4.1-mini'
      },
      fetcher
    });

    const [, init] = fetcher.mock.calls[0];
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Translate the user text into fr-FR. Return only the translated text.'
        },
        { role: 'user', content: 'Good morning' }
      ]
    });
  });

  it('rejects empty source text before calling a provider', async () => {
    const fetcher = vi.fn();

    await expect(
      translateText({
        text: '   ',
        targetLanguage: 'zh-CN',
        provider: { type: 'mock' },
        fetcher
      })
    ).rejects.toThrow('原文不能为空');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
