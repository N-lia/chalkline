
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from agent import process_request
import uvicorn
import os

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):
    prompt: str

@app.get("/")
def read_root():
    return {"status": "Chalkline Backend Online"}

@app.post("/api/agent")
async def run_agent(request: PromptRequest):
    try:
        # Pass the prompt to the agent logic
        response = await process_request(request.prompt)
        
        # Parse JSON if agent returns a string
        if isinstance(response, str):
            import json
            import re
            # Clean markdown formatting like ```json ... ```
            clean = re.sub(r'```(?:json)?\n?|\n?```', '', response).strip()
            try:
                return json.loads(clean)
            except json.JSONDecodeError:
                # Return structured response if parsing fails
                return {"status": "success", "raw_response": response}
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=6000, reload=True)
