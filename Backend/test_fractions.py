"""
Test the full pipeline for explaining fractions.
"""
import asyncio
from agent import runner
from google.genai import types

async def test_fractions():
    prompt = """Create a complete educational video about fractions. 
Explain:
1. What a fraction represents (part of a whole)
2. How to visualize fractions using shapes
3. Adding two simple fractions like 1/4 + 1/4 = 2/4 = 1/2

Keep the animations simple and clear for beginners."""

    print("=" * 70)
    print(f"🎯 PROMPT: {prompt}")
    print("=" * 70)
    print()

    event_count = 0
    
    try:
        async for event in runner.run_async(
            user_id="user-fractions",
            session_id="session-fractions",
            new_message=types.Content(
                role="user",
                parts=[types.Part(text=prompt)]
            )
        ):
            event_count += 1
            print(f"\n{'─' * 60}")
            print(f"📦 EVENT #{event_count}: {type(event).__name__}")
            
            if hasattr(event, 'author'):
                print(f"   👤 Author: {event.author}")
            
            if hasattr(event, 'content') and event.content:
                for part in event.content.parts:
                    if hasattr(part, 'text') and part.text:
                        text_preview = part.text[:500] + "..." if len(part.text) > 500 else part.text
                        print(f"   📝 TEXT:\n      {text_preview}")
                    if hasattr(part, 'function_call') and part.function_call:
                        fc = part.function_call
                        args_preview = str(fc.args)[:100] + "..." if len(str(fc.args)) > 100 else str(fc.args)
                        print(f"   🔧 TOOL CALL: {fc.name}")
                        print(f"      Args: {args_preview}")
                    if hasattr(part, 'function_response') and part.function_response:
                        fr = part.function_response
                        result_preview = str(fr.response)[:300] + "..." if len(str(fr.response)) > 300 else str(fr.response)
                        print(f"   📥 TOOL RESPONSE: {fr.name}")
                        print(f"      Result: {result_preview}")
                        
                        # Check for render success
                        if fr.name == "render_manim_code" and "success" in str(fr.response):
                            print("\n   🎬 RENDER SUCCESS!")
    
    except Exception as e:
        print(f"\n⚠️ Error: {e}")
    
    print()
    print("=" * 70)
    print(f"✅ FRACTIONS TEST COMPLETE - {event_count} events processed")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(test_fractions())
