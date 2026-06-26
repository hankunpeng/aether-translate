import { ChatMessage } from "./types";

export interface LanguageDetail {
  full: string;
  code: string;
  flag: string;
  name: string;
  country: string;
  countryName: string;
}

export const LANGUAGE_DETAILS: Record<string, LanguageDetail> = {
  en: { full: 'English', code: 'en', flag: '🇺🇸', name: 'English', country: 'US', countryName: '美国' },
  zh: { full: 'Chinese', code: 'zh', flag: '🇨🇳', name: '简体中文', country: 'CN', countryName: '中国' },
  ja: { full: 'Japanese', code: 'ja', flag: '🇯🇵', name: '日本語', country: 'JP', countryName: '日本' },
  ko: { full: 'Korean', code: 'ko', flag: '🇰🇷', name: '한국어', country: 'KR', countryName: '韩国' },
  fr: { full: 'French', code: 'fr', flag: '🇫🇷', name: 'Français', country: 'FR', countryName: '法国' },
  es: { full: 'Spanish', code: 'es', flag: '🇪🇸', name: 'Español', country: 'ES', countryName: '西班牙' },
  de: { full: 'German', code: 'de', flag: '🇩🇪', name: 'Deutsch', country: 'DE', countryName: '德国' }
};

export const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "你好！我是你的智能翻译练习助手。我可以帮你：\n1. 翻译任意单词、长句、段落\n2. 进行多语言口语对话练习与语法纠错\n3. 详细拆解复杂句法结构与提供音标\n\n请在下方输入框中与我开始对话吧！"
};
