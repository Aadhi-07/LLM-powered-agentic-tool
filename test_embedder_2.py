import os, sys
from crewai import Agent, Task, Crew

with open('out2.txt', 'w') as f:
    try:
        crew = Crew(
            agents=[],
            tasks=[],
            embedder={
                "provider": "sentence-transformer",
                "config": {
                    "model": "BAAI/bge-small-en-v1.5"
                }
            }
        )
        f.write("Crew initialized successfully with sentence-transformer.\n")
    except Exception as e:
        import traceback
        f.write(traceback.format_exc() + "\n")
