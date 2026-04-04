import os
import glob
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
from crew import run_crew

app = FastAPI(
    title="ResearchCrew AI",
    description="A multi-agent LLM-powered research assistant built with CrewAI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

executor = ThreadPoolExecutor(max_workers=2)

# In-memory job store
jobs: dict = {}


class ResearchRequest(BaseModel):
    topic: str
    job_id: Optional[str] = None


class ResearchResponse(BaseModel):
    job_id: str
    status: str
    topic: str
    result: Optional[str] = None
    message: Optional[str] = None


def run_research_job(job_id: str, topic: str):
    jobs[job_id]["status"] = "running"
    output = run_crew(topic)
    jobs[job_id]["status"] = output["status"]
    jobs[job_id]["result"] = output["result"]


@app.get("/")
def root():
    return {
        "name": "ResearchCrew AI",
        "description": "Multi-agent research assistant powered by CrewAI + LLaMA3",
        "endpoints": {
            "POST /research": "Start a new research job",
            "GET /research/{job_id}": "Check job status",
            "GET /reports": "List all saved reports",
            "GET /health": "Health check",
        },
    }


@app.get("/health")
def health():
    groq_key = os.getenv("GROQ_API_KEY")
    return {
        "status": "ok",
        "groq_api_key_set": bool(groq_key),
    }


@app.post("/research", response_model=ResearchResponse)
async def start_research(request: ResearchRequest, background_tasks: BackgroundTasks):
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")

    import uuid
    job_id = request.job_id or str(uuid.uuid4())[:8]

    jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "topic": request.topic,
        "result": None,
    }

    background_tasks.add_task(run_research_job, job_id, request.topic)

    return ResearchResponse(
        job_id=job_id,
        status="queued",
        topic=request.topic,
        message=f"Research job started. Poll GET /research/{job_id} for results.",
    )


@app.post("/research/sync", response_model=ResearchResponse)
def start_research_sync(request: ResearchRequest):
    """Synchronous endpoint — waits for full completion (may take several minutes)."""
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")

    import uuid
    job_id = str(uuid.uuid4())[:8]
    output = run_crew(request.topic)

    return ResearchResponse(
        job_id=job_id,
        status=output["status"],
        topic=request.topic,
        result=output["result"],
    )


@app.get("/research/{job_id}", response_model=ResearchResponse)
def get_research_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    job = jobs[job_id]
    return ResearchResponse(
        job_id=job_id,
        status=job["status"],
        topic=job["topic"],
        result=job["result"],
    )


@app.get("/reports")
def list_reports():
    outputs_dir = os.path.join(os.path.dirname(__file__), "outputs")
    if not os.path.exists(outputs_dir):
        return {"reports": []}
    files = glob.glob(os.path.join(outputs_dir, "*.md"))
    reports = [
        {
            "filename": os.path.basename(f),
            "size_kb": round(os.path.getsize(f) / 1024, 2),
            "created": os.path.getctime(f),
        }
        for f in sorted(files, reverse=True)
    ]
    return {"reports": reports, "total": len(reports)}


@app.get("/reports/{filename}")
def get_report(filename: str):
    outputs_dir = os.path.join(os.path.dirname(__file__), "outputs")
    filepath = os.path.join(outputs_dir, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Report not found.")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    return {"filename": filename, "content": content}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
