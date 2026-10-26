FROM jfrog.petrobras.dev.br/docker-hosted-releases/petrobras/s11193/imagens-base/petro-python3.12-slim:latest

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app

WORKDIR /app

ARG BUILD_VERSION=local

LABEL org.opencontainers.image.title="Armazenamento Científico Back-end" \
      org.opencontainers.image.version="${BUILD_VERSION}" \
      org.opencontainers.image.source="tecnologiawebnetsystem/armazenamento_cientifico"

RUN groupadd --system app && \
    useradd --system --gid app --home-dir /app app

COPY requirements.txt ./

RUN pip install --upgrade pip && \
    pip install \
      --index-url https://jfrog.petrobras.dev.br/artifactory/api/pypi/pypi-group-all/simple \
      --trusted-host jfrog.petrobras.dev.br \
      -r requirements.txt

COPY --chown=app:app . .

USER app

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]