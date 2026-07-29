# WhatsApp Atendimento SaaS

Sistema de atendimento omnichannel via WhatsApp com gestao de conversas, filas, departamentos e atendentes.

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Backend | Python 3.12 + Django 5 + Django REST Framework |
| Frontend | React 19 + TypeScript + Vite + Material UI |
| WebSocket | Django Channels + Redis |
| Banco | PostgreSQL 16 |
| Cache/Fila | Redis 7 |
| WhatsApp | Evolution API (Baileys) |
| Proxy | Nginx |
| Container | Docker Compose |

## Arquitetura

```
Cliente WhatsApp
      |
Evolution API (webhook)
      |
Backend (Django) --- Redis (Channels/WS)
      |                  |
  PostgreSQL         Frontend (React)
                        |
                   Atendente (browser)
```

- **Monolito modular**: backend Django com apps organizados por dominio (accounts, conversations, bot, integrations, etc.)
- **Event-driven**: eventos de dominio publicados via EventBus interno, consumidos pelo dispatcher WebSocket e services
- **Tempo real**: WebSocket com Django Channels, grupos por empresa/fila/conversa/usuario

## Pre-requisitos

- Docker + Docker Compose
- Node.js 20+ (para desenvolvimento frontend)
- Python 3.12+ (para desenvolvimento backend)

## Instalacao

```bash
# Clone o repositorio
git clone <url-do-repo>
cd whatsapp-atendimento-saas

# Configure as variaveis de ambiente
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edite backend/.env com suas configuracoes
```

## Como executar via Docker

```bash
# Construir e iniciar todos os servicos
docker compose -f docker/docker-compose.yml up -d --build

# Executar migrations
docker exec whatsapp-backend python manage.py migrate

# Criar usuario admin padrao
docker exec -it whatsapp-backend python manage.py createsuperuser
```

## Como executar localmente

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r ../docker/backend/requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Usuario padrao

Nao existe usuario padrao. Crie o primeiro admin com:

```bash
docker exec -it whatsapp-backend python manage.py createsuperuser
```

## Estrutura de pastas

```
whatsapp-atendimento-saas/
├── backend/
│   ├── apps/
│   │   ├── accounts/        # Usuarios e autenticacao
│   │   ├── bot/             # Bot de triagem de atendimento
│   │   ├── channels/        # Canais de comunicacao (WhatsApp)
│   │   ├── clients/         # Clientes (contatos)
│   │   ├── companies/       # Empresas (multitenancy)
│   │   ├── conversations/   # Conversas, mensagens, filas
│   │   ├── core/            # Utilitarios: EventBus, models base
│   │   ├── dashboard/       # Dashboard e metricas
│   │   ├── departments/     # Departamentos e membros
│   │   ├── events/          # Eventos persistidos
│   │   ├── integrations/    # Integracoes (Evolution API)
│   │   ├── observability/   # Logs e monitoramento
│   │   ├── presence/        # Presenca de atendentes
│   │   ├── reports/         # Relatorios
│   │   ├── tags/            # Tags e categorizacao
│   │   ├── tasks/           # Tarefas agendadas
│   │   └── websocket/       # WebSocket dispatcher
│   ├── config/              # Settings, urls, asgi
│   └── manage.py
├── docker/
│   ├── backend/             # Dockerfile + entrypoint
│   ├── frontend/            # Dockerfile
│   ├── nginx/               # nginx.conf
│   └── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizaveis
│   │   ├── contexts/        # Contextos React (Auth, WebSocket)
│   │   ├── pages/           # Paginas da aplicacao
│   │   └── services/        # API client
│   └── package.json
└── scripts/                 # Scripts auxiliares
```
