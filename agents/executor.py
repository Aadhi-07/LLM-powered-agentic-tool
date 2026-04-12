from crewai import Agent
import os
from tools import (
    web_search_tool, brave_search_tool,
    calculator_tool, document_reader_tool,
    save_report_tool, read_report_tool, wikipedia_tool
)

def create_executor(llm) -> Agent:
    max_iter = int(os.getenv("EXECUTOR_MAX_ITER", "10"))
    return Agent(
        role="Autonomous Executor",
        goal="Execute complex planned sequences using available tools, self-correct upon errors, and finalize tasks.",
        backstory=(
            "You are an advanced autonomous reasoning engine. You operate in a strict ReAct loop "
            "(Thought -> Action -> Observation). You execute actions step-by-step using a diverse set of tools. "
            "You are highly resilient: if a tool errors or returns no result, you deduce an alternative strategy, "
            "fix the query, or switch tools. Important: use one tool call at a time and do not emit batched "
            "or chained function calls in a single response. You compile all observations into a comprehensive "
            "end response."
        ),
        tools=[
            web_search_tool, brave_search_tool,
            calculator_tool, document_reader_tool,
            save_report_tool, read_report_tool, wikipedia_tool
        ],
        llm=llm,
        verbose=True,
        max_iter=max_iter,
        allow_delegation=False,
    )
