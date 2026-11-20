FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-ron \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/ocr-worker
COPY smoke/ ./smoke/
CMD ["sh", "smoke/check.sh"]
