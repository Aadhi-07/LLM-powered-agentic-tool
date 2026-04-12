from crewai import Agent
import os
from tools import (
    web_search_tool,
    calculator_tool,
    wikipedia_tool,
)


def create_executor(llm) -> Agent:
    max_iter = int(os.getenv("EXECUTOR_MAX_ITER", "5"))
    return Agent(
        role="Executor",
        goal="Fulfill user requests using tools. Be concise and direct.",
        backstory=(
            "You are a precise research agent. Use one tool at a time in a "
            "Thought→Action→Observation loop. If a tool fails, try one alternative. "
            "Return a structured, sourced answer."
        ),
        tools=[web_search_tool, calculator_tool, wikipedia_tool],
        llm=llm,
        verbose=True,
        max_iter=max_iter,
        allow_delegation=False,
    )
