# 🤖 ResearchCrew AI

![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)
![CrewAI](https://img.shields.io/badge/CrewAI-Multi--Agent-purple?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?style=flat-square&logo=fastapi)
![LangChain](https://img.shields.io/badge/LangChain-0.1.20-yellow?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Containerized-blue?style=flat-square&logo=docker)
![LLaMA3](https://img.shields.io/badge/LLaMA3--70B-Groq-orange?style=flat-square)

> An autonomous multi-agent research assistant that takes any topic, researches it across the web, analyzes findings, writes a professional report, and self-reviews for quality — all without human intervention.

---

## 🏗️ Architecture

```
User Input → FastAPI Backend → CrewAI Orchestrator
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              🔍 Researcher      📊 Analyst          ✍️ Writer
              (Web Search)    (Synthesize)        (Markdown Report)
                                                        │
                                                   🔎 Critic
                                                 (QA & Polish)
                                                        │
                                              💾 Saved .md Report
```

---

## 🤖 Agent Roles

| Agent | Role | Tools Used |
|-------|------|------------|
| **🔍 Researcher** | Multi-query web search to gather raw data | `web_search` (DuckDuckGo) |
| **📊 Analyst** | Synthesizes findings into structured insights | LLM reasoning |
| **✍️ Writer** | Produces a full professional markdown report | `save_report` (File I/O) |
| **🔎 Critic** | Reviews and improves the final report | LLM reasoning |

---

## 🛠️ Tech Stack

- **[CrewAI](https://github.com/joaomdmoura/crewAI)** — Multi-agent orchestration framework
- **[LangChain](https://langchain.com)** — LLM tooling and tool integration
- **[Groq + LLaMA3-70B](https://console.groq.com)** — Ultra-fast free LLM inference
- **[FastAPI](https://fastapi.tiangolo.com)** — REST API backend with async job support
- **[Streamlit](https://streamlit.io)** — Interactive frontend UI
- **[DuckDuckGo Search](https://pypi.org/project/duckduckgo-search/)** — Free web search (no API key needed)
- **[Docker](https://docker.com)** — Containerized deployment

---

## 🚀 Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/Aadhi-07/researchcrew-ai.git
cd researchcrew-ai
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
# Get a FREE key at: https://console.groq.com
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Run locally

**Terminal 1 — Start the API:**
```bash
python api.py
# API running at http://localhost:8000
```

**Terminal 2 — Start the frontend:**
```bash
streamlit run frontend/app.py
# UI running at http://localhost:8501
```

**Or run the crew directly in terminal:**
```bash
python crew.py
# Enter a topic when prompted
```

---

## 🐳 Docker Deployment

```bash
# Build and start both services
docker-compose up --build

# API: http://localhost:8000
# Frontend: http://localhost:8501
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API info and available endpoints |
| `GET` | `/health` | Health check + API key status |
| `POST` | `/research` | Start async research job (returns job_id) |
| `POST` | `/research/sync` | Run research synchronously (waits for result) |
| `GET` | `/research/{job_id}` | Poll job status and result |
| `GET` | `/reports` | List all saved reports |
| `GET` | `/reports/{filename}` | Fetch a specific report |

### Example Request
```bash
curl -X POST http://localhost:8000/research/sync \
  -H "Content-Type: application/json" \
  -d '{"topic": "Agentic AI trends in 2024"}'
```

---

## 📁 Project Structure

```
researchcrew-ai/
├── agents/
│   ├── __init__.py
│   ├── researcher.py     # Web search agent
│   ├── analyst.py        # Insights analyst
│   ├── writer.py         # Report writer
│   └── critic.py         # QA critic
├── tools/
│   ├── __init__.py
│   ├── search_tool.py    # DuckDuckGo web search
│   └── file_tool.py      # Save/read reports
├── frontend/
│   └── app.py            # Streamlit UI
├── outputs/              # Saved research reports
├── crew.py               # CrewAI orchestration
├── api.py                # FastAPI backend
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .env.example
└── README.md
```

---

## 📄 Sample Output

The crew produces structured markdown reports like:

```markdown
# Agentic AI Trends in 2024

## Executive Summary
...

## Key Findings
- Finding 1
- Finding 2

## Detailed Analysis
### Trends
...
### Challenges
...

## Conclusion
...
```

Reports are automatically saved to the `outputs/` directory with timestamps.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ Yes | Your Groq API key (free at console.groq.com) |
| `API_BASE_URL` | No | For frontend, defaults to `http://localhost:8000` |

---

## 👨‍💻 Author

**Aadhi J** — AI/ML Engineering Student, Annamalai University  
- GitHub: [@Aadhi-07](https://github.com/Aadhi-07)  
- LinkedIn: [aadhi-j](https://linkedin.com/in/aadhi-j-8a0671292)

---

## ⭐ If you found this useful, give it a star!
