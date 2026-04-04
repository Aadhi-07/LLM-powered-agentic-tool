import streamlit as st
import requests
import time
import os

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8000")

st.set_page_config(
    page_title="ResearchCrew AI",
    page_icon="🤖",
    layout="wide",
)

# ─── Styles ────────────────────────────────────────────────────────────────────
st.markdown(
    """
    <style>
    .main-title {
        font-size: 2.5rem;
        font-weight: 800;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0;
    }
    .subtitle {
        color: #888;
        font-size: 1rem;
        margin-top: 0;
        margin-bottom: 2rem;
    }
    .agent-card {
        background: #1e1e2e;
        border-left: 4px solid #667eea;
        padding: 12px 16px;
        border-radius: 8px;
        margin: 8px 0;
        font-size: 0.9rem;
    }
    .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-weight: bold;
        font-size: 0.85rem;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# ─── Header ────────────────────────────────────────────────────────────────────
st.markdown('<p class="main-title">🤖 ResearchCrew AI</p>', unsafe_allow_html=True)
st.markdown(
    '<p class="subtitle">Multi-agent autonomous research powered by CrewAI + LLaMA3</p>',
    unsafe_allow_html=True,
)

# ─── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Configuration")
    api_url = st.text_input("API Base URL", value=API_BASE)

    st.divider()
    st.subheader("🤖 Agent Pipeline")
    agents = [
        ("🔍", "Researcher", "Searches the web across multiple queries"),
        ("📊", "Analyst", "Synthesizes key insights and patterns"),
        ("✍️", "Writer", "Produces a structured markdown report"),
        ("🔎", "Critic", "Reviews and improves report quality"),
    ]
    for icon, name, desc in agents:
        st.markdown(
            f'<div class="agent-card">{icon} <b>{name}</b><br><small>{desc}</small></div>',
            unsafe_allow_html=True,
        )

    st.divider()
    # Health check
    try:
        r = requests.get(f"{api_url}/health", timeout=3)
        if r.status_code == 200:
            data = r.json()
            groq_ok = data.get("groq_api_key_set", False)
            st.success("✅ API Connected")
            if groq_ok:
                st.success("✅ Groq API Key Set")
            else:
                st.error("❌ Groq API Key Missing")
        else:
            st.error("❌ API Error")
    except Exception:
        st.warning("⚠️ API Offline — Start the FastAPI server")

# ─── Tabs ──────────────────────────────────────────────────────────────────────
tab1, tab2, tab3 = st.tabs(["🚀 Research", "📄 Reports", "ℹ️ About"])

# ══════════════════════════════════════════════════════════════════════════════
# TAB 1 — RESEARCH
# ══════════════════════════════════════════════════════════════════════════════
with tab1:
    st.subheader("Start a New Research Job")

    example_topics = [
        "Agentic AI and autonomous LLM agents in 2024",
        "Quantum computing breakthroughs and industry applications",
        "Climate change mitigation technologies 2024",
        "India's startup ecosystem and unicorn growth",
        "Large language model fine-tuning techniques",
    ]

    col1, col2 = st.columns([3, 1])
    with col1:
        topic = st.text_input(
            "Research Topic",
            placeholder="e.g. Agentic AI trends in 2024",
            help="Enter any topic you want the AI crew to research.",
        )
    with col2:
        st.markdown("**Quick Examples**")
        if st.button("💡 Random Topic"):
            import random
            st.session_state["random_topic"] = random.choice(example_topics)

    if "random_topic" in st.session_state:
        topic = st.session_state["random_topic"]
        st.info(f"📌 Using: *{topic}*")

    mode = st.radio(
        "Run Mode",
        ["Async (background job)", "Sync (wait for result)"],
        horizontal=True,
        help="Async returns a job ID immediately. Sync waits for completion (3–10 mins).",
    )

    if st.button("🚀 Start Research", type="primary", use_container_width=True):
        if not topic.strip():
            st.error("Please enter a research topic.")
        else:
            with st.spinner("Submitting job to ResearchCrew..."):
                try:
                    endpoint = "/research/sync" if "Sync" in mode else "/research"
                    resp = requests.post(
                        f"{api_url}{endpoint}",
                        json={"topic": topic},
                        timeout=600,
                    )
                    data = resp.json()
                except Exception as e:
                    st.error(f"Could not connect to API: {e}")
                    st.stop()

            if "Sync" in mode:
                if data.get("status") == "success":
                    st.success("✅ Research Complete!")
                    st.markdown("---")
                    st.markdown(data.get("result", "No result returned."))
                else:
                    st.error(f"Research failed: {data.get('result', 'Unknown error')}")
            else:
                job_id = data.get("job_id")
                st.success(f"✅ Job queued! Job ID: `{job_id}`")
                st.info(f"Polling for result...")

                progress_bar = st.progress(0)
                status_text = st.empty()
                result_area = st.empty()

                for i in range(60):
                    time.sleep(5)
                    progress_bar.progress(min((i + 1) / 60, 0.95))
                    try:
                        poll = requests.get(f"{api_url}/research/{job_id}", timeout=10)
                        pdata = poll.json()
                        status = pdata.get("status", "unknown")
                        status_text.markdown(f"**Status:** `{status}`")

                        if status == "success":
                            progress_bar.progress(1.0)
                            st.success("✅ Research Complete!")
                            result_area.markdown(pdata.get("result", ""))
                            break
                        elif status == "error":
                            st.error(pdata.get("result", "Unknown error"))
                            break
                    except Exception:
                        pass
                else:
                    st.warning("⏱️ Job is taking longer than expected. Check back using the job ID.")

# ══════════════════════════════════════════════════════════════════════════════
# TAB 2 — REPORTS
# ══════════════════════════════════════════════════════════════════════════════
with tab2:
    st.subheader("📄 Saved Reports")

    if st.button("🔄 Refresh Reports"):
        st.rerun()

    try:
        resp = requests.get(f"{api_url}/reports", timeout=5)
        reports_data = resp.json()
        reports = reports_data.get("reports", [])

        if not reports:
            st.info("No reports saved yet. Run a research job first!")
        else:
            st.markdown(f"**{len(reports)} report(s) found**")
            for report in reports:
                with st.expander(f"📄 {report['filename']} — {report['size_kb']} KB"):
                    if st.button(f"Load {report['filename']}", key=report["filename"]):
                        r = requests.get(f"{api_url}/reports/{report['filename']}", timeout=10)
                        st.markdown(r.json().get("content", ""))
    except Exception as e:
        st.error(f"Could not fetch reports: {e}")

# ══════════════════════════════════════════════════════════════════════════════
# TAB 3 — ABOUT
# ══════════════════════════════════════════════════════════════════════════════
with tab3:
    st.subheader("About ResearchCrew AI")
    st.markdown(
        """
        **ResearchCrew AI** is a portfolio-grade multi-agent research system built with:

        | Component | Technology |
        |-----------|------------|
        | Agent Orchestration | CrewAI |
        | LLM Backbone | LLaMA3-70B via Groq |
        | LLM Framework | LangChain |
        | Web Search | DuckDuckGo Search |
        | API Backend | FastAPI |
        | Frontend | Streamlit |
        | Containerization | Docker |

        ### 🤖 Agent Roles
        1. **Researcher** — Queries the web multiple times to gather raw data
        2. **Analyst** — Synthesizes information into structured insights
        3. **Writer** — Produces a full professional markdown report
        4. **Critic** — Reviews and improves the final output

        ### 🗂️ Architecture
        ```
        User Input → FastAPI → CrewAI Crew → [Researcher → Analyst → Writer → Critic]
                                                    ↓
                                          Saved Markdown Report
        ```

        Built by [Aadhi](https://github.com/Aadhi-07) · Powered by CrewAI + Groq
        """
    )
