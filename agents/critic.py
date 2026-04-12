from crewai import Agent
import os


def create_critic(llm) -> Agent:
    return Agent(
        role="Critic",
        goal="Review and improve the executor's output for quality and completeness. Return the full corrected version.",
        backstory=(
            "You are a sharp editor. Fix inaccuracies, strengthen the structure, "
            "and return the complete polished report — never a partial critique."
        ),
        tools=[],
        llm=llm,
        verbose=True,
        allow_delegation=False,
        max_iter=1,
    )
