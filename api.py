import os
import glob
import uuid
import json
import asyncio
import logging
import time
from pathlib import Path
from typing import Optional, AsyncIterator

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator

from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from crew import run_crew
from run_history import save_run, get_history

# ── Structured logging ───────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("researchcrew.api")

# ── Startup env validation ───────────────────────────────────────
def _validate_env() -> None:
    missing = [v for v in ("GROQ_API_KEY",) if not os.getenv(v)]
    if missing:
        log.critical("Missing required environment variables: %s", missing)
        raise RuntimeError(
            f"Required env vars not set: {missing}. "
            "Add them to your .env file and restart."
        )

_validate_env()

# ── App ──────────────────────────────────────────────────────────
app = FastAPI(
    title="ResearchCrew AI",
    description="A multi-agent LLM-powered research assistant built with CrewAI",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

executor = ThreadPoolExecutor(max_workers=2)
JOB_TIMEOUT_SECONDS = int(os.getenv("JOB_TIMEOUT_SECONDS", "420"))

# In-memory job store
jobs: dict = {}

# Active futures registry (for cancellation)
_active_futures: dict = {}

# ── Models ───────────────────────────────────────────────────────
class ResearchRequest(BaseModel):
    topic: str
    job_id: Optional[str] = None
    mode: Optional[str] = "fast"

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Topic cannot be empty.")
        if len(v) > 2000:
            raise ValueError("Topic exceeds 2000 character limit.")
        # Strip control characters except newline/tab
        import re
        v = re.sub(r"[\x00-\x08\x0b-\x1f\x7f]", "", v)
        return v


class RunRequest(BaseModel):
    topic: str
    mode: Optional[str] = "fast"

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Topic cannot be empty.")
        if len(v) > 2000:
            raise ValueError("Topic exceeds 2000 character limit.")
        import re
        v = re.sub(r"[\x00-\x08\x0b-\x1f\x7f]", "", v)
        return v


class ResearchResponse(BaseModel):
    job_id: str
    status: str
    topic: str
    result: Optional[str] = None
    message: Optional[str] = None


# ── SSE helpers ──────────────────────────────────────────────────
def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def _stream_run(topic: str, mode: str, run_id: str) -> AsyncIterator[str]:
    """Run crew in thread pool and stream SSE events."""
    loop = asyncio.get_event_loop()
    queue: asyncio.Queue = asyncio.Queue()
    start = time.time()

    yield _sse("log", {"type": "SYS", "msg": f'Starting {mode.upper()} run — "{topic}"'})
    if mode == "deep":
        yield _sse("log", {"type": "PLAN", "msg": "Planner agent initialised."})
    yield _sse("log", {"type": "EXEC", "msg": "Executor agent dispatched."})

    def _run_in_thread():
        try:
            result = run_crew(topic, mode)
            loop.call_soon_threadsafe(queue.put_nowait, ("done", result))
        except Exception as e:
            loop.call_soon_threadsafe(queue.put_nowait, ("error", str(e)))

    future = executor.submit(_run_in_thread)
    _active_futures[run_id] = future

    # Emit heartbeat ticks while waiting
    try:
        while True:
            try:
                event_type, payload = await asyncio.wait_for(queue.get(), timeout=2.0)
                break
            except asyncio.TimeoutError:
                elapsed = round(time.time() - start, 1)
                yield _sse("tick", {"elapsed": elapsed})
    finally:
        _active_futures.pop(run_id, None)

    elapsed = round(time.time() - start, 1)

    if event_type == "done":
        output = payload  # dict from run_crew
        status = output.get("status", "error")
        result_text = output.get("result", "")

        if status == "success":
            yield _sse("log", {"type": "DONE", "msg": f"Completed in {elapsed}s."})
        else:
            yield _sse("log", {"type": "ERR", "msg": result_text[:300]})

        yield _sse("result", {
            "status": status,
            "topic": topic,
            "result": result_text,
            "elapsed": elapsed,
        })
        save_run(run_id, topic, mode, status, elapsed, result_text)
    else:
        # Unhandled thread exception
        yield _sse("log", {"type": "ERR", "msg": f"Fatal: {payload[:300]}"})
        yield _sse("result", {
            "status": "error",
            "topic": topic,
            "result": f"Fatal error: {payload}",
            "elapsed": elapsed,
        })
        save_run(run_id, topic, mode, "error", elapsed, payload)

    yield _sse("done", {})


# ── Routes ───────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "name": "ResearchCrew AI",
        "version": "2.0.0",
        "endpoints": {
            "POST /run":           "Synchronous run",
            "POST /run/stream":    "Streaming SSE run",
            "DELETE /run/{id}":    "Cancel a running stream",
            "GET /history":        "Persistent run history",
            "POST /research":      "Background job (async)",
            "GET /research/{id}":  "Check background job",
            "GET /reports":        "List saved reports",
            "GET /health":         "Health check",
        },
    }


@app.get("/health")
def health():
    groq_key = os.getenv("GROQ_API_KEY")
    return {
        "status": "ok",
        "groq_api_key_set": bool(groq_key),
        "model": os.getenv("GROQ_MODEL", "groq/llama-3.1-8b-instant"),
    }


@app.post("/run")
def run_sync(request: RunRequest):
    """Simple synchronous run endpoint — blocks until complete."""
    log.info("sync run | topic=%r mode=%s", request.topic[:80], request.mode)
    run_id = str(uuid.uuid4())[:8]
    start = time.time()
    try:
        future = executor.submit(run_crew, request.topic, request.mode or "fast")
        _active_futures[run_id] = future
        output = future.result(timeout=JOB_TIMEOUT_SECONDS)
    except FutureTimeout:
        output = {
            "status": "error",
            "topic": request.topic,
            "result": (
                f"Timed out after {JOB_TIMEOUT_SECONDS}s. "
                "Try a narrower query or fast mode."
            ),
        }
    except Exception as exc:
        output = {
            "status": "error",
            "topic": request.topic,
            "result": f"Unexpected error: {exc}",
        }
    finally:
        _active_futures.pop(run_id, None)

    elapsed = round(time.time() - start, 1)
    save_run(run_id, request.topic, request.mode or "fast",
             output.get("status", "error"), elapsed, output.get("result"))
    log.info("sync run done | id=%s elapsed=%.1fs status=%s", run_id, elapsed, output.get("status"))
    return output


@app.post("/run/stream")
async def run_stream(request: RunRequest):
    """Server-Sent Events streaming run endpoint."""
    run_id = str(uuid.uuid4())[:8]
    log.info("stream run | id=%s topic=%r mode=%s", run_id, request.topic[:80], request.mode)
    return StreamingResponse(
        _stream_run(request.topic, request.mode or "fast", run_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "X-Run-Id": run_id,
        },
    )


@app.delete("/run/{run_id}")
def cancel_run(run_id: str):
    """Cancel an in-flight streaming run."""
    future = _active_futures.get(run_id)
    if not future:
        raise HTTPException(status_code=404, detail=f"No active run '{run_id}'.")
    cancelled = future.cancel()
    return {"run_id": run_id, "cancelled": cancelled}


@app.get("/history")
def run_history(limit: int = 20):
    """Return persistent run history from SQLite."""
    return {"history": get_history(min(limit, 100))}


# ── Background job endpoints (unchanged interface) ────────────────
def run_research_job(job_id: str, topic: str, mode: str = "fast"):
    jobs[job_id]["status"] = "running"
    try:
        future = executor.submit(run_crew, topic, mode)
        output = future.result(timeout=JOB_TIMEOUT_SECONDS)
        jobs[job_id]["status"] = output["status"]
        jobs[job_id]["result"] = output["result"]
        save_run(job_id, topic, mode, output["status"], None, output["result"])
    except FutureTimeout:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["result"] = (
            f"Timed out after {JOB_TIMEOUT_SECONDS}s while generating the report. "
            "Please retry with a shorter or narrower prompt."
        )
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["result"] = f"Unexpected error while running job: {e}"


@app.post("/research", response_model=ResearchResponse)
async def start_research(request: ResearchRequest, background_tasks: BackgroundTasks):
    job_id = request.job_id or str(uuid.uuid4())[:8]
    jobs[job_id] = {"job_id": job_id, "status": "queued", "topic": request.topic, "result": None}
    background_tasks.add_task(run_research_job, job_id, request.topic, request.mode)
    return ResearchResponse(
        job_id=job_id, status="queued", topic=request.topic,
        message=f"Research job started. Poll GET /research/{job_id} for results.",
    )


@app.post("/research/sync", response_model=ResearchResponse)
def start_research_sync(request: ResearchRequest):
    job_id = str(uuid.uuid4())[:8]
    try:
        future = executor.submit(run_crew, request.topic, request.mode)
        output = future.result(timeout=JOB_TIMEOUT_SECONDS)
    except FutureTimeout:
        output = {
            "status": "error",
            "result": f"Timed out after {JOB_TIMEOUT_SECONDS}s.",
        }
    return ResearchResponse(
        job_id=job_id, status=output["status"],
        topic=request.topic, result=output["result"],
    )


@app.get("/research/{job_id}", response_model=ResearchResponse)
def get_research_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    job = jobs[job_id]
    return ResearchResponse(
        job_id=job_id, status=job["status"],
        topic=job["topic"], result=job["result"],
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
    outputs_dir = Path(os.path.dirname(__file__)) / "outputs"
    filepath = (outputs_dir / filename).resolve()
    if outputs_dir.resolve() not in filepath.parents:
        raise HTTPException(status_code=400, detail="Invalid filename.")
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Report not found.")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    return {"filename": filename, "content": content}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
