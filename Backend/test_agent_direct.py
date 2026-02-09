import asyncio
from agent import process_request # This returns the last event with content

async def main():
    prompt = "Explain the Pythagorean theorem and generate a Manim script for it."
    print(f"Testing Agent with prompt: {prompt}\n")
    
    try:
        # 1. Get the last event from the Orchestrator
        event = await process_request(prompt)
        print("-" * 30)
        
        if event is None:
            print("No event with content was returned.")
            return
        
        # 2. The ADK event has 'content.parts' directly (not candidates)
        if hasattr(event, 'content') and event.content and event.content.parts:
            for part in event.content.parts:
                if hasattr(part, 'function_call') and part.function_call:
                    fn_name = part.function_call.name
                    args = part.function_call.args
                    print(f"🚀 AGENT ACTION: Calling tool '{fn_name}'")
                    print(f"📊 ARGUMENTS: {args}")
                    
                    # Here is where you'd trigger the Manim render!
                    # await run_manim_tool(args['script_content'])
                
                if hasattr(part, 'text') and part.text:
                    print("📝 AGENT EXPLANATION:")
                    print(part.text)
        else:
            print(f"Event structure: {type(event)}")
            print(f"Event: {event}")
                
        print("-" * 30)
        
    except Exception as e:
        import traceback
        print(f"An error occurred: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
