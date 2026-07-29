Write-Host "=== WhatsApp Atendimento SaaS - Setup ===" -ForegroundColor Green

Write-Host "`n1. Criando arquivo .env (se não existir)..." -ForegroundColor Yellow
if (-not (Test-Path "..\backend\.env")) {
    Copy-Item "..\backend\.env.example" -Destination "..\backend\.env"
    Write-Host "   .env criado em backend/.env"
}
if (-not (Test-Path "..\frontend\.env")) {
    Copy-Item "..\frontend\.env.example" -Destination "..\frontend\.env"
    Write-Host "   .env criado em frontend/.env"
}

Write-Host "`n2. Iniciando containers Docker..." -ForegroundColor Yellow
docker compose -f ..\docker\docker-compose.yml up -d --build

Write-Host "`n3. Aguardando backend ficar disponível..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`n4. Executando migrações..." -ForegroundColor Yellow
docker exec whatsapp-backend python manage.py migrate --noinput

Write-Host "`n5. Criando superusuário (se necessário)..." -ForegroundColor Yellow
docker exec -it whatsapp-backend python manage.py createsuperuser

Write-Host "`n=== Setup concluído! ===" -ForegroundColor Green
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Admin: http://localhost:8000/admin/"
