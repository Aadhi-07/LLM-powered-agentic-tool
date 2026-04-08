from crewai import Agent
from tools import (
    web_search_tool, brave_search_tool,
    calculator_tool, document_reader_tool,
    save_report_tool, read_report_tool
)

def create_executor(llm) -> Agent:
    return Agent(
        role="Autonomous Executor",
        goal="Execute complex planned sequences using available tools, self-correct upon errors, and finalize tasks.",
        backstory=(
            "You are an advanced autonomous reasoning engine. You operate in a strict ReAct loop "
            "(Thought -> Action -> Observation). You execute actions step-by-step using a diverse set of tools. "
            "You are highly resilient: if a tool errors or returns no result, you deduce an alternative strategy, "
            "fix the query, or switch tools. You compile all observations into a comprehensive end response."
        ),
        tools=[
            web_search_tool, brave_search_tool,
            calculator_tool, document_reader_tool,
            save_report_tool, read_report_tool
        ],
        llm=llm,
        verbose=True,
        max_iter=15,  # Increased loops to allow sufficient retries/self-correction
        allow_delegation=False,
    )
