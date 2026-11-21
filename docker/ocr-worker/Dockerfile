FROM backend
USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-ron \
    && rm -rf /var/lib/apt/lists/*
COPY smoke/ /opt/ocr-worker/smoke/
USER www-data
WORKDIR /app
CMD ["sh", "/opt/ocr-worker/smoke/check.sh"]
