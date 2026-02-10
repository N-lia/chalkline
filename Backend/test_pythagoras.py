"""
Test the full pipeline for explaining Pythagorean Theorem with active driver loop.
"""
import asyncio
from agent import runner
from google.genai import types

async def test_pythagoras():
    initial_prompt = """Create a complete educational video about the Pythagorean Theorem.
Explain:
1. What the theorem states: a² + b² = c²
2. Show a right triangle with sides a, b, and hypotenuse c
3. Visualize the proof using squares on each side
4. A simple example: 3² + 4² = 5² (the 3-4-5 triangle)

Keep animations simple and clear for visual learners."""

    print("=" * 70)
    print(f"🎯 INITIAL PROMPT: {initial_prompt}")
    print("=" * 70)
    print()

    # We will drive the conversation through stages
    prompts = [initial_prompt]
    
    # State tracking
    has_explanation = False
    has_storyboard = False
    has_video = False
    
    step = 0
    max_steps = 3 # 1. Explain, 2. Storyboard, 3. Code
    
    while prompts and step < max_steps:
        current_prompt = prompts.pop(0)
        print(f"\n🚀 SENDING PROMPT: {current_prompt[:100]}...")
        
        step_output = ""
        
        # Retry loop for Rate Limits
        max_retries = 3
        retry_delay = 5
        
        for attempt in range(max_retries):
            try:
                async for event in runner.run_async(
                    user_id="user-pythagoras",
                    session_id="session-pythagoras",
                    new_message=types.Content(
                        role="user",
                        parts=[types.Part(text=current_prompt)]
                    )
                ):
                    if hasattr(event, 'content') and event.content:
                        for part in event.content.parts:
                            if hasattr(part, 'text') and part.text:
                                print(f"   📝 TEXT: {part.text[:100]}...")
                                step_output += part.text
                            if hasattr(part, 'function_response') and part.function_response:
                                fr = part.function_response
                                if fr.name == "render_manim_code" and "success" in str(fr.response):
                                    print("\n   🎬 RENDER SUCCESS!")
                                    has_video = True
                break # Success, exit retry loop
            except Exception as e:
                if "429" in str(e) or "Rate limit" in str(e):
                    print(f"\n⚠️ Rate limit hit. Retrying in {retry_delay}s... (Attempt {attempt+1}/{max_retries})")
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2 # Exponential backoff
                else:
                    raise e # Re-raise other errors

        # Analyze output to decide next step
        if not has_explanation and "Pythagorean Theorem" in step_output:
            print("\n✅ DETECTED EXPLANATION")
            has_explanation = True
            prompts.append("Great explanation. Now create a detailed Storyboard JSON for this.")
            step += 1
            
        elif has_explanation and not has_storyboard and "{" in step_output and "scene" in step_output.lower():
            print("\n✅ DETECTED STORYBOARD")
            has_storyboard = True
            prompts.append("Great storyboard. Now generate the Manim code and RENDER it.")
            step += 1
            
        elif has_storyboard and not has_video and has_video: # wait, has_video is set in loop
            print("\n✅ DETECTED VIDEO RENDER")
            break
            
    print()
    print("=" * 70)
    print(f"✅ TEST COMPLETE")
    print(f"Explanation: {has_explanation}")
    print(f"Storyboard: {has_storyboard}")
    print(f"Video: {has_video}")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(test_pythagoras())
