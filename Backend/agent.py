
import os
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.genai import types
from dotenv import load_dotenv
from google.adk.models.lite_llm import LiteLlm
from tools.doc_checker import query_manim_docs, search_manim_docs
from tools.cloud_render import render_manim_code, check_render_status, stitch_cloud_video

load_dotenv()

# Get OpenAI API key from environment
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

def load_prompt(name):
    path = os.path.join(os.path.dirname(__file__), "prompts", f"{name}.md")
    if os.path.exists(path):
        with open(path, "r") as f:
            return f.read()
    return ""


# Helper to create OpenAI model via LiteLLM
def openai_model(model_name: str = "gpt-4o"):
    """Create an OpenAI model using LiteLLM adapter."""
    return LiteLlm(
        model=f"openai/{model_name}",
        api_key=OPENAI_API_KEY
    )


# Initialize Agents - ALL using OpenAI now
# Agent Hierarchy: Central Orchestrator
# Orchestrator manages optimal flow between specialized agents

# 1. Specialized Agents (Leaf nodes)
manim_coder = LlmAgent(
    name="ManimCoder",
    model=openai_model("gpt-5.2"),
    instruction=load_prompt("manim"),
    tools=[query_manim_docs, search_manim_docs, render_manim_code, check_render_status, stitch_cloud_video]
)

script_writer = LlmAgent(
    name="ScriptWriter",
    model=openai_model("gpt-4o"),
    instruction=load_prompt("script")
)

tutor = LlmAgent(
    name="Tutor",
    model=openai_model("gpt-4o"),
    instruction=load_prompt("tutor")
)

# 2. Orchestrator (Root)
# Controls the entire flow and hands off to specialists
orchestrator = LlmAgent(
    name="Orchestrator",
    model=openai_model("gpt-4o"),
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