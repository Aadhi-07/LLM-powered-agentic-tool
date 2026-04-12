import os
import re
import sys
import time
import random
import logging
from pathlib import Path
from dotenv import load_dotenv

log = logging.getLogger("researchcrew.crew")


def configure_local_crewai_storage() -> Path:
    """Force CrewAI runtime storage into a writable local project folder."""
    storage_root = Path(__file__).resolve().parent / ".crewai_data"
    storage_root.mkdir(parents=True, exist_ok=True)

    os.environ["APPDATA"] = str(storage_root)
    os.environ["LOCALAPPDATA"] = str(storage_root)
    os.environ["XDG_DATA_HOME"] = str(storage_root)
    os.environ.setdefault("OTEL_SDK_DISABLED", "true")
    os.environ.setdefault("CREWAI_DISABLE_TELEMETRY", "true")
    os.environ.setdefault("CREWAI_DISABLE_TRACKING", "true")
    return storage_root


configure_local_crewai_storage()

from crewai import Crew, Task, Process
from crewai import LLM
import crewai.utilities.paths as crewai_paths
import crewai.memory.storage.kickoff_task_outputs_storage as kickoff_storage
from agents import create_planner, create_executor, create_critic

load_dotenv()


def configure_crewai_runtime_paths() -> Path:
    """Patch CrewAI internal storage paths to use a writable local folder."""
    db_root = Path(__file__).resolve().parent / ".crewai_data" / "db"
    db_root.mkdir(parents=True, exist_ok=True)

    def _local_db_storage_path() -> str:
        db_root.mkdir(parents=True, exist_ok=True)
        return str(db_root)

    crewai_paths.db_storage_path = _local_db_storage_path
    kickoff_storage.db_storage_path = _local_db_storage_path
    return db_root


def configure_console_encoding() -> None:
    """Avoid Windows codepage crashes when CrewAI emits unicode logs."""
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def build_llm() -> LLM:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set. Add it to your .env file.")
    model = os.getenv("GROQ_MODEL", "groq/llama-3.1-8b-instant")
    temperature = float(os.getenv("LLM_TEMPERATURE", "0.3"))
    max_tokens = int(os.getenv("LLM_MAX_TOKENS", "1000"))
    return LLM(
        model=model,
        api_key=api_key,
        temperature=temperature,
        max_tokens=max_tokens,
        timeout=120,
        max_retries=int(os.getenv("RATE_LIMIT_RETRIES", "10")),
    )


def _extract_retry_seconds(error_text: str) -> float:
    match = re.search(r"try again in\s*([0-9]+(?:\.[0-9]+)?)s", error_text, re.IGNORECASE)
    if not match:
        return 0.0
    try:
        return float(match.group(1))
    except ValueError:
        return 0.0


def _is_rate_limit_error(error_text: str) -> bool:
    lowered = error_text.lower()
    return (
        "rate_limit" in lowered
        or "rate limit" in lowered
        or "rate_limited" in lowered
        or "too many requests" in lowered
        or "429" in lowered
    )


def _is_tool_use_failed_error(error_text: str) -> bool:
    lowered = error_text.lower()
    return (
        "tool_use_failed" in lowered
        or "failed to call a function" in lowered
        or ("badrequesterror" in lowered and "groqexception" in lowered)
    )


def _compute_backoff_seconds(base_backoff: float, attempt: int, provider_wait: float) -> float:
    exp_wait = base_backoff * (2 ** attempt)
    jitter = random.uniform(0.25, 1.0)
    return max(exp_wait + jitter, provider_wait + 1.0)


def build_tasks(topic: str, executor, planner=None, critic=None) -> list:
    tasks = []

    if planner:
        planning_task = Task(
            description=(
                f"User request: '{topic}'. "
                "Output a numbered list of steps needed to answer it. Do NOT execute them."
            ),
            expected_output="Numbered step-by-step plan.",
            agent=planner,
        )
        tasks.append(planning_task)

    execution_task = Task(
        description=(
            f"Answer this request: '{topic}'. "
            "Use one tool at a time. Wait for each result. "
            "If a tool fails, try one alternative. "
            "Return a structured answer with sources."
        ),
        expected_output="Structured, sourced answer to the user's request.",
        agent=executor,
        context=[planning_task] if planner else [],
    )
    tasks.append(execution_task)

    if critic:
        critic_task = Task(
            description=(
                "Review the executor's output. Fix inaccuracies, improve clarity, "
                "and return the complete polished final version."
            ),
            expected_output="Complete, polished, accurate final report.",
            agent=critic,
            context=[execution_task],
        )
        tasks.append(critic_task)

    return tasks


def run_crew(topic: str, mode: str = "fast") -> dict:
    """Run the Agentic execution pipeline. Returns dict with status and result."""
    try:
        configure_console_encoding()
        configure_crewai_runtime_paths()
        llm = build_llm()

        executor = create_executor(llm)
        planner = create_planner(llm) if mode == "deep" else None
        critic = create_critic(llm) if mode == "deep" else None

        agents = [a for a in [planner, executor, critic] if a is not None]

        tasks = build_tasks(topic, executor, planner, critic)

        max_rpm = int(os.getenv("CREW_MAX_RPM", "15"))

        memory_enabled = os.getenv("ENABLE_MEMORY", "false").strip().lower() == "true"

        embedder_config = None
        if memory_enabled:
            embedder_config = {
                "provider": "onnx",
                "config": {"model": "all-MiniLM-L6-v2"},
            }

        crew = Crew(
            agents=agents,
            tasks=tasks,
            process=Process.sequential,
            verbose=os.getenv("CREW_VERBOSE", "false").strip().lower() == "true",
            max_rpm=max_rpm,
            memory=memory_enabled,
            embedder=embedder_config,
        )

        retries = int(os.getenv("RATE_LIMIT_RETRIES", "4"))
        base_backoff = float(os.getenv("RATE_LIMIT_BACKOFF_SECONDS", "3.5"))

        attempt = 0
        while True:
            try:
                result = crew.kickoff()
                break
            except Exception as kickoff_error:
                error_text = str(kickoff_error)
                if _is_tool_use_failed_error(error_text) and memory_enabled:
                    memory_enabled = False
                    crew = Crew(
                        agents=agents,
                        tasks=tasks,
                        process=Process.sequential,
                        verbose=os.getenv("CREW_VERBOSE", "false").strip().lower() == "true",
                        max_rpm=max_rpm,
                        memory=False,
                        embedder=None,
                    )
                    continue
                if attempt >= retries or not _is_rate_limit_error(error_text):
                    raise

                provider_wait = _extract_retry_seconds(error_text)
                wait_seconds = _compute_backoff_seconds(base_backoff, attempt, provider_wait)
                log.warning("Rate limit hit, waiting %.1fs (attempt %d/%d)", wait_seconds, attempt + 1, retries)
                time.sleep(wait_seconds)
                attempt += 1

        return {
            "status": "success",
            "topic": topic,
            "result": str(result),
        }

    except Exception as e:
        error_text = str(e)
        if _is_rate_limit_error(error_text):
            retry_hint = _extract_retry_seconds(error_text)
            hint = (
                f" Suggested wait: about {retry_hint:.1f}s before retry."
                if retry_hint > 0
                else " Please wait a few seconds and retry."
            )
            final_message = (
                "Rate limit reached while contacting Groq."
                + hint
                + " Consider lowering token usage or using a smaller model."
            )
        else:
            final_message = f"Error: {error_text}"
            log.error("Crew run failed: %s", error_text)

        return {
            "status": "error",
            "topic": topic,
            "result": final_message,
        }


if __name__ == "__main__":
    topic = input("Enter request (e.g. 'Plan a $1000 trip to Tokyo for a week'): ").strip()
    if not topic:
        topic = "Plan a budget trip layout"
    output = run_crew(topic)
    print("\n" + "=" * 60)
    print("FINAL OUTPUT")
    print("=" * 60)
    print(output["result"])
