# 🚀 AetherTranslate 灵境翻译 - 实习生开发与学习指南

你好，欢迎加入 AetherTranslate 开发团队！这篇文档将作为你的新手指南，从零开始、一步步带你认识、启动和开发这个高性能的本地离线智能翻译终端。

本应用采用了现代桌面的高性能黄金组合：**Tauri + SolidJS (Vite + TypeScript) + Rust**，底层依赖本地大模型运行时 **Ollama**。

---

## 🎯 1. 认识我们的项目 (AetherTranslate)

在传统开发中，翻译网页通常要对接云端翻译 API（如 Google, DeepL）。但这有两个致命缺点：**要花钱** 且 **有隐私泄露风险**。
**AetherTranslate（灵境翻译）** 的核心定位是：**完全本地化、隐私安全、高性能、高颜值的离线大模型翻译终端**。

### 技术栈构成：
1. **本地 AI 大模型**：通过 Ollama 驱动轻量且强大的 `translategemma:latest` 模型。
2. **Rust 后端 (Tauri)**：负责调起系统原生文件管理器、解压解析 Word 文档、代理大模型 HTTP 请求（绕过浏览器跨域 CORS 拦截）。
3. **TypeScript 前端 (SolidJS)**：极其轻量、无虚拟 DOM 的超快响应式框架。用于渲染太空暗黑风（Cyber Space）的磨砂玻璃（Glassmorphism）翻译控制面板。

---

## 💻 2. 准备开发环境

在开始写代码前，我们需要在你的 Mac 上准备好开发工具链：

### 第一步：安装 Node.js (前端环境)
* 推荐安装 Node.js LTS 版本。安装完成后在终端验证：
  ```bash
  node -v
  npm -v
  ```

### 第二步：安装 Rust 编译环境
* Tauri 的后端是 Rust，我们需要使用 `rustup` 来安装 Rust 编译器：
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```
  安装完成后，重新打开终端验证：
  ```bash
  rustc --version
  cargo --version
  ```

### 第三步：安装并配置 Ollama (本地 AI)
1. 前往 [Ollama 官网](https://ollama.com) 下载并安装 macOS 客户端。
2. 打开 Mac 终端，把我们专用的翻译模型拉取到本地（这需要几分钟）：
   ```bash
   ollama pull translategemma:latest
   ```
3. 测试模型是否可用。在终端中输入：
   ```bash
   ollama run translategemma:latest "Hello, how are you?"
   ```
   如果模型正常回复，说明本地 AI 已经就绪！

---

## 📂 3. 核心源码结构导读

项目结构分为两个核心部分：**`src-tauri` (Rust 后端)** 和 **`src` (SolidJS 前端)**。

### 🦀 Rust 后端核心 (以 Rust 为桥梁)
打开 [src-tauri/Cargo.toml](file:///Users/alex/workspace/translator/src-tauri/Cargo.toml)，你会发现我们引入了以下关键依赖：
* `reqwest`：用于在 Rust 里发起对本地 Ollama 的 HTTP 请求。
* `zip`：把 `.docx` (Word 文档) 视为 zip 包进行解压，用于抓取里面的 XML 文本。
* `rfd` (Rusty File Dialog)：用于拉起 macOS 原生的“打开文件”和“保存文件”弹窗。

打开 [src-tauri/src/lib.rs](file:///Users/alex/workspace/translator/src-tauri/src/lib.rs)，这是后端的控制中心。里面定义了可以被前端调用的指令（Commands）：
* `get_ollama_models`：查询本地 Ollama 服务是否在线，并获取本地已下载的模型列表。
* `translate_api` 和 `chat_api`：将前端拼接好的 Prompt 传给本地大模型，并返回推导结果。
* `parse_file`：**核心考点！** 实习生请注意，Word 文档 (`.docx`) 本质上是一个压缩包。我们用 `zip` 库打开它，定位并读取内部的 `word/document.xml`，然后用一个极简的高性能字符扫描器过滤出所有 `<w:t>`（文本）标签的内容，再把 `</w:p>` 标签转化为换行符 `\n`。这比引入庞大的第三方解析库快上百倍，且不需要互联网。
* `select_file` 和 `save_file_dialog`：利用 `rfd` 直接调起系统级的沙盒文件管理器，返回绝对文件路径给前端。
* `write_file`：负责将翻译好的文档写入用户选择的本地路径。

### ⚛️ SolidJS 前端核心 (极致的高性能响应)
打开 [src/App.tsx](file:///Users/alex/workspace/translator/src/App.tsx)，这是我们前端唯一的控制核心：
1. **数据流动信号 (Signals)**：
   SolidJS 的 `createSignal` 用于创建响应式状态。例如 `const [sourceText, setSourceText] = createSignal("")`。当它的值改变时，只有绑定它的特定 DOM 节点会更新，不会触发整页的虚拟 DOM 重新计算，因此性能极高。
2. **防抖翻译 (Debounce)**：
   ```typescript
   function triggerAutoTranslate() {
     // 限制键盘输入流：每次按键清除旧计时器，停止打字 800ms 后才触发大模型推导，防止频繁请求卡死 Ollama。
     if (debounceTimer) clearTimeout(debounceTimer);
     debounceTimer = setTimeout(() => performTranslation(sourceText()), 800);
   }
   ```
3. **AI 对话上下文与 Prompt 工程**：
   在“助手对话”中，我们设置了系统级角色（System Prompt），规定模型回复必须使用 **目标语言（例如英语）** 回答，并通过 `---` 划一条分界线，在下方附带其翻译好的 **源语言译文**。前端利用 JS 的 `.split("---")` 对回复进行切分，在界面上渲染出双语对比的气泡。

### 🎨 Cyberpunk 玻璃拟态设计
打开 [src/App.css](file:///Users/alex/workspace/translator/src/App.css)：
* 全局使用了太空暗黑底色 (`--bg-dark`)。
* 浮动着三个呼吸动画的环境光晕球 (`.bg-glow`)。
* 窗口面板使用了毛玻璃质感：
  ```css
  background: rgba(14, 14, 23, 0.5);
  backdrop-filter: blur(35px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  ```

---

## 🚀 4. 运行与调试

准备好代码和环境后，现在我们把应用跑起来：

### 1. 安装项目前端依赖
在项目根目录 `/Users/alex/workspace/translator` 执行：
```bash
npm install
```

### 2. 启动 Tauri 开发环境
执行以下命令调起桌面客户端：
```bash
npm run tauri dev
```
Tauri 会自动开启 Vite 前端热更新服务，并在后台使用 Cargo 编译 Rust 源码。初次构建 Rust 代码会下载依赖，稍微需要一点时间，后续的热编译会在几秒内完成。

### 3. 如何调试？
* **前端调试**：在调起的桌面应用窗口内，**右键选择“检查元素” (Inspect Element)**，就会调出和 Chrome/Safari 一模一样的开发者工具控制台。你可以在里面看 Console 报错、调试样式、监控网络请求。
* **后端调试**：Rust 端的 `println!` 打印信息会直接输出在你运行 `npm run tauri dev` 的终端里。

---

## 💡 5. 实习生需要思考的 3 个技术关键点 (面试常问)

在看代码时，请带上这三个问题，并在脑海中理清它们的解决原理：

1. **为什么我们不在 JS 前端直接请求 `http://localhost:11434` (Ollama)？**
   * *答：* 浏览器的同源策略会限制跨域请求 (CORS)。而把请求移交给 Rust 后端发起，Rust 作为本地客户端不受浏览器的 CORS 安全拦截约束。
2. **为什么我们不使用传统的 HTML `<input type="file">` 来获取文件的绝对路径？**
   * *答：* 出于安全隐私考虑，现代浏览器引擎（包括 WebView）在 File 对象里去除了真实的本地绝对路径（只会显示 `C:\fakepath\...` 或只允许读取 binary 数据）。而我们的 Rust 翻译引擎必须得到绝对路径才能高效处理分段，所以采用 Rust 的 `rfd` 弹窗是一个极其安全、绕过沙盒限制的标准做法。
3. **如果拖入的文件特别大（比如 5 万字），大模型会发生什么？我们是怎么解决的？**
   * *答：* 大模型有上下文 Token 长度限制，一次性把 5 万字塞入 Prompt 会导致模型直接溢出或拒绝服务。我们在 [src/App.tsx](file:///Users/alex/workspace/translator/src/App.tsx#L327) 中编写了分段翻译逻辑——优先以段落换行和标点符号将长文切分成每个低于 1500 字的子 Chunk，串行或流式发送给大模型，最后在前端合并拼接。这样既保证了进度条的平滑变化，又保证了大模型的稳定推导。

祝你开发愉快！如果遇到任何 Rust 编译或者 CSS 渲染的问题，随时在群里呼叫导师。
