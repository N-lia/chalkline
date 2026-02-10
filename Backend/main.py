from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import runner
import os
from dotenv import load_dotenv
from google.genai import types

load_dotenv()

app = FastAPI()

# CORS — allow the frontend dev server to call the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PromptRequest(BaseModel):
    prompt: str
    user_id: str = "default_user"
    session_id: str = "default_session"


@app.post("/api/agent")
async def process_prompt(request: PromptRequest):
    """
    Receive a user prompt and return the orchestrator agent's response.
    Reuses the Runner defined in agent.py (which holds session state).
    """
    try:
        response_text = ""
        async for event in runner.run_async(
            user_id=request.user_id,
            session_id=request.session_id,
            new_message=types.Content(
                role="user",
                parts=[types.Part(text=request.prompt)]
            )
        ):
            if hasattr(event, 'content') and event.content:
                for part in event.content.parts:
                    if hasattr(part, 'text') and part.text:
                        response_text += part.text

        return {"response": response_text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health_check():
    return {"status": "ok"}
