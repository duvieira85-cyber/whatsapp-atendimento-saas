Write-Host "=== Parando WhatsApp Atendimento SaaS ===" -ForegroundColor Yellow
docker compose -f ..\docker\docker-compose.yml down
Write-Host "Containers parados." -ForegroundColor Green
