export type LanguageOption = {
  value: string;
  label: string;
  badge: string;
  region: string;
};

export type SourceLanguageOption = LanguageOption & {
  pattern: RegExp;
};

export const defaultTargetLanguage = 'zh-CN';

export const languageOptions: LanguageOption[] = [
  { value: 'zh-CN', label: '简体中文', badge: '简', region: '常用' },
  { value: 'zh-TW', label: '繁体中文', badge: '繁', region: '常用' },
  { value: 'en-US', label: '英语', badge: '英', region: '常用' },
  { value: 'ja-JP', label: '日语', badge: '日', region: '常用' },
  { value: 'ko-KR', label: '韩语', badge: '韩', region: '常用' },
  { value: 'fr-FR', label: '法语', badge: '法', region: '常用' },
  { value: 'de-DE', label: '德语', badge: '德', region: '欧洲' },
  { value: 'es-ES', label: '西班牙语', badge: '西', region: '欧洲' },
  { value: 'pt-PT', label: '葡萄牙语', badge: '葡', region: '欧洲' },
  { value: 'pt-BR', label: '葡萄牙语（巴西）', badge: '巴', region: '美洲' },
  { value: 'it-IT', label: '意大利语', badge: '意', region: '欧洲' },
  { value: 'nl-NL', label: '荷兰语', badge: '荷', region: '欧洲' },
  { value: 'ru-RU', label: '俄语', badge: '俄', region: '欧洲' },
  { value: 'uk-UA', label: '乌克兰语', badge: '乌', region: '欧洲' },
  { value: 'pl-PL', label: '波兰语', badge: '波', region: '欧洲' },
  { value: 'cs-CZ', label: '捷克语', badge: '捷', region: '欧洲' },
  { value: 'sk-SK', label: '斯洛伐克语', badge: '斯', region: '欧洲' },
  { value: 'hu-HU', label: '匈牙利语', badge: '匈', region: '欧洲' },
  { value: 'ro-RO', label: '罗马尼亚语', badge: '罗', region: '欧洲' },
  { value: 'bg-BG', label: '保加利亚语', badge: '保', region: '欧洲' },
  { value: 'el-GR', label: '希腊语', badge: '希', region: '欧洲' },
  { value: 'sv-SE', label: '瑞典语', badge: '瑞', region: '欧洲' },
  { value: 'da-DK', label: '丹麦语', badge: '丹', region: '欧洲' },
  { value: 'no-NO', label: '挪威语', badge: '挪', region: '欧洲' },
  { value: 'fi-FI', label: '芬兰语', badge: '芬', region: '欧洲' },
  { value: 'is-IS', label: '冰岛语', badge: '冰', region: '欧洲' },
  { value: 'ga-IE', label: '爱尔兰语', badge: '爱', region: '欧洲' },
  { value: 'et-EE', label: '爱沙尼亚语', badge: '爱', region: '欧洲' },
  { value: 'lv-LV', label: '拉脱维亚语', badge: '拉', region: '欧洲' },
  { value: 'lt-LT', label: '立陶宛语', badge: '立', region: '欧洲' },
  { value: 'hr-HR', label: '克罗地亚语', badge: '克', region: '欧洲' },
  { value: 'sr-RS', label: '塞尔维亚语', badge: '塞', region: '欧洲' },
  { value: 'sl-SI', label: '斯洛文尼亚语', badge: '斯', region: '欧洲' },
  { value: 'ca-ES', label: '加泰罗尼亚语', badge: '加', region: '欧洲' },
  { value: 'eu-ES', label: '巴斯克语', badge: '巴', region: '欧洲' },
  { value: 'gl-ES', label: '加利西亚语', badge: '加', region: '欧洲' },
  { value: 'tr-TR', label: '土耳其语', badge: '土', region: '中东' },
  { value: 'ar-SA', label: '阿拉伯语', badge: '阿', region: '中东' },
  { value: 'he-IL', label: '希伯来语', badge: '希', region: '中东' },
  { value: 'fa-IR', label: '波斯语', badge: '波', region: '中东' },
  { value: 'ur-PK', label: '乌尔都语', badge: '乌', region: '南亚' },
  { value: 'hi-IN', label: '印地语', badge: '印', region: '南亚' },
  { value: 'bn-BD', label: '孟加拉语', badge: '孟', region: '南亚' },
  { value: 'pa-IN', label: '旁遮普语', badge: '旁', region: '南亚' },
  { value: 'ta-IN', label: '泰米尔语', badge: '泰', region: '南亚' },
  { value: 'te-IN', label: '泰卢固语', badge: '泰', region: '南亚' },
  { value: 'ml-IN', label: '马拉雅拉姆语', badge: '马', region: '南亚' },
  { value: 'kn-IN', label: '卡纳达语', badge: '卡', region: '南亚' },
  { value: 'mr-IN', label: '马拉地语', badge: '马', region: '南亚' },
  { value: 'gu-IN', label: '古吉拉特语', badge: '古', region: '南亚' },
  { value: 'ne-NP', label: '尼泊尔语', badge: '尼', region: '南亚' },
  { value: 'si-LK', label: '僧伽罗语', badge: '僧', region: '南亚' },
  { value: 'th-TH', label: '泰语', badge: '泰', region: '东南亚' },
  { value: 'vi-VN', label: '越南语', badge: '越', region: '东南亚' },
  { value: 'id-ID', label: '印尼语', badge: '印', region: '东南亚' },
  { value: 'ms-MY', label: '马来语', badge: '马', region: '东南亚' },
  { value: 'fil-PH', label: '菲律宾语', badge: '菲', region: '东南亚' },
  { value: 'my-MM', label: '缅甸语', badge: '缅', region: '东南亚' },
  { value: 'km-KH', label: '高棉语', badge: '高', region: '东南亚' },
  { value: 'lo-LA', label: '老挝语', badge: '老', region: '东南亚' },
  { value: 'mn-MN', label: '蒙古语', badge: '蒙', region: '亚洲' },
  { value: 'kk-KZ', label: '哈萨克语', badge: '哈', region: '亚洲' },
  { value: 'uz-UZ', label: '乌兹别克语', badge: '乌', region: '亚洲' },
  { value: 'sw-KE', label: '斯瓦希里语', badge: '斯', region: '非洲' },
  { value: 'am-ET', label: '阿姆哈拉语', badge: '阿', region: '非洲' },
  { value: 'ha-NG', label: '豪萨语', badge: '豪', region: '非洲' },
  { value: 'yo-NG', label: '约鲁巴语', badge: '约', region: '非洲' },
  { value: 'ig-NG', label: '伊博语', badge: '伊', region: '非洲' },
  { value: 'zu-ZA', label: '祖鲁语', badge: '祖', region: '非洲' },
  { value: 'xh-ZA', label: '科萨语', badge: '科', region: '非洲' },
  { value: 'af-ZA', label: '南非荷兰语', badge: '南', region: '非洲' },
  { value: 'so-SO', label: '索马里语', badge: '索', region: '非洲' },
  { value: 'mg-MG', label: '马达加斯加语', badge: '马', region: '非洲' },
  { value: 'es-419', label: '西班牙语（拉美）', badge: '拉', region: '美洲' },
  { value: 'ht-HT', label: '海地克里奥尔语', badge: '海', region: '美洲' },
  { value: 'gn-PY', label: '瓜拉尼语', badge: '瓜', region: '美洲' },
  { value: 'qu-PE', label: '克丘亚语', badge: '克', region: '美洲' },
  { value: 'mi-NZ', label: '毛利语', badge: '毛', region: '大洋洲' },
  { value: 'sm-WS', label: '萨摩亚语', badge: '萨', region: '大洋洲' },
  { value: 'fj-FJ', label: '斐济语', badge: '斐', region: '大洋洲' },
  { value: 'haw-US', label: '夏威夷语', badge: '夏', region: '大洋洲' }
];

export const sourceLanguageOptions: SourceLanguageOption[] = [
  { value: 'ja-JP', label: '日语', badge: '日', region: '常用', pattern: /[\u3040-\u30ff]/ },
  { value: 'ko-KR', label: '韩语', badge: '韩', region: '常用', pattern: /[\uac00-\ud7af]/ },
  { value: 'zh-CN', label: '中文', badge: '中', region: '常用', pattern: /[\u4e00-\u9fff]/ },
  { value: 'ur-PK', label: '乌尔都语', badge: '乌', region: '南亚', pattern: /[\u0679\u0688\u0691\u06ba\u06be\u06c1\u06d2]/ },
  { value: 'fa-IR', label: '波斯语', badge: '波', region: '中东', pattern: /[\u067e\u0686\u0698\u06af]/ },
  { value: 'ar-SA', label: '阿拉伯语', badge: '阿', region: '中东', pattern: /[\u0600-\u06ff]/ },
  { value: 'he-IL', label: '希伯来语', badge: '希', region: '中东', pattern: /[\u0590-\u05ff]/ },
  { value: 'hi-IN', label: '印地语', badge: '印', region: '南亚', pattern: /[\u0900-\u097f]/ },
  { value: 'bn-BD', label: '孟加拉语', badge: '孟', region: '南亚', pattern: /[\u0980-\u09ff]/ },
  { value: 'pa-IN', label: '旁遮普语', badge: '旁', region: '南亚', pattern: /[\u0a00-\u0a7f]/ },
  { value: 'gu-IN', label: '古吉拉特语', badge: '古', region: '南亚', pattern: /[\u0a80-\u0aff]/ },
  { value: 'ta-IN', label: '泰米尔语', badge: '泰', region: '南亚', pattern: /[\u0b80-\u0bff]/ },
  { value: 'te-IN', label: '泰卢固语', badge: '泰', region: '南亚', pattern: /[\u0c00-\u0c7f]/ },
  { value: 'kn-IN', label: '卡纳达语', badge: '卡', region: '南亚', pattern: /[\u0c80-\u0cff]/ },
  { value: 'ml-IN', label: '马拉雅拉姆语', badge: '马', region: '南亚', pattern: /[\u0d00-\u0d7f]/ },
  { value: 'si-LK', label: '僧伽罗语', badge: '僧', region: '南亚', pattern: /[\u0d80-\u0dff]/ },
  { value: 'ru-RU', label: '俄语', badge: '俄', region: '欧洲', pattern: /[\u0400-\u04ff]/ },
  { value: 'el-GR', label: '希腊语', badge: '希', region: '欧洲', pattern: /[\u0370-\u03ff]/ },
  { value: 'th-TH', label: '泰语', badge: '泰', region: '东南亚', pattern: /[\u0e00-\u0e7f]/ },
  { value: 'lo-LA', label: '老挝语', badge: '老', region: '东南亚', pattern: /[\u0e80-\u0eff]/ },
  { value: 'my-MM', label: '缅甸语', badge: '缅', region: '东南亚', pattern: /[\u1000-\u109f]/ },
  { value: 'km-KH', label: '高棉语', badge: '高', region: '东南亚', pattern: /[\u1780-\u17ff]/ },
  { value: 'am-ET', label: '阿姆哈拉语', badge: '阿', region: '非洲', pattern: /[\u1200-\u137f]/ },
  { value: 'mn-MN', label: '蒙古语', badge: '蒙', region: '亚洲', pattern: /[\u1800-\u18af]/ },
  { value: 'vi-VN', label: '越南语', badge: '越', region: '东南亚', pattern: /[ăâđêôơưạ-ỹ]/i },
  { value: 'tr-TR', label: '土耳其语', badge: '土', region: '中东', pattern: /[ğışİ]/ },
  { value: 'pl-PL', label: '波兰语', badge: '波', region: '欧洲', pattern: /[ąćęłńóśźż]/i },
  { value: 'cs-CZ', label: '捷克语', badge: '捷', region: '欧洲', pattern: /[ěščřžů]/i },
  { value: 'hu-HU', label: '匈牙利语', badge: '匈', region: '欧洲', pattern: /[őű]/i },
  { value: 'ro-RO', label: '罗马尼亚语', badge: '罗', region: '欧洲', pattern: /[ăâîșț]/i },
  { value: 'sv-SE', label: '瑞典语', badge: '瑞', region: '欧洲', pattern: /[åäö]/i },
  { value: 'da-DK', label: '丹麦语', badge: '丹', region: '欧洲', pattern: /[æøå]/i },
  { value: 'no-NO', label: '挪威语', badge: '挪', region: '欧洲', pattern: /[æøå]/i },
  { value: 'de-DE', label: '德语', badge: '德', region: '欧洲', pattern: /[äöüß]/i },
  { value: 'pt-PT', label: '葡萄牙语', badge: '葡', region: '欧洲', pattern: /[ãõ]/i },
  { value: 'es-ES', label: '西班牙语', badge: '西', region: '欧洲', pattern: /[ñ¿¡]/i },
  { value: 'fr-FR', label: '法语', badge: '法', region: '常用', pattern: /[àâçéèêëîïôûùüÿœæ]/i },
  { value: 'en-US', label: '英语', badge: '英', region: '常用', pattern: /[a-z]/i }
];

export function getLanguageOption(language: string) {
  return languageOptions.find((option) => option.value === language);
}

export function getLanguageLabel(language: string) {
  return getLanguageOption(language)?.label ?? language;
}

export function getLanguageBadge(language: string) {
  return getLanguageOption(language)?.badge ?? getLanguageLabel(language).slice(0, 1);
}

export function normalizeTargetLanguage(language: unknown) {
  return typeof language === 'string' && languageOptions.some((option) => option.value === language)
    ? language
    : defaultTargetLanguage;
}
