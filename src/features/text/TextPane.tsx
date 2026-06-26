import { Show } from "solid-js";
import { LANGUAGE_DETAILS } from "../../constants";
import { useApp } from "../../context/AppContext";

export function TextPane() {
  const {
    srcLang,
    tgLang,
    sourceText,
    targetText,
    isTranslating,
    copied,
    handleSourceInput,
    clearSourceText,
    copyToClipboard,
    speakText
  } = useApp();

  return (
    <div class="tab-pane active" id="tab-content-text">
      <div class="premium-split-view">
        {/* Source Input Glass Card */}
        <div class="glass-card src-card">
          <div class="card-header">
            <span class="card-title-pill">源文本 ({LANGUAGE_DETAILS[srcLang()]?.name || srcLang()})</span>
          </div>
          <textarea
            id="source-textarea"
            placeholder="在此输入需要翻译的文本，系统将在您停止输入后自动触发翻译..."
            value={sourceText()}
            onInput={handleSourceInput}
            spellcheck={false}
          ></textarea>
          <div class="card-footer">
            <button id="clear-text-btn" class="card-action-btn danger-hover" title="清空输入" onClick={clearSourceText}>
              <span class="material-symbols-outlined mini-icon">delete</span>
              <span>清空</span>
            </button>
            <div class="char-counter">
              <span>{sourceText().length}</span> 字符
            </div>
          </div>
        </div>

        {/* Target Output Glass Card */}
        <div class="glass-card tg-card">
          <div class="card-header">
            <span class="card-title-pill">译文结果 ({LANGUAGE_DETAILS[tgLang()]?.name || tgLang()})</span>
          </div>
          <div class="textarea-wrapper">
            <textarea
              id="target-textarea"
              placeholder="等待翻译输入..."
              value={targetText()}
              readonly
              spellcheck={false}
            ></textarea>
            
            {/* Glowing spinner overlay */}
            <Show when={isTranslating()}>
              <div class="translation-loader" id="translation-loader">
                <div class="glowing-spinner"></div>
                <p>灵境协同翻译中...</p>
              </div>
            </Show>
          </div>
          <div class="card-footer">
            <div class="left-actions">
              <button id="copy-btn" class="card-action-btn accent-hover" title="复制结果" onClick={copyToClipboard}>
                <span class="material-symbols-outlined mini-icon">
                  {copied() ? "check" : "content_copy"}
                </span>
                <span>{copied() ? "已复制" : "复制"}</span>
              </button>
              <button id="speak-btn" class="card-action-btn accent-hover" title="语音朗读" onClick={() => speakText(targetText(), tgLang())}>
                <span class="material-symbols-outlined mini-icon">volume_up</span>
                <span>朗读</span>
              </button>
            </div>
            <div class="char-counter">
              <span>{targetText().length}</span> 字符
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
