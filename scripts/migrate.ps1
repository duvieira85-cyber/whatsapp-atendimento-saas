Write-Host "=== Executando migrações ===" -ForegroundColor Yellow
docker exec whatsapp-backend python manage.py migrate --noinput
Write-Host "Migrações concluídas." -ForegroundColor Green
