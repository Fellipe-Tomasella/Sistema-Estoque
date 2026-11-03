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
Acompanhe em GitHub → Actions.

A stack do Swarm não guarda login de registry, então, para o Portainer baixar a imagem **sem cadastrar registry**,
o pacote precisa ser público: GitHub → seu perfil → Packages → `sistema-estoque` → Package settings →
Change visibility → **Public** (o repositório continua privado). Atenção: a imagem leva o código da API — quem souber
o nome do pacote consegue baixá-la. Se não quiser isso, a alternativa é cadastrar `ghcr.io` em Registries no Portainer.

## 2. DNS

Aponte o domínio escolhido (ex.: `estoque.hyperdynamis.com`) para a VPS, igual ao `rpg.hyperdynamis.com`.

## 3. Stack

1. Copie `deploy/estoque-stack.yml` para `deploy/estoque-stack.local.yml` (ignorado pelo git) e troque:
   - `TROQUE_DOMINIO` (2 vezes) → o domínio, sem `https://` na regra do Traefik;
   - `TROQUE_SENHA_DO_BANCO` (3 vezes) → uma senha longa (`openssl rand -hex 24`);
   - `TROQUE_SEGREDO_LONGO_ALEATORIO` → `openssl rand -hex 32`;
   - `TROQUE_NOME_DA_DONA`, `TROQUE_EMAIL_DA_DONA`, `TROQUE_SENHA_PROVISORIA` (mínimo 8 caracteres) → a primeira conta;
   - `CLIENT_IP_HEADER`: deixe se o domínio passa pelo Cloudflare (nuvem laranja); apague se não passa.
2. Portainer → Stacks → Add stack → nome **`estoque`** → Web editor → cole → Deploy the stack.
3. Confira `https://SEU_DOMINIO/api/health` → `{"ok":true,"db":true,...}`.
   Na primeira subida a API aplica as migrations sozinha; se falhar, o container não sobe (veja os logs no Portainer).

## 4. Conta da dona

É criada sozinha na primeira subida, com `FIRST_USER_NAME`, `FIRST_USER_EMAIL` e `FIRST_USER_PASSWORD` da stack
(só quando o banco ainda não tem nenhuma conta). Entre com esses dados e troque a senha em Configurações → Acesso.
Para redefinir uma senha esquecida: console do container `estoque_estoque-app…` →
`bun apps/api/src/scripts/reset-password.ts --email "…"`.

## 5. Primeiro uso

Entrar no site → Configurações (nome da loja, CNPJ, UF, **fuso horário**) → cadastrar ou importar os produtos com a
contagem real → no celular, Configurações → Instalar no celular.

## Backup

O serviço `estoque-backup` faz `pg_dump` todo dia às 3h (fuso `TZ`) e guarda 14 dias no volume `estoque_backups`.
As fotos dos produtos (volume `estoque_media`) são copiadas junto para `/backups/media`.

- Backup na hora (ex.: antes de atualizar): console do container `estoque_estoque-backup…` → `sh /tmp/backup-agora.sh`.
- Os arquivos ficam em `/backups` dentro desse container. **Para valer como backup, copie para fora da VPS**
  (pendência: definir destino — storage de objetos, outro servidor ou o seu computador).
- Restaurar (console do `estoque-backup`): `pg_restore --clean --if-exists -d estoque /backups/estoque-AAAA-MM-DD_HHMM.dump`.
  Pare o `estoque-app` antes (Services → escalar para 0) e volte para 1 depois.
- Fotos: o volume `estoque_media` só é montado para leitura no backup; para restaurar, num container com os dois
  volumes, `cp -rn /backups/media/. /app/media/`.

## Atualizar

1. Backup na hora (acima).
2. Nova tag (`v1.0.1`) → espera o Actions terminar.
3. Portainer → Stacks → `estoque` → Editor → troque `:latest` pela tag nova (ou mantenha `:latest`) →
   Update the stack marcando **Re-pull image**. As migrations rodam sozinhas na subida.
