"""
Orchestrator for Parallel Manim Rendering
Uploads script to GCS, dispatches Cloud Run jobs, stitches results.
"""

import re
import os
import time
import subprocess
from typing import List, Optional
from google.cloud import storage


class ManimOrchestrator:
    """Orchestrates parallel Manim rendering on Cloud Run."""
    
    def __init__(
        self,
        project_id: str,
        bucket_name: str,
        region: str = "us-central1",
        job_name: str = "manim-render-job"
    ):
        self.project_id = project_id
        self.bucket_name = bucket_name
        self.region = region
        self.job_name = job_name
        self.storage_client = storage.Client()
        self.bucket = self.storage_client.bucket(bucket_name)
    
    def extract_scene_names(self, code: str) -> List[str]:
        """Extract Scene class names from Manim code."""
        # Match: class SceneName(Scene): or class SceneName(ThreeDScene):
        pattern = r'class\s+(\w+)\s*\(\s*(?:Scene|ThreeDScene|MovingCameraScene)\s*\)'
        scenes = re.findall(pattern, code)
        return scenes
    
    def upload_script(self, code: str, script_name: str = "render_script.py") -> str:
        """Upload the Manim script to GCS."""
        blob = self.bucket.blob(script_name)
        blob.upload_from_string(code)
        print(f"✓ Script uploaded to gs://{self.bucket_name}/{script_name}")
        return script_name
    
    def dispatch_render_job(self, script_name: str, scene_name: str) -> bool:
        """Dispatch a Cloud Run job for a single scene."""
        cmd = [
            "gcloud", "run", "jobs", "execute", self.job_name,
            "--args", f"{self.bucket_name},{script_name},{scene_name}",
            "--region", self.region,
            "--project", self.project_id,
            "--async"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"🚀 Dispatched render job for: {scene_name}")
            return True
        else:
            print(f"❌ Failed to dispatch {scene_name}: {result.stderr}")
            return False
    
    def wait_for_results(
        self,
        scene_names: List[str],
        timeout: int = 300,
        poll_interval: int = 10
    ) -> List[str]:
        """Wait for all scene videos to appear in GCS."""
        completed = []
        start_time = time.time()
        
        print(f"\n⏳ Waiting for {len(scene_names)} scenes to render...")
        
        while len(completed) < len(scene_names):
            if time.time() - start_time > timeout:
                print(f"⚠️ Timeout after {timeout}s. Got {len(completed)}/{len(scene_names)}")
                break
            
            for scene in scene_names:
                if scene not in completed:
                    blob = self.bucket.blob(f"output/{scene}.mp4")
                    if blob.exists():
                        completed.append(scene)
                        print(f"  ✓ {scene}.mp4 ready ({len(completed)}/{len(scene_names)})")
            
            if len(completed) < len(scene_names):
                time.sleep(poll_interval)
        
        return completed
    
    def download_videos(self, scene_names: List[str], output_dir: str = "./output") -> List[str]:
        """Download rendered videos from GCS."""
        os.makedirs(output_dir, exist_ok=True)
        downloaded = []
        
        for scene in scene_names:
            blob = self.bucket.blob(f"output/{scene}.mp4")
            local_path = os.path.join(output_dir, f"{scene}.mp4")
            
            try:
                blob.download_to_filename(local_path)
                downloaded.append(local_path)
                print(f"  ✓ Downloaded {scene}.mp4")
            except Exception as e:
                print(f"  ❌ Failed to download {scene}.mp4: {e}")
        
        return downloaded
    
    def stitch_videos(
        self,
        video_paths: List[str],
        output_path: str = "./final_video.mp4"
    ) -> Optional[str]:
        """Concatenate videos using ffmpeg."""
        if not video_paths:
            print("❌ No videos to stitch")
            return None
        
        # Create concat file for ffmpeg
        concat_file = "./concat_list.txt"
        with open(concat_file, "w") as f:
            for path in video_paths:
                f.write(f"file '{os.path.abspath(path)}'\n")
        
        # Run ffmpeg
        cmd = [
            "ffmpeg", "-y",  # Overwrite output
            "-f", "concat",
            "-safe", "0",
            "-i", concat_file,
            "-c", "copy",  # Copy streams (fast, no re-encoding)
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Cleanup
        os.remove(concat_file)
        
        if result.returncode == 0:
            print(f"✓ Final video saved: {output_path}")
            return output_path
        else:
            print(f"❌ FFmpeg failed: {result.stderr}")
            return None
    
    def render(
        self,
        code: str,
        script_name: str = "render_script.py",
        output_path: str = "./final_video.mp4",
        timeout: int = 300
    ) -> Optional[str]:
        """
        Full orchestration: upload, dispatch, wait, download, stitch.
        
        Args:
            code: The complete Manim Python code
            script_name: Name for the script in GCS
            output_path: Where to save the final video
            timeout: Max seconds to wait for renders
        
        Returns:
            Path to final stitched video, or None on failure
        """
        # 1. Extract scene names
        scene_names = self.extract_scene_names(code)
        if not scene_names:
            print("❌ No Scene classes found in code")
            return None
        
        print(f"📋 Found {len(scene_names)} scenes: {scene_names}")
        
        # 2. Upload script
        self.upload_script(code, script_name)
        
        # 3. Dispatch parallel jobs
        print(f"\n🚀 Dispatching {len(scene_names)} parallel render jobs...")
        for scene in scene_names:
            self.dispatch_render_job(script_name, scene)
        
        # 4. Wait for results
        completed = self.wait_for_results(scene_names, timeout=timeout)
        
        if not completed:
            print("❌ No renders completed")
            return None
        
        # 5. Download videos (in scene order for correct sequence)
        print(f"\n📥 Downloading {len(completed)} videos...")
        ordered_scenes = [s for s in scene_names if s in completed]
        video_paths = self.download_videos(ordered_scenes)
        
        # 6. Stitch
        print(f"\n🎬 Stitching {len(video_paths)} videos...")
        return self.stitch_videos(video_paths, output_path)


# CLI usage
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Orchestrate parallel Manim rendering")
    parser.add_argument("--project", required=True, help="GCP Project ID")
    parser.add_argument("--bucket", required=True, help="GCS Bucket name")
    parser.add_argument("--script", required=True, help="Path to Manim script file")
    parser.add_argument("--output", default="./final_video.mp4", help="Output video path")
    parser.add_argument("--timeout", type=int, default=300, help="Timeout in seconds")
    
    args = parser.parse_args()
    
    # Read the script
    with open(args.script, "r") as f:
        code = f.read()
    
    # Run orchestration
    orchestrator = ManimOrchestrator(
        project_id=args.project,
        bucket_name=args.bucket
    )
    
    result = orchestrator.render(
        code=code,
        output_path=args.output,
        timeout=args.timeout
    )
    
    if result:
        print(f"\n✅ Success! Final video: {result}")
    else:
        print("\n❌ Rendering failed")
