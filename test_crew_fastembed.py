import os
from crewai import Crew, Agent, Task
from unittest.mock import Mock

os.environ['ENABLE_MEMORY'] = 'true'
os.environ['GROQ_API_KEY'] = 'test'

try:
    crew = Crew(
        agents=[Agent(role="A", goal="B", backstory="C")],
        tasks=[Task(description="D", expected_output="E", agent=Agent(role="A", goal="B", backstory="C"))],
        embedder={
            "provider": "fastembed",
            "config": {
                "model": "BAAI/bge-small-en-v1.5"
            }
        }
    )
    print("Crew initialized successfully with fastembed")
except Exception as e:
    import traceback
    print("Error:", traceback.format_exc())
