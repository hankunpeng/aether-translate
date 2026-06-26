import { createSignal, onMount, onCleanup, createEffect, createContext, useContext, Accessor } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { LANGUAGE_DETAILS, WELCOME_MESSAGE } from "../constants";
import { ChatMessage } from "../types";

export interface AppContextType {
  // Navigation & Core config state
  currentTab: Accessor<"text" | "file" | "chat">;
  setCurrentTab: (val: "text" | "file" | "chat") => void;
  currentTheme: Accessor<string>;
  setCurrentTheme: (val: string) => void;
  
  ollamaUrl: Accessor<string>;
  setOllamaUrl: (val: string) => void;
  selectedModel: Accessor<string>;
  setSelectedModel: (val: string) => void;
  autoTranslate: Accessor<boolean>;
  setAutoTranslate: (val: boolean) => void;
  ttsVoice: Accessor<string>;
  setTtsVoice: (val: string) => void;
  ttsRate: Accessor<number>;
  setTtsRate: (val: number) => void;
  
  // Connection state
  isConnected: Accessor<"checking" | "connected" | "error">;
  statusMsg: Accessor<string>;
  models: Accessor<string[]>;
  showSettings: Accessor<boolean>;
  setShowSettings: (val: boolean) => void;
  voices: Accessor<SpeechSynthesisVoice[]>;
  
  // Temp settings signals
  tempOllamaUrl: Accessor<string>;
  setTempOllamaUrl: (val: string) => void;
  tempModel: Accessor<string>;
  setTempModel: (val: string) => void;
  tempAuto: Accessor<boolean>;
  setTempAuto: (val: boolean) => void;
  tempTheme: Accessor<string>;
  setTempTheme: (val: string) => void;
  tempVoice: Accessor<string>;
  setTempVoice: (val: string) => void;
  tempRate: Accessor<number>;
  setTempRate: (val: number) => void;
  
  // Language selectors state
  srcLang: Accessor<string>;
  setSrcLang: (val: string) => void;
  tgLang: Accessor<string>;
  setTgLang: (val: string) => void;
  srcCountry: Accessor<string>;
  setSrcCountry: (val: string) => void;
  tgCountry: Accessor<string>;
  setTgCountry: (val: string) => void;
  
  // Text translation pane state
  sourceText: Accessor<string>;
  setSourceText: (val: string) => void;
  targetText: Accessor<string>;
  setTargetText: (val: string) => void;
  isTranslating: Accessor<boolean>;
  copied: Accessor<boolean>;
  
  // File pane state
  activeFilePath: Accessor<string | null>;
  activeFileName: Accessor<string>;
  activeFileSize: Accessor<string>;
  isFileTranslating: Accessor<boolean>;
  isFileFinished: Accessor<boolean>;
  fileProgress: Accessor<number>;
  fileProgressStatus: Accessor<string>;
  fileSrcCharCount: Accessor<number>;
  fileTgCharCount: Accessor<number>;
  fileTranslatedContent: Accessor<string>;
  
  // Chat pane state
  chatInput: Accessor<string>;
  setChatInput: (val: string) => void;
  chatMessages: Accessor<ChatMessage[]>;
  
  // Handlers & Helpers
  checkConnection: () => Promise<void>;
  speakText: (text: string, langCode: string) => void;
  handleCountryChange: (prefix: "src" | "tg", country: string) => void;
  handleLangChange: (prefix: "src" | "tg", lang: string) => void;
  swapLanguages: () => void;
  openSettings: () => void;
  saveSettings: () => Promise<void>;
  handleSourceInput: (e: InputEvent & { currentTarget: HTMLTextAreaElement }) => void;
  manualTranslate: () => void;
  clearSourceText: () => void;
  copyToClipboard: () => void;
  browseFile: () => Promise<void>;
  resetFileState: () => void;
  translateFile: (filePath: string) => Promise<void>;
  saveTranslatedFile: () => Promise<void>;
  sendChatMessage: () => Promise<void>;
  clearChat: () => void;
}

const AppContext = createContext<AppContextType>();

function getTranslationPrompt(srcLangCode: string, tgLangCode: string, text: string) {
  const srcFull = LANGUAGE_DETAILS[srcLangCode]?.full || srcLangCode;
  const tgFull = LANGUAGE_DETAILS[tgLangCode]?.full || tgLangCode;
  return `You are a professional ${srcFull} (${srcLangCode}) to ${tgFull} (${tgLangCode}) translator. Your goal is to accurately convey the meaning and nuances of the original ${srcFull} text while adhering to ${tgFull} grammar, vocabulary, and cultural sensitivities. Produce only the ${tgFull} translation, without any additional explanations or commentary.

Please translate the following ${srcFull} text into ${tgFull}:

${text}`;
}

export function AppProvider(props: { children: any }) {
  // Navigation & Core config state
  const [currentTab, setCurrentTab] = createSignal<"text" | "file" | "chat">("text");
  const [currentTheme, setCurrentTheme] = createSignal(localStorage.getItem("currentTheme") || "cyber");
  
  const [ollamaUrl, setOllamaUrl] = createSignal(localStorage.getItem("ollamaUrl") || "http://localhost:11434");
  const [selectedModel, setSelectedModel] = createSignal(localStorage.getItem("selectedModel") || "translategemma:latest");
  const [autoTranslate, setAutoTranslate] = createSignal(localStorage.getItem("autoTranslate") !== "false");
  const [ttsVoice, setTtsVoice] = createSignal(localStorage.getItem("ttsVoice") || "");
  const [ttsRate, setTtsRate] = createSignal(parseFloat(localStorage.getItem("ttsRate") || "1.0"));
  
  // Connection state
  const [isConnected, setIsConnected] = createSignal<"checking" | "connected" | "error">("checking");
  const [statusMsg, setStatusMsg] = createSignal("正在检测 Ollama...");
  const [models, setModels] = createSignal<string[]>([]);
  const [showSettings, setShowSettings] = createSignal(false);
  const [voices, setVoices] = createSignal<SpeechSynthesisVoice[]>([]);
  
  // Temp settings signals
  const [tempOllamaUrl, setTempOllamaUrl] = createSignal("");
  const [tempModel, setTempModel] = createSignal("");
  const [tempAuto, setTempAuto] = createSignal(true);
  const [tempVoice, setTempVoice] = createSignal("");
  const [tempRate, setTempRate] = createSignal(1.0);
  const [tempTheme, setTempTheme] = createSignal("");
  
  // Language selectors state
  const [srcLang, setSrcLang] = createSignal("en");
  const [tgLang, setTgLang] = createSignal("zh");
  const [srcCountry, setSrcCountry] = createSignal("US");
  const [tgCountry, setTgCountry] = createSignal("CN");
  
  // Text translation pane state
  const [sourceText, setSourceText] = createSignal("");
  const [targetText, setTargetText] = createSignal("");
  const [isTranslating, setIsTranslating] = createSignal(false);
  const [copied, setCopied] = createSignal(false);
  
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // File pane state
  const [activeFilePath, setActiveFilePath] = createSignal<string | null>(null);
  const [activeFileName, setActiveFileName] = createSignal<string>("");
  const [activeFileSize, setActiveFileSize] = createSignal<string>("");
  const [isFileTranslating, setIsFileTranslating] = createSignal(false);
  const [isFileFinished, setIsFileFinished] = createSignal(false);
  const [fileProgress, setFileProgress] = createSignal(0);
  const [fileProgressStatus, setFileProgressStatus] = createSignal("");
  const [fileSrcCharCount, setFileSrcCharCount] = createSignal(0);
  const [fileTgCharCount, setFileTgCharCount] = createSignal(0);
  const [fileTranslatedContent, setFileTranslatedContent] = createSignal("");
  
  // Chat pane state
  const [chatInput, setChatInput] = createSignal("");
  const [chatMessages, setChatMessages] = createSignal<ChatMessage[]>([WELCOME_MESSAGE]);

  // Setup connection checks & models refresh
  async function checkConnection() {
    setIsConnected("checking");
    setStatusMsg("正在连接 Ollama...");
    try {
      const modelList = await invoke<string[]>("get_ollama_models");
      setModels(modelList);
      setIsConnected("connected");
      setStatusMsg(`已连接 | 模型: ${selectedModel()}`);
      if (modelList.length > 0 && !modelList.includes(selectedModel())) {
        setSelectedModel(modelList[0]);
      }
    } catch (error: unknown) {
      setIsConnected("error");
      const errStr = error instanceof Error ? error.message : String(error);
      setStatusMsg(`无法连接到 Ollama 服务: ${errStr}`);
    }
  }

  // Populate TTS voices
  function initSpeechSynthesis() {
    if ("speechSynthesis" in window) {
      const loadVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }

  // TTS speak helper
  function speakText(text: string, langCode: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = ttsRate();
    if (ttsVoice()) {
      const voice = window.speechSynthesis.getVoices().find(v => v.name === ttsVoice());
      if (voice) utterance.voice = voice;
    }
    utterance.lang = langCode;
    window.speechSynthesis.speak(utterance);
  }

  // Setup Tauri v2 drag and drop
  let unlistenDragDrop: (() => void) | undefined;
  async function setupTauriDragDrop() {
    try {
      const webview = getCurrentWebview();
      unlistenDragDrop = await webview.onDragDropEvent((event) => {
        if (event.payload.type === "drop" && currentTab() === "file") {
          const paths = event.payload.paths;
          if (paths && paths.length > 0) {
            const path = paths[0];
            const filename = path.substring(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
            setActiveFilePath(path);
            setActiveFileName(filename);
            setActiveFileSize("本地文档");
            setIsFileFinished(false);
            setFileProgress(0);
          }
        }
      });
    } catch (e) {
      console.error("Failed to setup drag drop listener:", e);
    }
  }

  // Lifecycle
  onMount(() => {
    checkConnection();
    initSpeechSynthesis();
    setupTauriDragDrop();
  });

  onCleanup(() => {
    if (unlistenDragDrop) unlistenDragDrop();
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  // Automatically apply theme class to html root
  createEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-cyber", "theme-gruvbox", "theme-tokyo");
    root.classList.add(`theme-${currentTheme()}`);
  });

  // Country select flags and language select sync
  function handleCountryChange(prefix: "src" | "tg", country: string) {
    const langDetail = Object.values(LANGUAGE_DETAILS).find(d => d.country === country);
    if (langDetail) {
      if (prefix === "src") {
        setSrcCountry(country);
        setSrcLang(langDetail.code);
      } else {
        setTgCountry(country);
        setTgLang(langDetail.code);
      }
      triggerAutoTranslate();
    }
  }

  // Language selector state updates
  function handleLangChange(prefix: "src" | "tg", lang: string) {
    const langDetail = LANGUAGE_DETAILS[lang];
    if (langDetail) {
      if (prefix === "src") {
        setSrcCountry(langDetail.country);
        setSrcLang(lang);
      } else {
        setTgCountry(langDetail.country);
        setTgLang(lang);
      }
      triggerAutoTranslate();
    }
  }

  // Swap language directions
  function swapLanguages() {
    const tempLang = srcLang();
    const tempCountry = srcCountry();
    
    setSrcLang(tgLang());
    setSrcCountry(tgCountry());
    setTgLang(tempLang);
    setTgCountry(tempCountry);
    
    const tempText = sourceText();
    setSourceText(targetText());
    setTargetText(tempText);
    
    triggerAutoTranslate();
  }

  // Open settings
  function openSettings() {
    setTempOllamaUrl(ollamaUrl());
    setTempModel(selectedModel());
    setTempAuto(autoTranslate());
    setTempVoice(ttsVoice());
    setTempRate(ttsRate());
    setTempTheme(currentTheme());
    setShowSettings(true);
  }

  // Save settings
  async function saveSettings() {
    const urlVal = tempOllamaUrl().trim();
    const modelVal = tempModel();
    const autoVal = tempAuto();
    const voiceVal = tempVoice();
    const rateVal = tempRate();
    const themeVal = tempTheme();

    setOllamaUrl(urlVal);
    setSelectedModel(modelVal);
    setAutoTranslate(autoVal);
    setTtsVoice(voiceVal);
    setTtsRate(rateVal);
    setCurrentTheme(themeVal);
    
    localStorage.setItem("ollamaUrl", urlVal);
    localStorage.setItem("selectedModel", modelVal);
    localStorage.setItem("autoTranslate", autoVal.toString());
    localStorage.setItem("ttsVoice", voiceVal);
    localStorage.setItem("ttsRate", rateVal.toString());
    localStorage.setItem("currentTheme", themeVal);
    
    setShowSettings(false);
    // Sync the URL to the Rust backend state (validated server-side).
    try {
      await invoke("set_ollama_url", { url: urlVal });
    } catch (error: unknown) {
      const errStr = error instanceof Error ? error.message : String(error);
      alert(`Ollama URL 无效: ${errStr}`);
      return;
    }
    checkConnection();
  }

  // Text Translation Logic
  async function performTranslation(text: string) {
    if (!text) {
      setTargetText("");
      return;
    }
    
    setIsTranslating(true);
    try {
      const prompt = getTranslationPrompt(srcLang(), tgLang(), text);

      const translation = await invoke<string>("translate_api", {
        model: selectedModel(),
        prompt: prompt
      });
      setTargetText(translation.trim());
    } catch (error: unknown) {
      const errStr = error instanceof Error ? error.message : String(error);
      setTargetText(`翻译失败: ${errStr}`);
    } finally {
      setIsTranslating(false);
    }
  }

  function triggerAutoTranslate() {
    const text = sourceText().trim();
    if (!text) {
      setTargetText("");
      return;
    }
    
    if (!autoTranslate()) return;
    
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
      performTranslation(text);
    }, 800);
  }

  function handleSourceInput(e: InputEvent & { currentTarget: HTMLTextAreaElement }) {
    setSourceText(e.currentTarget.value);
    triggerAutoTranslate();
  }

  function manualTranslate() {
    performTranslation(sourceText().trim());
  }

  // Clear source text
  function clearSourceText() {
    setSourceText("");
    setTargetText("");
  }

  // Copy target translation to clipboard
  function copyToClipboard() {
    const text = targetText();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  // File browse trigger
  async function browseFile() {
    try {
      const path = await invoke<string | null>("select_file");
      if (!path) return; // User cancelled
      const filename = path.substring(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
      setActiveFilePath(path);
      setActiveFileName(filename);
      setActiveFileSize("本地文档");
      setIsFileFinished(false);
      setFileProgress(0);
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      alert("选择文件失败: " + errStr);
    }
  }

  // Reset file states
  function resetFileState() {
    setActiveFilePath(null);
    setActiveFileName("");
    setActiveFileSize("");
    setIsFileTranslating(false);
    setIsFileFinished(false);
    setFileProgress(0);
    setFileProgressStatus("");
    setFileSrcCharCount(0);
    setFileTgCharCount(0);
    setFileTranslatedContent("");
  }

  // Chunked document translator
  async function translateFile(filePath: string) {
    try {
      setIsFileTranslating(true);
      setFileProgress(5);
      setFileProgressStatus("正在解析文件...");
      
      const parsedText = await invoke<string>("parse_file", { path: filePath });
      
      // Paragraph split & boundary check
      const chunks: string[] = [];
      const paragraphs = parsedText.split(/\n\s*\n/).filter(p => p.trim() !== "");
      for (let p of paragraphs) {
        if (p.length > 2000) {
          const sentences = p.split(/(?<=[.!?。！？])\s+/);
          let subChunk = "";
          for (let sentence of sentences) {
            if ((subChunk + sentence).length > 1500) {
              chunks.push(subChunk.trim());
              subChunk = sentence + " ";
            } else {
              subChunk += sentence + " ";
            }
          }
          if (subChunk.trim() !== "") {
            chunks.push(subChunk.trim());
          }
        } else {
          chunks.push(p.trim());
        }
      }
      
      if (chunks.length === 0) {
        alert("文件内容为空");
        resetFileState();
        return;
      }
      
      setFileSrcCharCount(parsedText.length);
      setFileProgressStatus(`准备翻译 ${chunks.length} 个段落...`);
      setFileProgress(10);
      
      const translatedChunks: string[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setFileProgressStatus(`正在翻译第 ${i + 1}/${chunks.length} 段...`);
        const prompt = getTranslationPrompt(srcLang(), tgLang(), chunk);
        
        const translation = await invoke<string>("translate_api", {
          model: selectedModel(),
          prompt: prompt
        });
        translatedChunks.push(translation.trim());
        
        const pct = 10 + Math.round(((i + 1) / chunks.length) * 90);
        setFileProgress(pct);
      }
      
      const finalTranslation = translatedChunks.join("\n\n");
      setFileTranslatedContent(finalTranslation);
      setFileTgCharCount(finalTranslation.length);
      setFileProgressStatus("翻译完成！");
      setIsFileFinished(true);
    } catch (error: unknown) {
      const errStr = error instanceof Error ? error.message : String(error);
      alert("文件解析或翻译失败: " + errStr);
      resetFileState();
    } finally {
      setIsFileTranslating(false);
    }
  }

  // Save document dialog
  async function saveTranslatedFile() {
    const originalName = activeFileName();
    const extIndex = originalName.lastIndexOf(".");
    const baseName = extIndex !== -1 ? originalName.substring(0, extIndex) : originalName;
    const extName = extIndex !== -1 ? originalName.substring(extIndex) : ".txt";
    const defaultSaveName = `translated_${baseName}${extName}`;
    
    try {
      const savePath = await invoke<string | null>("save_file_dialog", { defaultName: defaultSaveName });
      if (!savePath) return; // User cancelled
      await invoke<void>("write_file", { path: savePath, content: fileTranslatedContent() });
      alert("文件保存成功！");
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      alert("文件保存失败: " + errStr);
    }
  }

  // Chat/Dialogue Translation Assistant logic
  async function sendChatMessage() {
    const text = chatInput().trim();
    if (!text) return;
    
    setChatInput("");
    
    // Add user message bubble
    const userMsgId = `user-${crypto.randomUUID()}`;
    setChatMessages(prev => [...prev, { id: userMsgId, role: "user", content: text }]);
    
    // Add assistant bubble with scanning state
    const botMsgId = `bot-${crypto.randomUUID()}`;
    setChatMessages(prev => [...prev, { id: botMsgId, role: "assistant", content: "", isTranslating: true }]);
    
    try {
      const contextMessages = chatMessages()
        .filter(m => m.id !== "welcome" && m.id !== botMsgId)
        .map(m => ({
          role: m.role,
          content: m.content
        }));
        
      const srcFull = LANGUAGE_DETAILS[srcLang()].full;
      const tgFull = LANGUAGE_DETAILS[tgLang()].full;
      
      const systemPrompt = `You are a helpful translation assistant and conversation partner. The user wants to practice their language skills or translate dialogue.
The user's native language is ${srcFull} (${srcLang()}) and they want to communicate and practice in ${tgFull} (${tgLang()}).

Please converse with the user under these rules:
1. Always respond to the user's message in ${tgFull}. Keep your responses natural, engaging, and relatively concise (1-3 sentences) to maintain a friendly conversation.
2. Immediately below your response, provide the exact translation of your response in ${srcFull}, separated by a line containing exactly "---".
3. If the user asks a direct translation or grammar question, explain it briefly in ${srcFull} and provide examples.

Example format:
[Your response in ${tgFull}]
---
[Your translation in ${srcFull}]`;

      const fullMessages = [
        { role: "system", content: systemPrompt },
        ...contextMessages
      ];
      
      const response = await invoke<string>("chat_api", {
        model: selectedModel(),
        messages: fullMessages
      });
      
      setChatMessages(prev => prev.map(m => {
        if (m.id === botMsgId) {
          return { id: botMsgId, role: "assistant", content: response, isTranslating: false };
        }
        return m;
      }));
    } catch (error: unknown) {
      const errStr = error instanceof Error ? error.message : String(error);
      setChatMessages(prev => prev.map(m => {
        if (m.id === botMsgId) {
          return { id: botMsgId, role: "assistant", content: "抱歉，对话服务出错了。\n" + errStr, isTranslating: false };
        }
        return m;
      }));
    }
  }

  function clearChat() {
    setChatMessages([WELCOME_MESSAGE]);
  }

  const contextValue: AppContextType = {
    currentTab,
    setCurrentTab,
    currentTheme,
    setCurrentTheme,
    ollamaUrl,
    setOllamaUrl,
    selectedModel,
    setSelectedModel,
    autoTranslate,
    setAutoTranslate,
    ttsVoice,
    setTtsVoice,
    ttsRate,
    setTtsRate,
    isConnected,
    statusMsg,
    models,
    showSettings,
    setShowSettings,
    voices,
    tempOllamaUrl,
    setTempOllamaUrl,
    tempModel,
    setTempModel,
    tempAuto,
    setTempAuto,
    tempTheme,
    setTempTheme,
    tempVoice,
    setTempVoice,
    tempRate,
    setTempRate,
    srcLang,
    setSrcLang,
    tgLang,
    setTgLang,
    srcCountry,
    setSrcCountry,
    tgCountry,
    setTgCountry,
    sourceText,
    setSourceText,
    targetText,
    setTargetText,
    isTranslating,
    copied,
    activeFilePath,
    activeFileName,
    activeFileSize,
    isFileTranslating,
    isFileFinished,
    fileProgress,
    fileProgressStatus,
    fileSrcCharCount,
    fileTgCharCount,
    fileTranslatedContent,
    chatInput,
    setChatInput,
    chatMessages,
    checkConnection,
    speakText,
    handleCountryChange,
    handleLangChange,
    swapLanguages,
    openSettings,
    saveSettings,
    handleSourceInput,
    manualTranslate,
    clearSourceText,
    copyToClipboard,
    browseFile,
    resetFileState,
    translateFile,
    saveTranslatedFile,
    sendChatMessage,
    clearChat
  };

  return (
    <AppContext.Provider value={contextValue}>
      {props.children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
