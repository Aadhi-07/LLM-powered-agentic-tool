import os
import re
import time
import random
from crewai import Crew, Task, Process
from crewai import LLM
from dotenv import load_dotenv

from agents import create_planner, create_executor

load_dotenv()


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


def _compute_backoff_seconds(base_backoff: float, attempt: int, provider_wait: float) -> float:
    exp_wait = base_backoff * (2 ** attempt)
    jitter = random.uniform(0.25, 1.0)
    return max(exp_wait + jitter, provider_wait + 1.0)


def build_tasks(topic: str, planner, executor) -> list:
    # 1. Multi-step Task execution planning phase
    planning_task = Task(
        description=(
            f"Analyze the user's request: '{topic}'.\n\n"
            "Decompose this request into a logical, sequential plan. Outline exactly what information "
            "needs to be searched, what math needs to be evaluated, what needs to be synthesized. "
            "Do NOT execute the plan. Return explicit numbered steps."
        ),
        expected_output="An exact, numbered list of actionable steps breaking down the user query.",
        agent=planner,
    )

    # 2. Iterative execution phase inside ReAct loop
    execution_task = Task(
        description=(
            f"Fulfill the following user request entirely based on the plan provided in the preceding task: '{topic}'\n\n"
            "Instructions:\n"
            "1. Read the plan and perform the steps systematically.\n"
            "2. Utilize tools: web search, document reader, calculator, etc., when required.\n"
            "3. If a tool fails (e.g., search gives no results, or calculator throws error), immediately rethink -> try a different query or tool.\n"
            "4. Combine and structure all gathered facts/results into a beautiful, coherent final response.\n"
        ),
        expected_output="The final properly structured output satisfying every detail of the user's initial request.",
        agent=executor,
        context=[planning_task],
    )

    return [planning_task, execution_task]


def run_crew(topic: str) -> dict:
    """Run the Agentic execution pipeline. Returns dict with status and result."""
    try:
        llm = build_llm()

        planner = create_planner(llm)
        executor = create_executor(llm)

        tasks = build_tasks(topic, planner, executor)

        max_rpm = int(os.getenv("CREW_MAX_RPM", "15"))

        # Enable long/short term Memory using HuggingFace sentence transformers to avoid OpenAI defaults
        memory_enabled = os.getenv("ENABLE_MEMORY", "true").strip().lower() == "true"
        
        embedder_config = None
        if memory_enabled:
            # We enforce a local Sentence Transformer provider to ensure we do not hit OpenAI's rate limiter unannounced.
            embedder_config = {
                "provider": "sentence-transformer",
                "config": {
                    "model": "BAAI/bge-small-en-v1.5"
                }
            }

        # Initialize Crew
        crew = Crew(
            agents=[planner, executor],
            tasks=tasks,
            process=Process.sequential,
            verbose=True,
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
                if attempt >= retries or not _is_rate_limit_error(error_text):
                    raise

                provider_wait = _extract_retry_seconds(error_text)
                wait_seconds = _compute_backoff_seconds(base_backoff, attempt, provider_wait)
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
        else: final_message = f"Error: {error_text}"

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
