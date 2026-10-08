# ============================================================
# Multi-Stage Production Dockerfile for Render Deployment
# Stage 1: Node.js Next.js + Tailwind + shadcn/ui Builder
# Stage 2: Python 3.12 FastAPI + Data Warehouse + ML Runtime
# ============================================================

# --- Stage 1: Build Next.js Static Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/next-frontend

# Install dependencies
COPY next-frontend/package*.json ./
RUN npm install

# Copy source and build static export
COPY next-frontend/ ./
RUN npm run build

# --- Stage 2: Python Runtime & FastAPI Backend ---
FROM python:3.12-slim AS runner
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Install system dependencies if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend, ml, database, scripts
COPY backend/ ./backend/
COPY ml/ ./ml/
COPY database/ ./database/
COPY scripts/ ./scripts/
COPY tests/ ./tests/
COPY README.md ./

# Copy built Next.js static files from Stage 1
COPY --from=frontend-builder /app/next-frontend/out ./next-frontend/out

# Expose port (Render sets $PORT dynamically)
EXPOSE 8000

# Start FastAPI serving both REST APIs and the Next.js frontend
CMD sh -c "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"
