FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Se crea la carpeta storage explícitamente y se da permisos
RUN mkdir -p storage

# Gunicorn corre en el puerto 8000 INTERNO del contenedor
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "app:app"]