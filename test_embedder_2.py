import os, sys
from crewai import Agent, Task, Crew

with open('out2.txt', 'w') as f:
    try:
        crew = Crew(
            agents=[],
            tasks=[],
            embedder={
                "provider": "onnx",
                "config": {
                    "model": "all-MiniLM-L6-v2"
                }
            }
        )
        f.write("Crew initialized successfully with sentence-transformer.\n")
    except Exception as e:
        import traceback
        f.write(traceback.format_exc() + "\n")
