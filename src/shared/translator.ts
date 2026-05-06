export type MockProvider = {
  type: 'mock';
};

export type OpenAICompatibleProvider = {
  type: 'openai-compatible';
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type TranslationProvider = MockProvider | OpenAICompatibleProvider;

export type TranslateTextInput = {
  text: string;
  targetLanguage: string;
  provider: TranslationProvider;
  fetcher?: typeof fetch;
};

export type TranslateTextResult = {
  provider: TranslationProvider['type'];
  sourceText: string;
  translatedText: string;
  targetLanguage: string;
};

type OpenAICompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const mockDictionary = new Map<string, string>([
  ['hello::zh-CN', '你好'],
  ['hi::zh-CN', '你好'],
  ['hello world::zh-CN', '你好，世界'],
  ['good morning::fr-FR', 'Bonjour'],
  ['quick translate::zh-CN', '快速翻译']
]);

export async function translateText(input: TranslateTextInput): Promise<TranslateTextResult> {
  const sourceText = input.text.trim();

  if (!sourceText) {
    throw new Error('原文不能为空');
  }

  if (input.provider.type === 'mock') {
    return {
      provider: 'mock',
      sourceText,
      translatedText: translateWithMock(sourceText, input.targetLanguage),
      targetLanguage: input.targetLanguage
    };
  }

  const fetcher = input.fetcher ?? globalThis.fetch;
  if (!fetcher) {
    throw new Error('当前运行环境不支持网络请求');
  }

  const translatedText = await translateWithOpenAICompatibleProvider({
    sourceText,
    targetLanguage: input.targetLanguage,
    provider: input.provider,
    fetcher
  });

  return {
    provider: 'openai-compatible',
    sourceText,
    translatedText,
    targetLanguage: input.targetLanguage
  };
}

function translateWithMock(sourceText: string, targetLanguage: string): string {
  const dictionaryKey = `${sourceText.toLowerCase()}::${targetLanguage}`;
  return (
    mockDictionary.get(dictionaryKey) ??
    '离线示例引擎没有这段文本的示例译文，请切换到兼容接口并填写接口配置。'
  );
}

async function translateWithOpenAICompatibleProvider(input: {
  sourceText: string;
  targetLanguage: string;
  provider: OpenAICompatibleProvider;
  fetcher: typeof fetch;
}): Promise<string> {
  const response = await input.fetcher(`${input.provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.provider.apiKey}`
    },
    body: JSON.stringify({
      model: input.provider.model,
      messages: [
        {
          role: 'system',
          content: `Translate the user text into ${input.targetLanguage}. Return only the translated text.`
        },
        { role: 'user', content: input.sourceText }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    throw new Error(`翻译接口请求失败，状态码 ${response.status}`);
  }

  const payload = (await response.json()) as OpenAICompatibleResponse;
  const translatedText = payload.choices?.[0]?.message?.content?.trim();

  if (!translatedText) {
    throw new Error('翻译接口返回了空结果');
  }

  return translatedText;
}
