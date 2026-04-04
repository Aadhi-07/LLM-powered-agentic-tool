from crewai import Agent
from tools.file_tool import save_report_tool


def create_writer(llm) -> Agent:
    return Agent(
        role="Technical Report Writer",
        goal=(
            "Transform analytical insights into a well-structured, professional "
            "markdown report. The report must include: Executive Summary, Key Findings, "
            "Detailed Analysis, Trends, Challenges, Opportunities, Conclusion, and Sources. "
            "Save the final report to disk using the save_report tool."
        ),
        backstory=(
            "You are an experienced technical writer specializing in clear, compelling "
            "research reports for professional and academic audiences. Your reports are "
            "known for logical flow, rich detail, and actionable takeaways. You always "
            "format output in clean markdown with proper headers and an executive summary."
        ),
        tools=[save_report_tool],
        llm=llm,
        verbose=True,
        allow_delegation=False,
        max_iter=3,
    )
