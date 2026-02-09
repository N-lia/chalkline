# Cloud Run Parallel Manim Rendering

## Quick Setup

### Prerequisites
- Google Cloud SDK installed (`gcloud`)
- Docker installed (for local testing)
- FFmpeg installed (for video stitching)
- A GCP project with billing enabled

### 1. Create GCS Bucket

```bash
export PROJECT_ID=$(gcloud config get-value project)
export BUCKET_NAME="chalkline-render-${PROJECT_ID}"

# Create the bucket
gsutil mb -l us-central1 gs://${BUCKET_NAME}
```

### 2. Build & Push Worker Image

```bash
cd Backend/cloud

# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/${PROJECT_ID}/manim-worker .
```

### 3. Create Cloud Run Job

```bash
gcloud run jobs create manim-render-job \
    --image gcr.io/${PROJECT_ID}/manim-worker \
    --region us-central1 \
    --tasks 1 \
    --memory 2Gi \
    --cpu 1 \
    --max-retries 1
```

### 4. Run the Orchestrator

```bash
# From Backend directory
python cloud/orchestrator.py \
    --project ${PROJECT_ID} \
    --bucket ${BUCKET_NAME} \
    --script path/to/manim_script.py \
    --output final_video.mp4
```

## Architecture

```
┌─────────────┐     ┌─────────────────┐
│ Orchestrator│────▶│   GCS Bucket    │
│  (Local)    │     │ (Shared Board)  │
└──────┬──────┘     └────────┬────────┘
       │                     │
       │ dispatch            │ read script
       ▼                     ▼
┌──────────────────────────────────────┐
│         Cloud Run Jobs (N)           │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │
│  │ S1 │ │ S2 │ │ S3 │ │ S4 │ │... │ │
│  └──┬─┘ └──┬─┘ └──┬─┘ └──┬─┘ └──┬─┘ │
└─────│──────│──────│──────│──────│───┘
      │      │      │      │      │
      ▼      ▼      ▼      ▼      ▼
┌─────────────────────────────────────┐
│   GCS: output/*.mp4 (N videos)      │
└──────────────────┬──────────────────┘
                   │ download
                   ▼
            ┌─────────────┐
            │   FFmpeg    │
            │  (Stitch)   │
            └──────┬──────┘
                   │
                   ▼
            final_video.mp4
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RENDER_QUALITY` | Manim quality flag | `-pql` (480p) |

Quality options:
- `-pql` = 480p15 (fastest, for testing)
- `-pqm` = 720p30
- `-pqh` = 1080p60 (production)
- `-pqk` = 2160p60 (4K)

## Troubleshooting

**Job not starting?**
```bash
gcloud run jobs executions list --job manim-render-job --region us-central1
```

**Check logs:**
```bash
gcloud run jobs executions logs manim-render-job --region us-central1
```

**Bucket permissions:**
```bash
# Grant Cloud Run service account access
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${PROJECT_ID}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"
```
