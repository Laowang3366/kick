# 本地测试报告

更新时间：2026-04-12
更新时间：2026-04-13

## 已执行命令

### 后端

```powershell
cd excel-forum-backend
mvn -q -DskipTests compile
mvn test
```

结果：

- `mvn -q -DskipTests compile`：通过
- `mvn test`：通过，48 个测试全部通过

### 前端

```powershell
cd reace_web
npm ci
npm run build
```

结果：

- `npm ci`：通过
- `npm run build`：通过

补充说明：

- 前端开发进程占用 `node_modules` 时，Windows 下可能出现文件锁；本次已在关闭前端进程后完成 `npm ci`
- `npm audit --omit=dev`：未发现生产依赖漏洞
- 已对 `@univerjs` 相关产物做额外分包，编辑器入口显著拆开，但 `univer-sheets-core` 仍然偏大，属于后续性能优化项

## 烟测结果

已验证：

- `http://localhost:8080/api/public/home-overview` 返回 `200`
- `http://localhost:5173` 可访问

## 安全基线结果

已执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/security/security-baseline.ps1
```

结果：

- 未登录访问后台统计：返回 `403`
- 无效 JWT 访问私信未读数：返回 `403`
- 未登录访问文档转换接口：返回 `403`
- 当前安全脚本按 `401/403` 视为保护生效

## ZAP 扫描结果

已执行：

```powershell
& "C:\Program Files\ZAP\Zed Attack Proxy\zap.bat" -dir <profile> -cmd -port 8090 -quickurl http://localhost:5173 -quickout <report>
& "C:\Program Files\ZAP\Zed Attack Proxy\zap.bat" -dir <profile> -cmd -port 8091 -quickurl http://localhost:8080/api/public/home-overview -quickout <report>
```

报告文件：

- `run-logs/zap-frontend-quick-20260413.html`
- `run-logs/zap-frontend-quick-20260413-2.html`
- `run-logs/zap-backend-quick-20260413.html`

结果：

- 前端首轮扫描发现缺失：
  - `Content Security Policy (CSP) Header Not Set`
  - `X-Content-Type-Options Header Missing`
- 修复后前端二轮扫描已不再报“缺失响应头”
- 当前剩余前端告警主要为开发态宽松策略：
  - `CSP: Wildcard Directive`
  - `CSP: script-src unsafe-inline`
  - `CSP: style-src unsafe-inline`
  - `HTTP Only Site`
- 后端公开接口 quick scan 未发现高危/中危业务漏洞项

## 性能基线结果

已执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/perf/http-baseline.ps1
```

结果：

- `/api/public/home-overview`
  - Min: `16.45ms`
  - Max: `62.91ms`
  - Avg: `37.66ms`
- `/api/posts?page=1&limit=10`
  - Min: `20.04ms`
  - Max: `48.15ms`
  - Avg: `31.68ms`

## k6 压测结果

已执行：

```powershell
& "C:\Program Files\k6\k6.exe" run scripts/perf/k6-public-smoke.js
& "C:\Program Files\k6\k6.exe" run scripts/perf/k6-auth-smoke.js
```

结果：

- 公共接口压测
  - 5 VUs / 30 秒
  - 274 请求
  - 0 失败
  - 平均响应 `49.52ms`
  - P95 `120.63ms`
- 登录态接口压测
  - 5 VUs / 30 秒
  - 560 请求
  - 0 失败
  - 平均响应 `19.32ms`
  - P95 `67.5ms`

## 并发基线结果

已执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/concurrency/public-endpoints.ps1
```

结果：

- 并发 20 次请求 `/api/public/home-overview`
- 返回 `200`：20 次
- 未出现失败请求

## 性能 / 并发 / 安全测试脚本

已提供脚本：

- `scripts/smoke.ps1`
- `scripts/perf/http-baseline.ps1`
- `scripts/perf/k6-public-smoke.js`
- `scripts/perf/k6-auth-smoke.js`
- `scripts/security/security-baseline.ps1`
- `scripts/concurrency/public-endpoints.ps1`

当前状态：

- 脚本已落库
- `k6` 与 `OWASP ZAP` 已完成一轮本地执行

## 结论

当前版本已具备：

- 后端单元测试基线
- 前端生产构建基线
- 基础烟测能力

仍需补完：

- 使用 Ajax Spider 再做一轮登录后前端深扫
- 对商城兑换、通知已读、聊天消息做更高并发专项压测
