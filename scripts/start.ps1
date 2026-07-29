Write-Host "=== Iniciando WhatsApp Atendimento SaaS ===" -ForegroundColor Green
docker compose -f ..\docker\docker-compose.yml up -d --build
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Admin: http://localhost:8000/admin/"
