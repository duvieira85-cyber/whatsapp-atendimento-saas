# Deploy Producao — WhatsApp Atendimento SaaS

## Pre-requisitos

- Docker + Docker Compose instalados na VPS
- Git instalado
- Dominio apontado para o servidor (ex: `whatsapp.insights-software.dev.br`)
- Cloudflare ou outro DNS configurado (SSL recomendado via Cloudflare)

## Estrutura de diretorios na VPS

```
/opt/
└── whatsapp-atendimento/
    ├── backend/
    │   └── .env.production
    ├── docker/
    │   └── docker-compose.yml  (link simbolico ou copia do dev)
    └── .env.production
```

## Variaveis de ambiente

Criar `backend/.env.production`:

```ini
DEBUG=False
SECRET_KEY=<gerar random de 64 caracteres>
ALLOWED_HOSTS=.insights-software.dev.br,localhost
DB_NAME=whatsapp_service
DB_USER=whatsapp_user
DB_PASSWORD=<senha segura>
DB_HOST=db
DB_PORT=5432
REDIS_HOST=redis
REDIS_PORT=6379
CORS_ALLOWED_ORIGINS=https://whatsapp.insights-software.dev.br
CSRF_TRUSTED_ORIGINS=https://whatsapp.insights-software.dev.br
EVOLUTION_WEBHOOK_BASE_URL=https://whatsapp.insights-software.dev.br
EVOLUTION_API_KEY=<chave secreta da evolution>
```

## Primeiro deploy

```bash
# 1. Clonar o repositorio na VPS
cd /opt
git clone https://github.com/duvieira85-cyber/whatsapp-atendimento-saas.git whatsapp-atendimento
cd whatsapp-atendimento

# 2. Criar arquivo de env production
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

O `backend/.env.production` deve ter copia de seguranca externa (nao versionar no git).

## Recuperacao

Em caso de falha total:

```bash
cd /opt/whatsapp-atendimento
git pull
docker compose -f docker/docker-compose.prod.yml down -v   # CUIDADO: remove volumes
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
