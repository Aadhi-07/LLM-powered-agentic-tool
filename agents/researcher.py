from crewai import Agent
from tools.search_tool import web_search_tool, brave_search_tool


def create_researcher(llm) -> Agent:
    return Agent(
        role="Senior Research Specialist",
        goal=(
            "Conduct thorough, multi-angle web research on the given topic. "
            "Gather diverse, credible sources and collect comprehensive raw information "
            "including facts, statistics, recent developments, and expert opinions."
        ),
        backstory=(
            "You are an expert research analyst with 10+ years of experience in "
            "investigative research. You have a knack for finding accurate, relevant "
            "information from across the web. You always search multiple times with "
            "different queries to ensure completeness and accuracy."
        ),
        tools=[web_search_tool, brave_search_tool],
        llm=llm,
        verbose=True,
        allow_delegation=False,
        max_iter=5,
    )
