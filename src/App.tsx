import { AppProvider, useApp } from "./context/AppContext";
import { For, Show } from "solid-js";
import { LANGUAGE_DETAILS } from "./constants";
import "./App.css";

import { TextPane } from "./features/text/TextPane";
import { DocumentPane } from "./features/document/DocumentPane";
import { ChatPane } from "./features/chat/ChatPane";
import { ControlCenter } from "./features/settings/ControlCenter";

function MainApp() {
  const {
    currentTab,
    setCurrentTab,
    srcLang,
    tgLang,
    srcCountry,
    tgCountry,
    handleCountryChange,
    handleLangChange,
    swapLanguages,
    openSettings,
    autoTranslate,
    manualTranslate,
    isConnected,
    statusMsg,
    checkConnection
  } = useApp();

  return (
    <div class="app-root-container">
      {/* Background Decorative Glowing Blobs */}
      <div class="bg-glow spot-1"></div>
      <div class="bg-glow spot-2"></div>
      <div class="bg-glow spot-3"></div>

      {/* Main Glass Panel */}
      <div class={`window-container ${currentTab() === "chat" ? "chat-mode-active" : ""}`}>
        
        {/* Header navigation bar */}
        <header class="app-header">
          <div class="header-left">
            {/* Navigation Capsulated tabs */}
            <nav class="navigation-tabs">
              <button
                class={`tab-btn ${currentTab() === "text" ? "active" : ""}`}
                onClick={() => setCurrentTab("text")}
              >
                <span class="material-symbols-outlined tab-icon">translate</span>
                文本
              </button>
              <button
                class={`tab-btn ${currentTab() === "file" ? "active" : ""}`}
                onClick={() => setCurrentTab("file")}
              >
                <span class="material-symbols-outlined tab-icon">upload_file</span>
                文档
              </button>
              <button
                class={`tab-btn ${currentTab() === "chat" ? "active" : ""}`}
                onClick={() => setCurrentTab("chat")}
              >
                <span class="material-symbols-outlined tab-icon">forum</span>
                对话
              </button>
            </nav>
          </div>

          {/* Action pills & options */}
          <div class="header-actions">
            <div class="lang-selector-group">
              <div class="lang-pill">
                <select
                  id="src-country-select"
                  class="dropdown country-select"
                  value={srcCountry()}
                  onChange={(e) => handleCountryChange("src", e.currentTarget.value)}
                >
                  <For each={Object.values(LANGUAGE_DETAILS)}>
                    {(lang) => (
                      <option value={lang.country}>
                        {lang.flag} {lang.countryName}
                      </option>
                    )}
                  </For>
                </select>
                <select
                  id="src-lang-select"
                  class="dropdown lang-select"
                  value={srcLang()}
                  onChange={(e) => handleLangChange("src", e.currentTarget.value)}
                >
                  <For each={Object.values(LANGUAGE_DETAILS)}>
                    {(lang) => (
                      <option value={lang.code}>
                        {lang.name}
                      </option>
                    )}
                  </For>
                </select>
              </div>

              {/* Horizontal arrows as requested */}
              <button id="swap-lang-btn" class="swap-circle-btn" title="互换语言" onClick={swapLanguages}>
                <span class="material-symbols-outlined icon">swap_horiz</span>
              </button>

              <div class="lang-pill">
                <select
                  id="tg-country-select"
                  class="dropdown country-select"
                  value={tgCountry()}
                  onChange={(e) => handleCountryChange("tg", e.currentTarget.value)}
                >
                  <For each={Object.values(LANGUAGE_DETAILS)}>
                    {(lang) => (
                      <option value={lang.country}>
                        {lang.flag} {lang.countryName}
                      </option>
                    )}
                  </For>
                </select>
                <select
                  id="tg-lang-select"
                  class="dropdown lang-select"
                  value={tgLang()}
                  onChange={(e) => handleLangChange("tg", e.currentTarget.value)}
                >
                  <For each={Object.values(LANGUAGE_DETAILS)}>
                    {(lang) => (
                      <option value={lang.code}>
                        {lang.name}
                      </option>
                    )}
                  </For>
                </select>
              </div>
            </div>

            <Show when={currentTab() === "text" && !autoTranslate()}>
              <button id="translate-btn" class="glow-action-btn" title="立即翻译" onClick={manualTranslate}>
                <span>翻译</span>
              </button>
            </Show>
          </div>
          
          <button id="settings-btn" class="glass-gear-btn" title="配置中心" onClick={openSettings}>
            <span class="material-symbols-outlined icon">settings</span>
          </button>
        </header>

        {/* Core Workspace Panes */}
        <main class="workspace-area">
          <Show when={currentTab() === "text"}>
            <TextPane />
          </Show>

          <Show when={currentTab() === "file"}>
            <DocumentPane />
          </Show>

          <Show when={currentTab() === "chat"}>
            <ChatPane />
          </Show>
        </main>

        {/* Bottom Status bar indicators */}
        <footer class="app-status-bar">
          <div class="status-indicator">
            <span class={`status-pulse-dot ${isConnected() === "connected" ? "green" : isConnected() === "checking" ? "yellow" : "red"}`} id="status-dot"></span>
            <span id="status-text">{isConnected() === "connected" ? "就绪" : isConnected() === "checking" ? "连接中" : "离线"}</span>
            <span class="bar-divider">|</span>
            <span id="status-model-name">{statusMsg()}</span>
          </div>
          <div class="status-control">
            <button id="refresh-status-btn" class="status-refresh-btn" title="重新连接 Ollama" onClick={checkConnection}>
              <span class="material-symbols-outlined icon">refresh</span>
            </button>
          </div>
        </footer>
      </div>

      <ControlCenter />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

export default App;
