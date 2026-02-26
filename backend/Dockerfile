# ── 依赖安装阶段 ────────────────────────────────────────────
FROM python:3.11-slim AS builder

# 安装 uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# 先复制依赖声明文件，利用 Docker 层缓存
COPY pyproject.toml uv.lock ./

# 仅安装生产依赖（排除 dev/terminal 可选组），写入 /app/.venv
RUN uv sync --frozen --no-dev

# ── 运行阶段 ─────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# 安装 uv（用于 uv run 启动）
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# 从 builder 复制虚拟环境
COPY --from=builder /app/.venv /app/.venv

# 复制依赖声明（uv run 需要）
COPY --from=builder /app/pyproject.toml /app/uv.lock ./

# 复制项目源码（构建上下文为项目根目录）
COPY backend/ ./backend/
COPY src/ ./src/

# 激活虚拟环境
ENV VIRTUAL_ENV=/app/.venv
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
