# 知时 · 中文时间管理与学习效率 APP

## 运行

Windows 可直接双击 `start-app.cmd`。它会在需要时启动服务，并自动打开固定地址 `http://localhost:5174/`。

也可以在终端运行：

```bash
npm install
npm run dev -- --port 5174 --strictPort
```

默认开发地址由 Vite 输出。当前会话已启动在：

- `http://localhost:5174/`

## 检查

```bash
npm run lint
npm test
npm run build
```

## 数据说明

- 任务、计划、收藏、设置和专注记录保存在当前浏览器的 `localStorage`。
- 计时器额外保存运行时间戳，刷新或重新打开后会按真实经过时间续算。
- “我的 → 数据管理”支持 JSON 导出、导入和清除。
- 学术资料搜索使用 Crossref 公共接口；断网时仍显示本地方法与 Crossref、ERIC、PubMed 可靠检索入口。
- AI 学习建议为本地智能排程，会结合任务、剩余时间、历史专注长度与任务完成率，不上传用户输入。

## Android

项目已通过 Capacitor 生成 `android/` 工程。使用 Android Studio 打开 `android/` 目录即可继续编译 APK。

命令行流程：

```bash
npm install
npm run build
npx cap sync android
```

然后在 Android Studio 中打开 `android/`，等待 Gradle 同步完成，再运行或构建 APK。应用 ID 为 `com.qforreal.mytime`，网页产物目录为 `dist`。
