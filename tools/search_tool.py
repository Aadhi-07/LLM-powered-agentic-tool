import time
from crewai.tools import BaseTool
from duckduckgo_search import DDGS

_MAX_CHARS = 6000  # token guard


def _truncate(text: str) -> str:
    if len(text) <= _MAX_CHARS:
        return text
    return text[:_MAX_CHARS] + "\n\n[…truncated]"


def _run_search(query: str, max_results: int = 6) -> str:
    try:
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append(
                    f"Title: {r['title']}\nURL: {r['href']}\nSummary: {r['body']}\n"
                )
        if not results:
            return "No results found for the given query."
        return _truncate("\n---\n".join(results))
    except Exception as e:
        return f"Search error: {str(e)}"


# ── Simple TTL cache ─────────────────────────────────────────────
_CACHE: dict[str, tuple[str, float]] = {}
_TTL = 120  # 2 min cache for live web results


class WebSearchTool(BaseTool):
    name: str = "web_search"
    description: str = (
        "Search the web for current information on any topic. "
        "Input should be a concise search query string. "
        "Returns titles, URLs, and summaries of the most relevant results."
    )

    def _run(self, query: str) -> str:
        key = query.strip().lower()
        if key in _CACHE:
            result, exp = _CACHE[key]
            if time.time() < exp:
                return result
        result = _run_search(query=query)
        _CACHE[key] = (result, time.time() + _TTL)
        return result


class BraveSearchAliasTool(BaseTool):
    name: str = "brave_search"
    description: str = (
        "Alias of web_search. Use this with a search query string. "
        "Returns titles, URLs, and summaries of relevant results."
    )

    def _run(self, query: str) -> str:
        key = query.strip().lower()
        if key in _CACHE:
            result, exp = _CACHE[key]
            if time.time() < exp:
                return result
        result = _run_search(query=query)
        _CACHE[key] = (result, time.time() + _TTL)
        return result


web_search_tool = WebSearchTool()
brave_search_tool = BraveSearchAliasTool()
