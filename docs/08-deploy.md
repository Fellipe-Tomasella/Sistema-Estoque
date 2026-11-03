# 08 — Deploy (Docker Swarm + Traefik no Portainer)

> **Atualizado (decisão 036):** a VPS usa **Docker Swarm com Traefik** (rede `HDSwarmNet`), não Nginx.
> O que vale para subir é `deploy/estoque-stack.yml` + `deploy/LEIA.md`. As seções 4 e 5 abaixo (compose com
> `container_name`/Nginx) ficam só como histórico do plano original.

## 1. Visão

```
Internet ──HTTPS──> Nginx (já existe na VPS) ──HTTP──> app:3000 (Bun/Elysia: /api + SPA Vue)
                                                         │
                                                         └──> db:5432 (Postgres, só rede interna)
                                                   backup ──> pg_dump diário → volume /backups (+ cópia externa)
```

- **Uma imagem `app`**: a API serve `/api/*` e os arquivos estáticos do Vue (com fallback para `index.html`). Mesmo domínio → cookie simples, sem CORS.
- Postgres **não** expõe porta para fora.
- Stack gerenciada pelo **Portainer**.
- Imagem construída pelo **GitHub Actions** e publicada no **GHCR** (`ghcr.io/<usuario>/sistema-estoque:<tag>`); o Portainer puxa a tag.
  Alternativa: build direto na VPS pelo Portainer (stack com `build:` a partir do repositório Git).

## 2. Ambiente de desenvolvimento

`docker-compose.dev.yml` (só banco):

```yaml
services:
  db:
    image: postgres:18-alpine        # conferir major estável atual na Etapa 0
    environment:
      POSTGRES_USER: estoque
      POSTGRES_PASSWORD: estoque
      POSTGRES_DB: estoque
    ports: ["5432:5432"]
    volumes: [pgdata-dev:/var/lib/postgresql/data, ./docker/dev-init.sql:/docker-entrypoint-initdb.d/init.sql:ro]
volumes: { pgdata-dev: {} }
```
`docker/dev-init.sql` cria o banco `estoque_test` e as extensões `unaccent` e `pg_trgm` nos dois bancos.

## 3. Imagem de produção (`docker/Dockerfile`)

**Implementado** em `docker/Dockerfile` (decisão 035): o Bun executa o TypeScript da API direto (sem `dist/`),
o build do Vue vai para `/app/public` e a API o serve (`PUBLIC_DIR`). Build local:
`docker build -f docker/Dockerfile -t sistema-estoque .` — o esboço original fica abaixo como referência:

```dockerfile
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN bun run build            # web → apps/web/dist ; api → apps/api/dist

FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/src/db/migrations ./migrations
COPY --from=build /app/apps/web/dist ./public
COPY docker/entrypoint.sh ./entrypoint.sh
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD bun -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./entrypoint.sh"]
```

`entrypoint.sh`: aplica migrations (migrator programático do Drizzle) e inicia `bun dist/index.js`. Se a migration falhar, o container não sobe.

## 4. `docker-compose.yml` (stack no Portainer)

O Nginx da VPS precisa alcançar o `app`. Duas formas — **ver como o seu Nginx roda** (pendência em `10-pendencias.md`):

- **(A) Nginx em container** (comum com Portainer): o `app` entra na rede Docker externa do Nginx (ex.: `proxy`) e o Nginx usa `proxy_pass http://estoque-app:3000`.
- **(B) Nginx instalado no host**: publicar só no loopback: `ports: ["127.0.0.1:3010:3000"]` e `proxy_pass http://127.0.0.1:3010`.

```yaml
services:
  app:
    image: ghcr.io/<usuario>/sistema-estoque:${APP_TAG:-latest}
    container_name: estoque-app
    restart: unless-stopped
    env_file: stack.env            # variáveis definidas no Portainer
    depends_on:
      db: { condition: service_healthy }
    networks: [internal, proxy]    # (A). Para (B): remova `proxy` e use ports 127.0.0.1:3010:3000
  db:
    image: postgres:18-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      retries: 5
    networks: [internal]
  backup:
    image: postgres:18-alpine
    restart: unless-stopped
    environment:
      PGHOST: db
      PGUSER: ${DB_USER}
      PGPASSWORD: ${DB_PASSWORD}
      PGDATABASE: ${DB_NAME}
      KEEP_DAYS: 14
    volumes: [./backups:/backups, ./docker/backup.sh:/backup.sh:ro]
    entrypoint: ["/bin/sh", "/backup.sh"]   # loop: pg_dump -Fc diário às 03:00 (fuso da loja) + limpeza > KEEP_DAYS
    depends_on: [db]
    networks: [internal]
volumes: { pgdata: {} }
networks:
  internal: {}
  proxy: { external: true }        # nome da rede do seu Nginx
```

Variáveis de produção (Portainer → stack env): `DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}`,
`APP_ORIGIN=https://estoque.seudominio.com.br`, `SESSION_SECRET` (aleatório longo), `SMTP_*`, `DB_*`, `APP_TAG`, `PORT=3000`, `NODE_ENV=production`.

## 5. Nginx (`docker/nginx/estoque.conf.example`)

```nginx
server {
  listen 443 ssl http2;
  server_name estoque.seudominio.com.br;
  # ssl_certificate / ssl_certificate_key: usar o mesmo esquema (certbot/acme) que você já tem

  add_header Strict-Transport-Security "max-age=31536000" always;
  client_max_body_size 10m;                 # upload da planilha

  location = /sw.js               { proxy_pass http://estoque-app:3000; add_header Cache-Control "no-cache"; }
  location = /manifest.webmanifest{ proxy_pass http://estoque-app:3000; add_header Cache-Control "no-cache"; }

  location / {
    proxy_pass http://estoque-app:3000;     # (B): http://127.0.0.1:3010
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
server { listen 80; server_name estoque.seudominio.com.br; return 301 https://$host$request_uri; }
```

A API deve confiar no `X-Forwarded-For` só vindo do Nginx (rate limit do login usa o IP).
Assets com hash (`/assets/*`) podem ter `Cache-Control: public, max-age=31536000, immutable` (definir na API ao servir estáticos).

## 6. CI (GitHub Actions)

`.github/workflows/ci.yml`: em PR/push → `bun install`, `lint`, `typecheck`, testes da API com serviço Postgres, build.
`.github/workflows/release.yml`: em tag `v*` → build da imagem e push para GHCR com a tag e `latest`.
Deploy: no Portainer, atualizar `APP_TAG` e “Update the stack” (ou webhook do Portainer chamado pelo workflow).

## 7. Primeira subida (runbook)

1. DNS do subdomínio apontando para a VPS; certificado HTTPS no esquema atual.
2. Criar a stack no Portainer com o compose e as variáveis.
3. Subir. Conferir `https://…/api/health`.
4. Criar a conta da dona: `docker exec -it estoque-app bun apps/api/src/scripts/create-user.ts --name "…" --email "…"` (senha pedida no terminal).
5. Entrar, preencher Configurações (loja, UF, fuso).
6. Importar planilha ou cadastrar produtos com saldo inicial (contagem real).
7. Testar no celular e instalar o PWA.

## 8. Backup e recuperação

- `pg_dump -Fc` diário, 14 dias de retenção no volume `./backups` da VPS.
- Fotos dos produtos: volume `estoque_media` (`MEDIA_DIR=/app/media` na imagem), copiado para `/backups/media` no mesmo horário (só os arquivos novos; cada foto tem nome único).
- **Cópia fora da VPS** (obrigatório para valer como backup): `rclone` para um storage de objetos ou outro servidor — **[A] definir destino**.
- Restauração testada pelo menos uma vez antes de entrar em produção:
  `pg_restore --clean --if-exists -d $DATABASE_URL backups/estoque-AAAA-MM-DD.dump`.
- Além do backup, a dona tem a **exportação ZIP** (RN-ACE-04) em Configurações.
- Atualizações: migrations são só aditivas sempre que possível; antes de atualizar a imagem, rodar um backup manual
  (`docker exec estoque-backup sh /backup.sh once`).

## 9. Recuperação de acesso sem e-mail

`docker exec -it estoque-app bun apps/api/src/scripts/reset-password.ts --email "…"`.
