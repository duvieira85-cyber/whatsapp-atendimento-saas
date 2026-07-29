#!/bin/sh

set -e

echo "Aguardando banco de dados..."
while ! nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 0.5
done
echo "Banco de dados disponível!"

echo "Criando migrações..."
python manage.py makemigrations --noinput

echo "Executando migrações..."
python manage.py migrate --noinput

echo "Coletando arquivos estáticos..."
python manage.py collectstatic --noinput --clear

echo "Iniciando servidor..."
exec "$@"
