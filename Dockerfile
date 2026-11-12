# 多阶段构建：前端静态产物 + Python 3.11 轻量运行镜像
# 固定 Python 3.11 以避开 ctranslate2 在 3.13 上可能缺少预编译 wheel 的问题。

# ---- Stage 1: 构建前端 ----
FROM node:20-alpine AS web-build
WORKDIR /build
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

# ---- Stage 2: 运行后端 ----
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_HOST=0.0.0.0 \
    APP_PORT=8000 \
    STATIC_DIR=/app/web/dist \
    PYTHONPATH=/app/server

WORKDIR /app

# 核心 + edge-tts（无本地模型、体积最小）；argostranslate 作为可选构建参数
ARG INSTALL_ARGOS=false
COPY server/requirements.txt server/requirements-optional.txt /app/server/
RUN pip install --no-cache-dir -r /app/server/requirements.txt \
    && pip install --no-cache-dir edge-tts==7.3.1 \
    && if [ "$INSTALL_ARGOS" = "true" ]; then \
         pip install --no-cache-dir argostranslate==1.11.1 ; \
       fi

COPY server/app /app/server/app
COPY server/scripts /app/server/scripts
COPY docs /app/docs
COPY vendor/README.md /app/vendor/README.md
COPY --from=web-build /build/dist /app/web/dist

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=8s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=5)" || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "/app/server"]
