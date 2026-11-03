# Subir o Sistema de Estoque no Portainer (Swarm + Traefik)

Mesmo esquema do Nexus: o Traefik da VPS (rede `HDSwarmNet`, certificado `letsencryptresolver`) recebe o HTTPS e
manda para a API na porta 3000, que também serve as telas. O banco fica só na rede interna da stack.

## 1. Imagem

A imagem é publicada no GitHub Container Registry quando se cria uma tag de versão:

```bash
git tag v1.0.0
git push origin v1.0.0
```

O GitHub Actions (`.github/workflows/release.yml`) gera `ghcr.io/fellipe-tomasella/sistema-estoque:1.0.0` e `:latest`.
Acompanhe em GitHub → Actions. Se o repositório for **privado**, a imagem também é: no Portainer, em
Registries → Add registry → Custom, cadastre `ghcr.io` com seu usuário do GitHub e um token (classic) com `read:packages`.

## 2. DNS

Aponte o domínio escolhido (ex.: `estoque.hyperdynamis.com`) para a VPS, igual ao `rpg.hyperdynamis.com`.

## 3. Stack

1. Copie `deploy/estoque-stack.yml` para `deploy/estoque-stack.local.yml` (ignorado pelo git) e troque:
   - `TROQUE_DOMINIO` (2 vezes) → o domínio, sem `https://` na regra do Traefik;
   - `TROQUE_SENHA_DO_BANCO` (3 vezes) → uma senha longa (`openssl rand -hex 24`);
   - `TROQUE_SEGREDO_LONGO_ALEATORIO` → `openssl rand -hex 32`;
   - `CLIENT_IP_HEADER`: deixe se o domínio passa pelo Cloudflare (nuvem laranja); apague se não passa.
2. Portainer → Stacks → Add stack → nome **`estoque`** → Web editor → cole → Deploy the stack.
3. Confira `https://SEU_DOMINIO/api/health` → `{"ok":true,"db":true,...}`.
   Na primeira subida a API aplica as migrations sozinha; se falhar, o container não sobe (veja os logs no Portainer).

## 4. Conta da dona

Portainer → Containers → `estoque_estoque-app…` → Console → Connect (`/bin/sh`) e rode:

```sh
bun apps/api/src/scripts/create-user.ts --name "Nome da dona" --email "email@dela.com"
```

A senha é pedida ali mesmo (duas vezes). Para redefinir depois: `bun apps/api/src/scripts/reset-password.ts --email "…"`.

## 5. Primeiro uso

Entrar no site → Configurações (nome da loja, CNPJ, UF, **fuso horário**) → cadastrar ou importar os produtos com a
contagem real → no celular, Configurações → Instalar no celular.

## Backup

O serviço `estoque-backup` faz `pg_dump` todo dia às 3h (fuso `TZ`) e guarda 14 dias no volume `estoque_backups`.

- Backup na hora (ex.: antes de atualizar): console do container `estoque_estoque-backup…` → `sh /tmp/backup-agora.sh`.
- Os arquivos ficam em `/backups` dentro desse container. **Para valer como backup, copie para fora da VPS**
  (pendência: definir destino — storage de objetos, outro servidor ou o seu computador).
- Restaurar (console do `estoque-backup`): `pg_restore --clean --if-exists -d estoque /backups/estoque-AAAA-MM-DD_HHMM.dump`.
  Pare o `estoque-app` antes (Services → escalar para 0) e volte para 1 depois.

## Atualizar

1. Backup na hora (acima).
2. Nova tag (`v1.0.1`) → espera o Actions terminar.
3. Portainer → Stacks → `estoque` → Editor → troque `:latest` pela tag nova (ou mantenha `:latest`) →
   Update the stack marcando **Re-pull image**. As migrations rodam sozinhas na subida.
