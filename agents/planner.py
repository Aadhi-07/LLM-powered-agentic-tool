from crewai import Agent
import os


def create_planner(llm) -> Agent:
    return Agent(
        role="Planner",
        goal="Break the user request into a numbered list of concrete steps. Do NOT execute them.",
        backstory=(
            "You are a concise project planner. Output only a numbered step list. "
            "No prose, no execution — just the plan."
        ),
        llm=llm,
        verbose=True,
        allow_delegation=False,
        max_iter=1,
    )
