use anyhow::{anyhow, Result};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::Emitter;

use crate::models::{ChatTurn, FileItem};

const ZHIPU_ENDPOINT: &str = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

pub struct ZhipuClient {
    api_key: String,
    model: String,
    http: reqwest::Client,
}

impl ZhipuClient {
    pub fn from_env() -> Result<Self> {
        let api_key = std::env::var("ZHIPU_API_KEY")
            .map_err(|_| anyhow!("ZHIPU_API_KEY 未设置。请在 .env 中配置"))?;
        let model = std::env::var("ZHIPU_MODEL").unwrap_or_else(|_| "glm-4-flash".to_string());
        Ok(Self {
            api_key,
            model,
            http: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(60))
                .build()?,
        })
    }

    pub async fn summarize(&self, name: &str, content_hint: &str) -> Result<String> {
        let system = "你是文件摘要助手。根据文件名和已知信息，用一句话（不超过 50 字）描述这个文件是什么、做什么用。直接输出摘要，不要前缀。";
        let user = format!("文件名：{}\n已知信息：{}", name, content_hint);
        let resp = self.chat_simple(system, &user).await?;
        Ok(resp.trim().to_string())
    }

    pub async fn answer_question(
        &self,
        message: &str,
        history: &[ChatTurn],
        candidate_files: &[FileItem],
    ) -> Result<(String, String, Vec<String>)> {
        let system = build_system_prompt(candidate_files);

        let mut messages = vec![json!({ "role": "system", "content": system })];
        for h in history.iter().take(6) {
            messages.push(json!({ "role": h.role, "content": h.content }));
        }
        messages.push(json!({ "role": "user", "content": message }));

        let body = json!({
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 800,
        });

        let resp: ChatCompletionResp = self
            .http
            .post(ZHIPU_ENDPOINT)
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        let content = resp
            .choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .unwrap_or_default();

        let (answer, file_ids) = extract_file_refs(&content, candidate_files);
        let reasoning = format!(
            "1. 收集了 {} 个候选文件作为上下文（基于关键词匹配）\n2. 调用 GLM 模型理解你的问题\n3. 在候选中筛选最相关的 {} 个文件",
            candidate_files.len(),
            file_ids.len()
        );
        Ok((answer, reasoning, file_ids))
    }

    pub async fn answer_question_stream(
        &self,
        app: tauri::AppHandle,
        stream_id: String,
        message: &str,
        history: &[ChatTurn],
        candidate_files: &[FileItem],
    ) -> Result<(String, String, Vec<String>)> {
        let system = build_system_prompt(candidate_files);

        let mut messages = vec![json!({ "role": "system", "content": system })];
        for h in history.iter().take(6) {
            messages.push(json!({ "role": h.role, "content": h.content }));
        }
        messages.push(json!({ "role": "user", "content": message }));

        let body = json!({
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 800,
            "stream": true,
        });

        let resp = self
            .http
            .post(ZHIPU_ENDPOINT)
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?
            .error_for_status()?;

        let mut stream = resp.bytes_stream();
        let mut byte_buf: Vec<u8> = Vec::with_capacity(4096);
        let mut full_content = String::new();
        let event_name = format!("chat-stream-{}", stream_id);

        while let Some(chunk) = stream.next().await {
            let bytes = chunk?;
            byte_buf.extend_from_slice(&bytes);

            loop {
                let Some(idx) = find_subsequence(&byte_buf, b"\n\n") else { break };
                let event_bytes: Vec<u8> = byte_buf.drain(..idx + 2).collect();
                let Ok(event_str) = std::str::from_utf8(&event_bytes) else {
                    eprintln!("[stream] invalid utf8 in event block, skipping");
                    continue;
                };
                for line in event_str.lines() {
                    let line = line.trim();
                    let Some(data) = line.strip_prefix("data:") else { continue };
                    let data = data.trim();
                    if data == "[DONE]" || data.is_empty() {
                        continue;
                    }
                    let Ok(parsed) = serde_json::from_str::<StreamDelta>(data) else { continue };
                    let Some(choice) = parsed.choices.into_iter().next() else { continue };
                    let Some(content) = choice.delta.content else { continue };
                    if content.is_empty() {
                        continue;
                    }
                    let displayed = strip_inline_markers(&content);
                    full_content.push_str(&content);
                    if !displayed.is_empty() {
                        let _ = app.emit(
                            &event_name,
                            StreamChunkPayload { delta: displayed, done: false },
                        );
                    }
                }
            }
        }

        let (cleaned, file_ids) = extract_file_refs(&full_content, candidate_files);
        let reasoning = format!(
            "1. 收集了 {} 个候选文件作为上下文（基于关键词匹配）\n2. 流式调用 GLM 模型\n3. 在候选中筛选出 {} 个相关文件",
            candidate_files.len(),
            file_ids.len()
        );

        let _ = app.emit(
            &event_name,
            StreamChunkPayload {
                delta: String::new(),
                done: true,
            },
        );

        Ok((cleaned, reasoning, file_ids))
    }

    pub async fn suggest_relations(&self, files: &[FileItem]) -> Result<Vec<SuggestedRelation>> {
        if files.is_empty() {
            return Ok(vec![]);
        }
        let max = 40usize.min(files.len());
        let sample = &files[..max];

        let file_lines: Vec<String> = sample
            .iter()
            .enumerate()
            .map(|(i, f)| {
                format!(
                    "{}. [{}] {} | 项目: {} | 类型: {} | 标签: [{}] | 摘要: {}",
                    i + 1,
                    f.id,
                    f.name,
                    f.project_name.as_deref().unwrap_or("无"),
                    f.ext,
                    f.tags.join(", "),
                    f.summary.as_deref().unwrap_or("无")
                )
            })
            .collect();

        let system = r#"你是文件关系分析助手。基于一批文件的元信息，找出**强相关**的文件对，标注关系类型。

关系类型（必须用这 4 种之一）：
- "reference"：A 引用 / 链接 / 截图了 B
- "derived"：A 是 B 的版本 / 副本 / 导出（如 v3 derived from v2）
- "co-project"：A 和 B 同属一个工作主题（不只是同目录，要内容相关）
- "similar"：内容主题相似但非派生关系

规则：
1. 只输出**高置信度**关系（信心 > 0.6）
2. 不要乱配，宁可少不要多
3. 不要把"刚好同目录"算 co-project（那个本系统已自动算了）
4. 重点找：跨目录的同主题、不同格式的派生（如 .docx 和 .pdf）、版本族、引用链

输出格式：严格 JSON 数组，每项 `{"src": "文件ID", "dst": "文件ID", "rel": "类型", "conf": 0.0-1.0, "why": "一句话原因"}`。
- 不要任何前后缀文字，直接 JSON
- 最多 20 对
- src 和 dst 必须来自候选清单的方括号 ID
- 不允许自连（src != dst）"#;

        let user = format!(
            "候选文件（{}）：\n{}\n\n请输出 JSON 关系数组。",
            sample.len(),
            file_lines.join("\n")
        );

        let body = json!({
            "model": self.model,
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": user }
            ],
            "temperature": 0.2,
            "max_tokens": 1500,
            "response_format": { "type": "json_object" }
        });

        let resp: ChatCompletionResp = self
            .http
            .post(ZHIPU_ENDPOINT)
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        let content = resp
            .choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .unwrap_or_default();

        let valid_ids: std::collections::HashSet<&str> =
            files.iter().map(|f| f.id.as_str()).collect();

        let parsed = parse_relations_json(&content, &valid_ids);
        Ok(parsed)
    }

    async fn chat_simple(&self, system: &str, user: &str) -> Result<String> {
        let body = json!({
            "model": self.model,
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": user }
            ],
            "temperature": 0.5,
            "max_tokens": 200,
        });
        let resp: ChatCompletionResp = self
            .http
            .post(ZHIPU_ENDPOINT)
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(resp
            .choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .unwrap_or_default())
    }
}

fn build_system_prompt(files: &[FileItem]) -> String {
    let file_lines: Vec<String> = files
        .iter()
        .take(25)
        .map(|f| {
            format!(
                "  - [{}] {} | 路径: {} | 项目: {} | 类型: {} | 标签: [{}] | 摘要: {}",
                f.id,
                f.name,
                f.path,
                f.project_name.as_deref().unwrap_or("无"),
                f.ext,
                f.tags.join(", "),
                f.summary.as_deref().unwrap_or("无")
            )
        })
        .collect();

    format!(
        r#"# 你是谁
你是本地文件管理工具 FileMind 内嵌的助手。运行环境是用户**自己的电脑**，你**有权访问**用户自己提交给本工具的文件元数据。下面这份"候选文件清单"就是用户的真实文件（不是虚构的），由本系统从用户本地数据库实时查询得到，已**完全授权**你查阅。

# 重要：不要拒绝
用户的所有问题都是关于他自己电脑上的文件。任何"我无法访问个人文件"或"我是 AI 不能访问您的电脑"之类的回答都是**错误的**。你的工作就是基于下方清单回答问题。

# 候选文件清单（共 {} 个，已基于关键词预筛选）
{}

# 工作流程
1. 阅读候选清单，识别与用户问题相关的文件
2. 用 1-3 句中文给出直接结论
3. 涉及具体文件时，在结论中用 [FILE:文件ID] 形式标记（ID 见清单方括号内），UI 会自动渲染为文件卡片
4. 如果清单里没有合适答案，明确说"在已索引的范围内没找到 XXX"，并建议下一步（如扫描更多目录、改个关键词）
5. 不要编造清单之外的文件 ID

# 输出风格
- 中文、简短直接、口语
- 不要复读文件路径（卡片会显示）
- 不要解释你的能力或限制
- 数字、文件名前后无需加粗符号

# 示例
用户问："上周改的 PPT"
好答案：找到 3 个上周改过的 PPT：[FILE:f_abc] [FILE:f_def] [FILE:f_xyz]。最新一份是 v3。
坏答案：很抱歉我无法访问您的个人文件...（错！清单里就有）"#,
        files.len(),
        file_lines.join("\n")
    )
}

fn extract_file_refs(content: &str, candidates: &[FileItem]) -> (String, Vec<String>) {
    let re = regex_lite_find_ids(content);
    let mut ids: Vec<String> = Vec::new();
    let valid_ids: std::collections::HashSet<&str> =
        candidates.iter().map(|f| f.id.as_str()).collect();
    for id in re {
        if valid_ids.contains(id.as_str()) && !ids.contains(&id) {
            ids.push(id);
        }
    }
    let cleaned = strip_file_markers(content);
    (cleaned, ids)
}

fn regex_lite_find_ids(s: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut rest = s;
    while let Some(idx) = rest.find("[FILE:") {
        let after = &rest[idx + "[FILE:".len()..];
        if let Some(end) = after.find(']') {
            let id = after[..end].trim().to_string();
            if !id.is_empty() {
                out.push(id);
            }
            rest = &after[end + 1..];
        } else {
            break;
        }
    }
    out
}

fn strip_file_markers(s: &str) -> String {
    strip_inline_markers(s)
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string()
}

#[derive(Debug, Deserialize, Serialize)]
struct ChatCompletionResp {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize, Serialize)]
struct Choice {
    message: ChatMessage,
}

#[derive(Debug, Deserialize, Serialize)]
struct ChatMessage {
    #[allow(dead_code)]
    role: String,
    content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestedRelation {
    pub src: String,
    pub dst: String,
    pub rel: String,
    pub conf: f64,
    pub why: String,
}

fn parse_relations_json(content: &str, valid_ids: &std::collections::HashSet<&str>) -> Vec<SuggestedRelation> {
    let mut out = Vec::new();
    let allowed_rels = ["reference", "derived", "co-project", "similar"];

    let candidates: Vec<serde_json::Value> = if let Ok(arr) = serde_json::from_str::<Vec<serde_json::Value>>(content) {
        arr
    } else if let Ok(obj) = serde_json::from_str::<serde_json::Value>(content) {
        if let Some(arr) = obj.get("relations").and_then(|v| v.as_array()) {
            arr.clone()
        } else if let Some(arr) = obj.as_array() {
            arr.clone()
        } else if obj.is_object() {
            obj.as_object()
                .map(|m| m.values().cloned().collect::<Vec<_>>())
                .unwrap_or_default()
        } else {
            return out;
        }
    } else {
        if let Some(start) = content.find('[') {
            if let Some(end) = content.rfind(']') {
                if end > start {
                    if let Ok(arr) = serde_json::from_str::<Vec<serde_json::Value>>(&content[start..=end]) {
                        arr
                    } else {
                        return out;
                    }
                } else {
                    return out;
                }
            } else {
                return out;
            }
        } else {
            return out;
        }
    };

    for v in candidates {
        let Some(src) = v.get("src").and_then(|x| x.as_str()) else { continue };
        let Some(dst) = v.get("dst").and_then(|x| x.as_str()) else { continue };
        let Some(rel) = v.get("rel").and_then(|x| x.as_str()) else { continue };
        let conf = v.get("conf").and_then(|x| x.as_f64()).unwrap_or(0.7);
        let why = v.get("why").and_then(|x| x.as_str()).unwrap_or("").to_string();

        if src == dst { continue; }
        if !valid_ids.contains(src) || !valid_ids.contains(dst) { continue; }
        if !allowed_rels.contains(&rel) { continue; }
        if conf < 0.55 { continue; }

        out.push(SuggestedRelation {
            src: src.to_string(),
            dst: dst.to_string(),
            rel: rel.to_string(),
            conf,
            why,
        });
    }
    out.truncate(20);
    out
}

#[derive(Debug, Deserialize)]
struct StreamDelta {
    choices: Vec<StreamChoice>,
}

#[derive(Debug, Deserialize)]
struct StreamChoice {
    delta: DeltaContent,
}

#[derive(Debug, Deserialize)]
struct DeltaContent {
    content: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct StreamChunkPayload {
    pub delta: String,
    pub done: bool,
}

fn find_subsequence(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() || haystack.len() < needle.len() {
        return None;
    }
    haystack
        .windows(needle.len())
        .position(|w| w == needle)
}

fn strip_inline_markers(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut rest = s;
    while let Some(idx) = rest.find("[FILE:") {
        out.push_str(&rest[..idx]);
        let after = &rest[idx + "[FILE:".len()..];
        if let Some(end) = after.find(']') {
            rest = &after[end + 1..];
        } else {
            rest = after;
            break;
        }
    }
    out.push_str(rest);
    out
}

#[allow(dead_code)]
pub fn estimate_cost_yuan(input_tokens: u32, output_tokens: u32) -> f64 {
    let input_cost = input_tokens as f64 * 0.0001 / 1000.0;
    let output_cost = output_tokens as f64 * 0.0001 / 1000.0;
    input_cost + output_cost
}
