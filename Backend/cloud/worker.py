from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import os
import sys
import subprocess
from google.cloud import storage
import shutil

app = FastAPI()

class RenderRequest(BaseModel):
    bucket: str
    script: str
    scene: str

class StitchRequest(BaseModel):
    bucket: str
    scenes: str

@app.post("/render")
async def render_endpoint(req: RenderRequest, background_tasks: BackgroundTasks):
    try:
        background_tasks.add_task(render_scene, req.bucket, req.script, req.scene)
        return {"status": "accepted", "scene": req.scene, "message": "Render started in background"}
    except Exception as e:
        print(f"Error queuing render: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stitch")
async def stitch_endpoint(req: StitchRequest, background_tasks: BackgroundTasks):
    try:
        background_tasks.add_task(stitch_videos, req.bucket, req.scenes)
        return {"status": "accepted", "message": "Stitching started in background"}
    except Exception as e:
        print(f"Error queuing stitch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok"}


def render_scene(bucket_name: str, script_blob_name: str, scene_name: str):
    """
    Download script, render one scene, upload the result.
    """
    # 1. Download the script
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(script_blob_name)
    blob.download_to_filename("myscript.py")
    
    print(f"✓ Downloaded script from gs://{bucket_name}/{script_blob_name}")
    print(f"🎬 Rendering scene: {scene_name}...")

    # 2. Render
    quality = os.environ.get("RENDER_QUALITY", "-pql")
    
    result = subprocess.run([
        "manim", quality, "myscript.py", scene_name,
        "--media_dir", "./media"
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Render failed: {result.stderr}")
        raise Exception(f"Manim failed: {result.stderr}")
    
    print(f"✓ Render complete")

    # 3. Find output
    quality_folders = {
        "-pql": "480p15",
        "-pqm": "720p30", 
        "-pqh": "1080p60",
        "-pqk": "2160p60"
    }
    quality_folder = quality_folders.get(quality, "480p15")
    output_path = f"./media/videos/myscript/{quality_folder}/{scene_name}.mp4"
    
    if not os.path.exists(output_path):
        for root, dirs, files in os.walk("./media"):
            for f in files:
                if f == f"{scene_name}.mp4":
                    output_path = os.path.join(root, f)
                    break
    
    if os.path.exists(output_path):
        # 4. Upload result
        output_blob = bucket.blob(f"output/{scene_name}.mp4")
        output_blob.upload_from_filename(output_path)
        print(f"✓ Uploaded: gs://{bucket_name}/output/{scene_name}.mp4")
    else:
        raise Exception(f"Video file not found at {output_path}")


def stitch_videos(bucket_name: str, scene_names: str):
    """
    Download multiple scene videos and stitch them together.
    """
    if not shutil.which("ffmpeg"):
        raise Exception("ffmpeg not found!")

    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    scenes = scene_names.split(",")
    
    print(f"🧵 Stitching {len(scenes)} scenes...")
    
    # Prepare list for ffmpeg
    with open("input.txt", "w") as f:
        for i, scene in enumerate(scenes):
            blob_name = f"output/{scene}.mp4"
            local_path = f"scene_{i}.mp4"
            
            blob = bucket.blob(blob_name)
            if not blob.exists():
                print(f"⚠️ Warning: {blob_name} does not exist in bucket!")
                continue
                
            blob.download_to_filename(local_path)
            f.write(f"file '{local_path}'\n")
            print(f"✓ Downloaded {blob_name}")

    # Run ffmpeg concat
    print("🎬 Running ffmpeg...")
    subprocess.run([
        "ffmpeg", "-f", "concat", "-safe", "0", "-i", "input.txt",
        "-c", "copy", "final_video.mp4", "-y"
    ], check=True)
    
    if os.path.exists("final_video.mp4"):
        output_blob = bucket.blob("output/final_video.mp4")
        output_blob.upload_from_filename("final_video.mp4")
        print(f"✅ Stitched video uploaded to: gs://{bucket_name}/output/final_video.mp4")
    else:
        raise Exception("Stitching failed - output file not created")


