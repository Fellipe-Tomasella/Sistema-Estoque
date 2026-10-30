# Imagem única (docs/08): a API Bun/Elysia serve /api e o build do Vue. Build a partir da raiz do repositório:
#   docker build -f docker/Dockerfile -t sistema-estoque .
# O Bun executa o TypeScript direto (sem bundle), então a imagem leva o código da API e do shared.

FROM oven/bun:1.3.13 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile

FROM deps AS web
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
RUN bun run --filter @estoque/web build

FROM oven/bun:1.3.13 AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile --production --filter @estoque/api

FROM oven/bun:1.3.13-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    PUBLIC_DIR=/app/public
COPY --from=prod-deps /app ./
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api/tsconfig.json apps/api/
COPY apps/api/src apps/api/src
COPY --from=web /app/apps/web/dist ./public
COPY --chmod=755 docker/entrypoint.sh /entrypoint.sh
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD bun -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/entrypoint.sh"]
