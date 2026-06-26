export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  translatedContent?: string;
  isTranslating?: boolean;
}
