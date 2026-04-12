# LLM-Powered Agentic Tool

A **multi-agent AI research and task execution system** built with [CrewAI](https://github.com/joaomdmoura/crewAI), powered by **Groq's LLaMA models**. Type any complex request — trip planning, research, analysis, math — and a team of specialized AI agents autonomously handles it end-to-end.

---

## Features

- **Multi-agent architecture** — Planner, Executor, Researcher, Analyst, Writer, Critic
- **Web search** via DuckDuckGo (no API key needed)
- **Wikipedia** factual lookups
- **Safe math evaluation** via `numexpr`
- **Document reader** — PDF, CSV, TXT, Markdown
- **Auto-saves reports** to `outputs/` as Markdown files
- **Two modes** — `fast` (Executor only) or `deep` (Planner + Executor)
- **Auto-retry** with exponential backoff on Groq rate limits
- **Windows-safe** — writable local CrewAI storage, UTF-8 console output

---

## Architecture

```
User Input (topic)
       |
       v
  crew.py  --- orchestrates -->  [Planner Agent]  <- deep mode only
                                        |
                                        v
                                 Executor Agent  <---- 7 Tools
                                        |
                                        v
                                  Final Output
```

---

## Project Structure

```
project/
|-- crew.py                      # Entry point & orchestration
|-- .env                         # API keys and config (create this)
|-- outputs/                     # Saved reports go here
|
|-- agents/
|   |-- __init__.py
|   |-- planner.py               # Breaks complex requests into steps
|   |-- executor.py              # Executes plans using tools (main workhorse)
|   |-- researcher.py            # Deep multi-angle web research
|   |-- analyst.py               # Data analysis & key insights
|   |-- writer.py                # Formats findings into markdown reports
|   └-- critic.py                # QA review & report improvement
|
└-- tools/
    |-- __init__.py
    |-- search_tool.py           # DuckDuckGo web search
    |-- wikipedia_tool.py        # Wikipedia API search
    |-- calculator_tool.py       # Math expression evaluator
    |-- document_reader_tool.py  # PDF / CSV / TXT reader
    └-- file_tool.py             # Save & read markdown reports
```

---

## Agents

| Agent | Role | Tools Used |
|---|---|---|
| **Planner** | Decomposes complex requests into numbered steps | None (reasoning only) |
| **Executor** | Executes plans step-by-step in a ReAct loop | All 7 tools |
| **Researcher** | Multi-angle web research | Web search x 2 |
| **Analyst** | Identifies patterns, key facts, and trends | None (reasoning only) |
| **Writer** | Formats findings into a structured markdown report | `save_report` |
| **Critic** | Reviews and improves the final report quality | None (reasoning only) |

> **Note:** The active pipeline in `crew.py` uses **Planner + Executor**. The remaining agents (Researcher, Analyst, Writer, Critic) are fully implemented and ready to be wired in for extended pipelines.

---

## Tools

| Tool | Library | Description |
|---|---|---|
| `web_search` | `duckduckgo-search` | Search the web for any query |
| `brave_search` | `duckduckgo-search` | Alias of `web_search` (same backend) |
| `wikipedia_search` | `requests` + Wikipedia API | Fetch factual Wikipedia snippets |
| `calculator` | `numexpr` | Safely evaluate math expressions |
| `document_reader` | `pypdf`, `pandas` | Read PDF, CSV, TXT, MD files |
| `save_report` | built-in | Save markdown report to `outputs/` |
| `read_report` | built-in | Read a previously saved report |

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/Aadhi-07/LLM-powered-agentic-tool.git
cd LLM-powered-agentic-tool
```

### 2. Install dependencies

```bash
pip install crewai duckduckgo-search numexpr pypdf pandas python-dotenv requests langchain-core
```

### 3. Create your `.env` file

```env
# Required
GROQ_API_KEY=your_groq_api_key_here

# Optional - defaults shown
GROQ_MODEL=groq/llama-3.1-8b-instant
LLM_TEMPERATURE=0.3
LLM_MAX_TOKENS=1000
CREW_MAX_RPM=15
CREW_VERBOSE=false

EXECUTOR_MAX_ITER=10
CRITIC_MAX_ITER=1

RATE_LIMIT_RETRIES=4
RATE_LIMIT_BACKOFF_SECONDS=3.5

ENABLE_MEMORY=false
```

> Get your free Groq API key at [console.groq.com](https://console.groq.com)

### 4. Run

```bash
python crew.py
```

You will be prompted:
```
Enter request (e.g. 'Plan a $1000 trip to Tokyo for a week'):
```

---

## Execution Modes

### Fast mode (default)
Only the **Executor** agent runs. Best for straightforward queries.

```python
output = run_crew("What is the capital of France?", mode="fast")
```

### Deep mode
The **Planner** first generates a numbered step-by-step plan, then the **Executor** carries it out using that plan as context.

```python
output = run_crew("Plan a $1000 trip to Tokyo for a week", mode="deep")
```

---

## Rate Limit Handling

The system automatically handles Groq's rate limits:

- Parses the `try again in Xs` hint from 429 errors
- Applies **exponential backoff** with jitter between retries
- Configurable via `RATE_LIMIT_RETRIES` and `RATE_LIMIT_BACKOFF_SECONDS`
- Falls back gracefully after max retries with a user-friendly message

---

## Design Decisions

| Decision | Reason |
|---|---|
| **Groq + LLaMA** over OpenAI | Faster inference, free-tier friendly |
| **One tool call at a time** | Enforced in agent backstory — Groq rejects batched function calls |
| **Memory off by default** | CrewAI memory can trigger aggressive tool patterns that break Groq's function-calling |
| **All tools use `crewai.tools.BaseTool`** | Required for CrewAI's Pydantic validation — LangChain `Tool` objects are incompatible |
| **Local CrewAI storage paths** | Avoids permission errors on restricted Windows environments |

---

## Common Issues

**`ValidationError for Agent tools` (Pydantic)**
All tools must inherit from `crewai.tools.BaseTool`. Do not use `langchain_core.tools.Tool` or `langchain.tools.Tool` directly — wrap them in a `BaseTool` subclass instead.

**`GROQ_API_KEY not set`**
Make sure your `.env` file exists in the project root and contains a valid key.

**Rate limit / 429 errors**
Lower `CREW_MAX_RPM` or switch to a smaller model like `groq/llama-3.1-8b-instant`.

**Unicode errors on Windows**
Already handled — the console is reconfigured to UTF-8 on startup.

---

## Dependencies

| Package | Purpose |
|---|---|
| `crewai` | Multi-agent orchestration framework |
| `duckduckgo-search` | Free web search (no API key needed) |
| `numexpr` | Safe math expression evaluation |
| `pypdf` | PDF text extraction |
| `pandas` | CSV reading and tabular data |
| `python-dotenv` | Load `.env` configuration |
| `requests` | Wikipedia API HTTP calls |

---

## License

MIT License — see [LICENSE](LICENSE) for details.
