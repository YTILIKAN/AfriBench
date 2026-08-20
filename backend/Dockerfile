FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    AFRIBENCH_HOST=0.0.0.0 \
    AFRIBENCH_PORT=8080

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Code + données + scripts d'évaluation (monté aussi en volume en dev)
COPY backend /app/backend
COPY data /app/data
COPY frontend/data /app/frontend/data
COPY configs /app/configs
COPY scripts /app/scripts

WORKDIR /app/backend
EXPOSE 8080

# Healthcheck au niveau conteneur (indépendant du domaine public Railway)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT', '8080') + '/api/v1/health', timeout=4)"

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
