#!/bin/sh
set -e

echo "Aguardando banco de dados..."
while ! nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 0.5
done
echo "Banco de dados disponivel!"

echo "Executando migracoes..."
python manage.py migrate --noinput

echo "Coletando arquivos estaticos..."
python manage.py collectstatic --noinput --clear

echo "Iniciando servidor..."
exec "$@"
