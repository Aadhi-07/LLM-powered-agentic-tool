import os
import re
import time
import random
from crewai import Crew, Task, Process
from crewai import LLM
from dotenv import load_dotenv

from agents import create_researcher, create_analyst, create_writer, create_critic

load_dotenv()


def build_llm() -> LLM:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set. Add it to your .env file.")
    model = os.getenv("GROQ_MODEL", "groq/llama-3.1-8b-instant")
    temperature = float(os.getenv("LLM_TEMPERATURE", "0.3"))
    # Keep defaults moderate to reduce provider-side rate-limit pressure.
    max_tokens = int(os.getenv("LLM_MAX_TOKENS", "700"))
    # crewai 1.x uses its own LLM class (wraps LiteLLM under the hood)
    return LLM(
        model=model,
        api_key=api_key,
        temperature=temperature,
        max_tokens=max_tokens,
    )


def _extract_retry_seconds(error_text: str) -> float:
    """Parse provider hint like: 'Please try again in 11.78s'."""
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
    # Exponential backoff + small jitter, while respecting provider hint when present.
    exp_wait = base_backoff * (2 ** attempt)
    jitter = random.uniform(0.25, 1.0)
    return max(exp_wait + jitter, provider_wait + 1.0)


def build_tasks(topic: str, researcher, analyst, writer, critic) -> list:
    research_task = Task(
        description=(
            f"Research the following topic thoroughly: '{topic}'\n\n"
            "Use the web_search tool (alias: brave_search) multiple times with different queries:\n"
            "1. General overview and background\n"
            "2. Latest news and recent developments (2025)\n"
            "3. Key statistics and data points\n"
            "4. Expert opinions and analysis\n"
            "5. Challenges, risks, or controversies\n\n"
            "Compile all raw findings into a detailed research dump with source URLs."
        ),
        expected_output=(
            "A comprehensive collection of raw research data with source URLs, "
            "facts, statistics, expert quotes, and recent developments. Minimum 800 words."
        ),
        agent=researcher,
    )

    analysis_task = Task(
        description=(
            f"Analyze the research data collected about '{topic}'.\n\n"
            "Structure your analysis into:\n"
            "1. **Key Facts** — verified, important factual information\n"
            "2. **Major Trends** — patterns and directions observed\n"
            "3. **Challenges & Risks** — problems and obstacles\n"
            "4. **Opportunities** — positive developments or potential\n"
            "5. **Expert Consensus** — what experts agree or disagree on\n"
            "6. **Data Highlights** — statistics and key metrics\n\n"
            "Be analytical. Synthesize — do not just repeat raw data."
        ),
        expected_output=(
            "A structured analytical breakdown with clearly labeled sections. "
            "Minimum 600 words of original analysis."
        ),
        agent=analyst,
        context=[research_task],
    )

    writing_task = Task(
        description=(
            f"Write a professional research report on '{topic}' based on the analysis.\n\n"
            "Use this exact structure:\n"
            "# {topic}\n"
            "## Executive Summary\n"
            "## Introduction\n"
            "## Key Findings\n"
            "## Detailed Analysis\n"
            "### Trends\n"
            "### Challenges\n"
            "### Opportunities\n"
            "## Data & Statistics\n"
            "## Expert Perspectives\n"
            "## Conclusion\n"
            "## Sources & References\n\n"
            "After writing the complete report, use the save_report tool to save it to disk."
        ),
        expected_output=(
            "A complete, well-formatted markdown report saved to disk. "
            "Minimum 1000 words. All sections present. Professional tone."
        ),
        agent=writer,
        context=[research_task, analysis_task],
    )

    critic_task = Task(
        description=(
            f"Review the research report on '{topic}'.\n\n"
            "Check for:\n"
            "1. Factual accuracy and consistency with the research\n"
            "2. Completeness — all key aspects covered?\n"
            "3. Logical flow and structure\n"
            "4. Clarity and professional tone\n"
            "5. Grammar and formatting\n\n"
            "Return your critique notes followed by the FULL improved final report in markdown."
        ),
        expected_output=(
            "Critique notes + the complete final improved markdown report, "
            "polished and ready for publication."
        ),
        agent=critic,
        context=[writing_task],
    )

    return [research_task, analysis_task, writing_task, critic_task]


def run_crew(topic: str) -> dict:
    """Run the full ResearchCrew pipeline. Returns dict with status and result."""
    try:
        llm = build_llm()

        researcher = create_researcher(llm)
        analyst = create_analyst(llm)
        writer = create_writer(llm)
        critic = create_critic(llm)

        tasks = build_tasks(topic, researcher, analyst, writer, critic)

        crew = Crew(
            agents=[researcher, analyst, writer, critic],
            tasks=tasks,
            process=Process.sequential,
            verbose=True,
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
        else:
            final_message = f"Error: {error_text}"

        return {
            "status": "error",
            "topic": topic,
            "result": final_message,
        }


if __name__ == "__main__":
    topic = input("Enter research topic: ").strip()
    if not topic:
        topic = "Agentic AI and autonomous LLM systems in 2025"
    output = run_crew(topic)
    print("\n" + "=" * 60)
    print("FINAL OUTPUT")
    print("=" * 60)
    print(output["result"])
