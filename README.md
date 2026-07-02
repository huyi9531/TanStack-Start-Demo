# TanStack Start Cloudflare Demo

一个最小的 TanStack Start + Cloudflare Workers 中文演示，包含：

- TanStack Router 文件路由
- TanStack Start server functions
- Tailwind CSS
- Cloudflare Workers 构建与部署配置
- TanStack Devtools 开发体验，生产构建会自动移除

## 本地开发

```bash
npm install
npm run dev
```

默认开发地址是 `http://localhost:3000`。

## 验证命令

```bash
npm run check
npm run typecheck
npm run lint
npm test
npm run build
```

也可以一次性执行完整门禁：

```bash
npm run validate
```

## 项目结构

```text
src/
  lib/
    greeting.ts
    greeting.test.ts
  routes/
    __root.tsx
    index.tsx
  router.tsx
  routeTree.gen.ts
```

`src/routeTree.gen.ts` 由 TanStack Router 生成，不要手动编辑。

## Cloudflare Workers 部署

项目使用 `@cloudflare/vite-plugin` 和 `wrangler.jsonc`。部署前先登录：

```bash
npx wrangler login
```

构建并部署：

```bash
npm run deploy
```

生产环境变量建议这样处理：

- 密钥：使用 `wrangler secret put MY_SECRET`
- 非密钥配置：写入 `wrangler.jsonc` 的 `vars`
- KV、D1、R2、Durable Objects：写入 `wrangler.jsonc` 对应 bindings

Cloudflare Workers 的环境变量按请求注入。需要在模块作用域读取绑定时，优先使用 Cloudflare 官方的 `cloudflare:workers` env binding；普通 server function 内也可以按请求读取服务端环境。

## GitHub 自动部署

`.github/workflows/deploy.yml` 会在推送到 `main` 时执行：

```bash
npm ci
npm run check
npm run typecheck
npm run lint
npm test
npm run build
npx wrangler deploy
```

首次使用前需要配置仓库 Secrets：

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Cloudflare API token 应只授予部署这个 Worker 所需的最小权限。

## 开发约定

- 路由放在 `src/routes`，使用 `createFileRoute`。
- 服务端专属逻辑放进 `createServerFn`、server routes 或 server-only 模块。
- Route loader 是同构代码，不要直接访问数据库、文件系统或密钥。
- 表单、server function、API body 和 URL search params 等边界需要运行时校验。
