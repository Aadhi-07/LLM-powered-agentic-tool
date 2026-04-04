from crewai import Agent


def create_analyst(llm) -> Agent:
    return Agent(
        role="Data & Insights Analyst",
        goal=(
            "Analyze raw research data and identify the most important insights, "
            "patterns, and key findings. Separate facts from opinions, highlight "
            "contradictions, and synthesize information into structured analytical notes."
        ),
        backstory=(
            "You are a critical thinker and data analyst with a background in both "
            "quantitative and qualitative analysis. You excel at distilling large "
            "volumes of information into actionable insights, always structuring "
            "your analysis with clear categories: Key Facts, Trends, Challenges, "
            "Opportunities, and Expert Consensus."
        ),
        tools=[],
        llm=llm,
        verbose=True,
        allow_delegation=False,
        max_iter=3,
    )
