<div align="center">

# ✨ FileMind

**本地优先的 AI 文件管家**

Tauri 2 · React 19 · Rust · SQLite · 智谱 GLM-4

*让你「看清、整理、连接、回忆」自己电脑里的所有文件*

</div>

---

## 它解决什么

每个人的电脑都有三种痛苦：**找不到**（命名混乱）、**看不清**（项目散落）、**理不顺**（文件关系不可见）。FileMind 不替你做决定，而是用 AI 帮你看见自己。

```
打开 Dashboard            →  一眼看清你有多少文件、多少项目、多少冗余
Chat 里问大白话           →  「上周改的那个客户方案在哪」→ 10 秒定位
看 Graph                  →  「这张图哪些文件在引用我」→ 一目了然
扫描真实目录              →  walkdir 真扫盘，自动聚类，自动建关系
```

---

## 截图 _(待补)_

> Dashboard / Files / Graph / Chat 四个核心页面截图位 — 跑起来后可以补上。

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
cp .env.example .env
# 编辑 .env 填入 ZHIPU_API_KEY
npm install
npm run tauri dev
```

首次启动需要 ~1 分钟编译 Rust 依赖。完成后会弹出 1280×820 窗口，自动 seed 8 个 demo 项目 + 77 个 mock 文件。

### 用它

| 想做什么 | 怎么做 |
|---|---|
| 看一眼所有文件 | 进 Dashboard |
| 找一个忘了名字的文件 | ⌘K 搜索 / Files 页 / Chat 问 |
| 看项目之间的关系 | Graph 页 |
| 让 AI 帮你梳理 | Chat 页问大白话 |
| 用真实文件替换 demo | Dashboard → 「清空」→「选择目录开始扫描」 |
| 重新生成单个文件的 AI 摘要 | 文件详情抽屉 → 「重新生成」 |

---

## 现在能做什么 ✅

### 看清
- Dashboard：文件 / 项目 / 重复 / 临时 / AI 用量
- recharts donut chart 显示扩展名分布
- 实时索引进度条

### 搜索
- 全局搜索（⌘K）：FTS5 全文 + 名称模糊匹配 + 命中高亮
- 关键词 + 标签 + AI 摘要全部参与排序

### Chat
- 调用真实 智谱 GLM-4 API
- **流式输出**（SSE + Tauri 事件），UTF-8 安全
- AI 回答中嵌入文件卡片，附「我是怎么找到的」推理链
- 支持追问 / 历史会话

### 项目与关系
- 项目自动聚类（mock + 扫描派生）
- 关系图谱可视化（react-force-graph-2d）
  - 4 类边：reference / derived / co-project / similar
  - 按项目染色节点，按关系染色连线
  - 力导向布局 + 鼠标悬停 + 单击打开详情

### 真实扫描
- walkdir 递归扫描你选的目录（原生文件对话框）
- 自动跳过 node_modules / .git / target 等
- 进度事件实时推送到 UI
- 扫完自动派生关系（同目录 = co-project，同名前缀 = derived）

### 文件操作
- 详情抽屉：摘要 / 标签 / 元信息 / 相关文件
- 单文件 AI 摘要重新生成
- 一键复制路径
- 清空所有数据

### 隐私
- API key 在 `.env`，gitignored
- 数据存 `~/Library/Application Support/FileMind/`
- 暂时不接管任何写操作（不动你一个文件）

---

## 暂不支持 / 计划中 🚧

完整路线图见 **[ROADMAP.md](./ROADMAP.md)**，下面是高层次的：

- 短期（1-2 周）：批量 AI 摘要、Settings 中心、暗色主题外的浅色支持、扫描后自动摘要
- 中期（1-3 个月）：FSEvents 实时监听、向量嵌入 + 语义搜索、Phase 2 写操作（移动 / 归档 / 去重 / 回滚）
- 长期（3-12 个月）：版本管理、本地 LLM 备份、Windows / Linux、多人共享、插件生态

---

## 架构 30 秒

```
┌──────────────────────────────────────────┐
│   React 19 + Tailwind v4 + Framer        │
│   ⤷ Pages: Dashboard / Files / Graph /   │
│             Projects / Chat              │
│   ⤷ ⌘K 全局搜索 · 文件详情抽屉            │
└────────────────┬─────────────────────────┘
                 │ Tauri IPC (13 commands)
┌────────────────▼─────────────────────────┐
│   Rust 核心（单二进制）                    │
│   ⤷ SQLite + FTS5 索引                    │
│   ⤷ walkdir 真实扫描                       │
│   ⤷ 智谱 GLM-4 客户端（流式 SSE）           │
│   ⤷ 关系图谱派生（co-project / derived）    │
└──────────────────────────────────────────┘
```

---

## IPC 命令清单（13 个）

| Command | 用途 |
|---|---|
| `dashboard_stats` | 仪表盘聚合统计 |
| `list_files(limit, offset)` | 文件列表分页 |
| `get_file_detail(id)` | 单文件详情 |
| `search_files(query, limit)` | FTS5 + LIKE 混合搜索 |
| `list_projects` | 项目列表 |
| `get_project(id)` | 项目详情 |
| `get_project_files(id)` | 项目内文件 |
| `get_related_files(id)` | 单文件的 4 类关系邻居 |
| `get_graph_data(focus_id?, limit)` | 全图 / 局部图谱数据 |
| `regenerate_summary(id)` | 单文件 AI 摘要重生成 |
| `chat_message(message, history)` | Chat 非流式入口 |
| `chat_message_stream(stream_id, message, history)` | Chat 流式入口（Tauri events 推送 chunks） |
| `scan_directory(path, max_files?)` | 真实目录扫描 |
| `clear_all_data` | 一键清空 |

事件：`chat-stream-{id}`、`scan-progress`

---

## 目录结构

```
FileMind/
├── src/                              # React 前端 (~2500 LOC)
│   ├── components/
│   │   ├── Layout.tsx                # 主框架（侧栏 + 顶栏 + 状态条）
│   │   ├── Sidebar.tsx               # 5 个一级导航
│   │   ├── TopBar.tsx                # 搜索框 + Settings/User popover
│   │   ├── StatusBar.tsx             # 扫描进度 + AI 用量
│   │   ├── GlassCard.tsx             # 玻璃拟态卡片基类
│   │   ├── FileRow.tsx               # 文件列表行（带分数、高亮、标签）
│   │   ├── FileIcon.tsx              # 按扩展名上色的图标
│   │   ├── FileDetailDrawer.tsx      # 右侧抽屉：摘要/标签/相关/元信息
│   │   ├── ExtDistChart.tsx          # recharts 文件类型分布 donut
│   │   └── ScanCard.tsx              # 选目录扫描 + 清空数据
│   ├── pages/
│   │   ├── Dashboard.tsx             # Bento Grid 首页
│   │   ├── Files.tsx                 # 文件列表 + ⌘K 搜索
│   │   ├── Projects.tsx              # 项目卡片网格
│   │   ├── Graph.tsx                 # react-force-graph 关系图
│   │   └── Chat.tsx                  # 流式 AI 对话
│   ├── lib/
│   │   ├── api.ts                    # Tauri invoke 封装
│   │   ├── types.ts                  # 与 Rust 共享的类型
│   │   └── utils.ts                  # cn / formatBytes / formatRelativeTime
│   └── styles/globals.css            # Tailwind v4 主题 + design tokens
│
├── src-tauri/                        # Rust 后端 (~2000 LOC)
│   ├── src/
│   │   ├── lib.rs                    # Tauri builder + .env 加载 + 初始化
│   │   ├── main.rs                   # 二进制入口
│   │   ├── db.rs                     # SQLite schema + 14 个查询函数
│   │   ├── models.rs                 # serde 结构体（与前端类型对齐）
│   │   ├── commands.rs               # 13 个 IPC commands
│   │   ├── ai.rs                     # 智谱 GLM 客户端（流式 + 非流式）
│   │   ├── scan.rs                   # walkdir 扫描 + 关系派生
│   │   └── seed.rs                   # 8 个项目 + 77 个 mock 文件
│   ├── capabilities/default.json     # Tauri 权限：dialog / opener
│   ├── tauri.conf.json               # 窗口配置（1280×820 OLED 主题）
│   └── Cargo.toml
│
├── .env                              # ZHIPU_API_KEY（gitignored）
├── .env.example                      # 模板
└── README.md
```

---

## 故障排查

| 现象 | 大概率原因 | 解法 |
|---|---|---|
| Chat 提示 "AI 未配置" | `.env` 没填 / 没生效 | 检查 `.env` 是否在 `FileMind/` 根目录，重启应用 |
| AI 答得很官腔、拒绝看文件 | 用的是 `glm-4-flash`（太小） | `.env` 改 `ZHIPU_MODEL=glm-4-air` 或 `glm-4` |
| 扫描后 Graph 还是空 | 单文件目录没法派生关系 | 选包含多个文件的目录（如 `~/Documents`） |
| Chat 输出乱码 | 旧版 bug，已修，但需要重启 | 杀掉 `target/debug/filemind` 重新 `npm run tauri dev` |
| macOS 第一次扫描卡住 | 权限弹窗未处理 | 系统设置 → 隐私 → 完全磁盘访问，加入 FileMind |
| 「设置」面板里值像 placeholder | 是的，完整设置中心是 Phase 2 | 现在改 `.env` 即可 |

---

## 重置

```bash
# 清掉 SQLite 索引（下次启动重新 seed demo 数据）
rm -rf ~/Library/Application\ Support/FileMind/

# 清掉 Rust 构建缓存（释放磁盘）
cd src-tauri && cargo clean
```

或在 UI 里：Dashboard → 「索引一个真实目录」卡片右侧的「清空」按钮（不会动你的真实文件，只清 SQLite）

---

## 已锁定的产品方向

| 维度 | 选择 | 原因 |
|---|---|---|
| AI 部署 | 云端为主（智谱 GLM-4） | 中文质量好、便宜；隐私靠 Privacy Gateway |
| 自动化激进度 | 渐进式 | 文件操作不可逆，必须先建立信任 |
| 重组方式 | 混合（默认不动 + 可选迁移） | 不破坏用户原有习惯 |

---

## 贡献 / 反馈

这是一个 demo / 学习项目。Issue 和 PR 都欢迎。短期路线图见 [ROADMAP.md](./ROADMAP.md)。

---

## License

MIT（隐式 — 待补 LICENSE 文件）

## Credits

- **Tauri** — 桌面应用框架
- **智谱 AI GLM-4** — 中文 LLM
- **lucide-react** — 图标
- **react-force-graph** — 力导向图谱
- **Anthropic Claude Opus 4.7** — 主要协作者 🤖

---

<div align="center">
<sub>Built with ☕ and 🤖 · 2026</sub>
</div>
