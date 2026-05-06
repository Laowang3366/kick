# 快捷翻译

Windows 桌面端 + 移动端 PWA 翻译 MVP。

## 运行

```powershell
npm install
npm run dev
```

打开 `http://127.0.0.1:5173/` 使用网页和移动端 PWA 版本。

```powershell
npm run desktop:dev
```

Windows 桌面端会注册鼠标键 4，通常是鼠标侧边的“后退键”。在其他应用中选中文本后按鼠标键 4，桌面窗口会读取选中文本并立即翻译。

## 翻译引擎

界面默认使用“离线示例”，无需联网即可验证流程。切换到“兼容接口”后填写：

- `接口密钥`
- `接口地址`，例如 `https://api.openai.com/v1`
- `模型名称`，例如 `gpt-4.1-mini`

任何兼容 `/chat/completions` 的接口都可以接入。

## 移动端 PWA

网页版本包含：

- `public/manifest.webmanifest`
- `public/sw.js`
- 移动端系统分享入口

在支持 PWA 的移动浏览器中安装到桌面即可使用。通过系统分享进入时，文本会自动填入翻译框。

## 验证

```powershell
npm test
npm run build
```
