import time
import requests
from crewai.tools import BaseTool

# Simple in-process TTL cache: {query_lower: (result_str, expire_ts)}
_CACHE: dict[str, tuple[str, float]] = {}
_TTL = 300  # 5 minutes
_MAX_OUTPUT_TOKENS = 1500  # ~6000 chars before it burns context


def _truncate(text: str, max_chars: int = _MAX_OUTPUT_TOKENS * 4) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n\n[…output truncated to stay within token limit]"


class WikipediaTool(BaseTool):
    name: str = "Wikipedia Search"
    description: str = (
        "Useful for finding academic and factual information about people, places, "
        "concepts, and history on Wikipedia. "
        "Input should be a clear search query string."
    )

    def _run(self, query: str) -> str:
        key = query.strip().lower()

        # Cache hit
        if key in _CACHE:
            result, expires = _CACHE[key]
            if time.time() < expires:
                return result

        try:
            url = "https://en.wikipedia.org/w/api.php"
            params = {
                "action": "query",
                "format": "json",
                "list": "search",
                "srsearch": query,
                "utf8": 1,
                "srlimit": 3,
            }
            response = requests.get(url, params=params, timeout=8)
            response.raise_for_status()
            data = response.json()
            results = []
            for row in data.get("query", {}).get("search", []):
                snippet = (
                    row["snippet"]
                    .replace('<span class="searchmatch">', "")
                    .replace("</span>", "")
                )
                results.append(f"Title: {row['title']}\nSnippet: {snippet}")
            if not results:
                return "No Wikipedia results found."
            result = "\n\n".join(results)
        except Exception as e:
            return f"Wikipedia search failed: {e}"

        result = _truncate(result)
        _CACHE[key] = (result, time.time() + _TTL)
        return result


wikipedia_tool = WikipediaTool()