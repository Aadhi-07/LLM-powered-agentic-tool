import sys
from crew import run_crew

try:
    print("Running crew...")
    res = run_crew("What is 2+2?")
    with open('test_output.txt', 'w', encoding='utf-8') as f:
        f.write("Success:\n" + str(res))
    print("Crew completed successfully.")
except Exception as e:
    import traceback
    with open('test_output.txt', 'w', encoding='utf-8') as f:
        f.write("Exception:\n" + traceback.format_exc())
    print("Crew failed with exception.")
