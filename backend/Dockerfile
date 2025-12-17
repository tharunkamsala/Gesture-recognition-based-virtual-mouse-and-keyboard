FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and PyAutoGUI
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV DISPLAY=:99

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run with Xvfb for headless display (needed for PyAutoGUI)
CMD ["sh", "-c", "Xvfb :99 -screen 0 1920x1080x24 & uvicorn main:app --host 0.0.0.0 --port 8000"]
