import os
from crewai import Agent, Task, Crew, set_openai_key

set_openai_key("dummy")

import traceback
try:
    crew = Crew(
        agents=[],
        tasks=[],
        embedder={
            "provider": "huggingface",
            "config": {
                "model": "all-MiniLM-L6-v2"
            }
        }
    )
    print("Crew initialized successfully.")
except Exception as e:
    print(traceback.format_exc())
