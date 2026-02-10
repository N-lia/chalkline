"""
Manim Cloud Render Tool
Allows the agent to trigger parallel cloud rendering of Manim code.
"""

import os
import re
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Configuration from environment
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")


def render_manim_code(manim_code: str, prefer_local: bool = False) -> Dict[str, Any]:
    """
    Tool function to render Manim code. Automatically falls back to local rendering
    when cloud isn't available.
    
    This function first tries Blaxel parallel rendering for speed.
    If cloud isn't configured or fails, it falls back to local sequential rendering.
    
    Args:
        manim_code: Complete Python code containing Manim Scene classes
        prefer_local: If True, skip cloud and render locally immediately
    
    Returns:
        Dictionary with render status, scene count, and output info
    """
    import subprocess
    import tempfile
    import os
    
    # Extract scene names first
    scene_pattern = r'class\s+(\w+)\s*\(\s*(?:Scene|ThreeDScene|MovingCameraScene)\s*\)'
    scene_names = re.findall(scene_pattern, manim_code)
    
    if not scene_names:
        return {
            "status": "error",
            "message": "No Scene classes found in the code"
        }
    
    # Try cloud rendering first (if configured and not preferring local)
    BLAXEL_RENDERER_URL = os.getenv("BLAXEL_RENDERER_URL")
    
    if not prefer_local and BLAXEL_RENDERER_URL and GCS_BUCKET_NAME:
        try:
            import requests
            from google.cloud import storage
            
            # 1. Upload to GCS
            client = storage.Client()
            bucket = client.bucket(GCS_BUCKET_NAME)
            script_name = "agent_render.py"
            blob = bucket.blob(script_name)
            blob.upload_from_string(manim_code)
            
            # 2. Dispatch Blaxel requests
            dispatched = []
            errors = []
            
            for scene in scene_names:
                try:
                    resp = requests.post(f"{BLAXEL_RENDERER_URL}/render", json={
                        "bucket": GCS_BUCKET_NAME,
                        "script": script_name,
                        "scene": scene
                    }, timeout=10)
                    
                    if resp.status_code == 200:
                        dispatched.append(scene)
                    else:
                        errors.append(f"{scene}: {resp.text}")
                except Exception as e:
                    errors.append(f"{scene}: {str(e)}")
            
            if dispatched:
                return {
                    "status": "success",
                    "mode": "cloud",
                    "message": f"Dispatched {len(dispatched)} render jobs to Blaxel",
                    "scenes": dispatched,
                    "errors": errors,
                    "bucket": GCS_BUCKET_NAME,
                    "output_path": f"gs://{GCS_BUCKET_NAME}/output/",
                    "estimated_time": "45-60 seconds for parallel rendering",
                    "next_step": "Use check_render_status() then stitch_cloud_video()"
                }
            else:
                 cloud_error = f"Failed to dispatch to Blaxel: {errors}"
                 
        except Exception as e:
            # Cloud failed, will fall back to local
            cloud_error = str(e)
    else:
        if not BLAXEL_RENDERER_URL:
             cloud_error = "BLAXEL_RENDERER_URL not configured"
        else:
             cloud_error = "Cloud not configured or local preferred"
    
    # Fall back to LOCAL RENDERING
    output_dir = os.path.join(os.path.dirname(__file__), "..", "output")
    output_dir = os.path.abspath(output_dir)
# ... (rest of local rendering is identical) ...


def stitch_cloud_video(scene_names: list[str]) -> Dict[str, Any]:
    """
    Dispatch a cloud job to stitch rendered scenes together using ffmpeg.
    
    Args:
        scene_names: List of scene names in the order they should appear.
    
    Returns:
        Status dictionary with job info.
    """
    BLAXEL_RENDERER_URL = os.getenv("BLAXEL_RENDERER_URL")
    if not BLAXEL_RENDERER_URL or not GCS_BUCKET_NAME:
        return {"status": "error", "message": "Cloud/Blaxel not configured"}
        
    try:
        import requests
        scenes_str = ",".join(scene_names)
        
        resp = requests.post(f"{BLAXEL_RENDERER_URL}/stitch", json={
            "bucket": GCS_BUCKET_NAME,
            "scenes": scenes_str
        }, timeout=10)
        
        if resp.status_code == 200:
            return {
                "status": "success",
                "message": "Stitching job dispatched to Blaxel",
                "final_url": f"gs://{GCS_BUCKET_NAME}/output/final_video.mp4"
            }
        else:
            return {"status": "error", "message": f"Failed to dispatch stitch job: {resp.text}"}
            
    except Exception as e:
        return {"status": "error", "message": str(e)}


def check_render_status() -> Dict[str, Any]:
    """
    Check the status of rendered videos in GCS.
    
    Returns:
        Dictionary with list of completed videos and their URLs
    """
    if not GCS_BUCKET_NAME:
        return {"status": "error", "message": "GCS_BUCKET_NAME not configured"}
    
    try:
        from google.cloud import storage
        
        client = storage.Client()
        bucket = client.bucket(GCS_BUCKET_NAME)
        
        # List all videos in output/
        blobs = bucket.list_blobs(prefix="output/")
        videos = []
        final_video_ready = False
        
        for blob in blobs:
            if blob.name.endswith(".mp4"):
                name = blob.name.replace("output/", "")
                if name == "final_video.mp4":
                    final_video_ready = True
                
                videos.append({
                    "name": name,
                    "url": f"gs://{GCS_BUCKET_NAME}/{blob.name}",
                    "size_mb": round(blob.size / (1024 * 1024), 2) if blob.size else 0
                })
        
        return {
            "status": "success",
            "completed_videos": len(videos),
            "final_video_ready": final_video_ready,
            "videos": videos
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}


def get_final_video_url() -> str:
    """
    Get the URL where the stitched final video will be available.
    
    Returns:
        GCS URL or local path for the final video
    """
    if GCS_BUCKET_NAME:
        return f"gs://{GCS_BUCKET_NAME}/output/final_video.mp4"
    return "./final_video.mp4"


# For local testing without cloud
def render_manim_locally(manim_code: str, output_dir: str = "./output") -> Dict[str, Any]:
    """
    Fallback: Render Manim code locally (sequential, slower).
    
    Args:
        manim_code: Complete Python code
        output_dir: Where to save videos
    
    Returns:
        Dictionary with render status
    """
    import subprocess
    import tempfile
    import os
    
    # Extract scenes
    scene_pattern = r'class\s+(\w+)\s*\(\s*(?:Scene|ThreeDScene|MovingCameraScene)\s*\)'
    scene_names = re.findall(scene_pattern, manim_code)
    
    if not scene_names:
        return {"status": "error", "message": "No Scene classes found"}
    
    # Write code to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(manim_code)
        script_path = f.name
    
    os.makedirs(output_dir, exist_ok=True)
    rendered = []
    
    try:
        for scene in scene_names:
            cmd = [
                "manim", "-pql", script_path, scene,
                "--media_dir", output_dir
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                rendered.append(scene)
        
        return {
            "status": "success",
            "message": f"Rendered {len(rendered)}/{len(scene_names)} scenes locally",
            "scenes": rendered,
            "output_dir": output_dir
        }
    finally:
        os.unlink(script_path)
