# ── 依赖安装 + 构建阶段 ──────────────────────────────────────────
FROM node:18-alpine AS builder

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 先复制依赖声明，利用 Docker 层缓存
COPY frontend/package.json frontend/pnpm-lock.yaml* ./

# 安装全部依赖（含 devDependencies，构建需要）
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# 复制源码
COPY frontend/ ./

# 构建时注入 API URL（支持 docker-compose build-arg 覆盖）
ARG NEXT_PUBLIC_API_URL=http://backend:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# 生成 standalone 输出（需要 next.config.mjs 中 output: 'standalone'）
RUN pnpm build

# ── 运行阶段 ─────────────────────────────────────────────────────
# 使用 standalone 输出：仅需 server.js + static 资源，无需完整 node_modules
FROM node:18-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 非 root 用户运行
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# standalone 模式：仅复制必要产物，镜像体积从 ~700MB 降至 ~150MB
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# 健康检查：探测前端自身是否响应（不依赖后端，避免循环依赖）
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# standalone 模式用 node server.js 启动，无需 next start
CMD ["node", "server.js"]
