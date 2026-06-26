import { For, Show } from "solid-js";
import { useApp } from "../../context/AppContext";

export function ControlCenter() {
  const {
    showSettings,
    setShowSettings,
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
    models,
    voices,
    checkConnection,
    saveSettings
  } = useApp();

  return (
    <Show when={showSettings()}>
      <div class="modal-overlay active" id="settings-modal" onClick={(e) => (e.target as HTMLElement).id === "settings-modal" && setShowSettings(false)}>
        <div class="settings-glass-card">
          <div class="modal-header">
            <h3>控制中心</h3>
            <button class="btn-close" id="settings-close-btn" onClick={() => setShowSettings(false)}>&times;</button>
          </div>
          <div class="modal-body">
            <div class="settings-group">
              <label for="settings-ollama-url">OLLAMA 服务终端 URL</label>
              <input
                type="text"
                id="settings-ollama-url"
                value={tempOllamaUrl()}
                onInput={(e) => setTempOllamaUrl(e.target.value)}
              />
            </div>

            <div class="settings-group">
              <label for="settings-model-select">挂载推理模型</label>
              <div class="flex-input-row">
                <select
                  id="settings-model-select"
                  value={tempModel()}
                  onChange={(e) => setTempModel(e.currentTarget.value)}
                >
                  <For each={models()}>
                    {(model) => <option value={model}>{model}</option>}
                  </For>
                </select>
                <button id="settings-model-refresh" class="pill-border-btn" onClick={checkConnection}>刷新节点</button>
              </div>
            </div>

            <div class="settings-group checkbox-row">
              <input
                type="checkbox"
                id="settings-auto-translate"
                checked={tempAuto()}
                onChange={(e) => setTempAuto(e.currentTarget.checked)}
              />
              <label for="settings-auto-translate">自动翻译</label>
            </div>

            <div class="settings-group">
              <label for="settings-theme-select">界面主题风格 (Theme)</label>
              <select
                id="settings-theme-select"
                value={tempTheme()}
                onChange={(e) => setTempTheme(e.currentTarget.value)}
              >
                <option value="cyber">赛博毛玻璃 (默认)</option>
                <option value="gruvbox">复古温暖 (Gruvbox Material)</option>
                <option value="tokyo">东京之夜 (Tokyo Night)</option>
              </select>
            </div>

            <div class="settings-group">
              <label for="settings-tts-voice">合成语音节点 (TTS 引擎)</label>
              <select
                id="settings-tts-voice"
                value={tempVoice()}
                onChange={(e) => setTempVoice(e.currentTarget.value)}
              >
                <option value="">系统缺省发音器</option>
                <For each={voices()}>
                  {(v) => <option value={v.name}>{v.name} ({v.lang})</option>}
                </For>
              </select>
            </div>

            <div class="settings-group">
              <div class="label-info-row">
                <label>语音发音速率</label>
                <span id="tts-rate-val">{tempRate().toFixed(1)}x</span>
              </div>
              <input
                type="range"
                id="settings-tts-rate"
                min="0.5"
                max="2"
                step="0.1"
                value={tempRate()}
                onInput={(e) => setTempRate(parseFloat(e.currentTarget.value))}
              />
            </div>
          </div>
          <div class="modal-footer">
            <button id="settings-save-btn" class="premium-button save-action" onClick={saveSettings}>
              <span>保存配置</span>
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
