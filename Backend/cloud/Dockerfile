FROM manimcommunity/manim:latest

# Switch to root to install dependencies
USER root

# Install Google Cloud Storage client
RUN pip install google-cloud-storage

# Copy our worker script
COPY worker.py /app/worker.py

WORKDIR /app

# Set entrypoint (runs when container starts)
ENTRYPOINT ["python", "/app/worker.py"]
