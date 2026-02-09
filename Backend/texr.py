import os
from google.adk.agents.llm_agent import LlmAgent
from google.adk.apps.app import App
from google.adk.models.lite_llm import LiteLlm # Assuming LiteLlm is available and supports custom API keys

# --- Agent 1 with API Key 1 ---
# You might set environment variables or pass API keys directly if the LLM wrapper supports it.
# For demonstration, let's assume LiteLlm can take an api_key argument.
# In a real scenario, you'd configure LiteLlm for a specific provider (e.g., OpenAI, Anthropic).
agent1_api_key = "YOUR_AGENT_1_API_KEY"
agent1_llm_instance = LiteLlm(model="openai/gpt-3.5-turbo", api_key=agent1_api_key)

agent1 = LlmAgent(
    name="agent-one",
    description="An agent using its own API key for OpenAI.",
    instruction="You are a helpful assistant specialized in coding questions.",
    model=agent1_llm_instance, # Pass the LiteLlm instance directly
)

# --- Agent 2 with API Key 2 ---
agent2_api_key = "YOUR_AGENT_2_API_KEY"
agent2_llm_instance = LiteLlm(model="anthropic/claude-3-haiku", api_key=agent2_api_key)

agent2 = LlmAgent(
    name="agent-two",
    description="An agent using its own API key for Anthropic.",
    instruction="You are a helpful assistant specialized in creative writing.",
    model=agent2_llm_instance, # Pass another LiteLlm instance
)

# --- Multi-agent setup (e.g., a SequentialAgent or ParallelAgent) ---
# You would then integrate these LlmAgents into a multi-agent structure.
# For example, using a SequentialAgent or ParallelAgent as described in
# [Specialized Agent Types](#core-agent-framework-specialized-agent-types).
from google.adk.agents.sequential_agent import SequentialAgent

orchestrator_agent = SequentialAgent(
    name="orchestrator",
    description="Orchestrates Agent One and Agent Two.",
    sub_agents=[agent1, agent2],
)

app = App(name="multi-api-key-app", root_agent=orchestrator_agent)

async def run_multi_agent_test():
    from google.adk.runners.console_runner import ConsoleRunner
    runner = ConsoleRunner(app)
    print(f"Multi-agent app '{app.name}' is ready. Type 'exit' to quit.")
    await runner.run()

if __name__ == "__main__":
    import asyncio
    # In a real scenario, ensure your API keys are properly loaded from secure storage.
    # For this example, replace placeholders or ensure environment variables are set.
    if "YOUR_AGENT_1_API_KEY" in agent1_api_key or "YOUR_AGENT_2_API_KEY" in agent2_api_key:
        print("Please replace API key placeholders with actual keys.")
    else:
        asyncio.run(run_multi_agent_test())

