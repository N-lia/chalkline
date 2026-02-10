FROM manimcommunity/manim:latest

# Switch to root to install dependencies
USER root

# Install Google Cloud Storage client
# Install Google Cloud Storage client and FastAPI/Uvicorn for Blaxel
RUN pip install google-cloud-storage fastapi uvicorn python-multipart

# Copy our worker script
COPY worker.py /app/worker.py

WORKDIR /app

# Set entrypoint (runs web server)
ENTRYPOINT ["uvicorn", "worker:app", "--host", "0.0.0.0", "--port", "8000"]
