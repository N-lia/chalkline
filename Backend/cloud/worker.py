"""
Cloud Run Worker for Manim Rendering
Downloads a script from GCS, renders a specific scene, uploads the result.
"""

import os
import sys
import subprocess
from google.cloud import storage


def render_scene(bucket_name: str, script_blob_name: str, scene_name: str):
    """
    Download script, render one scene, upload the result.
    
    Args:
        bucket_name: GCS bucket name
        script_blob_name: Path to the script in the bucket
        scene_name: The specific Scene class to render
    """
    # 1. Download the script from the "Blackboard"
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(script_blob_name)
    blob.download_to_filename("myscript.py")
    
    print(f"✓ Downloaded script from gs://{bucket_name}/{script_blob_name}")
    print(f"🎬 Rendering scene: {scene_name}...")

    # 2. Render ONLY that specific scene
    # -pql = preview quality low (480p15) - fast for testing
    # -pqh = preview quality high (1080p30) - for production
    # -pqk = 4K quality
    quality = os.environ.get("RENDER_QUALITY", "-pql")
    
    result = subprocess.run([
        "manim", quality, "myscript.py", scene_name,
        "--media_dir", "./media"
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Render failed: {result.stderr}")
        return
    
    print(f"✓ Render complete")

    # 3. Find the output video
    # Manim saves to media/videos/myscript/{quality}/{SceneName}.mp4
    quality_folders = {
        "-pql": "480p15",
        "-pqm": "720p30", 
        "-pqh": "1080p60",
        "-pqk": "2160p60"
    }
    quality_folder = quality_folders.get(quality, "480p15")
    output_path = f"./media/videos/myscript/{quality_folder}/{scene_name}.mp4"
    
    # Fallback: search for the file
    if not os.path.exists(output_path):
        for root, dirs, files in os.walk("./media"):
            for f in files:
                if f == f"{scene_name}.mp4":
                    output_path = os.path.join(root, f)
                    break
    
    if os.path.exists(output_path):
        # 4. Upload result back to the Bucket
        output_blob = bucket.blob(f"output/{scene_name}.mp4")
        output_blob.upload_from_filename(output_path)
        print(f"✓ Uploaded: gs://{bucket_name}/output/{scene_name}.mp4")
    else:
        print(f"❌ Error: Video file not found at {output_path}")
        # List what we do have
        print("Available files in media/:")
        for root, dirs, files in os.walk("./media"):
            for f in files:
                print(f"  {os.path.join(root, f)}")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python worker.py <BUCKET_NAME> <SCRIPT_PATH> <SCENE_NAME>")
        sys.exit(1)
    
    # Arguments can be passed comma-separated or as separate args
    if "," in sys.argv[1]:
        args = sys.argv[1].split(",")
        render_scene(args[0], args[1], args[2])
    else:
        render_scene(sys.argv[1], sys.argv[2], sys.argv[3])
