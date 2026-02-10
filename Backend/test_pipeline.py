"""
Full Pipeline Test - Traces all agent handoffs and events
Tests ManimCoder flow with animation generation
"""

import asyncio
from agent import runner
from google.genai import types

async def test_pipeline():
    prompt = "Create a complete educational video about the quadratic formula. I need the full pipeline: explanation, storyboard, and runnable Manim Python code."
    print("=" * 70)

    print(f"🎯 PROMPT: {prompt}")
    print("=" * 70)
    print()
    
    event_count = 0
    
    async for event in runner.run_async(
        user_id="test-user",
        session_id="test-session-2",
        new_message=types.Content(
            role="user",
            parts=[types.Part(text=prompt)]
        )
    ):
        event_count += 1
        event_type = type(event).__name__
        
        # Print event header
        print(f"\n{'─' * 60}")
        print(f"📦 EVENT #{event_count}: {event_type}")
        
        # Check for agent name (handoff indicator)
        if hasattr(event, 'author'):
            print(f"   👤 Author: {event.author}")
        
        if hasattr(event, 'agent_name'):
            print(f"   🤖 Agent: {event.agent_name}")
        
        # Check for function calls (tool usage)
        if hasattr(event, 'content') and event.content and event.content.parts:
            for i, part in enumerate(event.content.parts):
                if hasattr(part, 'function_call') and part.function_call:
                    print(f"   🔧 TOOL CALL: {part.function_call.name}")
                    args_str = str(part.function_call.args)
                    if len(args_str) > 200:
                        args_str = args_str[:200] + "..."
                    print(f"      Args: {args_str}")
                
                if hasattr(part, 'function_response') and part.function_response:
                    print(f"   📥 TOOL RESPONSE: {part.function_response.name}")
                    resp_str = str(part.function_response.response)
                    if len(resp_str) > 300:
                        resp_str = resp_str[:300] + "..."
                    print(f"      Result: {resp_str}")
                
                if hasattr(part, 'text') and part.text:
                    text = part.text
                    if len(text) > 500:
                        text = text[:500] + "...[truncated]"
                    print(f"   📝 TEXT:")
                    for line in text.split('\n')[:15]:
                        print(f"      {line}")
                    if text.count('\n') > 15:
                        print("      ...[more lines]")
        
        # Check for transfer events
        if hasattr(event, 'actions'):
            for action in event.actions:
                if hasattr(action, 'transfer_to_agent'):
                    print(f"   🔀 HANDOFF TO: {action.transfer_to_agent}")
    
    print(f"\n{'=' * 70}")
    print(f"✅ PIPELINE COMPLETE - {event_count} events processed")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(test_pipeline())
