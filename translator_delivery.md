# AetherTranslate 灵境翻译 - 桌面智能翻译终端 (v2.0) 交付文档

为了追求极致的高性能、安全离线特性以及未来太空暗黑美学，我们已成功将项目架构升级至**方案 A (Tauri + SolidJS + Rust)**。这实现了全本地离线运行、免除跨域限制 (CORS) 以及直接访问系统原生 API 的能力。

---

## 🎨 视觉设计与体验升级 (UX/UI)

1. **Cyber Space 太空暗黑环境**：
   * 采用深邃的太空暗色背景，底置三个具有缓慢漂移与呼吸伸缩效果的霓虹高斯模糊光晕球（青、紫、红三色）。
2. **Glassmorphism 玻璃拟态卡片**：
   * 所有文本区与操作卡片均采用高模糊度的磨砂玻璃样式（`backdrop-filter: blur(35px)`），配以极细的半透明边框与深色渐变阴影。
3. **大字号与微交互**：
   * 输入/译文文本框的字号增大至 `18px`，聊天气泡字号增大至 `15.5px`，以提高视觉舒适度。
   * 语言切换（Swap）按钮修改为**水平左右箭头**（`swap_horiz`），且具备平滑的旋转微动画。
4. **激光扫描进度条**：
   * 翻译长文档时，高保真进度条内置了横向反复扫射的激光光柱动画。
5. **极简无边框设计**：
   * 移除了顶部模拟 macOS 的灰色标题栏，使独立页面更为集成。

---

## 📂 项目核心文件布局

应用已完全迁移到新的高性能技术栈，文件布局如下：

* **前端基础**：
  * [index.html](file:///Users/alex/workspace/translator/index.html): 加载了 Google 字体 (`Outfit` 与 `Inter`)，并作为 SolidJS 的渲染容器。
  * [src/index.tsx](file:///Users/alex/workspace/translator/src/index.tsx): 挂载并实例化前端组件。
  * [src/App.tsx](file:///Users/alex/workspace/translator/src/App.tsx): **SolidJS 核心交互组件**，包含防抖文本翻译、文件拖拽与浏览、AI 翻译练习会话等响应式逻辑。
  * [src/App.css](file:///Users/alex/workspace/translator/src/App.css): **Aether 霓虹暗黑主题样式表**。
* **Rust 后端 (Tauri)**：
  * [src-tauri/Cargo.toml](file:///Users/alex/workspace/translator/src-tauri/Cargo.toml): 引入了 `reqwest` (与 Ollama 进程进行本地 HTTP 交互)、`zip` (解压 docx 提取 XML) 和 `rfd` (原生系统文件打开与保存对话框)。
  * [src-tauri/src/lib.rs](file:///Users/alex/workspace/translator/src-tauri/src/lib.rs): **Rust 核心指令控制器**。定义了 `get_ollama_models`、`translate_api`、`chat_api`、`parse_file`、`write_file`、`select_file` 和 `save_file_dialog` 接口。
  * [src-tauri/capabilities/default.json](file:///Users/alex/workspace/translator/src-tauri/capabilities/default.json): 声明 Tauri 窗口的核心安全权限。

---

## ✨ 核心功能与离线运行逻辑

### 1. 离线文本翻译
* **自动防抖翻译**：输入停止 **800ms** 后自动触发翻译。
* **语言同步选择**：支持 7 国语言。点击国旗/国家与语言选择器时自动进行双向同步更改。
* **完全离线 TTS 朗读**：利用 Web Speech API `speechSynthesis` 直接驱动 macOS 系统本地语音包（如 Tingting、Samantha），不需要任何网络请求。可在控制中心调整发音速率与声线。

### 2. 本地文件解析与导出
* **安全文件选择**：抛弃了容易暴露隐私路径的 HTML File Input 方案，改用 Rust 原生 `select_file` 命令调起系统级文件浏览器。
* **文件拖拽 (Drag & Drop)**：整合了 Tauri v2 WebView 的拖放事件，用户直接拖入文档即可瞬间识别并解析其内部文字。
* **分段式翻译保障**：自动以换行及标点切分大篇幅文章，流式推导，避免 Ollama 大模型发生上下文溢出。
* **一键导出保存**：翻译成功后，可通过 Rust 调用原生保存对话框并使用 `write_file` 写入系统，安全可靠。

### 3. AI 对话翻译练习助手
* **对话提示词工程**：大模型被限制以目标语言（如英语）回答，并在底部通过 `---` 分割线给出对应的源语言（如中文）译文，方便口语学习。
* **极简终端气泡**：助手头像为微光渐变的 **“译”** 字徽章，并具有独立的“朗读”按键。

---

## 🚀 启动翻译终端

如需拉起或在开发状态下运行 AetherTranslate，请在 `/Users/alex/workspace/translator` 运行：

```bash
# 启动 Tauri 桌面客户端调试环境
npm run tauri dev
```

该命令将自动构建 Rust 目标程序、编译 SolidJS 前端资源并拉起本地桌面窗口进行翻译与交互。
