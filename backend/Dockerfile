FROM python:3.11-slim

# Zainstaluj FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Kopiuj requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopiuj kod
COPY app.py .
COPY seed_admin.py .

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:5001/health')" || exit 1

# Uruchom aplikację
CMD ["python", "app.py"]
