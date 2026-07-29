# Deploy Producao — WhatsApp Atendimento SaaS

## Pre-requisitos

- Docker + Docker Compose instalados na VPS
- Git instalado
- Dominio apontado para o servidor (ex: `sos-whats-atendimento.insights-software.dev.br`)
- Cloudflare ou outro DNS configurado (SSL recomendado via Cloudflare)

## Estrutura de diretorios na VPS

```
/opt/
└── whatsapp-atendimento/
    ├── backend/
    │   └── .env.production
    └── docker/
        └── docker-compose.prod.yml
```

## Variaveis de ambiente

**Todas as referencias de dominio sao externas ao codigo.**

Para mudar o dominio no futuro, altere apenas:

1. `APP_URL` e `DOMAIN` no `.env.production` da raiz
2. Variaveis nos arquivos `backend/.env.production` e `frontend/.env.production`
3. O DNS (Cloudflare)
4. Nenhuma alteracao de codigo-fonte e necessaria

### Arquivo raiz `.env.production`

```ini
APP_URL=https://sos-whats-atendimento.insights-software.dev.br
DOMAIN=sos-whats-atendimento.insights-software.dev.br
FRONTEND_URL=${APP_URL}
API_URL=${APP_URL}/api
WS_URL=wss://${DOMAIN}/ws
DB_PASSWORD=<senha segura>
EVOLUTION_API_KEY=<chave secreta>
DJANGO_SECRET_KEY=<gerar random 64 caracteres>
```

### Arquivo `backend/.env.production`

```ini
DEBUG=False
SECRET_KEY=<gerar random 64 caracteres>
ALLOWED_HOSTS=.insights-software.dev.br,localhost
DB_NAME=whatsapp_service
DB_USER=whatsapp_user
DB_PASSWORD=<senha segura>
DB_HOST=db
DB_PORT=5432
REDIS_HOST=redis
REDIS_PORT=6379
FRONTEND_URL=https://sos-whats-atendimento.insights-software.dev.br
CORS_ALLOWED_ORIGINS=https://sos-whats-atendimento.insights-software.dev.br
CSRF_TRUSTED_ORIGINS=https://sos-whats-atendimento.insights-software.dev.br
EVOLUTION_WEBHOOK_BASE_URL=https://sos-whats-atendimento.insights-software.dev.br
EVOLUTION_API_KEY=<chave secreta>
```

### Arquivo `frontend/.env.production`

```ini
VITE_API_URL=https://sos-whats-atendimento.insights-software.dev.br/api
VITE_WS_URL=wss://sos-whats-atendimento.insights-software.dev.br/ws
```

## Primeiro deploy

```bash
# 1. Clonar o repositorio na VPS
cd /opt
git clone https://github.com/duvieira85-cyber/whatsapp-atendimento-saas.git whatsapp-atendimento
cd whatsapp-atendimento

# 2. Criar arquivos de env
cp backend/.env.production.example backend/.env.production
nano backend/.env.production   # preencher valores reais

# 3. Subir os containers
docker compose -f docker/docker-compose.prod.yml up -d --build

# 4. Verificar logs
docker compose -f docker/docker-compose.prod.yml logs -f

# 5. Criar superusuario
docker exec -it whatsapp-backend python manage.py createsuperuser
```

## Atualizacao (deploy rotineiro)

```bash
cd /opt/whatsapp-atendimento
git pull
docker compose -f docker/docker-compose.prod.yml up -d --build
```

As migracoes rodam automaticamente no entrypoint do backend.

## Rollback

```bash
# Reverter para versao anterior do codigo
cd /opt/whatsapp-atendimento
git checkout <commit-anterior>

# Reconstruir e reiniciar
docker compose -f docker/docker-compose.prod.yml up -d --build
```

Para rollback de banco, restaurar backup (veja secao abaixo).

## Backup

### PostgreSQL

```bash
# Backup
docker exec whatsapp-db pg_dump -U whatsapp_user whatsapp_service > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
cat backup.sql | docker exec -i whatsapp-db psql -U whatsapp_user whatsapp_service
```

### Media (arquivos enviados)

```bash
# Backup
docker run --rm -v whatsapp_backend_media:/data -v $(pwd):/backup alpine tar czf /backup/media_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# Restore
docker run --rm -v whatsapp_backend_media:/data -v $(pwd):/backup alpine tar xzf /backup/media_backup.tar.gz -C /data
```

### Configuracoes

Os arquivos `.env.production` devem ter copia de seguranca externa (nao versionar no git).

## Recuperacao

Em caso de falha total:

```bash
cd /opt/whatsapp-atendimento
git pull
docker compose -f docker/docker-compose.prod.yml down
# CUIDADO: Nao use -v a menos que queira perder dados
# Restaurar backup do banco primeiro
docker compose -f docker/docker-compose.prod.yml up -d db
# Aguardar db ficar saudavel
docker compose -f docker/docker-compose.prod.yml up -d
```

## Logs

```bash
# Todos os servicos
docker compose -f docker/docker-compose.prod.yml logs -f

# Servico especifico
docker compose -f docker/docker-compose.prod.yml logs -f backend
docker compose -f docker/docker-compose.prod.yml logs -f nginx

# Logs do Nginx (acessados internamente)
docker exec whatsapp-nginx tail -f /var/log/nginx/access.log
docker exec whatsapp-nginx tail -f /var/log/nginx/error.log
```

## Cloudflare

Registro DNS:

```
Tipo: CNAME
Nome: sos-whats-atendimento
Alvo: <ip-da-vps>
Proxy: Ativado (laranja) — para SSL
```

SSL mode: **Full (strict)** ou **Flexible**

- Flexible: Cloudflare faz HTTPS com o cliente, HTTP com o servidor (porta 8080)
- O Nginx do WhatsApp escuta na porta 8080 para HTTP
