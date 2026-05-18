# FileMind

> 本地优先的 AI 文件管家 · Tauri 2 + React 19 + Rust + SQLite + 智谱 GLM
> 阶段：Phase 1 MVP 切片（"看清"）

## 这是什么

FileMind 帮你**看清、整理、连接、回忆**你自己电脑里的文件。本仓库是 MVP 可运行 demo，包含：

- **仪表盘** — Bento 风格，文件 / 项目 / 重复 / 临时 / AI 用量一目了然
- **全局搜索** — FTS5 全文 + 名称模糊匹配，命中高亮
- **AI Chat** — 用大白话问"我上周改的那个客户方案在哪"，调用智谱 GLM-4 真实回答
- **项目识别** — AI 把散落文件聚成项目（mock 已生成）
- **文件详情** — AI 摘要、标签、相关文件（图谱关系）、元信息
- **关系图谱（数据层）** — reference / derived / co-project / similar 四类边已就位

## 技术栈

| 层 | 选型 |
|---|---|
| UI | React 19 + Vite 7 + TS |
| 样式 | Tailwind v4 + 自研 design tokens（深色 OLED + 玻璃拟态） |
| 动画 | Framer Motion |
| 桌面壳 | Tauri 2 |
| 后端 | Rust（rusqlite + reqwest + tokio） |
| 数据库 | SQLite + FTS5 |
| AI | 智谱 GLM-4（OpenAI 兼容 API） |

## 运行

```bash
cd filemind
npm install          # 仅首次
npm run tauri dev    # 启动桌面应用
```

首次启动会编译 Rust 依赖（~1 分钟），在 `~/Library/Application Support/FileMind/` 创建 SQLite，自动 seed 8 个项目 + 77 个文件，然后弹窗。

## API Key

`.env` 已写入：

```
ZHIPU_API_KEY=cdd67b27f5184649a42c0870123ea961.xxx
ZHIPU_MODEL=glm-4-flash
```

> ⚠️ 你在对话里贴过 key，建议去[智谱控制台](https://open.bigmodel.cn/console) rotate 后更新到 `.env`。

## 试试这些

- Dashboard → 看 Bento 仪表盘
- Files → 搜 `客户A`，看高亮和分数
- 点任一文件 → 看右侧抽屉（AI 摘要 + 相关文件）
- Chat → 问：
  - "我上周改的所有 PPT 在哪"
  - "客户A 项目有哪些文件"
  - "Python 学习相关的笔记"

## 目录结构

```
filemind/
├── src/                        React 前端
│   ├── components/             Sidebar / TopBar / StatusBar / GlassCard / FileRow / FileDetailDrawer / FileIcon / Layout
│   ├── pages/                  Dashboard / Files / Projects / Chat
│   ├── lib/                    api.ts (Tauri invoke 封装) / types.ts / utils.ts
│   └── styles/globals.css      design tokens + Tailwind v4 主题
├── src-tauri/                  Rust 后端
│   └── src/
│       ├── lib.rs              Tauri builder + 启动 + .env 加载 + seed
│       ├── db.rs               SQLite schema + 查询 + FTS5
│       ├── seed.rs             8 个项目 + 77 个 mock 文件 + 关系数据
│       ├── ai.rs               智谱 GLM 客户端
│       ├── commands.rs         10 个 IPC commands
│       └── models.rs           序列化结构
├── .env                        ZHIPU_API_KEY（gitignored）
└── README.md
```

## IPC 命令

| Command | 用途 |
|---|---|
| `dashboard_stats` | 仪表盘统计 |
| `list_files(limit, offset)` | 文件列表分页 |
| `get_file_detail(id)` | 文件详情 |
| `search_files(query, limit)` | FTS5 + LIKE 混合搜索 |
| `list_projects` | 项目列表 |
| `get_project(id)` | 项目详情 |
| `get_project_files(id)` | 项目内文件 |
| `get_related_files(id)` | 图谱邻居（4 类关系） |
| `regenerate_summary(id)` | AI 重新生成摘要 |
| `chat_message(message, history)` | Chat 主入口 |

## 已锁定的产品方向

| 维度 | 选择 |
|---|---|
| AI 部署 | 云端为主（GLM-4） |
| 自动化激进度 | 渐进式（建议→确认→自动） |
| 重组方式 | 混合（默认不动 + 可选迁移） |

## 还没做的（Phase 2+）

- 真实文件系统扫描（FSEvents watcher）
- 向量嵌入 + 语义搜索
- AI 摘要批量生成
- 写操作（移动 / 删除 / 重命名 + 操作日志 + 回滚）
- 关系图谱可视化界面
- 版本管理 + 版本树
- 设置中心（敏感目录、预算控制、PII 剥离）

## 重置

```bash
rm -rf ~/Library/Application\ Support/FileMind/
```

---

*生成于 2026-05-18 · MVP v0.1*
