
import os
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.genai import types
from dotenv import load_dotenv
from google.adk.models.google_llm import Gemini
from functools import cached_property
from tools.doc_checker import query_manim_docs, search_manim_docs

load_dotenv()

def load_prompt(name):
    path = os.path.join(os.path.dirname(__file__), "prompts", f"{name}.md")
    if os.path.exists(path):
        with open(path, "r") as f:
            return f.read()
    return ""



class CustomGemini(Gemini):
    api_key: str

    @cached_property
    def api_client(self):
        from google import genai
        return genai.Client(
            api_key=self.api_key,
            http_options=types.HttpOptions(
                headers=self._tracking_headers(),
                retry_options=self.retry_options,
            )
        )

# Initialize Agents

tutor = LlmAgent(
    name="Tutor",
    model=CustomGemini(
        api_key=os.getenv("Tutor"), 
        model="gemini-2.5-flash"),
    instruction=load_prompt("tutor")
)

script_writer = LlmAgent(
    name="ScriptWriter",
    model=CustomGemini(
        api_key=os.getenv("ScriptWriter"), 
        model="gemini-2.5-flash"),
    instruction=load_prompt("script")
)

manim_coder = LlmAgent(
    name="ManimCoder",
    model=CustomGemini(
        api_key=os.getenv("ManimCoder"), 
        model="gemini-2.5-flash"),
    instruction=load_prompt("manim"),
    tools=[query_manim_docs, search_manim_docs]
)

# Orchestrator
orchestrator = LlmAgent(
    name="Orchestrator",
    model=CustomGemini(
        api_key=os.getenv("Orchestrator"), 
        model="gemini-2.5-flash"),
    instruction=load_prompt("orchestrator"),
    sub_agents=[tutor, script_writer, manim_coder]
)

# Create Runner with session service
session_service = InMemorySessionService()
runner = Runner(
    agent=orchestrator,
    app_name="Chalkline",
    session_service=session_service,
    auto_create_session=True
)

async def process_request(user_prompt: str):
    """
    Process the user prompt through the orchestrator agent using a Runner.
    Returns the last event that contains content, allowing the caller to
    inspect function_call parts and text directly.
    """
    last_event_with_content = None
    async for event in runner.run_async(
        user_id="user-1",
        session_id="session-1",
        new_message=types.Content(
            role="user",
            parts=[types.Part(text=user_prompt)]
        )
    ):
        # Track the last event that has content (for structured parsing)
        if hasattr(event, 'content') and event.content:
            last_event_with_content = event
    
    return last_event_with_content