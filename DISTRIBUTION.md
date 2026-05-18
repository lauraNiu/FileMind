# FileMind 打包与分发指南

> 把 FileMind 打成 `.dmg` 安装包给别人用 · v0.6+

---

## TL;DR · 三句话

1. `npm run tauri build` 生成 `.app` + `.dmg`，输出在 `src-tauri/target/release/bundle/`
2. **没有 Apple Developer 证书** → 用户首次打开会被 Gatekeeper 拦截，需要右键 → 打开 → 同意
3. **有 Apple Developer 证书**（$99/年）→ 可签名 + 公证，用户双击即可打开，无任何警告

---

## 1. 打包流程

### 1.1 准备

确认在 `src-tauri/tauri.conf.json` 里：
```json
{
  "productName": "FileMind",
  "version": "0.6.0",           // ← 每次发版前手动 bump
  "identifier": "com.filemind.app",
  "bundle": {
    "targets": "all"             // macOS 上 = .app + .dmg
  }
}
```

### 1.2 单一命令

```bash
cd FileMind
npm run tauri build
```

首次构建约 **5-10 分钟**（release 模式要重新编译所有 Rust 依赖 + tsc + vite build）。

### 1.3 输出位置

```
src-tauri/target/release/bundle/
├── macos/
│   └── FileMind.app/            # 应用本身（约 15-25 MB）
└── dmg/
    └── FileMind_0.6.0_aarch64.dmg  # 拖拽安装包（约 20-30 MB）
```

> Apple Silicon 上默认产出 `aarch64`（arm64）版本，只能在 M 系列 Mac 上跑。
> Intel Mac 用户需要单独编译 `x86_64`，或者打通用包（universal）。

### 1.4 打通用包（同时支持 Intel + Apple Silicon）

```bash
# 先安装两个 target
rustup target add aarch64-apple-darwin x86_64-apple-darwin

# 打通用包（约 2 倍时间 + 体积）
npm run tauri build -- --target universal-apple-darwin
```

输出会是 `FileMind_0.6.0_universal.dmg`。

---

## 2. 签名与公证

### 2.1 没有 Apple Developer 账号（免费方案）

✅ **可以打包，可以分发，但用户首次打开会被 Gatekeeper 拦截。**

用户打开时会看到：
> "FileMind"无法打开，因为无法验证开发者。

解法：用户右键应用 → 选择「打开」→ 弹窗里点「打开」即可。**只需做一次**。

或在终端：
```bash
xattr -d com.apple.quarantine /Applications/FileMind.app
```

**适合**：朋友圈分享、内测、个人使用、开源项目自下载。

### 2.2 有 Apple Developer 账号（$99/年）

✅ **签名 + 公证后，用户双击就能打开，无任何警告。**

#### 配置（一次性）

1. 加入 Apple Developer Program → 拿到 `Developer ID Application` 证书
2. 用 Keychain Access 把证书导入到 macOS 钥匙串
3. 在 `~/.cargo/config.toml` 或环境变量配置：
   ```bash
   export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
   export APPLE_ID="your-apple-id@example.com"
   export APPLE_PASSWORD="app-specific-password"   # 在 appleid.apple.com 生成
   export APPLE_TEAM_ID="ABCDEFGHIJ"
   ```

#### `tauri.conf.json` 加配置

```json
"bundle": {
  "macOS": {
    "signingIdentity": "Developer ID Application: Your Name (TEAMID)",
    "providerShortName": "TEAMID",
    "minimumSystemVersion": "13.0"
  }
}
```

#### 打包

```bash
npm run tauri build
```

会自动签名。要公证（让 Gatekeeper 完全放行）：

```bash
# 公证 .dmg
xcrun notarytool submit src-tauri/target/release/bundle/dmg/FileMind_0.6.0_aarch64.dmg \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --wait

# 公证通过后给 .app 装订
xcrun stapler staple src-tauri/target/release/bundle/macos/FileMind.app
```

公证一般 5-15 分钟，成功后用户体验 = 双击打开，零警告。

---

## 3. 用户怎么安装

### 3.1 给用户的「快速开始」

> 把这段贴给你的朋友 / Issue 里 / 发布说明里 👇

```markdown
# 安装 FileMind

## 1. 下载
- 从 [Releases](https://github.com/lauraNiu/FileMind/releases) 下载 `FileMind_0.6.0_aarch64.dmg`
- Apple Silicon (M1/M2/M3/M4) 选 aarch64 · Intel 选 x86_64

## 2. 安装
- 双击 .dmg
- 把 FileMind.app 拖到 Applications 文件夹

## 3. 首次打开（重要！）
**因为开发者还没买 Apple 公证证书**，第一次打开会被 macOS 拦截：

1. 进入 Applications，**右键** FileMind → 选「打开」
2. 弹窗写"无法验证开发者"，点 **打开**（不是取消！）
3. 之后正常双击即可

## 4. 授权
- macOS 会请求"完全磁盘访问权限"
- 同意（这是为了能扫描你选定的文件夹）
- 设置 → 隐私 → 完全磁盘访问 → 勾选 FileMind

## 5. 配置
- 弹出 4 步 Welcome 向导
- 填名字 + 智谱 GLM API Key（[免费申请](https://open.bigmodel.cn/console)）
- 测试连接通过后点完成

## 6. 开始用
- Dashboard → 「索引一个真实目录」→ 选你的 ~/Documents
- ⌘P 唤起命令面板看所有功能
- ⌘N 在 Chat 里开新对话问问题
```

### 3.2 卸载

```bash
# 删 App
rm -rf /Applications/FileMind.app

# 删数据（可选）
rm -rf ~/Library/Application\ Support/FileMind/
```

---

## 4. 发版到 GitHub Releases

### 4.1 手动发布

1. 本地 `npm run tauri build`
2. 把 `FileMind_0.6.0_aarch64.dmg` 上传到 GitHub Releases：
   ```bash
   gh release create v0.6.0 \
     src-tauri/target/release/bundle/dmg/FileMind_0.6.0_aarch64.dmg \
     --title "v0.6 — 命令面板 + 向量嵌入 + 12 项大补全" \
     --notes-file ROADMAP.md
   ```

### 4.2 GitHub Actions 自动发版（推荐）

在 `.github/workflows/release.yml` 配置 Tauri 官方的 [action-tauri-build](https://github.com/tauri-apps/tauri-action)：

```yaml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  build:
    strategy:
      matrix:
        platform: [macos-latest]    # 也可加 ubuntu / windows
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: dtolnay/rust-toolchain@stable
      - run: npm install
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # 签名相关 secrets（可选）：
          # APPLE_SIGNING_IDENTITY / APPLE_ID / APPLE_PASSWORD / APPLE_TEAM_ID
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'FileMind ${{ github.ref_name }}'
          releaseDraft: false
```

后续打版：
```bash
git tag v0.7.0
git push origin v0.7.0
# GitHub Actions 自动构建 + 上传 .dmg 到 Releases
```

---

## 5. 已知限制

| 项 | 现状 | 应对 |
|---|---|---|
| 首次打开警告 | 无签名 → Gatekeeper 拦截 | 教用户右键打开（一次性） |
| 自动更新 | 没做 | 用户需要手动下载新版（建议加 [tauri-plugin-updater](https://v2.tauri.app/plugin/updater/)） |
| Windows / Linux 包 | 没测过 | 理论上跑 `npm run tauri build` 在对应平台能出包，没验证 |
| API key 携带 | `.env` 不会进包 | 用户自己输（Onboarding 里有引导） |
| 大模型默认值 | 打包时 `glm-4-air` | 用户首次进 Onboarding 时可选 |
| 应用图标 | 用的 Tauri 默认图标 | 后续可换成 FileMind 品牌图标 |
| App 名 vs Bundle | productName="FileMind" 已对 | OK |

---

## 6. 验证清单（发版前）

- [ ] `tauri.conf.json` 的 `version` 已更新
- [ ] README + ROADMAP 已更新
- [ ] 本地走通：装 → 引导 → 扫描 → Chat → 退出 → 重启 → 看到数据
- [ ] 用 `xattr -p com.apple.quarantine FileMind.app` 检查是否需要去隔离
- [ ] 至少在一台**别人的 Mac**测试一次（不是开发机）
- [ ] 写发布说明（哪些新功能 / 修了哪些 bug）

---

## 7. 如果不打包，怎么让别人体验？

**最轻量**：让对方 clone repo，跑 `npm run tauri dev`。需要：
- Mac
- 装 Rust + Node
- 有耐心等首次编译 1 分钟

**稍微正式**：打 `.app` 但不签名，**zip 后** 分享给朋友（zip 可以保留 macOS 扩展属性）。对方解压 → 右键打开。

---

*本文档版本：v1 · 2026-05-18*
