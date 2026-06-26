use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Read;
use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;

/// Managed state holding the validated Ollama base URL and a shared HTTP
/// client with proper timeouts.
pub struct OllamaState {
    base_url: Mutex<String>,
    client: reqwest::Client,
}

/// Validates that `url` uses http or https and targets localhost only.
/// Returns the cleaned URL (trailing slash stripped) on success.
fn validate_ollama_url(url: &str) -> Result<String, String> {
    let url = url.trim().trim_end_matches('/');
    if url.is_empty() {
        return Err("Ollama URL 不能为空".to_string());
    }

    // Must start with http:// or https://
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Ollama URL 必须以 http:// 或 https:// 开头".to_string());
    }

    // Parse and restrict host to localhost / 127.0.0.1 / [::1]
    let parsed = reqwest::Url::parse(url)
        .map_err(|e| format!("无效的 URL 格式: {}", e))?;
    match parsed.host_str() {
        Some("localhost") | Some("127.0.0.1") | Some("[::1]") => {}
        Some(host) => {
            return Err(format!(
                "仅允许连接 localhost，当前 host: {}",
                host
            ));
        }
        None => return Err("URL 缺少 host".to_string()),
    }

    Ok(url.to_string())
}

#[derive(Deserialize, Serialize, Clone)]
pub struct OllamaMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct GenerateRequest {
    model: String,
    prompt: String,
    stream: bool,
}

#[derive(Deserialize)]
struct GenerateResponse {
    response: String,
}

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<OllamaMessage>,
    stream: bool,
}

#[derive(Deserialize)]
struct ChatResponse {
    message: OllamaMessage,
}

#[derive(Deserialize)]
struct ModelInfo {
    name: String,
}

#[derive(Deserialize)]
struct TagsResponse {
    models: Option<Vec<ModelInfo>>,
}

// 0. Update the Ollama base URL (called from settings panel)
#[tauri::command]
fn set_ollama_url(state: State<'_, OllamaState>, url: String) -> Result<(), String> {
    let validated = validate_ollama_url(&url)?;
    let mut base = state
        .base_url
        .lock()
        .map_err(|_| "内部状态锁定失败".to_string())?;
    *base = validated;
    Ok(())
}

// 1. Get Ollama status & models list
#[tauri::command]
async fn get_ollama_models(state: State<'_, OllamaState>) -> Result<Vec<String>, String> {
    let url = state
        .base_url
        .lock()
        .map_err(|_| "内部状态锁定失败".to_string())?
        .clone();
    let res = state
        .client
        .get(format!("{}/api/tags", url))
        .send()
        .await
        .map_err(|e| format!("无法连接 Ollama 服务: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Ollama 返回错误状态码: {}", res.status()));
    }

    let tags: TagsResponse = res
        .json()
        .await
        .map_err(|e| format!("解析 Ollama 状态失败: {}", e))?;

    let models = tags
        .models
        .unwrap_or_default()
        .into_iter()
        .map(|m| m.name)
        .collect();

    Ok(models)
}

// 2. Query text translation via generate API
#[tauri::command]
async fn translate_api(
    state: State<'_, OllamaState>,
    model: String,
    prompt: String,
) -> Result<String, String> {
    let url = state
        .base_url
        .lock()
        .map_err(|_| "内部状态锁定失败".to_string())?
        .clone();
    let req = GenerateRequest {
        model,
        prompt,
        stream: false,
    };

    let res = state
        .client
        .post(format!("{}/api/generate", url))
        .json(&req)
        .send()
        .await
        .map_err(|e| format!("翻译请求发送失败: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("模型推导错误，状态码: {}", res.status()));
    }

    let resp: GenerateResponse = res
        .json()
        .await
        .map_err(|e| format!("解析翻译结果失败: {}", e))?;

    Ok(resp.response)
}

// 3. Dialogue Chat via chat API
#[tauri::command]
async fn chat_api(
    state: State<'_, OllamaState>,
    model: String,
    messages: Vec<OllamaMessage>,
) -> Result<String, String> {
    let url = state
        .base_url
        .lock()
        .map_err(|_| "内部状态锁定失败".to_string())?
        .clone();
    let req = ChatRequest {
        model,
        messages,
        stream: false,
    };

    let res = state
        .client
        .post(format!("{}/api/chat", url))
        .json(&req)
        .send()
        .await
        .map_err(|e| format!("对话请求发送失败: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("对话推导错误，状态码: {}", res.status()));
    }

    let resp: ChatResponse = res
        .json()
        .await
        .map_err(|e| format!("解析对话结果失败: {}", e))?;

    Ok(resp.message.content)
}

/// Validates that a given path resolves to a location within the user's home
/// directory and contains no `..` traversal components. Returns the
/// canonicalized path on success.
fn validate_path_in_home(raw_path: &str) -> Result<std::path::PathBuf, String> {
    let path = Path::new(raw_path);

    // Reject paths with explicit traversal components before canonicalization.
    for component in path.components() {
        if let std::path::Component::ParentDir = component {
            return Err("路径包含非法的 '..' 跳转".to_string());
        }
    }

    // For existing files, canonicalize to resolve symlinks. For new files
    // (write_file), canonicalize the parent directory instead.
    let canonical = if path.exists() {
        path.canonicalize().map_err(|e| format!("无法解析路径: {}", e))?
    } else {
        let parent = path
            .parent()
            .ok_or_else(|| "无法获取父目录".to_string())?;
        if !parent.exists() {
            return Err("目标目录不存在".to_string());
        }
        let canonical_parent = parent
            .canonicalize()
            .map_err(|e| format!("无法解析父目录: {}", e))?;
        let file_name = path
            .file_name()
            .ok_or_else(|| "缺少文件名".to_string())?;
        canonical_parent.join(file_name)
    };

    // Restrict access to the user's home directory.
    let home_dir = dirs::home_dir().ok_or_else(|| "无法获取用户主目录".to_string())?;
    if !canonical.starts_with(&home_dir) {
        return Err("只允许访问用户主目录下的文件".to_string());
    }

    Ok(canonical)
}

// 4. File parsing for TXT, MD, and DOCX (Word)
#[tauri::command]
fn parse_file(path: String) -> Result<String, String> {
    let file_path = validate_path_in_home(&path)?;

    if !file_path.exists() {
        return Err("文件不存在".to_string());
    }

    let extension = file_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    if extension == "txt" || extension == "md" || extension == "markdown" {
        let mut file = File::open(&file_path).map_err(|e| e.to_string())?;
        let mut content = String::new();
        file.read_to_string(&mut content).map_err(|e| e.to_string())?;
        Ok(content)
    } else if extension == "docx" {
        let file = File::open(&file_path).map_err(|e| e.to_string())?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
        let mut doc_file = archive
            .by_name("word/document.xml")
            .map_err(|_| "无法解析 Word 内部文档结构".to_string())?;

        let mut xml_content = String::new();
        doc_file
            .read_to_string(&mut xml_content)
            .map_err(|e| e.to_string())?;

        // Robust XML text-run extraction using quick-xml
        let mut reader = quick_xml::Reader::from_str(&xml_content);
        reader.config_mut().trim_text(false); // Preserve spacing in text runs

        let mut extracted_text = String::new();
        let mut buf = Vec::new();
        let mut in_text_node = false;

        loop {
            match reader.read_event_into(&mut buf) {
                Ok(quick_xml::events::Event::Start(ref e)) => {
                    if e.local_name().as_ref() == b"t" {
                        in_text_node = true;
                    }
                }
                Ok(quick_xml::events::Event::End(ref e)) => {
                    let local = e.local_name();
                    if local.as_ref() == b"t" {
                        in_text_node = false;
                    } else if local.as_ref() == b"p" {
                        extracted_text.push('\n');
                    }
                }
                Ok(quick_xml::events::Event::Text(e)) => {
                    if in_text_node {
                        if let Ok(decoded) = e.unescape() {
                            extracted_text.push_str(&decoded);
                        }
                    }
                }
                Ok(quick_xml::events::Event::Eof) => break,
                Err(e) => return Err(format!("XML 解析错误: {}", e)),
                _ => {}
            }
            buf.clear();
        }
        Ok(extracted_text)
    } else {
        Err("不支持的文件格式，桌面客户端支持 TXT、MD、DOCX 文件。".to_string())
    }
}

// 5. Native file writing (download replacement)
#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    let file_path = validate_path_in_home(&path)?;

    // Only allow writing to safe file extensions.
    let extension = file_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();
    let allowed_extensions = ["txt", "md", "markdown", "docx"];
    if !allowed_extensions.contains(&extension.as_str()) {
        return Err(format!(
            "不允许写入 .{} 格式文件，仅支持: {}",
            extension,
            allowed_extensions.join(", ")
        ));
    }

    std::fs::write(file_path, content).map_err(|e| format!("保存文件失败: {}", e))
}

// 6. Native file selection dialog
#[tauri::command]
fn select_file() -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .add_filter("支持的文档格式", &["txt", "md", "markdown", "docx"])
        .pick_file();

    Ok(file.map(|path| path.to_string_lossy().to_string()))
}

// 7. Native save file dialog
#[tauri::command]
fn save_file_dialog(default_name: String) -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .set_file_name(&default_name)
        .save_file();

    Ok(file.map(|path| path.to_string_lossy().to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .connect_timeout(Duration::from_secs(10))
        .build()
        .expect("无法创建 HTTP 客户端");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(OllamaState {
            base_url: Mutex::new("http://localhost:11434".to_string()),
            client,
        })
        .invoke_handler(tauri::generate_handler![
            set_ollama_url,
            get_ollama_models,
            translate_api,
            chat_api,
            parse_file,
            write_file,
            select_file,
            save_file_dialog
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
