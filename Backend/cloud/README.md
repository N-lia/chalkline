# Blaxel Manim Rendering

This directory contains the worker service for rendering Manim scenes on Blaxel.

## Components
- `worker.py`: FastAPI service that handles `/render` and `/stitch` requests.
- `Dockerfile`: Builds the environment with Manim, Ffmpeg, and Python dependencies.

## Deployment
The service is deployed via `blaxel deploy` using the `blaxel.config.yaml` in the parent directory.

## Configuration
The worker needs access to:
- GCP Project ID
- GCS Bucket Name
- Google Cloud Credentials (via Blaxel secrets or built-in identity)

## API Usage
### Render Scene
POST `/render`
```json
{
  "bucket": "my-bucket",
  "script": "script.py",
  "scene": "SceneName"
}
```

### Stitch Videos
POST `/stitch`
```json
{
  "bucket": "my-bucket",
  "scenes": "Scene1,Scene2,Scene3"
}
```
