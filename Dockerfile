# AfriBench — image d'évaluation reproductible
# Build : docker build -t afribench:eval .
# Run  : docker run --rm --env-file .env afribench:eval run --model gpt-4o

FROM python:3.12-slim

LABEL org.opencontainers.image.title="AfriBench"
LABEL org.opencontainers.image.description="Benchmark LLM sur les réalités africaines"
LABEL org.opencontainers.image.source="https://github.com/YTILIKAN/AfriBench"
LABEL org.opencontainers.image.version="0.1.0"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    # Seeds / déterminisme côté client (les APIs cloud restent non seedables)
    PYTHONHASHSEED=0 \
    AFRIBENCH_SEED=42

WORKDIR /app

COPY requirements-eval.txt /app/requirements-eval.txt
RUN pip install --no-cache-dir -r /app/requirements-eval.txt

COPY configs /app/configs
COPY data /app/data
COPY scripts /app/scripts

# Volume conseillé pour persister les résultats
VOLUME ["/app/data/results"]

ENTRYPOINT ["python", "scripts/afribench.py"]
CMD ["leaderboard"]
