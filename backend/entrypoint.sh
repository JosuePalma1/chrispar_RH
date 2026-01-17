#!/bin/bash
set -e

echo "Waiting for postgres..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 0.1
done
echo "PostgreSQL started"

echo "Running database migrations..."
flask db upgrade

echo "Starting application with Gunicorn..."
exec gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
