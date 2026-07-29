# DEPLOY_SAFE — Processo de Deploy Seguro

Skill obrigatória para todo deploy deste projeto.

---

## PRE DEPLOY (ambiente LOCAL)

### 1. Verificar estado do repositório

```bash
git status
git diff --stat
git log --oneline -5
```

Confirmar:
- [ ] Nenhum arquivo não versionado crítico (`.env`, secrets)
- [ ] Nenhum merge conflict
- [ ] Branch correta (`main` para produção)
- [ ] `git diff` mostra apenas o esperado

### 2. Verificar dependências

```bash
# Backend
cd backend
pip install -r requirements.txt 2>&1 | grep -iE 'error|conflict' || echo "OK"

# Frontend
cd frontend
npm install 2>&1 | grep -iE 'error|vulnerability' || echo "OK"
```

Confirmar:
- [ ] `requirements.txt` atualizado se novas dependências foram adicionadas
- [ ] `package-lock.json` versionado se `package.json` mudou
- [ ] Nenhuma vulnerabilidade crítica

### 3. Verificar migrations

```bash
cd backend
python manage.py makemigrations --check --dry-run 2>&1
```

Confirmar:
- [ ] Nenhuma migration pendente não criada
- [ ] Migrations novas estão versionadas no git

### 4. Build

```bash
# Frontend
cd frontend
npx tsc --noEmit
npx vite build

# Backend
cd backend
python manage.py check --deploy 2>&1 | grep -iE 'error|warning' || echo "OK"
python manage.py collectstatic --dry-run --noinput 2>&1 | tail -5
```

Confirmar:
- [ ] TypeScript: 0 erros
- [ ] Vite build: sucesso
- [ ] Django check: sem warnings/errors de produção
- [ ] Collectstatic: sem erros

### 5. Commitar

```bash
git add -A
git commit -m "feat: descrição clara do que foi feito"
git push origin main
```

Confirmar:
- [ ] Mensagem de commit descritiva (seguindo padrão conventional commits)
- [ ] Push bem-sucedido
- [ ] Nenhum `.env` ou secret no commit

---

## DEPLOY (VPS)

### 1. Acessar VPS

```bash
ssh -i ~/.ssh/id_rsa_food_platform root@187.127.25.176
```

### 2. Atualizar código

```bash
cd /opt/whatsapp-atendimento
git pull origin main
```

Confirmar:
- [ ] `git pull` sem conflitos
- [ ] Mostra os commits esperados

### 3. Executar deploy

```bash
# Deploy completo (recomendado para mudanças que afetam backend+frontend)
docker compose -f docker/docker-compose.prod.yml up -d --build

# Deploy somente frontend (quando apenas arquivos React mudaram)
docker compose -f docker/docker-compose.prod.yml up -d --build frontend

# Deploy somente backend (quando apenas Django mudou)
docker compose -f docker/docker-compose.prod.yml up -d --build backend

# Deploy somente migration (sem rebuild, apenas rodar migrations)
docker exec whatsapp-backend python manage.py migrate --noinput

# Deploy somente nginx (quando apenas config mudou)
docker compose -f docker/docker-compose.prod.yml up -d --build nginx
```

> **Regra**: Sempre usar `--build` para garantir imagem atualizada.  
> **Regra**: Nunca reiniciar containers desnecessários (ex: db, redis).

### 4. Verificar migrations (se houver novas)

```bash
docker exec whatsapp-backend python manage.py showmigrations --list | grep '\[ \]'
```

Confirmar:
- [ ] Nenhuma migration pendente (output vazio)

---

## HEALTH CHECK (VPS)

### 1. Containers

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
```

Confirmar:
- [ ] `whatsapp-backend` running
- [ ] `whatsapp-frontend` running
- [ ] `whatsapp-nginx` running
- [ ] `whatsapp-db` running (healthy)
- [ ] `whatsapp-redis` running (healthy)
- [ ] `whatsapp-evolution` running
- [ ] `food-cloudflared` running
- [ ] Nenhum restart count elevado

### 2. Health endpoints

```bash
# Backend API
curl -sS -o /dev/null -w '%{http_code}' http://localhost:8000/api/auth/login/
# Esperado: 405 (Method Not Allowed) — significa que o backend está respondendo

# Frontend
curl -sS -o /dev/null -w '%{http_code}' http://localhost:5173/
# Esperado: 200

# Nginx
curl -sS -o /dev/null -w '%{http_code}' http://localhost:8080/
# Esperado: 200

# Evolution
curl -sS -o /dev/null -w '%{http_code}' http://localhost:8081/
# Esperado: 200
```

### 3. Logs

```bash
# Backend (erros)
docker logs whatsapp-backend --tail 30 2>&1 | grep -iE 'error|traceback|importerror|migrationerror|modulenotfound|permissionerror|critical'
# Esperado: nenhum resultado

# Evolution
docker logs whatsapp-evolution --tail 10 2>&1 | grep -iE 'error|warn|exception|fail'
# Esperado: nenhum resultado

# Nginx
docker exec whatsapp-nginx tail -5 /var/log/nginx/error.log 2>/dev/null
docker exec whatsapp-nginx tail -5 /var/log/nginx/access.log 2>/dev/null
# Esperado: sem 5xx, sem erros
```

### 4. Cloudflared

```bash
docker ps --format '{{.Names}} {{.Status}}' | grep cloudflared
docker logs food-cloudflared --tail 5 2>&1 | grep -iE 'error|warn|reconnect'
```

Confirmar:
- [ ] Tunnel `Up` sem reinícios
- [ ] Sem erros de conexão (erros `context canceled` são normais)
- [ ] Sem `reconnect` contínuo

---

## SMOKE TEST (VPS)

### 1. Login via API

```bash
python3 -c "
import urllib.request, json
data = json.dumps({'username': 'admin', 'password': '<senha>'}).encode()
req = urllib.request.Request('http://localhost:8000/api/auth/login/', data=data,
    headers={'Content-Type': 'application/json'})
try:
    resp = urllib.request.urlopen(req)
    body = json.loads(resp.read())
    print('LOGIN: OK')
    print('User:', body.get('user', {}).get('first_name', ''))
    token = body.get('access', '')
except urllib.error.HTTPError as e:
    print(f'LOGIN: FAILED ({e.code})')
    print(e.read().decode()[:200])
    exit(1)
"
```

### 2. Endpoints protegidos

```bash
# Listar usuários
curl -sS http://localhost:8000/api/auth/users/ \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Users: {len(d.get(\"results\",d))}')"

# Listar departamentos
curl -sS http://localhost:8000/api/departments/ \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Depts: {len(d if isinstance(d,list) else d.get(\"results\",[]))}')"

# Listar integrações
curl -sS http://localhost:8000/api/integrations/ \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Integrations: {len(d.get(\"results\",d))}')"
```

### 3. Validação manual (navegador)

Abrir: `https://sos-whats-atendimento.insights-software.dev.br`

Testar:
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Usuários: listar, criar, editar
- [ ] Departamentos: listar, criar, editar
- [ ] Clientes: listar
- [ ] WhatsApp: exibir estado, conectar/desconectar, QR Code
- [ ] Conversas: abrir, enviar mensagem
- [ ] Configurações: página carrega

---

## ROLLBACK

Se qualquer health check ou smoke test falhar:

```bash
# 1. Interromper
echo "DEPLOY FAILED - INICIANDO ROLLBACK"

# 2. Reverter código
cd /opt/whatsapp-atendimento
git log --oneline -5
git checkout <commit-anterior-estavel>

# 3. Reconstruir e reiniciar
docker compose -f docker/docker-compose.prod.yml up -d --build

# 4. Verificar saúde
docker ps
docker logs whatsapp-backend --tail 20

# 5. Se ainda assim falhar:
docker compose -f docker/docker-compose.prod.yml down
docker compose -f docker/docker-compose.prod.yml up -d
```

> **Regra**: Nunca deixar produção indisponível.  
> **Regra**: Rollback é prioridade — diagnostique depois.

---

## RELATÓRIO PÓS-DEPLOY

Sempre documentar:

| Item | Valor |
|---|---|
| **Data/hora** | `date -u` |
| **Tempo total** | do `git pull` até smoke test OK |
| **Downtime** | segundos entre `up -d --build` e health OK |
| **Containers atualizados** | lista dos que rebuildaram |
| **Containers reiniciados** | apenas os que mudaram |
| **Problemas encontrados** | descrição |
| **Problemas corrigidos** | descrição |
| **Health final** | todos OK |
| **Responsável** | nome |

---

## DICAS PARA DEPLOYS MAIS RÁPIDOS

### Deploy somente Frontend (segundos, não minutos)

Quando apenas arquivos `.tsx`/`.ts`/`.css` mudarem:

```bash
docker compose -f docker/docker-compose.prod.yml up -d --build frontend
```

Isso evita rebuild de backend, evolution e outros containers pesados.

### Deploy somente Backend

Quando apenas Python mudar:

```bash
docker compose -f docker/docker-compose.prod.yml up -d --build backend
```

### Deploy somente Migration

```bash
docker exec whatsapp-backend python manage.py migrate --noinput
```

### Evitar rebuild quando possível

- Alterou só nginx config? → `docker compose up -d --build nginx`
- Alterou só variável de ambiente? → `docker compose up -d` (sem `--build`)
- Alterou migration? → só `docker exec ... migrate`

### Zero-downtime (futuro)

Para deploys sem downtime:
1. Usar múltiplas réplicas do backend
2. Usar `docker compose up -d --no-deps --build <service>` + `docker compose up -d` (rolling update)
3. Health check no load balancer antes de remover container antigo

---

> **Esta Skill é obrigatória.** Todo deploy deve seguir este checklist.
> Pular etapas pode causar indisponibilidade em produção.
