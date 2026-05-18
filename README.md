<div align="center">

# ✨ FileMind

**本地优先的 AI 文件管家**

Tauri 2 · React 19 · Rust · SQLite · 智谱 GLM · 实时监听 · 向量嵌入

*让你「看清、整理、连接、回忆」自己电脑里的所有文件*

`v0.6 MVP` · 6 个迭代版本 · 50+ IPC 命令 · ~10000 行代码

</div>

---

## 它解决什么

每个人的电脑都有三种痛苦：**找不到**（命名混乱）、**看不清**（项目散落）、**理不顺**（文件关系不可见）。FileMind 不替你做决定，而是用 AI 帮你看见自己。

```
打开 Dashboard            →  一眼看清你有多少文件、多少项目、多少冗余
Chat 里问大白话           →  「上周改的那个客户方案在哪」→ 10 秒定位
看 Graph                  →  「这张图哪些文件在引用我」→ 一目了然
扫描真实目录              →  walkdir 真扫盘 + FSEvents 实时监听 + 自动建关系
⌘P 命令面板              →  50+ 命令一键到位
```

---

## 5 分钟跑起来

### 前置

- **macOS 13+**（首发只测过 Mac）
- **Rust 1.95+** — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node 18+**
- 一个 **智谱 GLM API Key**（[免费申请](https://open.bigmodel.cn/console)）

### 装 + 跑

```bash
git clone git@github.com:lauraNiu/FileMind.git
cd FileMind
npm install
npm run tauri dev
```

首次启动会：
1. 编译 Rust 依赖（~1 分钟）
2. 弹出**全屏 Welcome 引导**（4 步：欢迎 → 名字 → API Key + 模型 + 测试 → 完成）
3. 进入主界面，自动 seed 8 个 demo 项目 + 77 个 mock 文件

> 你可以随时在「设置 → 数据 → 清空索引」清掉 demo，然后选你自己的目录扫描。

---

## 现在能做什么 ✅

### 🏠 仪表盘
- Bento Grid：文件总数 / 项目 / 重复 / 临时 / AI 用量
- recharts donut 显示文件类型分布
- 30 天活跃曲线（area chart）+ Top 标签
- 一键扫描目录 + 批量 AI 摘要按钮
- 实时索引进度条 + 关注事项跳转

### 🔍 全局搜索 (⌘K / ⌘P)
- FTS5 全文 + 名称 LIKE 双路召回
- 命中高亮 + 相关度分数
- 命令面板：50+ 命令（跳页 / 扫描 / 切模型 / 切主题 / 退出 ...）

### 💬 Chat
- 流式输出 (Zhipu GLM-4 / 5 / 5.1 全系列可切)
- **会话持久化**：左侧侧栏列出所有历史会话，可切换、删除
- **快捷命令**：输入 `/` 弹出 6 个模板 (`/find` `/dup` `/proj` `/recent` `/count` `/help`)
- **快捷 prompt 芯片行**：5 个常用预设一键发送
- 附文件 / 附目录作为对话上下文
- 「我是怎么找到的」可展开的推理链
- 文件卡片嵌入回答中

### 🕸 关系图谱 (`/graph`)
- react-force-graph-2d 力导向图
- 4 类边：reference / derived / co-project / similar
- 项目色 / 文件类型色 两种染色模式切换
- 「规则派生」+ 「AI 智能补图」两个一键增强按钮
- 节点搜索 + 关系筛选 + 图例

### 📁 项目识别
- AI 自动聚类（基于路径相邻 + 内容相似 + 时间）
- 项目详情页：摘要 + 类型分布 + 常见标签 + 按类型分组的文件
- 网格 / 列表两种视图

### 📂 真实文件操作
- 真打开 Finder (`open -R`) + 真用默认应用打开
- **移动 / 重命名 / 移到废纸篓** 三件套全部接通
- **AI 改名建议**：详情抽屉点 "Wand2" → GLM 给 3 个候选
- **所有写操作可回滚**：`/history` 页面列出操作流水

### ⏱ 时间轴 (`/timeline`)
- 按天聚合的文件变更
- 7 天 / 30 天 / 90 天 / 1 年范围切换
- 高峰可视化 + 卡片展开

### 🧹 清理向导
- **重复文件** (`/duplicates`)：按 SHA256 分组，标记最早保留，其余一键移废纸篓
- **临时文件** (`/temp`)：复选 + 批量移除 + 实时显示可释放空间

### 🔔 FSEvents 实时监听
- 扫描后的目录自动加入监听
- 文件 create/modify/remove 实时同步到索引
- 状态条左下角脉冲点（有事件时闪烁），点击看监听根目录 + 最近事件

### 🧠 AI 用量明细 (`/usage`)
- 总调用 / 总花费 / 成功率 三个 KPI
- 按模型 / 按用途 分布
- 最近 80 条调用流水（含 chat / rename / embed / summary）

### 🎨 设置中心 (`/settings`)
- **6 个分区**：个人资料 / AI & 模型 / 扫描 / 隐私 / 外观主题 / 数据 / 关于
- **完整登录系统**：API Key 持久化 + 测试连接 + 退出登录回引导
- **主题切换**：深色 / 浅色 / 跟随系统
- **导出 / 导入 JSON**：跨设备迁移或备份
- 月预算 + 排除规则 + 敏感目录

### 🧬 语义嵌入（云端）
- Zhipu `embedding-3` API 批量生成
- 余弦相似度查询（基础设施已就绪，UI 集成中）

### 📌 菜单栏托盘
- 左键开关窗口
- 右键菜单：仪表盘 / Chat / 设置 / 退出

### ⌨️ 键盘快捷键

| 快捷键 | 动作 |
|---|---|
| `⌘P` / `⌘K` | 命令面板 |
| `⌘1` ~ `⌘7` | 跳仪表盘 / 项目 / 文件 / 时间轴 / 图谱 / Chat / 历史 |
| `⌘N` | Chat 新对话 |
| `⌘,` | 设置 |
| `⌘C` (在标签上) | 复制路径 |
| `Esc` | 关闭抽屉 / 命令面板 |
| `↑ ↓ ↵` | 命令面板内导航 / 执行 |
| `Tab` (搜索时) | 切换到 Chat |
| `/` (Chat) | 唤起快捷命令 |

---

## 暂不支持 / 计划中 🚧

完整路线图见 **[ROADMAP.md](./ROADMAP.md)**。重要缺口：

- ❌ **macOS Quick Action**（Finder 右键集成）—— 需要 Apple Developer 证书
- ❌ **缩略图预览**（PDF / 图片）—— poppler C 依赖让首次编译从 1 分钟变 10 分钟
- ❌ **PDF / DOCX / PPTX 引用边**—— Markdown 已支持，其他格式约 2 天工作
- ❌ **本地 LLM 备份**（Ollama / llama.cpp）
- ❌ **Windows / Linux 打包**
- ❌ **测试覆盖**（当前 0%）

---

## 架构

```
┌──────────────────────────────────────────────────────┐
│   React 19 + Tailwind v4 + Framer Motion             │
│   ⤷ Pages: Dashboard / Files / Projects / Project    │
│             / Graph / Chat / Timeline / Duplicates   │
│             / TempFiles / History / Usage / Settings │
│             / Welcome                                │
│   ⤷ Components: Layout / Sidebar / TopBar /          │
│      StatusBar / GlassCard / FileRow / FileDetail    │
│      / CommandPalette / WatcherIndicator /           │
│      ExtDistChart / ActivityChart / TopTagsCard      │
│      / BatchSummaryCard / ScanCard / PortalPopover   │
│   ⤷ Lib: api / types / models / theme / shortcuts    │
└───────────────────────┬──────────────────────────────┘
                        │ Tauri IPC (50+ commands)
                        │ Events: scan-progress / fs-event /
                        │   chat-stream / batch-summary /
                        │   embedding-progress
┌───────────────────────▼──────────────────────────────┐
│   Rust 核心（单二进制 + tray icon）                    │
│   ├── ai.rs            智谱 GLM (chat/embed/rename) │
│   ├── commands.rs      40+ IPC 命令                  │
│   ├── config.rs        ConfigStore (JSON)            │
│   ├── db.rs            SQLite 9 张表 + FTS5          │
│   ├── lib.rs           Tauri builder + 托盘          │
│   ├── models.rs        所有序列化结构                │
│   ├── ops.rs           move/rename/trash/revert      │
│   ├── scan.rs          walkdir + SHA256 +            │
│   │                    Markdown 引用 + 关系派生      │
│   ├── seed.rs          77 个 mock 文件               │
│   └── watcher.rs       notify (FSEvents)             │
│                                                      │
│   存储 → ~/Library/Application Support/FileMind/     │
│     ├── filemind.sqlite                              │
│     ├── config.json                                  │
│     └── .trash/   (软删除)                           │
└──────────────────────────────────────────────────────┘
```

---

## 数据库 Schema (9 张表)

| 表 | 用途 |
|---|---|
| `files` | 文件主表（路径 / 大小 / mtime / hash / mime / tags / summary） |
| `files_fts` | FTS5 全文索引 |
| `projects` | AI 聚类得到的项目 |
| `relations` | 4 类边（reference / derived / co-project / similar） |
| `operations` | 写操作日志（用于回滚） |
| `chat_sessions` | 会话元信息 |
| `chat_messages` | 会话内每条消息 |
| `ai_usage_log` | 每次 AI 调用的记录 |
| `embeddings` | 文件向量（embedding-3 输出，BLOB） |
| `meta` | 键值对配置 |

---

## IPC 命令清单 (40+)

<details>
<summary>展开查看全部</summary>

**读取**
- `dashboard_stats` · `list_files` · `get_file_detail` · `search_files`
- `list_projects` · `get_project` · `get_project_files` · `get_related_files`
- `get_graph_data` · `top_tags` · `activity_timeline` · `timeline_buckets`
- `list_duplicates` · `list_temp_files` · `files_without_summary`

**AI**
- `regenerate_summary` · `batch_summarize`
- `chat_message` · `chat_message_stream`
- `enrich_graph` · `suggest_rename`
- `embed_pending` · `semantic_search`

**扫描 / 监听**
- `scan_directory` · `clear_all_data`
- `watcher_start` · `watcher_stop` · `watcher_status` · `watcher_remove_root`

**文件操作**
- `reveal_in_finder` · `open_with_default`
- `move_file` · `rename_file` · `trash_file`
- `revert_operation` · `list_operations`

**配置 / 登录**
- `get_config` · `save_profile` · `save_ai_config` · `save_scan_config`
- `complete_onboarding` · `logout` · `test_ai_connection`

**会话 / 用量 / 备份**
- `create_chat_session` · `list_chat_sessions` · `delete_chat_session`
- `rename_chat_session` · `save_chat_message` · `list_chat_messages`
- `list_ai_usage` · `ai_usage_stats`
- `export_data` · `import_data` · `update_file_tags`

**事件**
- `scan-progress` · `fs-event` · `chat-stream-{id}`
- `batch-summary-progress` · `embedding-progress` · `watcher-changed`

</details>

---

## 故障排查

| 现象 | 大概率原因 | 解法 |
|---|---|---|
| Chat 提示 "AI 未配置" | 没填 API key | 设置 → AI & 模型 → 填 + 测试 |
| AI 答得很官腔、拒绝看文件 | 用的是 `glm-4-flash`（太弱） | 设置或命令面板切到 `glm-4-air` / `glm-4-plus` |
| 扫描后 Graph 空 | 单文件目录没法派生关系 | 选含多文件目录，或点 Graph 页「AI 智能补图」 |
| 重复页空 | demo 数据没 hash | 用真实目录扫描，扫描时会算 SHA256 |
| 左上角图标和 macOS 红绿灯重叠 | 已在 v0.5 修复 | 升到 v0.5+ |
| Chat 输入 `/` 没反应 | 已在 v0.6 修复 | 升到 v0.6+ |
| 浅色主题切回去后下次启动是深色 | 已用 localStorage 持久化 | 升到 v0.6+ |
| macOS 第一次扫描卡住 | 全盘访问权限未授予 | 系统设置 → 隐私 → 完全磁盘访问 |

---

## 重置

```bash
# 通过 UI（推荐）
设置 → 数据管理 → 清空索引 / 退出登录

# 或者命令行
rm -rf ~/Library/Application\ Support/FileMind/
```

---

## 版本演进

| 版本 | 亮点 |
|---|---|
| **v0.1** | Tauri 骨架 + 5 个基础页面 + 智谱 GLM 接入 |
| **v0.2** | Dashboard donut chart + Chat 流式输出 + 图谱可视化 + 真实目录扫描 |
| **v0.3** | 修 10 个 UI 坑：失效按钮 / 项目详情 / 标签编辑 / 图谱配色 / 仪表盘扩展 |
| **v0.4** | 登录系统 + 完整设置 + 写操作 + 操作日志 + 真打开 Finder + GLM 5/5.1 |
| **v0.5** | Timeline 页 + FSEvents 实时监听 + 批量摘要 + 重复/临时清理向导 + 修 UI 重叠 |
| **v0.6** | 命令面板 + 快捷键 + SHA256 + 向量嵌入 + AI 改名 + 会话持久化 + 用量明细 + 导入导出 + 浅色主题 + 菜单栏 + Markdown 引用 |

---

## 已锁定的产品方向

| 维度 | 选择 | 原因 |
|---|---|---|
| AI 部署 | 云端为主（智谱 GLM） | 中文质量好、便宜 |
| 自动化激进度 | 渐进式（建议→确认→自动） | 文件操作不可逆 |
| 重组方式 | 混合（默认不动 + 可选迁移） | 不破坏用户习惯 |
| 隐私 | 100% 本地存储 + Privacy Gateway | 敏感目录不外泄 |

---

## 贡献 / 反馈

Issue 和 PR 都欢迎。路线图见 [ROADMAP.md](./ROADMAP.md)。

## License

MIT

## Credits

- **Tauri 2** · 桌面框架
- **智谱 AI GLM-4** · 中文 LLM
- **lucide-react** · 图标系统
- **react-force-graph** · 力导向图谱
- **recharts** · 数据可视化
- **notify** · FSEvents 跨平台监听
- **Anthropic Claude Opus 4.7** · 主要协作者 🤖

---

<div align="center">
<sub>Built with ☕ and 🤖 · 2026 · 6 次迭代 · 仍在演进</sub>
</div>
