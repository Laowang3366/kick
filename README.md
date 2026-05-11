# 快捷翻译

Windows 桌面端 + 移动端 PWA 翻译 MVP。

## 运行

```powershell
npm install
npm run dev
```

打开 `http://127.0.0.1:5173/` 使用网页和移动端 PWA 版本。线上 Web App 入口是 `https://sg.lwvpscc.top/quick-translate/backend/app/`。

```powershell
npm run desktop:dev
```

Windows 桌面端会注册鼠标下侧键，通常是鼠标侧边的“后退键”。在其他应用中选中文本后按鼠标下侧键，桌面窗口会读取选中文本并立即翻译。

## 翻译引擎

前端界面不展示引擎、接口密钥、接口地址或模型设置。普通用户只看到翻译功能，桌面端由后台通道读取引擎配置并完成请求。

设置页提供默认目标语言和翻译格式偏好。翻译格式包含普通翻译、Java 驼峰命名、PascalCase、snake_case、UPPER_SNAKE_CASE 和 kebab-case，适合把中文说明快速转成代码变量名、类名、常量名或文件名。

桌面端后台支持两种配置方式：

```powershell
$env:TRANSLATE_API_KEY="你的接口密钥"
$env:TRANSLATE_BASE_URL="https://api.openai.com/v1"
$env:TRANSLATE_MODEL="gpt-4.1-mini"
npm run desktop:dev
```

也可以在 Electron 用户数据目录放置 `provider-settings.json`：

```json
{
  "providerType": "openai-compatible",
  "apiKey": "你的接口密钥",
  "baseUrl": "https://api.openai.com/v1",
  "model": "gpt-4.1-mini"
}
```

环境变量优先级高于 `provider-settings.json`。安装版默认走服务器后台 `/api/translate` 通道，不在客户端包内携带接口密钥；只有显式设置环境变量或用户数据目录里的 `provider-settings.json` 时，才会启用本机直连兼容接口兜底。任何兼容 `/chat/completions` 的接口都可以接入。

## 账号同步与后台

项目新增 Node 后台服务，提供登录注册、翻译历史与设置同步、管理员翻译引擎配置和应用下载页。

本地启动后台：

```powershell
$env:QUICK_TRANSLATE_ADMIN_USER="admin"
$env:QUICK_TRANSLATE_ADMIN_PASSWORD="请改成强密码"
$env:QUICK_TRANSLATE_JWT_SECRET="请改成长随机字符串"
npm run build
npm run download:manifest
npm run server:start
```

默认端口是 `8787`，可通过 `QUICK_TRANSLATE_PORT` 修改。数据默认写入 `server-data/`：

- `users.json`：用户账号
- `states.json`：用户翻译历史、收藏和设置同步数据
- `provider.json`：管理员配置的翻译引擎
- `downloads.json`：下载页版本清单

后台页面：

- 用户下载页：`https://sg.lwvpscc.top`
- 管理后台：`https://sg.lwvpscc.top/quick-translate/backend/admin`

软件未登录时继续使用本地历史、收藏和设置；登录后会把历史、收藏和设置同步到后台。翻译请求在 Electron 安装版和 Web/PWA 中都优先走服务器翻译代理；接口不可用时，桌面端仅在本机配置了直连通道时兜底。

## 移动端 PWA

网页版本包含：

- `public/manifest.webmanifest`
- `public/sw.js`
- 移动端系统分享入口

在支持 PWA 的移动浏览器中安装到桌面即可使用。通过系统分享进入时，文本会自动填入翻译框。

后台服务会把 `dist/` 暴露到 `/app/`，用于 Android、iOS 和桌面浏览器安装 Web App：

```text
https://sg.lwvpscc.top/quick-translate/backend/app/
```

## 验证

发布前运行统一验证入口：

```powershell
npm run verify
```

该命令会按顺序执行 `npm test` 和 `npm run build`，任一阶段失败会保留对应退出码并停止后续步骤。

如果需要真实接口冒烟，先设置环境变量再运行：

```powershell
$env:TRANSLATE_API_KEY="你的接口密钥"
$env:TRANSLATE_BASE_URL="https://api.openai.com/v1"
$env:TRANSLATE_MODEL="gpt-4.1-mini"
npm run smoke:api
```

桌面端启动冒烟：

```powershell
npm run desktop:smoke
```

500 并发压力测试：

```powershell
npm run stress:backend
```

## 桌面打包

生成本地未安装目录包：

```powershell
npm run package:dir
```

生成 Windows NSIS 安装包：

```powershell
npm run dist:win
```

生成 Mac DMG/ZIP 安装包需要在 macOS 环境运行：

```powershell
npm run dist:mac
```

安装后的桌面快捷方式图标来自 `build/icons/desktop-icon.ico`，安装包自身图标来自 `build/icons/installer-icon.ico`。

## 线上更新通道

Windows 客户端使用 Electron 自动更新的 generic 通道：

```text
https://sg.lwvpscc.top/quick-translate/updates/latest/latest.yml
```

当前服务器静态目录：

```text
/www/wwwroot/quick-translate/updates/latest
```

发布新版本时先在本地运行：

```powershell
npm run dist:win
```

再将以下文件上传到服务器更新目录，安装包和 `.blockmap` 先上传，`latest.yml` 最后覆盖：

- `release/latest.yml`
- `release/Quick-Translate-<版本号>.exe`
- `release/Quick-Translate-<版本号>.exe.blockmap`

当前打包链路未包含代码签名；正式分发前需要接入签名证书。

## 本地缓存刷新

Vite 开发服务默认地址是 `http://127.0.0.1:5173/`。如果浏览器或 PWA 仍显示旧资源，可以先访问带版本参数的地址刷新本地缓存：

```text
http://localhost:5173/?v=4
```

刷新后再回到常规地址继续验证。
