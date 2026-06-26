import { For, Show, createEffect } from "solid-js";
import { LANGUAGE_DETAILS } from "../../constants";
import { useApp } from "../../context/AppContext";

export function ChatPane() {
  const {
    tgLang,
    chatMessages,
    chatInput,
    setChatInput,
    sendChatMessage,
    clearChat,
    speakText
  } = useApp();

  let chatHistoryDiv: HTMLDivElement | undefined;

  // Automatically scroll chat history when new messages arrive
  createEffect(() => {
    // track length changes to run effect when messages are updated
    chatMessages().length;
    if (chatHistoryDiv) {
      setTimeout(() => {
        if (chatHistoryDiv) {
          chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
        }
      }, 50);
    }
  });

  function parseAssistantMessage(rawContent: string) {
    const parts = rawContent.split("---");
    if (parts.length >= 2) {
      return {
        main: parts[0].trim(),
        trans: parts.slice(1).join("---").trim()
      };
    }
    return {
      main: rawContent.trim(),
      trans: undefined
    };
  }

  return (
    <div class="tab-pane active" id="tab-content-chat">
      <div class="chat-workspace">
        <div class="glass-card chat-card">
          <div class="card-header">
            <span class="card-title-pill">对话学习流 ({LANGUAGE_DETAILS[tgLang()]?.name || tgLang()})</span>
          </div>
          
          <div class="chat-history" ref={chatHistoryDiv}>
            <For each={chatMessages()}>
              {(msg) => {
                const isBot = msg.role === "assistant";
                const parsed = isBot ? parseAssistantMessage(msg.content) : { main: msg.content, trans: undefined };
                return (
                  <div class={`chat-msg-row ${isBot ? "bot" : "user"}`}>
                    <Show when={isBot}>
                      <div class="avatar">译</div>
                    </Show>
                    <div class="msg-bubble">
                      <div class="msg-orig pre-formatted">{parsed.main}</div>
                      <Show when={parsed.trans}>
                        <div class="msg-trans">{parsed.trans}</div>
                      </Show>
                      <Show when={isBot && !msg.isTranslating && msg.id !== "welcome"}>
                        <div class="msg-actions">
                          <button
                            class="msg-btn"
                            title="朗读"
                            onClick={() => speakText(parsed.main, tgLang())}
                          >
                            <span class="material-symbols-outlined icon mini-icon">volume_up</span>
                          </button>
                        </div>
                      </Show>
                      <Show when={msg.isTranslating}>
                        <div class="msg-trans">正在思考并进行口语回复与双语对照翻译...</div>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>

          {/* Bottom dialog chat inputs wrapper */}
          <div class="chat-input-wrapper">
            <div class="chat-input-bar">
              <input
                type="text"
                id="chat-user-input"
                placeholder={`用 ${LANGUAGE_DETAILS[tgLang()]?.name || tgLang()} 消息在这里和我交流...`}
                value={chatInput()}
                onInput={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
              />
              <button id="chat-user-send" title="发送消息" onClick={sendChatMessage}>
                <span class="material-symbols-outlined icon">send</span>
              </button>
            </div>
            <button id="clear-chat-btn" class="chat-clear-btn" title="清空会话" onClick={clearChat}>
              <span class="material-symbols-outlined icon">delete_sweep</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
