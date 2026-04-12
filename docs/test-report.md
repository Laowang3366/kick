# 本地测试报告

更新时间：2026-04-12

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
- 当前安全脚本按 `401/403` 视为保护生效

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
- `scripts/security/security-baseline.ps1`
- `scripts/concurrency/public-endpoints.ps1`

当前状态：

- 脚本已落库
- 需要在具备对应工具（例如 `k6`、`OWASP ZAP`）的环境继续执行完整基线

## 结论

当前版本已具备：

- 后端单元测试基线
- 前端生产构建基线
- 基础烟测能力

仍需补完：

- 完整安全扫描
- 完整性能与并发压测
