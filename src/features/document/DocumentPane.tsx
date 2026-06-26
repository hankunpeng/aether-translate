import { Show } from "solid-js";
import { useApp } from "../../context/AppContext";

export function DocumentPane() {
  const {
    activeFilePath,
    activeFileName,
    activeFileSize,
    isFileTranslating,
    isFileFinished,
    fileProgress,
    fileProgressStatus,
    fileSrcCharCount,
    fileTgCharCount,
    browseFile,
    resetFileState,
    translateFile,
    saveTranslatedFile
  } = useApp();

  return (
    <div class="tab-pane active" id="tab-content-file">
      <div class="file-workspace">
        
        {/* Dropzone selection box */}
        <Show when={!activeFilePath()}>
          <div class="dropzone-outer">
            <div class="dropzone" id="dropzone" onClick={browseFile}>
              <div class="dropzone-content">
                <div class="glow-upload-ring">
                  <span class="material-symbols-outlined upload-icon">cloud_upload</span>
                </div>
                <h3>拖入需要解析的文档</h3>
                <p>点击选择或将文件拖入此区域</p>
                <span class="file-spec-hint">支持 TXT, MD, DOCX (大小限 10MB 内)</span>
              </div>
            </div>
          </div>
        </Show>

        {/* Uploaded File details card */}
        <Show when={activeFilePath()}>
          <div class="file-status-glass-card" id="file-status-card">
            <div class="file-card-header">
              <div class="file-icon-wrapper">
                <span class="material-symbols-outlined file-icon">description</span>
              </div>
              <div class="file-info-text">
                <div class="file-name" id="file-name">{activeFileName()}</div>
                <div class="file-size" id="file-size">{activeFileSize()}</div>
              </div>
              <button id="remove-file-btn" class="close-card-btn" title="移去文件" onClick={resetFileState}>
                &times;
              </button>
            </div>
            
            <Show when={!isFileTranslating() && !isFileFinished()}>
              <div class="file-action-trigger">
                <button id="start-file-trans-btn" class="premium-button" onClick={() => translateFile(activeFilePath()!)}>
                  <span>智能解析并翻译文档</span>
                </button>
              </div>
            </Show>
            
            <Show when={isFileTranslating() || isFileFinished()}>
              <div class="glowing-progress-container" id="progress-container">
                <div class="progress-info-row">
                  <span id="progress-status">{fileProgressStatus()}</span>
                  <span id="progress-percent">{fileProgress()}%</span>
                </div>
                <div class="glow-progress-track">
                  <div class="glow-progress-fill" id="progress-bar-fill" style={{ width: `${fileProgress()}%` }}>
                    <div class="laser-light"></div>
                  </div>
                </div>
              </div>
            </Show>
            
            <Show when={isFileFinished()}>
              <div class="file-result-container" id="file-result-section">
                <div class="glow-divider"></div>
                <h4>文档解析并翻译成功</h4>
                <p class="stats-label">原文: {fileSrcCharCount()} 字符 | 译文: {fileTgCharCount()} 字符</p>
                <button id="download-file-btn" class="premium-button success-variant" onClick={saveTranslatedFile}>
                  <span class="material-symbols-outlined icon btn-icon">download</span>
                  <span>立即保存/导出译文文档</span>
                </button>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}
